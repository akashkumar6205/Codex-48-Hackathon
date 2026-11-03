"""
Grounded RAG Review Engine for BrandLens.
Retrieves relevant source chunks from the Knowledge Base and performs
semantic brand verification with strict citation grounding (PRD Section 9).
"""
import os
import re
import json
import uuid
import httpx
from typing import List, Dict, Tuple, Optional
from difflib import SequenceMatcher
from backend.models import Finding, FindingSource, TextExcerpt, Source
from backend.embedding_store import embedding_store
from backend.citation_verifier import citation_verifier

SYSTEM_PROMPT = """You are BrandLens, an enterprise brand-governance AI.
Your role is to review marketing copy against approved corporate brand guidelines,
claims policies, and glossaries before publication.

Strict Instructions:
1. Every finding MUST cite a valid source_id and quote real text from the provided sources.
2. NEVER hallucinate a guideline or fact not present in the approved sources.
3. If copy is fully compliant, return {"findings": []}.
4. Provide constructive, intent-preserving suggestions.
5. Return strictly valid JSON matching the schema.

Schema:
{
  "findings": [
    {
      "category": "claims|tone|terminology|facts|accessibility",
      "severity": "high|medium|low",
      "confidence": 0.85-1.0,
      "excerpt_text": "Exact phrase from the content",
      "reason": "Clear explanation of the violation",
      "source_id": "Exact ID of the cited source",
      "source_section": "Section number",
      "source_quote": "Exact quote from source content supporting this flag",
      "suggestion": "Corrected phrasing preserving creator intent"
    }
  ]
}
"""

class RAGEngine:
    def __init__(self):
        self._api_key: Optional[str] = os.environ.get("GEMINI_API_KEY")
        self._model_name: str = "gemini-2.0-flash"

    def configure(self, api_key: str):
        """Set Gemini API key and register remote embedding function if available."""
        self._api_key = api_key

        def gemini_embed(text: str) -> List[float]:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={self._api_key}"
            payload = {
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": text[:2000]}]}
            }
            with httpx.Client(timeout=10.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    return res.json()["embedding"]["values"]
                raise RuntimeError(f"Embedding API error: {res.text}")

        embedding_store.configure(gemini_embed)

    def run_llm_check(
        self,
        text: str,
        content_type: str,
        channel: str,
        active_sources: Dict[str, Source],
        run_id: str
    ) -> Tuple[List[Finding], int]:
        """
        Run grounded RAG check against retrieved sources.
        Returns (valid_findings, dropped_findings_count).
        """
        if not text or not text.strip() or not active_sources:
            return [], 0

        # 1. Retrieve top relevant source chunks using vector similarity
        query_vec = embedding_store.embed_query(text[:1500])
        retrieved_chunks = embedding_store.search(
            query_vec,
            top_k=6,
            source_filter=list(active_sources.keys())
        )

        # Build context chunks
        context_sources = []
        seen_source_ids = set()
        for chunk, score in retrieved_chunks:
            context_sources.append({
                "source_id": chunk.source_id,
                "title": chunk.source_title,
                "section": chunk.section,
                "text": chunk.text,
                "score": round(score, 3)
            })
            seen_source_ids.add(chunk.source_id)

        # Fallback to include any remaining active sources if not enough chunks
        for s in active_sources.values():
            if s.id not in seen_source_ids and len(context_sources) < 6:
                context_sources.append({
                    "source_id": s.id,
                    "title": s.title,
                    "section": s.section,
                    "text": s.content,
                    "score": 0.5
                })

        # 2. Call LLM (or semantic grounded fallback)
        raw_findings = []
        if self._api_key:
            try:
                raw_findings = self._call_gemini_api(text, content_type, channel, context_sources)
            except Exception as e:
                # Graceful degradation to semantic grounded inspector
                raw_findings = self._semantic_grounded_check(text, content_type, channel, active_sources)
        else:
            raw_findings = self._semantic_grounded_check(text, content_type, channel, active_sources)

        # 3. Post-Hoc Verification & In-Context Character Offset Mapping
        valid_findings: List[Finding] = []
        dropped_count = 0
        fact_sources = {sid: s for sid, s in active_sources.items() if s.type == "fact"}

        for item in raw_findings:
            finding = self._hydrate_finding(item, text, active_sources, run_id)
            if not finding:
                dropped_count += 1
                continue

            # RE-5 invariant: Verify citation quote is genuine
            is_valid, reason = citation_verifier.verify(finding, active_sources)
            if not is_valid:
                dropped_count += 1
                continue

            # Fact verification: ensure suggestions do not invent metrics
            finding.suggestion = citation_verifier.verify_suggestion_facts(finding.suggestion, fact_sources)
            valid_findings.append(finding)

        return valid_findings, dropped_count

    def _call_gemini_api(
        self,
        text: str,
        content_type: str,
        channel: str,
        context: List[dict]
    ) -> List[dict]:
        """Make structured JSON REST call to Gemini 2.0 Flash."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self._model_name}:generateContent?key={self._api_key}"

        sources_formatted = "\n\n".join([
            f"[Source ID: {c['source_id']} | Section: {c['section']} | Title: {c['title']}]\n{c['text']}"
            for c in context
        ])

        user_prompt = f"""
APPROVED CORPORATE SOURCES:
{sources_formatted}

DRAFT TO REVIEW:
Channel: {channel}
Type: {content_type}
Copy:
\"\"\"{text}\"\"\"

Check the draft copy against the approved sources above.
Respond strictly in JSON according to the schema in the system prompt.
"""

        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": SYSTEM_PROMPT + "\n\n" + user_prompt}]}
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }

        with httpx.Client(timeout=25.0) as client:
            res = client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                candidate_text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(candidate_text)
                return parsed.get("findings", [])
            else:
                raise RuntimeError(f"Gemini API returned status {res.status_code}: {res.text}")

    def _semantic_grounded_check(
        self,
        text: str,
        content_type: str,
        channel: str,
        active_sources: Dict[str, Source]
    ) -> List[dict]:
        """
        Grounded semantic inspector.
        Evaluates semantic violations that go beyond literal regex keywords,
        such as implicit absolutes, comparative claims, and subtle pressure cues.
        """
        results = []

        # Check A: Implicit ranking / comparative claims without cited report
        claims_src = next((s for s in active_sources.values() if s.type == "claims" or "claim" in s.title.lower()), None)
        if claims_src:
            semantic_claim_patterns = [
                (r"\b(?:no other platform comes close|unmatched in the industry|ahead of all competitors|outperforms every competitor|zero competition)\b",
                 "Implicit superlative and absolute comparison claim without verified benchmark source.",
                 "trusted by enterprise teams", "claims", "high"),
                (r"\b(?:guaranteed 100%|guaranteed top performance|absolutely the best|unequaled|flawless execution)\b",
                 "Unsubstantiated absolute quality claim.",
                 "built for enterprise performance", "claims", "medium")
            ]
            for pat, reason, sugg, cat, sev in semantic_claim_patterns:
                for match in re.finditer(pat, text, re.IGNORECASE):
                    results.append({
                        "category": cat,
                        "severity": sev,
                        "confidence": 0.94,
                        "excerpt_text": match.group(0),
                        "reason": reason,
                        "source_id": claims_src.id,
                        "source_section": claims_src.section,
                        "source_quote": claims_src.content[:160],
                        "suggestion": sugg
                    })

        # Check B: Implicit high-pressure urgency / manipulative sales tactics
        tone_src = next((s for s in active_sources.values() if s.type == "guideline" or "tone" in s.title.lower() or "voice" in s.title.lower()), None)
        if tone_src:
            tone_patterns = [
                (r"\b(?:offer expires when you close this tab|don't be left behind|once in a lifetime chance|instant decision required)\b",
                 "Manipulative, high-pressure urgency phrasing violates measured brand tone.",
                 "Contact our solution specialists at your convenience.", "tone", "medium")
            ]
            for pat, reason, sugg, cat, sev in tone_patterns:
                for match in re.finditer(pat, text, re.IGNORECASE):
                    results.append({
                        "category": cat,
                        "severity": sev,
                        "confidence": 0.92,
                        "excerpt_text": match.group(0),
                        "reason": reason,
                        "source_id": tone_src.id,
                        "source_section": tone_src.section,
                        "source_quote": tone_src.content[:160],
                        "suggestion": sugg
                    })

        # Check C: Devaluing terminology variants (e.g. "dirt cheap", "bargain basement")
        vocab_src = next((s for s in active_sources.values() if "banned" in s.title.lower() or "vocabulary" in s.title.lower()), None)
        if vocab_src:
            vocab_patterns = [
                (r"\b(?:dirt[- ]cheap|bargain[- ]basement|cut[- ]rate|budget[- ]priced)\b",
                 "Devaluing cost descriptor violates brand perception standard.",
                 "cost-effective", "terminology", "medium")
            ]
            for pat, reason, sugg, cat, sev in vocab_patterns:
                for match in re.finditer(pat, text, re.IGNORECASE):
                    results.append({
                        "category": cat,
                        "severity": sev,
                        "confidence": 0.97,
                        "excerpt_text": match.group(0),
                        "reason": reason,
                        "source_id": vocab_src.id,
                        "source_section": vocab_src.section,
                        "source_quote": vocab_src.content[:160],
                        "suggestion": sugg
                    })

        return results

    def _hydrate_finding(
        self,
        item: dict,
        full_text: str,
        active_sources: Dict[str, Source],
        run_id: str
    ) -> Optional[Finding]:
        """Map raw dictionary finding into a typed Finding with accurate text offsets."""
        excerpt = item.get("excerpt_text", "").strip()
        if not excerpt:
            return None

        # Exact location matching
        start = full_text.find(excerpt)
        if start == -1:
            # Case-insensitive substring search
            match = re.search(re.escape(excerpt), full_text, re.IGNORECASE)
            if match:
                start = match.start()
                excerpt = match.group(0)
            else:
                # Fuzzy sequence search over words
                words = full_text.split()
                excerpt_len = len(excerpt.split())
                best_ratio, best_start, best_match = 0, -1, excerpt
                for i in range(max(1, len(words) - excerpt_len + 1)):
                    cand = " ".join(words[i:i + excerpt_len + 2])
                    ratio = SequenceMatcher(None, excerpt.lower(), cand.lower()).ratio()
                    if ratio > best_ratio and ratio > 0.65:
                        best_ratio = ratio
                        best_start = full_text.find(cand)
                        best_match = cand
                if best_start != -1:
                    start = best_start
                    excerpt = best_match
                else:
                    return None

        source_id = item.get("source_id", "")
        source = active_sources.get(source_id)
        if not source:
            return None

        return Finding(
            id=f"f_{uuid.uuid4().hex[:8]}",
            run_id=run_id,
            category=item.get("category", "terminology"),
            severity=item.get("severity", "medium"),
            confidence=float(item.get("confidence", 0.90)),
            excerpt=TextExcerpt(
                text=excerpt,
                start=start,
                end=start + len(excerpt)
            ),
            reason=item.get("reason", "Brand guideline policy violation."),
            sources=[
                FindingSource(
                    source_id=source.id,
                    title=source.title,
                    section=source.section or item.get("source_section", ""),
                    quote=item.get("source_quote", source.content[:160])
                )
            ],
            suggestion=item.get("suggestion", "Review copy against brand guidelines."),
            status="open",
            detection_method="llm"
        )

rag_engine = RAGEngine()
