"""
Context-Aware Severity Tuner for BrandLens.
Adjusts finding severities based on approved feedback adjustments,
while maintaining a 5% exploration rate to prevent feedback collapse.
"""
import random
from typing import List
from backend.models import Finding
from backend.feedback_loop import feedback_loop

class SeverityTuner:
    EXPLORATION_RATE = 0.05  # 5% exploration to avoid feedback collapse

    def adjust(
        self,
        findings: List[Finding],
        content_type: str = "web",
        channel: str = ""
    ) -> List[Finding]:
        """Apply approved contextual severity adjustments to findings."""
        active_adjustments = feedback_loop.get_active_adjustments()
        if not active_adjustments:
            return findings

        for finding in findings:
            if not finding.sources:
                continue

            primary_src_id = finding.sources[0].source_id
            # Find matching approved adjustment for this source and context
            adj = next(
                (a for a in active_adjustments
                 if a.source_id == primary_src_id
                 and (a.content_type is None or a.content_type == content_type)
                 and finding.severity == a.original_severity),
                None
            )

            if adj:
                # 5% Exploration sampling: maintain original severity to verify override pattern persists
                if random.random() < self.EXPLORATION_RATE:
                    finding.reason += " [Sampled at baseline severity for calibration verification]"
                else:
                    finding.severity = adj.adjusted_severity

        return findings

severity_tuner = SeverityTuner()
