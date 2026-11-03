/**
 * BrandLens API Client
 * Resilient Hybrid Client: Connects to local FastAPI backend when active,
 * and seamlessly uses Firebase Firestore directly when deployed or when backend is offline.
 * Firebase Project: codex-48
 */

import {
  fsGetWorkspace,
  fsUpdateSettings,
  fsListSources,
  fsCreateSource,
  fsUpdateSource,
  fsToggleSourceStatus,
  fsDeleteSource,
  fsListContent,
  fsGetContent,
  fsSubmitContent,
  fsSubmitNewVersion,
  fsRerunCheck,
  fsActOnFinding,
  fsMakeDecision,
  fsDeleteContent,
  fsGetAuditTrail,
  fsGetInsights
} from "./firestore-sync.js?v=20261103_5";

const API_BASE = (typeof window !== "undefined" && (window.BRANDLENS_API_URL || localStorage.getItem("BRANDLENS_API_URL"))) || "";

async function safeFetch(url, options = {}, fallbackFn = null) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500); // 2.5s quick timeout for offline failover

    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Port 8000 offline, network error or proxy ECONNREFUSED - fallback to Firestore
  }

  if (fallbackFn) {
    return await fallbackFn();
  }
  return null;
}

export const api = {
  // Workspace & Settings
  async getWorkspace() {
    return await safeFetch(`${API_BASE}/api/workspace`, {}, fsGetWorkspace);
  },

  async updateSettings(settings) {
    return await safeFetch(
      `${API_BASE}/api/workspace/settings`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      },
      () => fsUpdateSettings(settings)
    );
  },

  // Firebase User Sync
  async syncAuthUser(authData) {
    return await safeFetch(`${API_BASE}/api/auth/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authData),
    }, () => ({ ok: true, user: authData }));
  },
  async syncGoogleUser(authData) {
    return await this.syncAuthUser(authData);
  },

  async listAuthUsers() {
    return await safeFetch(`${API_BASE}/api/auth/users`, {}, () => []);
  },

  async getFirebaseConfig() {
    return await safeFetch(`${API_BASE}/api/auth/firebase-config`, {}, () => null);
  },

  // Knowledge Base Sources (Guidelines)
  async listSources() {
    return await safeFetch(`${API_BASE}/api/sources`, {}, fsListSources);
  },

  async createSource(sourceData) {
    return await safeFetch(
      `${API_BASE}/api/sources`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sourceData),
      },
      () => fsCreateSource(sourceData)
    );
  },

  async updateSource(sourceId, sourceData) {
    return await safeFetch(
      `${API_BASE}/api/sources/${sourceId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sourceData),
      },
      () => fsUpdateSource(sourceId, sourceData)
    );
  },

  async toggleSourceStatus(sourceId) {
    return await safeFetch(
      `${API_BASE}/api/sources/${sourceId}/toggle-status`,
      { method: "PATCH" },
      () => fsToggleSourceStatus(sourceId)
    );
  },

  async deleteSource(sourceId) {
    return await safeFetch(
      `${API_BASE}/api/sources/${sourceId}`,
      { method: "DELETE" },
      () => fsDeleteSource(sourceId)
    );
  },

  // Content & Checks
  async listContent() {
    return await safeFetch(`${API_BASE}/api/content`, {}, fsListContent);
  },

  async getContent(contentId) {
    return await safeFetch(`${API_BASE}/api/content/${contentId}`, {}, () => fsGetContent(contentId));
  },

  async submitContent(payload) {
    return await safeFetch(
      `${API_BASE}/api/content`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      () => fsSubmitContent(payload)
    );
  },

  async uploadDocument(formData) {
    // If backend is active, use backend parsing
    try {
      const res = await fetch(`${API_BASE}/api/content/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    // Fallback: extract form text/ocr_text and submit to Firestore
    const title = formData.get("title") || "Uploaded Document";
    const channel = formData.get("channel") || "Global Marketing Landing Page";
    const text = formData.get("ocr_text") || formData.get("text") || `Document draft: ${title}`;
    const creatorId = formData.get("creator_id") || "usr_creator";
    const creatorName = formData.get("creator_name") || "Creator";

    return await fsSubmitContent({
      title,
      channel,
      text,
      content_type: "web",
      creator_id: creatorId,
      creator_name: creatorName,
    });
  },

  async deleteContent(contentId) {
    return await safeFetch(
      `${API_BASE}/api/content/${contentId}`,
      { method: "DELETE" },
      () => fsDeleteContent(contentId)
    );
  },

  async rerunCheck(contentId) {
    return await safeFetch(
      `${API_BASE}/api/content/${contentId}/check`,
      { method: "POST" },
      () => fsRerunCheck(contentId)
    );
  },

  async submitNewVersion(contentId, newText) {
    const formData = new FormData();
    formData.append("text", newText);
    try {
      const res = await fetch(`${API_BASE}/api/content/${contentId}/versions`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    return await fsSubmitNewVersion(contentId, newText);
  },

  async actOnFinding(contentId, findingId, actionData) {
    return await safeFetch(
      `${API_BASE}/api/content/${contentId}/findings/${findingId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actionData),
      },
      () => fsActOnFinding(contentId, findingId, actionData)
    );
  },

  async addComment(contentId, commentData) {
    return await safeFetch(
      `${API_BASE}/api/content/${contentId}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commentData),
      },
      () => ({ ok: true, ...commentData })
    );
  },

  async makeDecision(contentId, decisionData) {
    return await safeFetch(
      `${API_BASE}/api/content/${contentId}/decision`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(decisionData),
      },
      () => fsMakeDecision(contentId, decisionData)
    );
  },

  // Insights & Governance
  async getInsights() {
    return await safeFetch(`${API_BASE}/api/insights`, {}, fsGetInsights);
  },

  async approveAdjustment(adjustmentId, approverId = "usr_brand_mgr") {
    return await safeFetch(
      `${API_BASE}/api/insights/adjustments/${adjustmentId}?action=approved&approver_id=${approverId}`,
      { method: "PATCH" },
      () => ({ ok: true })
    );
  },

  async rejectAdjustment(adjustmentId) {
    return await safeFetch(
      `${API_BASE}/api/insights/adjustments/${adjustmentId}?action=rejected`,
      { method: "PATCH" },
      () => ({ ok: true })
    );
  },

  async getRewriteSuggestions() {
    return await safeFetch(`${API_BASE}/api/insights/rewrite-suggestions`, {}, () => []);
  },

  // Audit Trail
  async getAuditTrail() {
    return await safeFetch(`${API_BASE}/api/audit`, {}, fsGetAuditTrail);
  },
};

if (typeof window !== "undefined") {
  window.api = api;
}
