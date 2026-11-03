"""
Closed-Loop Learning Engine for BrandLens.
Collects and learns from human decisions (accept, edit, dispute, override).
Detects ambiguous rules, context-dependent false-positive clusters,
and generates explainable severity adjustments and guideline rewrite suggestions.
"""
import time
import uuid
from collections import defaultdict
from typing import List, Dict, Optional, Tuple
from backend.models import (
    FindingDecisionRecord, SeverityAdjustment, GuidelineRewriteSuggestion,
    Source, FindingCategory, FindingSeverity
)

class FeedbackLoop:
    def __init__(self):
        self.decision_records: List[FindingDecisionRecord] = []
        self.adjustments: List[SeverityAdjustment] = []
        self.rewrite_suggestions: List[GuidelineRewriteSuggestion] = []
        self._init_starter_learning_data()

    def record_decision(
        self,
        finding_id: str,
        source_id: str,
        category: FindingCategory,
        original_severity: FindingSeverity,
        content_type: str,
        channel: str,
        action: str,
        reason: Optional[str] = None
    ) -> FindingDecisionRecord:
        """Log a human decision on a finding to feed the learning model."""
        record = FindingDecisionRecord(
            finding_id=finding_id,
            source_id=source_id,
            category=category,
            original_severity=original_severity,
            content_type=content_type,
            channel=channel,
            action=action,
            reason=reason or ""
        )
        self.decision_records.append(record)
        self._analyze_context(source_id, content_type, channel)
        return record

    def _analyze_context(self, source_id: str, content_type: str, channel: str):
        """
        Evaluate if sufficient decisions indicate a pattern requiring
        a severity adjustment or guideline clarification.
        """
        records = [
            d for d in self.decision_records
            if d.source_id == source_id and d.content_type == content_type
        ]

        # Minimum sample threshold for dynamic proposal
        MIN_DECISIONS = 2

        if len(records) < MIN_DECISIONS:
            return

        negative = [d for d in records if d.action in ("overridden", "disputed")]
        negative_rate = len(negative) / len(records)
        reasons = [d.reason for d in negative if d.reason]

        # If override rate >= 40%, propose a severity adjustment
        if negative_rate >= 0.4:
            existing = next(
                (a for a in self.adjustments if a.source_id == source_id and a.content_type == content_type),
                None
            )
            top_reasons = self._cluster_reasons(reasons)
            original_sev = records[0].original_severity
            adjusted_sev: FindingSeverity = "medium" if original_sev == "high" else "low"

            if existing:
                existing.evidence_count = len(records)
                existing.override_rate_pct = round(negative_rate * 100, 1)
                existing.top_reasons = top_reasons
            else:
                adj = SeverityAdjustment(
                    source_id=source_id,
                    source_section="",
                    content_type=content_type,
                    channel=channel,
                    original_severity=original_sev,
                    adjusted_severity=adjusted_sev,
                    evidence_count=len(records),
                    override_rate_pct=round(negative_rate * 100, 1),
                    top_reasons=top_reasons,
                    status="proposed"
                )
                self.adjustments.append(adj)

    def generate_rewrite_suggestion(self, source: Source, adjustment: SeverityAdjustment) -> GuidelineRewriteSuggestion:
        """
        Synthesize human override rationales into a proposed guideline amendment.
        """
        top_reason = adjustment.top_reasons[0] if adjustment.top_reasons else "standard industry usage"
        channel_desc = f"{adjustment.content_type} / {adjustment.channel or 'general communications'}"

        evidence = (
            f"Based on {adjustment.evidence_count} reviewer decisions: "
            f"{adjustment.override_rate_pct}% dispute/override rate in {channel_desc}. "
            f"Common reviewer justification: '{top_reason}'."
        )

        suggested = (
            f"{source.content}\n\n"
            f"[Guideline Amendment - Contextual Exception]:\n"
            f"For {channel_desc}, terminology may be accepted at {adjustment.adjusted_severity} severity "
            f"when justified by: {top_reason}."
        )

        suggestion = GuidelineRewriteSuggestion(
            source_id=source.id,
            source_title=source.title,
            current_content=source.content,
            suggested_content=suggested,
            rationale=f"High override rate ({adjustment.override_rate_pct}%) indicates ambiguity for {adjustment.content_type} content.",
            evidence_summary=evidence,
            status="proposed"
        )
        self.rewrite_suggestions.append(suggestion)
        return suggestion

    def get_active_adjustments(self) -> List[SeverityAdjustment]:
        """Return adjustments approved by a Brand Manager or Admin."""
        return [a for a in self.adjustments if a.status == "approved"]

    def get_pending_adjustments(self) -> List[SeverityAdjustment]:
        """Return adjustments proposed by the learning loop awaiting human review."""
        return [a for a in self.adjustments if a.status == "proposed"]

    def approve_adjustment(self, adj_id: str, approver_id: str = "usr_brand_mgr") -> Optional[SeverityAdjustment]:
        """Brand Manager approves a proposed severity adjustment."""
        adj = next((a for a in self.adjustments if a.id == adj_id), None)
        if adj:
            adj.status = "approved"
            adj.approved_by = approver_id
        return adj

    def reject_adjustment(self, adj_id: str) -> Optional[SeverityAdjustment]:
        """Brand Manager rejects a proposed severity adjustment."""
        adj = next((a for a in self.adjustments if a.id == adj_id), None)
        if adj:
            adj.status = "rejected"
        return adj

    def _cluster_reasons(self, reasons: List[str]) -> List[str]:
        """Cluster and clean textual override explanations."""
        if not reasons:
            return ["Reviewer business justification provided"]
        unique_reasons = []
        for r in reasons:
            clean = r.strip()
            if clean and not any(clean.lower() in existing.lower() for existing in unique_reasons):
                unique_reasons.append(clean)
        return unique_reasons[:4]

    def _init_starter_learning_data(self):
        """Seed realistic historical decision data for commercial demonstration."""
        demo_records = [
            ("claims-policy-01", "claims", "high", "press", "Press Release", "overridden",
             "Standard press release benchmark citation accepted by corporate PR lead."),
            ("claims-policy-01", "claims", "high", "press", "Press Release", "overridden",
             "Third-party analyst report available upon request in media kit."),
            ("claims-policy-01", "claims", "high", "press", "Press Release", "disputed",
             "Executive briefing allows verified industry positioning terms."),
            ("glossary-banned-01", "terminology", "medium", "social", "Social Media", "accepted",
             "Replaced with cost-effective per brand voice guideline."),
        ]
        for src_id, cat, sev, ctype, ch, act, rsn in demo_records:
            self.decision_records.append(FindingDecisionRecord(
                finding_id=f"f_demo_{uuid.uuid4().hex[:6]}",
                source_id=src_id,
                category=cat,
                original_severity=sev,
                content_type=ctype,
                channel=ch,
                action=act,
                reason=rsn
            ))

        # Seed proposed severity adjustment for Section 3.2 in press releases
        self.adjustments.append(SeverityAdjustment(
            id="adj_claims_press_01",
            source_id="claims-policy-01",
            source_section="3.2",
            content_type="press",
            channel="Press Release",
            original_severity="high",
            adjusted_severity="medium",
            evidence_count=3,
            override_rate_pct=100.0,
            top_reasons=[
                "Standard press release benchmark citation accepted by corporate PR lead.",
                "Third-party analyst report available upon request in media kit."
            ],
            status="proposed"
        ))

        # Seed an amendment rewrite suggestion
        self.rewrite_suggestions.append(GuidelineRewriteSuggestion(
            id="grs_claims_01",
            source_id="claims-policy-01",
            source_title="Commercial Claims & Superlatives Policy",
            current_content="Ranking and superlative claims require a verifiable, cited third-party report published within the past 12 months.",
            suggested_content=(
                "Ranking and superlative claims require a verifiable, cited third-party report published within the past 12 months.\n\n"
                "[Contextual Exception for Press Releases]: In media releases and analyst kits, comparative positioning is permitted at medium severity "
                "provided third-party report citations are filed in the digital press kit."
            ),
            rationale="100% override rate in press releases indicates authors and reviewers require a documented exception for media statements.",
            evidence_summary="Based on 3 PR lead overrides citing media kit third-party report availability.",
            status="proposed"
        ))

feedback_loop = FeedbackLoop()
