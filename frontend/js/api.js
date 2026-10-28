/**
 * BrandLens API Client
 * Pure JavaScript (ES6+) Fetch wrapper for BrandLens FastAPI endpoints.
 * Zero external libraries or TypeScript.
 */

// When frontend is served from FastAPI root, API_BASE is "" (same origin).
// When frontend is deployed separately on Vercel/Netlify, API_BASE can be configured via
// window.BRANDLENS_API_URL or localStorage.getItem("BRANDLENS_API_URL").
const API_BASE = (typeof window !== "undefined" && (window.BRANDLENS_API_URL || localStorage.getItem("BRANDLENS_API_URL"))) || "";

export const api = {
  // Workspace & Settings
  async getWorkspace() {
    const res = await fetch(`${API_BASE}/api/workspace`);
    return await res.json();
  },

  async updateSettings(settings) {
    const res = await fetch(`${API_BASE}/api/workspace/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    return await res.json();
  },

  // Knowledge Base Sources
  async listSources() {
    const res = await fetch(`${API_BASE}/api/sources`);
    return await res.json();
  },

  async createSource(sourceData) {
    const res = await fetch(`${API_BASE}/api/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sourceData),
    });
    return await res.json();
  },

  async updateSource(sourceId, sourceData) {
    const res = await fetch(`${API_BASE}/api/sources/${sourceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sourceData),
    });
    return await res.json();
  },

  async toggleSourceStatus(sourceId) {
    const res = await fetch(`${API_BASE}/api/sources/${sourceId}/toggle-status`, {
      method: "PATCH",
    });
    return await res.json();
  },

  async deleteSource(sourceId) {
    const res = await fetch(`${API_BASE}/api/sources/${sourceId}`, {
      method: "DELETE",
    });
    return await res.json();
  },

  // Content & Checks
  async listContent() {
    const res = await fetch(`${API_BASE}/api/content`);
    return await res.json();
  },

  async getContent(contentId) {
    const res = await fetch(`${API_BASE}/api/content/${contentId}`);
    return await res.json();
  },

  async submitContent(payload) {
    const res = await fetch(`${API_BASE}/api/content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async uploadDocument(formData) {
    const res = await fetch(`${API_BASE}/api/content/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Upload failed");
    }
    return await res.json();
  },

  async deleteContent(contentId) {
    const res = await fetch(`${API_BASE}/api/content/${contentId}`, {
      method: "DELETE",
    });
    return await res.json();
  },

  async rerunCheck(contentId) {
    const res = await fetch(`${API_BASE}/api/content/${contentId}/check`, {
      method: "POST",
    });
    return await res.json();
  },

  // Finding Actions: Accept, Edit, Dispute, Override
  async actOnFinding(contentId, findingId, actionPayload) {
    const res = await fetch(`${API_BASE}/api/content/${contentId}/findings/${findingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actionPayload),
    });
    return await res.json();
  },

  // Comments
  async addComment(contentId, commentPayload) {
    const res = await fetch(`${API_BASE}/api/content/${contentId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(commentPayload),
    });
    return await res.json();
  },

  // Decisions: Approve / Reject / Changes Requested
  async makeDecision(contentId, decisionPayload) {
    const res = await fetch(`${API_BASE}/api/content/${contentId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(decisionPayload),
    });
    return await res.json();
  },

  // Governance Insights
  async getInsights() {
    const res = await fetch(`${API_BASE}/api/insights`);
    return await res.json();
  },

  // Immutable Audit Trail
  async getAuditTrail() {
    const res = await fetch(`${API_BASE}/api/audit`);
    return await res.json();
  },
};
