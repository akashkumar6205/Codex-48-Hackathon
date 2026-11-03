/**
 * BrandLens Client-Side Rule & Semantic Review Engine
 * Runs deterministic rule and policy checks in the browser when offline or directly with Firebase Firestore.
 */

export function runClientReview(text, contentType = "web", channel = "Global Website", sources = []) {
  const findings = [];
  if (!text || !text.trim()) return findings;

  const activeSources = (sources || []).filter((s) => s.status === "active");
  const sourceMap = {};
  activeSources.forEach((s) => {
    sourceMap[s.id] = s;
  });

  // 1. Terminology & Rebranding Check (CloudSync -> OmniFlow)
  const cloudSyncRegex = /\bCloudSync\b/gi;
  let match;
  while ((match = cloudSyncRegex.exec(text)) !== null) {
    const src = sourceMap["glossary-prod-01"] || activeSources.find((s) => s.type === "glossary") || {
      id: "glossary-prod-01",
      section: "2.1",
      title: "Product Naming Guidelines",
    };
    findings.push({
      id: "f_" + Math.random().toString(36).substring(2, 10),
      run_id: "run_client_" + Date.now(),
      category: "terminology",
      severity: "high",
      confidence: 0.98,
      excerpt: {
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
      },
      reason: "Deprecated legacy brand name. 'CloudSync' was formally rebranded to 'OmniFlow'.",
      suggestion: "OmniFlow",
      sources: [
        {
          source_id: src.id,
          section: src.section || "2.1",
          title: src.title || "Product Naming Guidelines",
          quote: "Our enterprise collaboration suite was formally rebranded from 'CloudSync' to 'OmniFlow'. Use of 'CloudSync' is deprecated.",
        },
      ],
      status: "open",
    });
  }

  // 2. Banned Value Vocabulary Check ('cheap' -> 'cost-effective')
  const cheapRegex = /\bcheap\b/gi;
  while ((match = cheapRegex.exec(text)) !== null) {
    const src = sourceMap["glossary-banned-01"] || activeSources.find((s) => s.tags?.includes("pricing") || s.tags?.includes("banned-words")) || {
      id: "glossary-banned-01",
      section: "4.5",
      title: "Banned Value Vocabulary",
    };
    findings.push({
      id: "f_" + Math.random().toString(36).substring(2, 10),
      run_id: "run_client_" + Date.now(),
      category: "terminology",
      severity: "medium",
      confidence: 0.95,
      excerpt: {
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
      },
      reason: "The word 'cheap' diminishes brand value and is banned per pricing communication standards.",
      suggestion: "cost-effective",
      sources: [
        {
          source_id: src.id,
          section: src.section || "4.5",
          title: src.title || "Banned Value Vocabulary",
          quote: "The word 'cheap' must not be used to describe our products, tiers, or pricing. Approved alternative terminology includes 'cost-effective'.",
        },
      ],
      status: "open",
    });
  }

  // 3. Unverifiable Claims & Superlatives Policy Check ('#1 in the market', 'best-in-class', etc.)
  const superlatives = [
    { regex: /#1\s+in\s+the\s+market|#1\s+cloud\s+platform|#1\s+platform/gi, quote: "Ranking claims require a verifiable, cited third-party report published within the past 12 months." },
    { regex: /\b(best-in-class|industry-leading|unmatched|guaranteed\s+fastest)\b/gi, quote: "Superlative claims require published independent benchmark citations." },
  ];

  for (const item of superlatives) {
    while ((match = item.regex.exec(text)) !== null) {
      const src = sourceMap["claims-policy-01"] || activeSources.find((s) => s.type === "claims") || {
        id: "claims-policy-01",
        section: "3.2",
        title: "Commercial Claims Policy",
      };
      findings.push({
        id: "f_" + Math.random().toString(36).substring(2, 10),
        run_id: "run_client_" + Date.now(),
        category: "claims",
        severity: "high",
        confidence: 0.94,
        excerpt: {
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
        },
        reason: `Unsubstantiated superlative claim. Commercial claims policy requires cited third-party audit reports.`,
        suggestion: match[0].toLowerCase().includes("#1") ? "a recognized leading cloud platform" : "high-performance",
        sources: [
          {
            source_id: src.id,
            section: src.section || "3.2",
            title: src.title || "Commercial Claims Policy",
            quote: item.quote,
          },
        ],
        status: "open",
      });
    }
  }

  // 4. Tone & Urgent Phrasing Check ('Act now!', 'Hurry up!', '!!!')
  const toneUrgency = /\b(act\s+now|hurry\s+up|limited\s+time\s+only|don't\s+wait)\b|!{2,}/gi;
  while ((match = toneUrgency.exec(text)) !== null) {
    const src = sourceMap["tone-voice-01"] || activeSources.find((s) => s.type === "guideline") || {
      id: "tone-voice-01",
      section: "1.4",
      title: "Brand Voice Standard",
    };
    findings.push({
      id: "f_" + Math.random().toString(36).substring(2, 10),
      run_id: "run_client_" + Date.now(),
      category: "tone",
      severity: "medium",
      confidence: 0.91,
      excerpt: {
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
      },
      reason: "Aggressive sales urgency violates the confident and measured brand tone standard.",
      suggestion: "Discover the possibilities",
      sources: [
        {
          source_id: src.id,
          section: src.section || "1.4",
          title: src.title || "Brand Voice Standard",
          quote: "Our brand tone is confident, measured, and empathetic. We strictly avoid high-pressure urgency cues.",
        },
      ],
      status: "open",
    });
  }

  return findings;
}
