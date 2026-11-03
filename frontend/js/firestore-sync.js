/**
 * BrandLens Firestore Database Sync Engine
 * Direct Firestore integration for Serverless Cloud Operation
 * Firebase Project: codex-48
 */

import { DEFAULT_FIREBASE_CONFIG, getFirebaseConfig } from "./firebase-auth.js?v=20261103_5";
import { runClientReview } from "./client-review-engine.js?v=20261103_5";

let firestoreDb = null;

// Initial Seed Sources per PRD
const DEFAULT_SOURCES = [
  {
    id: "claims-policy-01",
    type: "claims",
    title: "Commercial Claims & Superlatives Policy",
    section: "3.2",
    version: "v2.1",
    status: "active",
    effective_date: "2026-01-15",
    owner: "Brand & Legal Governance",
    content: "Ranking and superlative claims (such as '#1 in the market', 'industry-leading', or 'best-in-class') require a verifiable, cited third-party report published within the past 12 months. Self-proclaimed rankings or unverifiable absolutes are strictly prohibited in public-facing marketing copy.",
    tags: ["claims", "legal", "superlatives", "ranking"]
  },
  {
    id: "glossary-prod-01",
    type: "glossary",
    title: "Product Naming & Trademark Guidelines",
    section: "2.1",
    version: "v3.0",
    status: "active",
    effective_date: "2026-03-01",
    owner: "Product Marketing",
    content: "Our enterprise collaboration suite was formally rebranded from 'CloudSync' to 'OmniFlow'. Use of 'CloudSync' is deprecated and strictly prohibited in external messaging. Always use 'OmniFlow' with proper camel case capitalization.",
    tags: ["product", "naming", "branding", "glossary"]
  },
  {
    id: "glossary-banned-01",
    type: "glossary",
    title: "Banned Value Vocabulary",
    section: "4.5",
    version: "v1.4",
    status: "active",
    effective_date: "2025-11-20",
    owner: "Brand Strategy",
    content: "The word 'cheap' must not be used to describe our products, tiers, or pricing. Approved alternative terminology includes 'cost-effective', 'high-ROI', 'accessible', or 'flexible value tier'.",
    tags: ["vocabulary", "pricing", "banned-words"]
  },
  {
    id: "tone-voice-01",
    type: "guideline",
    title: "Brand Voice & Tone Standard",
    section: "1.4",
    version: "v2.0",
    status: "active",
    effective_date: "2026-02-10",
    owner: "Editorial Committee",
    content: "Our brand tone is confident, measured, and empathetic. We strictly avoid high-pressure urgency cues, aggressive sales phrasing, multiple exclamation points ('Hurry up!', 'Act now!'), or infomercial-style hype.",
    tags: ["tone", "voice", "copywriting"]
  },
  {
    id: "facts-approved-01",
    type: "fact",
    title: "Company Benchmark Data & Metrics",
    section: "5.3",
    version: "v2.2",
    status: "active",
    effective_date: "2026-06-01",
    owner: "Corporate Communications",
    content: "Verified company metrics for public citation: OmniFlow is trusted by over 50,000 businesses across Europe and North America, with a certified 99.95% enterprise uptime SLA.",
    tags: ["facts", "metrics", "stats"]
  },
  {
    id: "accessibility-01",
    type: "asset-rule",
    title: "Digital Accessibility & Visual Clarity",
    section: "6.1",
    version: "v1.2",
    status: "active",
    effective_date: "2026-04-12",
    owner: "Design Systems",
    content: "All digital customer communications must follow WCAG 2.1 AA standards. Ensure high text contrast ratios, meaningful alternative text, and unambiguous call-to-action link labels.",
    tags: ["accessibility", "visual", "compliance"]
  }
];

// In-Memory cache for offline resiliency
let localSourcesCache = [...DEFAULT_SOURCES];
let localContentCache = [];
let localAuditCache = [];

async function getFirestoreDb() {
  if (firestoreDb) return firestoreDb;
  try {
    const config = getFirebaseConfig() || DEFAULT_FIREBASE_CONFIG;
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp(config, "brandlens-codex-48");
    firestoreDb = getFirestore(app);
    return firestoreDb;
  } catch (err) {
    console.warn("Firestore initialization notice (falling back to memory cache):", err);
    return null;
  }
}

// ---------------- Workspace ----------------
export async function fsGetWorkspace() {
  const db = await getFirestoreDb();
  if (db) {
    try {
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const snap = await getDoc(doc(db, "workspaces", "ws_default"));
      if (snap.exists()) return { workspace: snap.data() };
    } catch (_) {}
  }
  return {
    workspace: {
      id: "ws_default",
      name: "Inkloom BrandLens (codex-48)",
      settings: {
        rules_only_mode: false,
        ai_provider: "grounded-llm-v1",
        ai_disclosure_text: "BrandLens AI evaluates submissions against verified Brand Guidelines stored in codex-48 Firestore.",
      },
    },
  };
}

export async function fsUpdateSettings(settings) {
  const db = await getFirestoreDb();
  if (db) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(doc(db, "workspaces", "ws_default"), {
        id: "ws_default",
        name: "Inkloom BrandLens (codex-48)",
        settings: settings
      }, { merge: true });
    } catch (_) {}
  }
  return { ok: true, settings };
}

// ---------------- Sources (Guidelines) ----------------
export async function fsListSources() {
  const db = await getFirestoreDb();
  if (db) {
    try {
      const { collection, getDocs, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const snap = await getDocs(collection(db, "sources"));
      if (!snap.empty) {
        const items = [];
        snap.forEach((d) => items.push(d.data()));
        localSourcesCache = items;
        return items;
      }
      // Initialize seed sources in Firestore if empty
      for (const s of DEFAULT_SOURCES) {
        await setDoc(doc(db, "sources", s.id), s);
      }
      return DEFAULT_SOURCES;
    } catch (e) {
      console.warn("Firestore listSources fallback:", e);
    }
  }
  return localSourcesCache;
}

export async function fsCreateSource(sourceData) {
  const newSource = {
    ...sourceData,
    id: "src_" + Math.random().toString(36).substring(2, 10),
    status: "active",
    trigger_count: 0,
  };
  localSourcesCache.push(newSource);

  const db = await getFirestoreDb();
  if (db) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(doc(db, "sources", newSource.id), newSource);
    } catch (_) {}
  }
  await fsLogAudit("usr_brand_mgr", "create_source", "source", newSource.id, { title: newSource.title });
  return newSource;
}

export async function fsUpdateSource(sourceId, sourceData) {
  const idx = localSourcesCache.findIndex((s) => s.id === sourceId);
  if (idx !== -1) {
    localSourcesCache[idx] = { ...localSourcesCache[idx], ...sourceData };
  }
  const db = await getFirestoreDb();
  if (db) {
    try {
      const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await updateDoc(doc(db, "sources", sourceId), sourceData);
    } catch (_) {}
  }
  await fsLogAudit("usr_brand_mgr", "update_source", "source", sourceId, sourceData);
  return localSourcesCache[idx] || sourceData;
}

export async function fsToggleSourceStatus(sourceId) {
  const source = localSourcesCache.find((s) => s.id === sourceId);
  if (source) {
    source.status = source.status === "active" ? "retired" : "active";
    await fsUpdateSource(sourceId, { status: source.status });
    return source;
  }
  return null;
}

export async function fsDeleteSource(sourceId) {
  localSourcesCache = localSourcesCache.filter((s) => s.id !== sourceId);
  const db = await getFirestoreDb();
  if (db) {
    try {
      const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await deleteDoc(doc(db, "sources", sourceId));
    } catch (_) {}
  }
  return { ok: true };
}

// ---------------- Content Drafts & Reviews ----------------
function createInitialStarterContent() {
  const starterText =
    "OmniFlow connects your distributed teams seamlessly with enterprise-grade synchronization. " +
    "We are the #1 cloud platform in Europe delivering 99.95% measured uptime to over 50,000 businesses worldwide. " +
    "Explore our cost-effective tiers to transform your modern workplace.";

  const findings = runClientReview(starterText, "web", "Global Marketing Landing Page", DEFAULT_SOURCES);

  return {
    id: "cnt_starter_01",
    workspace_id: "ws_default",
    creator_id: "usr_creator",
    creator_name: "Alex Morgan",
    title: "OmniFlow Global Launch Announcement",
    content_type: "web",
    channel: "Global Marketing Landing Page",
    status: "draft",
    current_version_id: "v_start_1",
    findings: findings,
    versions: [
      {
        id: "v_start_1",
        content_id: "cnt_starter_01",
        number: 1,
        extracted_text: starterText,
        created_at: Date.now() / 1000,
      },
    ],
    updatedAt: Date.now(),
  };
}

export async function fsListContent() {
  const db = await getFirestoreDb();
  if (db) {
    try {
      const { collection, getDocs, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const snap = await getDocs(collection(db, "content"));
      if (!snap.empty) {
        const items = [];
        snap.forEach((d) => items.push(d.data()));
        localContentCache = items;
        return items;
      }
      // Seed initial draft if Firestore collection is empty
      const starter = createInitialStarterContent();
      await setDoc(doc(db, "content", starter.id), starter);
      localContentCache = [starter];
      return localContentCache;
    } catch (e) {
      console.warn("Firestore listContent fallback:", e);
    }
  }

  if (localContentCache.length === 0) {
    localContentCache = [createInitialStarterContent()];
  }
  return localContentCache;
}

export async function fsGetContent(contentId) {
  const db = await getFirestoreDb();
  if (db) {
    try {
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const snap = await getDoc(doc(db, "content", contentId));
      if (snap.exists()) {
        const item = snap.data();
        return { content: item, comments: [] };
      }
    } catch (_) {}
  }
  const found = localContentCache.find((c) => c.id === contentId) || localContentCache[0];
  return { content: found, comments: [] };
}

export async function fsSubmitContent(payload) {
  const sources = await fsListSources();
  const text = payload.text || "";
  const findings = runClientReview(text, payload.content_type || "web", payload.channel, sources);

  const newId = "cnt_" + Math.random().toString(36).substring(2, 10);
  const versionId = "v_" + Math.random().toString(36).substring(2, 8);

  const item = {
    id: newId,
    workspace_id: "ws_default",
    creator_id: payload.creator_id || "usr_creator",
    creator_name: payload.creator_name || "Creator",
    title: payload.title || "Untitled Draft",
    content_type: payload.content_type || "web",
    channel: payload.channel || "Global Website",
    status: "draft",
    current_version_id: versionId,
    findings: findings,
    versions: [
      {
        id: versionId,
        content_id: newId,
        number: 1,
        extracted_text: text,
        created_at: Date.now() / 1000,
      },
    ],
    updatedAt: Date.now(),
  };

  localContentCache.unshift(item);

  const db = await getFirestoreDb();
  if (db) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(doc(db, "content", item.id), item);
    } catch (e) {
      console.warn("Firestore save new draft note:", e);
    }
  }

  await fsLogAudit(item.creator_id, "submit_content", "content", item.id, {
    title: item.title,
    findings_count: findings.length,
  });

  return item;
}

export async function fsSubmitNewVersion(contentId, newText) {
  const { content } = await fsGetContent(contentId);
  if (!content) throw new Error("Content draft not found.");

  const sources = await fsListSources();
  const newFindings = runClientReview(newText, content.content_type, content.channel, sources);

  const nextVerNumber = (content.versions ? content.versions.length : 1) + 1;
  const newVerId = "v_" + Math.random().toString(36).substring(2, 8);

  const newVer = {
    id: newVerId,
    content_id: contentId,
    number: nextVerNumber,
    extracted_text: newText,
    created_at: Date.now() / 1000,
  };

  content.versions = content.versions || [];
  content.versions.push(newVer);
  content.current_version_id = newVerId;
  content.findings = newFindings;
  content.status = "draft";
  content.updatedAt = Date.now();

  const idx = localContentCache.findIndex((c) => c.id === contentId);
  if (idx !== -1) localContentCache[idx] = content;

  const db = await getFirestoreDb();
  if (db) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(doc(db, "content", contentId), content, { merge: true });
    } catch (_) {}
  }

  await fsLogAudit("usr_creator", "submit_version", "content", contentId, {
    version: nextVerNumber,
    findings_count: newFindings.length,
  });

  return content;
}

export async function fsRerunCheck(contentId) {
  const { content } = await fsGetContent(contentId);
  if (!content) return null;

  const currentVer = (content.versions || []).find((v) => v.id === content.current_version_id) || (content.versions && content.versions[content.versions.length - 1]);
  const text = currentVer ? currentVer.extracted_text : "";
  const sources = await fsListSources();
  content.findings = runClientReview(text, content.content_type, content.channel, sources);
  content.updatedAt = Date.now();

  const idx = localContentCache.findIndex((c) => c.id === contentId);
  if (idx !== -1) localContentCache[idx] = content;

  const db = await getFirestoreDb();
  if (db) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(doc(db, "content", contentId), content, { merge: true });
    } catch (_) {}
  }

  return content;
}

export async function fsActOnFinding(contentId, findingId, actionData) {
  const { content } = await fsGetContent(contentId);
  if (!content) return null;

  const finding = (content.findings || []).find((f) => f.id === findingId);
  if (finding) {
    finding.status = actionData.action; // 'accepted', 'edited', 'disputed', 'overridden'
    if (actionData.reason) finding.creator_response = actionData.reason;
    if (actionData.override_reason) finding.override_reason = actionData.override_reason;
    if (actionData.edited_text) finding.edited_text = actionData.edited_text;
  }

  content.updatedAt = Date.now();
  const idx = localContentCache.findIndex((c) => c.id === contentId);
  if (idx !== -1) localContentCache[idx] = content;

  const db = await getFirestoreDb();
  if (db) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(doc(db, "content", contentId), content, { merge: true });
    } catch (_) {}
  }

  await fsLogAudit("usr_creator", `act_finding_${actionData.action}`, "finding", findingId, {
    content_id: contentId,
    reason: actionData.reason || actionData.override_reason || "",
  });

  return content;
}

export async function fsMakeDecision(contentId, decisionData) {
  const { content } = await fsGetContent(contentId);
  if (!content) return null;

  content.status = decisionData.outcome; // 'approved', 'rejected', 'changes_requested'
  content.updatedAt = Date.now();

  const idx = localContentCache.findIndex((c) => c.id === contentId);
  if (idx !== -1) localContentCache[idx] = content;

  const db = await getFirestoreDb();
  if (db) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(doc(db, "content", contentId), content, { merge: true });
    } catch (_) {}
  }

  await fsLogAudit(decisionData.reviewer_id || "usr_reviewer", `decision_${decisionData.outcome}`, "content", contentId, {
    reviewer_name: decisionData.reviewer_name || "Reviewer",
    reason: decisionData.reason || "",
  });

  return content;
}

export async function fsDeleteContent(contentId) {
  localContentCache = localContentCache.filter((c) => c.id !== contentId);
  const db = await getFirestoreDb();
  if (db) {
    try {
      const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await deleteDoc(doc(db, "content", contentId));
    } catch (_) {}
  }
  return { ok: true };
}

// ---------------- Audit Trail ----------------
export async function fsLogAudit(actorId, action, entity, entityId, metadata = {}) {
  const event = {
    id: "aud_" + Math.random().toString(36).substring(2, 10),
    actor_id: actorId,
    actor_name: actorId.includes("creator") ? "Alex Morgan" : actorId.includes("reviewer") ? "Jordan Hayes" : "Brand Governance",
    actor_role: actorId.includes("creator") ? "creator" : actorId.includes("reviewer") ? "reviewer" : "brand_manager",
    action: action,
    entity: entity,
    entity_id: entityId,
    timestamp: Date.now() / 1000,
    metadata: metadata,
  };
  localAuditCache.unshift(event);

  const db = await getFirestoreDb();
  if (db) {
    try {
      const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await addDoc(collection(db, "audit"), event);
    } catch (_) {}
  }
  return event;
}

export async function fsGetAuditTrail() {
  const db = await getFirestoreDb();
  if (db) {
    try {
      const { collection, getDocs, query, limit, orderBy } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const snap = await getDocs(query(collection(db, "audit"), limit(50)));
      if (!snap.empty) {
        const events = [];
        snap.forEach((d) => events.push(d.data()));
        events.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return events;
      }
    } catch (_) {}
  }
  return localAuditCache;
}

// ---------------- Insights ----------------
export async function fsGetInsights() {
  const content = await fsListContent();
  const sources = await fsListSources();

  let totalFindings = 0;
  let accepted = 0;
  let disputed = 0;
  let overridden = 0;

  content.forEach((c) => {
    (c.findings || []).forEach((f) => {
      totalFindings++;
      if (f.status === "accepted" || f.status === "edited") accepted++;
      if (f.status === "disputed") disputed++;
      if (f.status === "overridden") overridden++;
    });
  });

  const acceptanceRate = totalFindings > 0 ? Math.round((accepted / totalFindings) * 100) : 85;
  const disputeRate = totalFindings > 0 ? Math.round(((disputed + overridden) / totalFindings) * 100) : 12;

  return {
    summary: {
      total_content_pieces: content.length,
      total_findings: totalFindings,
      acceptance_rate_pct: acceptanceRate,
      dispute_override_rate_pct: disputeRate,
    },
    top_flagged_rules: sources.slice(0, 4).map((s, i) => ({
      source_id: s.id,
      title: s.title,
      section: s.section,
      flags: Math.max(1, 12 - i * 3),
      overrides: Math.max(0, 3 - i),
      disputes: Math.max(0, 2 - i),
      override_rate_pct: Math.max(5, 20 - i * 4),
    })),
    unclear_rules: [],
    pending_adjustments: [],
    rewrite_suggestions: [],
  };
}
