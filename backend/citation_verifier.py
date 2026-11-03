"""
Post-hoc citation verification for LLM-generated findings.
Enforces PRD RE-5: every finding must cite a real, active source
with a quote that actually appears in that source.
Also enforces factual grounding on suggestions against approved fact sources.
"""
import re
from difflib import SequenceMatcher
from typing import Dict, Tuple
from backend.models import Finding, Source

class CitationVerifier:

    def verify(
        self,
        finding: Finding,
        active_sources: Dict[str, Source]
    ) -> Tuple[bool, str]:
        """
        Validate that a finding's citation is real and accurate.
        Returns (is_valid, rejection_reason).
        """
        if not finding.sources:
            return False, "No source citation provided (violates PRD RE-5)"

        for cited in finding.sources:
            # 1. Source must exist and be active
            source = active_sources.get(cited.source_id)
            if not source:
                return False, f"Cited source '{cited.source_id}' not found in active knowledge base"

            # 2. Quoted text must appear in source content
            if not cited.quote or not cited.quote.strip():
                return False, "Empty quote in source citation"

            quote_clean = cited.quote.lower().strip()
            source_clean = source.content.lower().strip()

            # Exact substring check
            if quote_clean in source_clean:
                continue

            # Sub-phrase match (in case quote is truncated or ellipsis used)
            sub_phrases = [p.strip() for p in re.split(r'\.\.\.+|,|;', quote_clean) if len(p.strip()) > 15]
            if sub_phrases and any(p in source_clean for p in sub_phrases):
                continue

            # SequenceMatcher ratio
            ratio = SequenceMatcher(None, quote_clean, source_clean).ratio()
            # Also test against sliding windows of source
            window_size = len(quote_clean)
            words = source_clean.split()
            quote_word_count = len(quote_clean.split())
            best_window_ratio = 0.0
            for i in range(max(1, len(words) - quote_word_count + 1)):
                cand = " ".join(words[i:i + quote_word_count + 3])
                cand_ratio = SequenceMatcher(None, quote_clean, cand).ratio()
                if cand_ratio > best_window_ratio:
                    best_window_ratio = cand_ratio

            if best_window_ratio < 0.65 and ratio < 0.65:
                return False, f"Quoted text does not match source '{source.title}' (similarity {max(best_window_ratio, ratio):.1%})"

        return True, "Valid"

    def verify_suggestion_facts(
        self,
        suggestion: str,
        approved_facts: Dict[str, Source]
    ) -> str:
        """
        Ensure suggested text doesn't invent unapproved numbers or facts.
        Replaces unverified statistics with a verification requirement prompt.
        """
        if not suggestion:
            return suggestion

        numbers = re.findall(r'\b\d+(?:[\.,]\d+)?%?\b', suggestion)
        if not numbers:
            return suggestion

        approved_numbers = set()
        for src in approved_facts.values():
            for num in re.findall(r'\b\d+(?:[\.,]\d+)?%?\b', src.content):
                approved_numbers.add(num)

        sanitized = suggestion
        for num in numbers:
            # If the number is not in approved facts and is greater than 1 digit (not just "1" or small index)
            if num not in approved_numbers and len(num) > 1:
                sanitized = sanitized.replace(num, "[verified metric required]")

        return sanitized

citation_verifier = CitationVerifier()
