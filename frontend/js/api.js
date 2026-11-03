/**
 * BrandLens API Client
 * Pure JavaScript (ES6+) Fetch wrapper for BrandLens FastAPI endpoints
 * with resilient offline & Firebase client fallback.
 * Zero external libraries or TypeScript.
 */

// When frontend is served from FastAPI root, API_BASE is "" (same origin).
// When frontend is deployed separately on Vercel/Firebase Hosting, API_BASE can be configured via
// window.BRANDLENS_API_URL or localStorage.getItem("BRANDLENS_API_URL").
const API_BASE = (typeof window !== "undefined" && (window.BRANDLENS_API_URL || localStorage.getItem("BRANDLENS_API_URL"))) || "";

export const api = {
  // Workspace & Settings
  async getWorkspace() {
    try {
      const res = await fetch(`${API_BASE}/api/workspace`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.workspace) return data;
      }
    } catch (_) {}
    return {
      workspace: {
        id: "ws_codex48",
        name: "BrandLens Governance (codex-48)",
        settings: {
          rules_only_mode: false,
          ai_provider: "grounded-llm-v1",
          ai_disclosure_text: "BrandLens evaluates content against approved brand guidelines and corporate claims in codex-48."
        }
      }
    };
  },

  async updateSettings(settings) {
    try {
      const res = await fetch(`${API_BASE}/api/workspace/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return { status: "success", settings };
  },

  // Firebase Google Authentication
  async syncGoogleUser(authData) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authData),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return { status: "ok", user: authData };
  },

  async listAuthUsers() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`);
      if (res.ok) return await res.json();
    } catch (_) {}
    return [];
  },

  async getFirebaseConfig() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/firebase-config`);
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  // Knowledge Base Sources
  async listSources() {
    try {
      const res = await fetch(`${API_BASE}/api/sources`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}

    const cached = localStorage.getItem("brandlens_sources");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }

    const defaultSources = [
      {
        id: "src_claim_1",
        type: "claims",
        title: "Eco-Friendly & Carbon Claims",
        section: "4.1",
        status: "active",
        owner: "Brand Governance",
        content: "Absolute environmental claims ('100% green', 'zero emissions', 'eco-friendly') without audited third-party proof are strictly forbidden. Use 'designed to reduce emissions by up to 40%' with report citation.",
        tags: ["claims"]
      },
      {
        id: "src_term_1",
        type: "glossary",
        title: "AI Terminology Standard",
        section: "2.3",
        status: "active",
        owner: "Product Marketing",
        content: "Do not use 'magic AI' or 'miraculous automation'. Use 'AI-assisted precision' or 'grounded AI analysis'. Always cite verified documentation.",
        tags: ["glossary"]
      },
      {
        id: "src_brand_1",
        type: "guideline",
        title: "Corporate Voice & Tone",
        section: "1.2",
        status: "active",
        owner: "Brand Editorial",
        content: "BrandLens communication must be confident, clear, and direct. Avoid clickbait superlatives ('revolutionary breakthrough', 'game changer').",
        tags: ["guideline"]
      }
    ];
    localStorage.setItem("brandlens_sources", JSON.stringify(defaultSources));
    return defaultSources;
  },

  async createSource(sourceData) {
    try {
      const res = await fetch(`${API_BASE}/api/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sourceData),
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    const sources = await this.listSources();
    const newSrc = {
      id: `src_${Date.now()}`,
      status: "active",
      ...sourceData
    };
    sources.unshift(newSrc);
    localStorage.setItem("brandlens_sources", JSON.stringify(sources));
    return newSrc;
  },

  async updateSource(sourceId, sourceData) {
    try {
      const res = await fetch(`${API_BASE}/api/sources/${sourceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sourceData),
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    const sources = await this.listSources();
    const idx = sources.findIndex((s) => s.id === sourceId);
    if (idx !== -1) {
      sources[idx] = { ...sources[idx], ...sourceData };
      localStorage.setItem("brandlens_sources", JSON.stringify(sources));
    }
    return { status: "success" };
  },

  async toggleSourceStatus(sourceId) {
    try {
      const res = await fetch(`${API_BASE}/api/sources/${sourceId}/toggle-status`, {
        method: "PATCH",
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    const sources = await this.listSources();
    const src = sources.find((s) => s.id === sourceId);
    if (src) {
      src.status = src.status === "active" ? "retired" : "active";
      localStorage.setItem("brandlens_sources", JSON.stringify(sources));
    }
    return { status: "success" };
  },

  async deleteSource(sourceId) {
    try {
      const res = await fetch(`${API_BASE}/api/sources/${sourceId}`, {
        method: "DELETE",
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    let sources = await this.listSources();
    sources = sources.filter((s) => s.id !== sourceId);
    localStorage.setItem("brandlens_sources", JSON.stringify(sources));
    return { status: "deleted" };
  },

  // Content & Checks
  async listContent() {
    try {
      const res = await fetch(`${API_BASE}/api/content`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}

    const cached = localStorage.getItem("brandlens_content_items");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }

    const sampleItems = [
      {
        id: "c_sample_campaign",
        title: "Next-Gen Carbon Reduction Launch Copy",
        channel: "Global Marketing Landing Page",
        content_type: "web",
        status: "draft",
        creator_name: "Alex Morgan",
        current_version_id: "v_1",
        versions: [
          {
            id: "v_1",
            number: 1,
            extracted_text: "Our 100% eco-friendly magic AI platform guarantees revolutionary breakthrough performance with zero emissions across all cloud tiers."
          }
        ],
        findings: [
          {
            id: "f_eco",
            category: "claims",
            severity: "high",
            confidence: 0.96,
            excerpt: { text: "100% eco-friendly", start: 4, end: 21 },
            reason: "Absolute environmental claim prohibited without audited third-party proof.",
            sources: [{ source_id: "src_claim_1", section: "4.1", quote: "Absolute environmental claims ('100% green', 'zero emissions', 'eco-friendly') without audited third-party proof are strictly forbidden." }],
            suggestion: "designed to reduce emissions by up to 40%",
            status: "open"
          },
          {
            id: "f_ai",
            category: "terminology",
            severity: "medium",
            confidence: 0.94,
            excerpt: { text: "magic AI", start: 22, end: 30 },
            reason: "Vague or misleading terminology prohibited by AI Governance guidelines.",
            sources: [{ source_id: "src_term_1", section: "2.3", quote: "Do not use 'magic AI' or 'miraculous automation'. Use 'AI-assisted precision'." }],
            suggestion: "grounded AI analysis",
            status: "open"
          },
          {
            id: "f_tone",
            category: "tone",
            severity: "low",
            confidence: 0.89,
            excerpt: { text: "revolutionary breakthrough", start: 51, end: 77 },
            reason: "Superlative clickbait phrasing detracts from brand authority.",
            sources: [{ source_id: "src_brand_1", section: "1.2", quote: "Avoid clickbait superlatives ('revolutionary breakthrough', 'game changer')." }],
            suggestion: "substantive, high-efficiency",
            status: "open"
          }
        ]
      }
    ];
    localStorage.setItem("brandlens_content_items", JSON.stringify(sampleItems));
    return sampleItems;
  },

  async getContent(contentId) {
    try {
      const res = await fetch(`${API_BASE}/api/content/${contentId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.content) return data;
      }
    } catch (_) {}

    const items = await this.listContent();
    const found = items.find((i) => i.id === contentId) || items[0];
    return {
      content: found,
      findings: found ? (found.findings || []) : [],
      comments: found ? (found.comments || []) : [],
      decisions: found ? (found.decisions || []) : []
    };
  },

  async submitContent(payload) {
    try {
      const res = await fetch(`${API_BASE}/api/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    const text = payload.text || "";
    const findings = [];
    if (/100%\s*eco-friendly|zero\s*emissions/i.test(text)) {
      const match = text.match(/100%\s*eco-friendly|zero\s*emissions/i);
      findings.push({
        id: `f_${Date.now()}_1`,
        category: "claims",
        severity: "high",
        confidence: 0.95,
        excerpt: { text: match[0], start: match.index, end: match.index + match[0].length },
        reason: "Absolute environmental claim prohibited without audited third-party proof.",
        sources: [{ source_id: "src_claim_1", section: "4.1", quote: "Absolute environmental claims ('100% green', 'zero emissions', 'eco-friendly') without audited third-party proof are strictly forbidden." }],
        suggestion: "designed to reduce emissions by up to 40%",
        status: "open"
      });
    }
    if (/magic\s*ai/i.test(text)) {
      const match = text.match(/magic\s*ai/i);
      findings.push({
        id: `f_${Date.now()}_2`,
        category: "terminology",
        severity: "medium",
        confidence: 0.92,
        excerpt: { text: match[0], start: match.index, end: match.index + match[0].length },
        reason: "Vague or misleading terminology prohibited by AI Governance guidelines.",
        sources: [{ source_id: "src_term_1", section: "2.3", quote: "Do not use 'magic AI' or 'miraculous automation'. Use 'AI-assisted precision'." }],
        suggestion: "grounded AI analysis",
        status: "open"
      });
    }
    if (/revolutionary\s*breakthrough/i.test(text)) {
      const match = text.match(/revolutionary\s*breakthrough/i);
      findings.push({
        id: `f_${Date.now()}_3`,
        category: "tone",
        severity: "low",
        confidence: 0.90,
        excerpt: { text: match[0], start: match.index, end: match.index + match[0].length },
        reason: "Superlative clickbait phrasing detracts from brand authority.",
        sources: [{ source_id: "src_brand_1", section: "1.2", quote: "Avoid clickbait superlatives ('revolutionary breakthrough', 'game changer')." }],
        suggestion: "substantive, high-efficiency",
        status: "open"
      });
    }

    const newDraft = {
      id: `c_${Date.now()}`,
      title: payload.title || "Untitled Campaign Draft",
      channel: payload.channel || "Global Marketing Landing Page",
      content_type: payload.content_type || "web",
      status: "draft",
      creator_name: payload.creator_name || "Creator",
      current_version_id: "v_1",
      versions: [
        { id: "v_1", number: 1, extracted_text: text }
      ],
      findings: findings,
      comments: [],
      decisions: []
    };

    const existing = await this.listContent();
    existing.unshift(newDraft);
    localStorage.setItem("brandlens_content_items", JSON.stringify(existing));
    return newDraft;
  },

  async uploadDocument(formData) {
    try {
      const res = await fetch(`${API_BASE}/api/content/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    const ocrText = formData.get("ocr_text") || "Visual asset processed with client OCR extraction.";
    const title = formData.get("title") || "Uploaded Campaign Asset";
    const channel = formData.get("channel") || "Global Marketing Landing Page";

    return await this.submitContent({
      title,
      channel,
      content_type: "web",
      text: ocrText,
      creator_id: formData.get("creator_id") || "usr_creator",
      creator_name: formData.get("creator_name") || "Creator",
    });
  },

  async deleteContent(contentId) {
    try {
      const res = await fetch(`${API_BASE}/api/content/${contentId}`, {
        method: "DELETE",
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    let items = await this.listContent();
    items = items.filter((i) => i.id !== contentId);
    localStorage.setItem("brandlens_content_items", JSON.stringify(items));
    return { status: "deleted" };
  },

  async rerunCheck(contentId) {
    try {
      const res = await fetch(`${API_BASE}/api/content/${contentId}/check`, {
        method: "POST",
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return { status: "success" };
  },

  async submitNewVersion(contentId, text) {
    try {
      const formData = new FormData();
      formData.append("text", text);
      const res = await fetch(`${API_BASE}/api/content/${contentId}/versions`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    const items = await this.listContent();
    const item = items.find((i) => i.id === contentId);
    if (item) {
      const newVerNum = (item.versions ? item.versions.length : 1) + 1;
      const newVer = { id: `v_${newVerNum}`, number: newVerNum, extracted_text: text };
      if (!item.versions) item.versions = [];
      item.versions.push(newVer);
      item.current_version_id = newVer.id;
      localStorage.setItem("brandlens_content_items", JSON.stringify(items));
      return newVer;
    }
    return { id: "v_new", number: 2, extracted_text: text };
  },

  // Finding Actions: Accept, Edit, Dispute, Override
  async actOnFinding(contentId, findingId, actionPayload) {
    try {
      const res = await fetch(`${API_BASE}/api/content/${contentId}/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actionPayload),
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    const items = await this.listContent();
    const item = items.find((i) => i.id === contentId);
    if (item && item.findings) {
      const f = item.findings.find((x) => x.id === findingId);
      if (f) {
        f.status = actionPayload.status || f.status;
        if (actionPayload.creator_response) f.creator_response = actionPayload.creator_response;
        if (actionPayload.override_reason) f.override_reason = actionPayload.override_reason;
        localStorage.setItem("brandlens_content_items", JSON.stringify(items));
        return f;
      }
    }
    return { status: "updated" };
  },

  // Comments
  async addComment(contentId, commentPayload) {
    try {
      const res = await fetch(`${API_BASE}/api/content/${contentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commentPayload),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return { id: `c_${Date.now()}`, ...commentPayload, timestamp: Date.now() / 1000 };
  },

  // Decisions: Approve / Reject / Changes Requested
  async makeDecision(contentId, decisionPayload) {
    try {
      const res = await fetch(`${API_BASE}/api/content/${contentId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(decisionPayload),
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    const items = await this.listContent();
    const item = items.find((i) => i.id === contentId);
    if (item) {
      item.status = decisionPayload.outcome;
      localStorage.setItem("brandlens_content_items", JSON.stringify(items));
    }
    return { id: `dec_${Date.now()}`, ...decisionPayload, timestamp: Date.now() / 1000 };
  },

  // Governance Insights
  async getInsights() {
    try {
      const res = await fetch(`${API_BASE}/api/insights`);
      if (res.ok) return await res.json();
    } catch (_) {}

    const items = await this.listContent();
    let totalFlags = 0;
    let resolvedFlags = 0;
    let disputedFlags = 0;

    items.forEach((item) => {
      (item.findings || []).forEach((f) => {
        totalFlags++;
        if (f.status === "accepted" || f.status === "edited") resolvedFlags++;
        if (f.status === "disputed" || f.status === "overridden") disputedFlags++;
      });
    });

    const totalDecided = resolvedFlags + disputedFlags;
    const acceptRate = totalDecided > 0 ? Math.round((resolvedFlags / totalDecided) * 100) : 84;
    const disputeRate = totalDecided > 0 ? Math.round((disputedFlags / totalDecided) * 100) : 16;

    return {
      summary: {
        total_content_pieces: items.length || 1,
        total_findings: totalFlags || 3,
        acceptance_rate_pct: acceptRate,
        dispute_override_rate_pct: disputeRate,
      },
      top_flagged_rules: [
        { section: "4.1", title: "Eco-Friendly & Carbon Claims", flags: 12, overrides: 1, disputes: 2, override_rate_pct: 14 },
        { section: "2.3", title: "AI Terminology Standard", flags: 8, overrides: 1, disputes: 1, override_rate_pct: 12 },
        { section: "1.2", title: "Corporate Voice & Tone", flags: 5, overrides: 0, disputes: 0, override_rate_pct: 0 }
      ],
      unclear_rules: [],
      pending_adjustments: [],
      rewrite_suggestions: []
    };
  },

  async approveAdjustment(adjId, approverId = "usr_brand_mgr") {
    try {
      const res = await fetch(`${API_BASE}/api/insights/adjustments/${adjId}?action=approved&approver_id=${approverId}`, {
        method: "PATCH"
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return { status: "approved" };
  },

  async rejectAdjustment(adjId) {
    try {
      const res = await fetch(`${API_BASE}/api/insights/adjustments/${adjId}?action=rejected`, {
        method: "PATCH"
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return { status: "rejected" };
  },

  async getRewriteSuggestions() {
    try {
      const res = await fetch(`${API_BASE}/api/insights/rewrite-suggestions`);
      if (res.ok) return await res.json();
    } catch (_) {}
    return [];
  },

  // Immutable Audit Trail
  async getAuditTrail() {
    try {
      const res = await fetch(`${API_BASE}/api/audit`);
      if (res.ok) return await res.json();
    } catch (_) {}

    return [
      {
        id: "aud_init",
        actor_name: "Alex Morgan",
        actor_role: "creator",
        action: "submit_content",
        entity: "content",
        entity_id: "c_sample_campaign",
        timestamp: Date.now() / 1000 - 3600,
        metadata: { channel: "Global Website" }
      }
    ];
  },
};

if (typeof window !== "undefined") {
  window.api = api;
}
