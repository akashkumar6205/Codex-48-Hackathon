"""
Visual Brand Compliance Engine for BrandLens.
Performs perceptual visual analysis: WCAG 2.1 AA contrast ratio validation,
brand palette adherence, aspect ratio checks, alt-text requirement,
and embedded copy governance.
"""
import os
import re
import uuid
import numpy as np
from typing import List, Dict, Optional, Tuple
from backend.models import Finding, FindingSource, TextExcerpt, Source
from backend.contrast_checker import contrast_checker

class VisualAnalyzer:
    def __init__(self):
        pass

    def analyze_image(
        self,
        image_path: str,
        ocr_text: str = "",
        active_sources: Dict[str, Source] = None,
        run_id: str = ""
    ) -> List[Finding]:
        """
        Analyze an uploaded image asset against active brand & accessibility rules.
        """
        findings: List[Finding] = []
        if not active_sources:
            return findings

        if not run_id:
            run_id = f"run_{uuid.uuid4().hex[:8]}"

        acc_source = next(
            (s for s in active_sources.values() if s.id == "accessibility-01" or s.type == "asset-rule" or "accessibility" in s.title.lower()),
            None
        )
        asset_rules = [s for s in active_sources.values() if s.type == "asset-rule" or "asset" in s.title.lower()]
        primary_asset_rule = asset_rules[0] if asset_rules else acc_source

        # Load image pixels and dimensions
        pixels, (width, height) = (None, (0, 0))
        if image_path and os.path.exists(image_path):
            pixels, (width, height) = contrast_checker.load_image_pixels(image_path)

        filename = os.path.basename(image_path) if image_path else "Visual Asset"

        # ── 1. WCAG 2.1 AA DIGITAL ACCESSIBILITY & ALT-TEXT CHECK ──
        if acc_source:
            alt_sample = (ocr_text[:50] if ocr_text and ocr_text.strip() and not ocr_text.startswith("Visual Asset:") else filename).strip()
            findings.append(Finding(
                id=f"f_{uuid.uuid4().hex[:8]}",
                run_id=run_id,
                category="accessibility",
                severity="medium",
                confidence=0.96,
                excerpt=TextExcerpt(
                    text=alt_sample,
                    start=0,
                    end=len(alt_sample)
                ),
                reason="Visual assets require verified alternative text (alt-text) and WCAG 2.1 AA digital accessibility compliance.",
                sources=[
                    FindingSource(
                        source_id=acc_source.id,
                        title=acc_source.title,
                        section=acc_source.section,
                        quote=acc_source.content[:160] + ("..." if len(acc_source.content) > 160 else "")
                    )
                ],
                suggestion="Provide descriptive alternative text (alt-text) describing the graphic purpose and confirming high contrast readability.",
                status="open",
                detection_method="visual"
            ))

        # ── 2. PIXEL-LEVEL WCAG CONTRAST EVALUATION ──
        if pixels is not None and acc_source:
            dominant_colors = contrast_checker.extract_dominant_colors(pixels, max_colors=4)
            # Evaluate pairwise contrast between the two most dominant non-identical colors
            if len(dominant_colors) >= 2:
                c1, c2 = dominant_colors[0], dominant_colors[1]
                ratio = contrast_checker.contrast_ratio(c1, c2)
                c1_hex = "#{:02x}{:02x}{:02x}".format(*c1)
                c2_hex = "#{:02x}{:02x}{:02x}".format(*c2)

                # Flag if contrast ratio is below WCAG AA minimum threshold (4.5:1)
                if ratio < contrast_checker.AA_NORMAL_TEXT and ratio > 1.1:
                    is_severe = ratio < contrast_checker.AA_LARGE_TEXT
                    findings.append(Finding(
                        id=f"f_{uuid.uuid4().hex[:8]}",
                        run_id=run_id,
                        category="accessibility",
                        severity="high" if is_severe else "medium",
                        confidence=0.94,
                        excerpt=TextExcerpt(
                            text=f"Dominant palette {c1_hex} on {c2_hex} (Ratio {ratio:.2f}:1)",
                            start=0,
                            end=len(f"Dominant palette {c1_hex} on {c2_hex}")
                        ),
                        reason=f"Measured contrast ratio of {ratio:.2f}:1 between {c1_hex} and {c2_hex} fails WCAG 2.1 AA standard (minimum {contrast_checker.AA_NORMAL_TEXT}:1 required for standard text).",
                        sources=[
                            FindingSource(
                                source_id=acc_source.id,
                                title=acc_source.title,
                                section=acc_source.section,
                                quote=acc_source.content[:160]
                            )
                        ],
                        suggestion=f"Increase contrast between foreground elements and background to reach at least 4.5:1 ratio (currently {ratio:.2f}:1).",
                        status="open",
                        detection_method="visual"
                    ))

        # ── 3. BRAND PALETTE ADHERENCE CHECK ──
        if pixels is not None and primary_asset_rule:
            brand_palette = self._extract_palette_from_sources(active_sources)
            if brand_palette:
                off_palette = contrast_checker.check_palette_compliance(pixels, brand_palette, max_distance=65.0)
                for violation in off_palette[:2]:  # Limit to top 2 to avoid alert fatigue
                    findings.append(Finding(
                        id=f"f_{uuid.uuid4().hex[:8]}",
                        run_id=run_id,
                        category="visual",
                        severity="medium",
                        confidence=0.88,
                        excerpt=TextExcerpt(
                            text=f"Off-brand color {violation['hex']}",
                            start=0,
                            end=len(f"Off-brand color {violation['hex']}")
                        ),
                        reason=f"Measured color {violation['hex']} deviates significantly from approved corporate palette.",
                        sources=[
                            FindingSource(
                                source_id=primary_asset_rule.id,
                                title=primary_asset_rule.title,
                                section=primary_asset_rule.section,
                                quote=primary_asset_rule.content[:160]
                            )
                        ],
                        suggestion="Replace non-standard color tints with approved brand palette hex values.",
                        status="open",
                        detection_method="visual"
                    ))

        # ── 4. ASPECT RATIO & RESOLUTION INTEGRITY CHECK ──
        if width > 0 and height > 0 and primary_asset_rule:
            aspect = width / height
            if aspect > 4.5 or aspect < 0.22:
                findings.append(Finding(
                    id=f"f_{uuid.uuid4().hex[:8]}",
                    run_id=run_id,
                    category="visual",
                    severity="medium",
                    confidence=0.91,
                    excerpt=TextExcerpt(
                        text=f"Asset dimensions {width}x{height} (Aspect {aspect:.2f})",
                        start=0,
                        end=len(f"Asset dimensions {width}x{height}")
                    ),
                    reason=f"Extreme aspect ratio ({aspect:.2f}:1) risks logo distortion or awkward layout scaling across publishing channels.",
                    sources=[
                        FindingSource(
                            source_id=primary_asset_rule.id,
                            title=primary_asset_rule.title,
                            section=primary_asset_rule.section,
                            quote=primary_asset_rule.content[:160]
                        )
                    ],
                    suggestion="Standardize graphic dimensions to standard channel aspect ratios (16:9, 1:1, or 4:5) to prevent stretching.",
                    status="open",
                    detection_method="visual"
                ))

        return findings

    def _extract_palette_from_sources(self, sources: Dict[str, Source]) -> List[Tuple[int, int, int]]:
        """Extract brand color hex codes defined across active guideline sources."""
        palette = []
        for src in sources.values():
            hexes = re.findall(r'#([0-9a-fA-F]{6})\b', src.content)
            for h in hexes:
                r, g, b = int(h[:2], 16), int(h[2:4], 16), int(h[4:], 16)
                if (r, g, b) not in palette:
                    palette.append((r, g, b))

        # Default fallback brand palette if no hex codes in knowledge base
        if not palette:
            # Corporate blue #2970FF, dark ground #0C0E12, white #FFFFFF
            palette = [(41, 112, 255), (12, 14, 18), (240, 242, 246)]
        return palette

visual_analyzer = VisualAnalyzer()
