/**
 * BrandLens Application Controller
 * Pure Vanilla JavaScript (ES6+) - Real User Production Workflow
 * Zero TypeScript, Zero Next.js
 */

import { api } from "./api.js";

// Application State
const state = {
  currentRole: "creator", // 'creator', 'reviewer', 'brand_manager', 'admin'
  currentUser: { id: "usr_creator", name: "Alex Morgan", role: "creator" },
  activeTab: "studio",
  contentList: [],
  activeContentId: null,
  activeFindingId: null,
  activeFilter: "all",
  currentContentData: null,
  sources: [],
  insights: null,
  auditLog: [],
  workspace: null,
  submissionMode: "paste", // 'paste' or 'file'
  studioMobilePane: "doc", // 'doc' or 'findings' for screens <= 768px
};

// Role user mapping
const ROLE_USERS = {
  creator: { id: "usr_creator", name: "Alex Morgan", role: "creator" },
  reviewer: { id: "usr_reviewer", name: "Jordan Hayes", role: "reviewer" },
  brand_manager: { id: "usr_brand_mgr", name: "Elena Vance", role: "brand_manager" },
  admin: { id: "usr_admin", name: "Marcus Sterling", role: "admin" },
};

// DOM Elements
const elements = {
  roleSelect: document.getElementById("roleSelect"),
  currentUserName: document.getElementById("currentUserName"),
  navTabs: document.querySelectorAll(".nav-btn, .nav-tab-btn"),
  viewSections: document.querySelectorAll(".view-section"),
  
  // Studio Header & Document Selection
  docSelect: document.getElementById("docSelect"),
  docTitle: document.getElementById("docTitle"),
  docStatus: document.getElementById("docStatus"),
  docChannel: document.getElementById("docChannel"),
  docVersionNum: document.getElementById("docVersionNum"),
  docCreator: document.getElementById("docCreator"),
  docTextCanvas: document.getElementById("docTextCanvas"),
  findingsList: document.getElementById("findingsList"),
  findingCountBadge: document.getElementById("findingCountBadge"),
  mobileFindingCount: document.getElementById("mobileFindingCount"),
  filterButtons: document.querySelectorAll(".segment-btn, .filter-btn"),
  studioLayout: document.getElementById("studioLayout"),
  btnStudioMobileDoc: document.getElementById("btnStudioMobileDoc"),
  btnStudioMobileFindings: document.getElementById("btnStudioMobileFindings"),
  btnNewDraft: document.getElementById("btnNewDraft"),
  btnRerunCheck: document.getElementById("btnRerunCheck"),
  btnDeleteDraft: document.getElementById("btnDeleteDraft"),
  btnApproveContent: document.getElementById("btnApproveContent"),
  btnRejectContent: document.getElementById("btnRejectContent"),
  btnDiffTab: document.getElementById("btnDiffTab"),
  btnTextTab: document.getElementById("btnTextTab"),
  diffContainer: document.getElementById("diffContainer"),

  // Knowledge Base
  sourcesGrid: document.getElementById("sourcesGrid"),
  kbSearchInput: document.getElementById("kbSearchInput"),
  btnAddNewSource: document.getElementById("btnAddNewSource"),
  newSourceModal: document.getElementById("newSourceModal"),
  sourceTypeSelect: document.getElementById("sourceTypeSelect"),
  sourceSectionInput: document.getElementById("sourceSectionInput"),
  sourceTitleInput: document.getElementById("sourceTitleInput"),
  sourceContentInput: document.getElementById("sourceContentInput"),
  btnCancelNewSource: document.getElementById("btnCancelNewSource"),
  btnSaveNewSource: document.getElementById("btnSaveNewSource"),

  // Insights
  statTotalContent: document.getElementById("statTotalContent"),
  statTotalFlags: document.getElementById("statTotalFlags"),
  statAcceptanceRate: document.getElementById("statAcceptanceRate"),
  statOverrideRate: document.getElementById("statOverrideRate"),
  unclearRulesList: document.getElementById("unclearRulesList"),
  topRulesTableBody: document.getElementById("topRulesTableBody"),

  // Audit
  auditTableBody: document.getElementById("auditTableBody"),

  // Settings
  chkRulesOnly: document.getElementById("chkRulesOnly"),
  selAiProvider: document.getElementById("selAiProvider"),
  txtAiDisclosure: document.getElementById("txtAiDisclosure"),

  // Modals
  modalOverlay: document.getElementById("modalOverlay"),
  modalTitle: document.getElementById("modalTitle"),
  modalInputLabel: document.getElementById("modalInputLabel"),
  modalTextarea: document.getElementById("modalTextarea"),
  btnModalSubmit: document.getElementById("btnModalSubmit"),
  btnModalCancel: document.getElementById("btnModalCancel"),

  // New Draft Modal
  newDraftModal: document.getElementById("newDraftModal"),
  draftTitleInput: document.getElementById("draftTitleInput"),
  draftChannelSelect: document.getElementById("draftChannelSelect"),
  tabInputPaste: document.getElementById("tabInputPaste"),
  tabInputFile: document.getElementById("tabInputFile"),
  sectionPasteInput: document.getElementById("sectionPasteInput"),
  sectionFileInput: document.getElementById("sectionFileInput"),
  draftTextInput: document.getElementById("draftTextInput"),
  draftFileInput: document.getElementById("draftFileInput"),
  btnSubmitNewDraft: document.getElementById("btnSubmitNewDraft"),
  btnCancelNewDraft: document.getElementById("btnCancelNewDraft"),
  modalImagePreviewContainer: document.getElementById("modalImagePreviewContainer"),
  modalImageThumb: document.getElementById("modalImageThumb"),
  modalImageFilename: document.getElementById("modalImageFilename"),
  modalOcrStatus: document.getElementById("modalOcrStatus"),
  modalOcrProgressBarWrap: document.getElementById("modalOcrProgressBarWrap"),
  modalOcrProgressBar: document.getElementById("modalOcrProgressBar"),
  modalOcrTextSection: document.getElementById("modalOcrTextSection"),
  modalOcrTextarea: document.getElementById("modalOcrTextarea"),
};

let activeModalCallback = null;

// Initialization
async function init() {
  setupEventListeners();
  await loadWorkspace();
  await loadSources();
  await reloadDocumentList();
}

function setupEventListeners() {
  // Role selector
  elements.roleSelect.addEventListener("change", (e) => {
    state.currentRole = e.target.value;
    state.currentUser = ROLE_USERS[state.currentRole];
    elements.currentUserName.textContent = state.currentUser.name;
    updateRoleSpecificUI();
    renderFindings();
  });

  // Navigation tabs
  elements.navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      switchTab(tab.dataset.tab);
    });
  });

  // Mobile Studio Pane Switcher (screens <= 768px)
  elements.btnStudioMobileDoc?.addEventListener("click", () => setStudioMobilePane("doc"));
  elements.btnStudioMobileFindings?.addEventListener("click", () => setStudioMobilePane("findings"));

  // Document selection change
  elements.docSelect.addEventListener("change", (e) => {
    if (e.target.value) {
      state.activeContentId = e.target.value;
      loadContent(state.activeContentId);
    }
  });

  // Finding category/status filters
  elements.filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      elements.filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeFilter = btn.dataset.filter;
      renderFindings();
    });
  });

  // Re-run check button
  elements.btnRerunCheck.addEventListener("click", async () => {
    if (!state.activeContentId) return;
    elements.btnRerunCheck.disabled = true;
    elements.btnRerunCheck.textContent = "Checking...";
    await api.rerunCheck(state.activeContentId);
    await loadContent(state.activeContentId);
    elements.btnRerunCheck.disabled = false;
    elements.btnRerunCheck.textContent = "Re-check Guidelines";
  });

  // Delete draft button
  elements.btnDeleteDraft.addEventListener("click", async () => {
    if (!state.activeContentId) return;
    const confirmDelete = confirm("Are you sure you want to delete this content draft?");
    if (confirmDelete) {
      await api.deleteContent(state.activeContentId);
      await reloadDocumentList();
    }
  });

  // Reviewer Decisions (Approve / Reject)
  elements.btnApproveContent.addEventListener("click", () => {
    if (!state.activeContentId) return;
    openModal("Approve Content Submission", "Enter approval rationale / compliance sign-off:", async (reason) => {
      await api.makeDecision(state.activeContentId, {
        reviewer_id: state.currentUser.id,
        reviewer_name: state.currentUser.name,
        outcome: "approved",
        reason: reason || "Meets approved brand consistency and claims standards.",
      });
      await loadContent(state.activeContentId);
    });
  });

  elements.btnRejectContent.addEventListener("click", () => {
    if (!state.activeContentId) return;
    openModal("Request Changes on Submission", "Enter reason or required revisions:", async (reason) => {
      await api.makeDecision(state.activeContentId, {
        reviewer_id: state.currentUser.id,
        reviewer_name: state.currentUser.name,
        outcome: "changes_requested",
        reason: reason || "Unresolved brand policy flags require creator revisions.",
      });
      await loadContent(state.activeContentId);
    });
  });

  // Diff / Text view tabs
  elements.btnDiffTab.addEventListener("click", () => {
    elements.btnDiffTab.classList.add("active");
    elements.btnTextTab.classList.remove("active");
    elements.docTextCanvas.style.display = "none";
    elements.diffContainer.style.display = "block";
    renderDiffView();
  });

  elements.btnTextTab.addEventListener("click", () => {
    elements.btnTextTab.classList.add("active");
    elements.btnDiffTab.classList.remove("active");
    elements.docTextCanvas.style.display = "block";
    elements.diffContainer.style.display = "none";
  });

  // Knowledge base search
  elements.kbSearchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = state.sources.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.content.toLowerCase().includes(query) ||
        s.section.toLowerCase().includes(query)
    );
    renderSourcesList(filtered);
  });

  // Add Guideline Modal
  elements.btnAddNewSource.addEventListener("click", () => {
    elements.newSourceModal.classList.add("active");
  });
  elements.btnCancelNewSource.addEventListener("click", () => {
    elements.newSourceModal.classList.remove("active");
  });
  elements.btnSaveNewSource.addEventListener("click", async () => {
    const title = elements.sourceTitleInput.value.trim();
    const section = elements.sourceSectionInput.value.trim() || "1.0";
    const type = elements.sourceTypeSelect.value;
    const content = elements.sourceContentInput.value.trim();
    if (!title || !content) {
      alert("Please provide both a title and the guideline content.");
      return;
    }
    await api.createSource({
      type,
      title,
      section,
      effective_date: new Date().toISOString().split("T")[0],
      owner: "Brand Governance",
      content,
      tags: [type]
    });
    elements.newSourceModal.classList.remove("active");
    elements.sourceTitleInput.value = "";
    elements.sourceSectionInput.value = "";
    elements.sourceContentInput.value = "";
    await loadSources();
  });

  // Settings: Rules only mode toggle & provider select
  elements.chkRulesOnly?.addEventListener("change", async (e) => {
    await api.updateSettings({ rules_only_mode: e.target.checked });
  });
  elements.selAiProvider?.addEventListener("change", async (e) => {
    await api.updateSettings({ ai_provider: e.target.value });
  });

  // New Draft Modal - Input Mode Tabs
  elements.tabInputPaste.addEventListener("click", () => {
    state.submissionMode = "paste";
    elements.tabInputPaste.classList.add("active");
    elements.tabInputFile.classList.remove("active");
    elements.tabInputPaste.style.color = "var(--text)";
    elements.tabInputPaste.style.fontWeight = "600";
    elements.tabInputFile.style.color = "var(--muted)";
    elements.tabInputFile.style.fontWeight = "500";
    elements.sectionPasteInput.style.display = "block";
    elements.sectionFileInput.style.display = "none";
  });

  elements.tabInputFile.addEventListener("click", () => {
    state.submissionMode = "file";
    elements.tabInputFile.classList.add("active");
    elements.tabInputPaste.classList.remove("active");
    elements.tabInputFile.style.color = "var(--text)";
    elements.tabInputFile.style.fontWeight = "600";
    elements.tabInputPaste.style.color = "var(--muted)";
    elements.tabInputPaste.style.fontWeight = "500";
    elements.sectionPasteInput.style.display = "none";
    elements.sectionFileInput.style.display = "block";
  });

  // Draft File Input Change - Instant Image Preview & OCR Scanning
  if (elements.draftFileInput) {
    elements.draftFileInput.addEventListener("change", async () => {
      const file = elements.draftFileInput.files[0];
      if (!file) {
        if (elements.modalImagePreviewContainer) elements.modalImagePreviewContainer.style.display = "none";
        return;
      }

      const isImg = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(file.name);
      if (isImg && elements.modalImagePreviewContainer) {
        elements.modalImagePreviewContainer.style.display = "block";
        if (elements.modalImageFilename) elements.modalImageFilename.textContent = file.name;
        if (elements.modalImageThumb) elements.modalImageThumb.src = URL.createObjectURL(file);
        if (elements.modalOcrStatus) elements.modalOcrStatus.textContent = "Visual asset selected. Scanning for copy...";
        if (elements.modalOcrProgressBarWrap) {
          elements.modalOcrProgressBarWrap.style.display = "block";
          if (elements.modalOcrProgressBar) elements.modalOcrProgressBar.style.width = "20%";
        }
        if (elements.modalOcrTextSection) elements.modalOcrTextSection.style.display = "none";
        if (elements.modalOcrTextarea) elements.modalOcrTextarea.value = "";

        // Client-side OCR if Tesseract.js is present
        if (window.Tesseract) {
          try {
            const worker = await window.Tesseract.recognize(file, "eng", {
              logger: (m) => {
                if (m && m.status === "recognizing text" && elements.modalOcrProgressBar) {
                  const pct = Math.round((m.progress || 0) * 100);
                  elements.modalOcrProgressBar.style.width = `${Math.max(20, pct)}%`;
                  if (elements.modalOcrStatus) elements.modalOcrStatus.textContent = `Extracting copy... ${pct}%`;
                }
              }
            });
            const recognized = worker && worker.data ? worker.data.text.trim() : "";
            if (elements.modalOcrProgressBar) elements.modalOcrProgressBar.style.width = "100%";
            if (recognized) {
              if (elements.modalOcrStatus) elements.modalOcrStatus.textContent = "OCR scan complete: Text extracted";
              if (elements.modalOcrTextSection) elements.modalOcrTextSection.style.display = "block";
              if (elements.modalOcrTextarea) elements.modalOcrTextarea.value = recognized;
            } else {
              if (elements.modalOcrStatus) elements.modalOcrStatus.textContent = "Visual asset scan complete (no text detected)";
            }
          } catch (ocrErr) {
            console.warn("Client OCR warning:", ocrErr);
            if (elements.modalOcrStatus) elements.modalOcrStatus.textContent = "Visual asset ready for inspection";
            if (elements.modalOcrProgressBarWrap) elements.modalOcrProgressBarWrap.style.display = "none";
          }
        } else {
          if (elements.modalOcrStatus) elements.modalOcrStatus.textContent = "Visual asset ready for inspection";
          if (elements.modalOcrProgressBarWrap) elements.modalOcrProgressBarWrap.style.display = "none";
        }
      } else if (elements.modalImagePreviewContainer) {
        elements.modalImagePreviewContainer.style.display = "none";
      }
    });
  }

  // Open / Close New Draft Modal
  elements.btnNewDraft.addEventListener("click", () => {
    elements.newDraftModal.classList.add("active");
  });
  elements.btnCancelNewDraft.addEventListener("click", () => {
    elements.newDraftModal.classList.remove("active");
    if (elements.modalImagePreviewContainer) elements.modalImagePreviewContainer.style.display = "none";
    if (elements.modalOcrTextarea) elements.modalOcrTextarea.value = "";
  });

  // Submit Draft Action (Paste or Upload)
  elements.btnSubmitNewDraft.addEventListener("click", async () => {
    const title = elements.draftTitleInput.value.trim() || "Untitled Campaign Draft";
    const channel = elements.draftChannelSelect.value;

    if (state.submissionMode === "file") {
      const file = elements.draftFileInput.files[0];
      if (!file) {
        alert("Please select a file (.pdf, .docx, .png, .jpg, .txt, .md) to upload.");
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("channel", channel);
      formData.append("content_type", "web");
      formData.append("creator_id", state.currentUser.id);
      formData.append("creator_name", state.currentUser.name);

      if (elements.modalOcrTextarea && elements.modalOcrTextarea.value.trim()) {
        formData.append("ocr_text", elements.modalOcrTextarea.value.trim());
      }

      elements.btnSubmitNewDraft.disabled = true;
      elements.btnSubmitNewDraft.textContent = "Extracting & Checking...";
      try {
        const created = await api.uploadDocument(formData);
        elements.newDraftModal.classList.remove("active");
        elements.draftFileInput.value = "";
        if (elements.modalImagePreviewContainer) elements.modalImagePreviewContainer.style.display = "none";
        if (elements.modalOcrTextarea) elements.modalOcrTextarea.value = "";
        await reloadDocumentList(created.id);
      } catch (err) {
        alert("Upload error: " + err.message);
      } finally {
        elements.btnSubmitNewDraft.disabled = false;
        elements.btnSubmitNewDraft.textContent = "Submit & Run Review";
      }
    } else {
      const text = elements.draftTextInput.value.trim();
      if (!text) {
        alert("Please paste draft copy to check.");
        return;
      }
      elements.btnSubmitNewDraft.disabled = true;
      elements.btnSubmitNewDraft.textContent = "Evaluating...";
      const created = await api.submitContent({
        title,
        channel,
        content_type: "web",
        text,
        creator_id: state.currentUser.id,
        creator_name: state.currentUser.name,
      });
      elements.newDraftModal.classList.remove("active");
      elements.draftTextInput.value = "";
      elements.btnSubmitNewDraft.disabled = false;
      elements.btnSubmitNewDraft.textContent = "Submit & Run Review";
      await reloadDocumentList(created.id);
    }
  });

  // Generic Reason Modal
  elements.btnModalCancel.addEventListener("click", closeModal);
  elements.btnModalSubmit.addEventListener("click", () => {
    const val = elements.modalTextarea.value.trim();
    if (activeModalCallback) {
      activeModalCallback(val);
    }
    closeModal();
  });
}

function updateRoleSpecificUI() {
  const isReviewerOrAdmin = ["reviewer", "brand_manager", "admin"].includes(state.currentRole);
  elements.btnApproveContent.style.display = isReviewerOrAdmin ? "inline-block" : "none";
  elements.btnRejectContent.style.display = isReviewerOrAdmin ? "inline-block" : "none";
}

function switchTab(tabName) {
  state.activeTab = tabName;
  elements.navTabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === tabName));
  elements.viewSections.forEach((s) => s.classList.toggle("active", s.id === `view-${tabName}`));

  if (tabName === "knowledge") {
    loadSources();
  } else if (tabName === "insights") {
    loadInsights();
  } else if (tabName === "audit") {
    loadAudit();
  } else if (tabName === "settings") {
    loadWorkspace();
  }
}

function setStudioMobilePane(pane) {
  state.studioMobilePane = pane;
  const isFindings = pane === "findings";
  elements.btnStudioMobileDoc?.classList.toggle("active", !isFindings);
  elements.btnStudioMobileFindings?.classList.toggle("active", isFindings);
  elements.studioLayout?.classList.toggle("show-findings", isFindings);
}

// ---------------- Document List & Studio ----------------
async function reloadDocumentList(preferredId = null) {
  const items = await api.listContent();
  state.contentList = items;

  elements.docSelect.innerHTML = "";
  if (items.length === 0) {
    elements.docSelect.innerHTML = `<option value="">No Drafts Submitted</option>`;
    state.activeContentId = null;
    state.currentContentData = null;
    renderEmptyStudio();
    return;
  }

  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = `${item.title} (${item.status.toUpperCase()})`;
    elements.docSelect.appendChild(opt);
  });

  const targetId = preferredId || (items.some((i) => i.id === state.activeContentId) ? state.activeContentId : items[0].id);
  elements.docSelect.value = targetId;
  state.activeContentId = targetId;
  await loadContent(targetId);
}

function renderEmptyStudio() {
  elements.docTitle.textContent = "No Document Selected";
  elements.docStatus.textContent = "EMPTY";
  elements.docStatus.className = "content-status-pill status-draft";
  elements.docChannel.textContent = "Channel: None";
  elements.docVersionNum.textContent = "Version 0";
  elements.docCreator.textContent = "Creator: —";
  elements.docTextCanvas.innerHTML = `
    <div style="text-align: center; padding: 48px 24px;">
      <h3 style="font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 8px;">No content drafts in review</h3>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 20px; max-width: 420px; margin-inline: auto;">
        Submit a document draft by pasting text or uploading a file (.pdf, .docx, .txt, .md). BrandLens will check it against active guidelines and approved metrics.
      </p>
      <button class="btn-primary" onclick="document.getElementById('btnNewDraft').click()">+ Submit Your First Draft</button>
    </div>
  `;
  elements.findingsList.innerHTML = `
    <div style="text-align: center; padding: 40px 10px; color: var(--faint);">
      <p style="font-size: 13px;">No findings. Submit a draft to run brand governance inspection.</p>
    </div>
  `;
  if (elements.findingCountBadge) elements.findingCountBadge.textContent = "0";
  if (elements.mobileFindingCount) elements.mobileFindingCount.textContent = "0";
}

async function loadContent(contentId) {
  if (!contentId) return;
  const data = await api.getContent(contentId);
  state.currentContentData = data;
  renderStudio();
}

function renderStudio() {
  if (!state.currentContentData || !state.currentContentData.content) {
    renderEmptyStudio();
    return;
  }
  const { content } = state.currentContentData;
  elements.docTitle.textContent = content.title;
  elements.docChannel.textContent = `Channel: ${content.channel}`;
  elements.docVersionNum.textContent = `Version ${content.versions.length}`;
  elements.docCreator.textContent = `Creator: ${content.creator_name || "Alex Morgan"}`;
  
  // Status pill
  elements.docStatus.textContent = content.status.replace("_", " ");
  elements.docStatus.className = `content-status-pill status-${content.status}`;

  updateRoleSpecificUI();
  renderHighlightedText();
  renderFindings();
}

function isHashedOrBinaryText(text) {
  if (!text) return false;
  if (text.includes("\x00") || text.includes("\uFFFD")) return true;
  if (/^(\x89PNG|\xFF\xD8\xFF|GIF8|RIFF.{4}WEBP)/.test(text)) return true;
  const nonPrintable = (text.slice(0, 400).match(/[\x00-\x08\x0E-\x1F\x7F-\x9F]/g) || []).length;
  if (nonPrintable > 5) return true;
  return false;
}

function generateHighlightedHtml(fullText, findings) {
  if (!fullText) return "";
  if (isHashedOrBinaryText(fullText)) return "";

  if (!findings || findings.length === 0) {
    return escapeHtml(fullText);
  }

  let html = "";
  let lastIndex = 0;

  const matchableFindings = findings
    .filter((f) => f.excerpt && f.excerpt.text && fullText.includes(f.excerpt.text))
    .map((f) => {
      const idx = fullText.indexOf(f.excerpt.text);
      return { ...f, start: idx, end: idx + f.excerpt.text.length };
    })
    .sort((a, b) => a.start - b.start);

  for (const f of matchableFindings) {
    if (f.start < lastIndex) continue;
    html += escapeHtml(fullText.substring(lastIndex, f.start));

    const isResolved = f.status === "accepted" || f.status === "overridden";
    const isSelected = f.id === state.activeFindingId;

    html += `<span class="highlight-finding highlight-${f.category} ${isSelected ? "selected" : ""} ${isResolved ? "resolved" : ""}" data-finding-id="${f.id}" title="Flagged: ${escapeHtml(f.reason)}">${escapeHtml(f.excerpt.text)}</span>`;
    lastIndex = f.end;
  }
  html += escapeHtml(fullText.substring(lastIndex));
  return html;
}

function renderHighlightedText() {
  const { content } = state.currentContentData;
  const currentVersion = content.versions.find((v) => v.id === content.current_version_id) || content.versions[content.versions.length - 1];
  const fullText = currentVersion ? currentVersion.extracted_text : "";
  const findings = content.findings || [];
  const imageUrl = content.image_url || (currentVersion && currentVersion.image_url);

  // If content is an image, render the image visually
  if (imageUrl || content.is_image) {
    const isBinary = isHashedOrBinaryText(fullText);
    const hasMeaningfulText = !isBinary && fullText && fullText.trim() && !fullText.startsWith("Visual Asset:");

    let html = `
      <div class="studio-image-card">
        <div class="studio-image-toolbar">
          <div class="image-meta-info">
            <span class="badge-visual-asset">Visual Asset</span>
            <span class="image-name-label">${escapeHtml(content.file_name || content.title)}</span>
          </div>
          <div class="image-toolbar-actions">
            ${imageUrl ? `<a href="${escapeHtml(imageUrl)}" target="_blank" rel="noopener noreferrer" class="btn-subtle btn-xs" style="text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
              <span>Open Full Size</span>
              <span style="font-size: 11px;">↗</span>
            </a>` : ""}
          </div>
        </div>

        <div class="studio-image-viewport">
          ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(content.title)}" class="studio-doc-image" />` : `<div style="color: var(--muted); padding: 40px;">[Visual Asset Attached]</div>`}
        </div>
    `;

    if (hasMeaningfulText) {
      const highlightedTextHtml = generateHighlightedHtml(fullText, findings);
      html += `
        <div class="image-extracted-text-wrap">
          <div class="image-extracted-header">
            <span>Embedded Copy &amp; Slogans (OCR Detected)</span>
          </div>
          <div class="image-extracted-body">
            <p>${highlightedTextHtml}</p>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="image-visual-notice">
          <div class="notice-title">Visual Brand &amp; Accessibility Verification</div>
          <p>This image asset has been evaluated against active brand rules, including WCAG 2.1 AA digital accessibility standards and required descriptive metadata.</p>
        </div>
      `;
    }

    html += `</div>`;
    elements.docTextCanvas.innerHTML = html;

    elements.docTextCanvas.querySelectorAll(".highlight-finding").forEach((span) => {
      span.addEventListener("click", () => {
        selectFinding(span.dataset.findingId);
      });
    });
    return;
  }

  // Regular document / text flow
  if (isHashedOrBinaryText(fullText)) {
    elements.docTextCanvas.innerHTML = `
      <div style="padding: 32px 16px; text-align: center; color: var(--muted);">
        <h4 style="color: var(--text); margin-bottom: 8px;">Binary Content Detected</h4>
        <p>This file contained unreadable binary bytes instead of text. Please re-upload as a supported visual format (.png, .jpg) or document (.pdf, .docx, .txt).</p>
      </div>
    `;
    return;
  }

  if (findings.length === 0) {
    elements.docTextCanvas.innerHTML = `<p>${escapeHtml(fullText)}</p>`;
    return;
  }

  const html = generateHighlightedHtml(fullText, findings);
  elements.docTextCanvas.innerHTML = `<p>${html}</p>`;

  elements.docTextCanvas.querySelectorAll(".highlight-finding").forEach((span) => {
    span.addEventListener("click", () => {
      selectFinding(span.dataset.findingId);
    });
  });
}

function renderFindings() {
  if (!state.currentContentData || !state.currentContentData.content) {
    elements.findingsList.innerHTML = `<div style="text-align: center; padding: 40px 10px; color: var(--faint);">No active draft.</div>`;
    if (elements.findingCountBadge) elements.findingCountBadge.textContent = "0";
  if (elements.mobileFindingCount) elements.mobileFindingCount.textContent = "0";
    return;
  }
  const { content } = state.currentContentData;
  let findings = content.findings || [];

  if (state.activeFilter !== "all") {
    if (["claims", "terminology", "tone", "facts"].includes(state.activeFilter)) {
      findings = findings.filter((f) => f.category === state.activeFilter);
    } else {
      findings = findings.filter((f) => f.status === state.activeFilter);
    }
  }

  if (elements.findingCountBadge) elements.findingCountBadge.textContent = `${findings.length}`;
  if (elements.mobileFindingCount) elements.mobileFindingCount.textContent = `${findings.length}`;

  if (findings.length === 0) {
    elements.findingsList.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--faint);">
        <p style="font-size: 13px;">No brand issues found matching this filter.</p>
      </div>`;
    return;
  }

  elements.findingsList.innerHTML = findings
    .map((f) => {
      const isSelected = f.id === state.activeFindingId;
      const primarySource = f.sources[0] || {};
      const isReviewerOrAdmin = ["reviewer", "brand_manager", "admin"].includes(state.currentRole);

      return `
        <div class="finding-card ${isSelected ? "selected" : ""}" id="card-${f.id}">
          <div class="card-top">
            <div class="card-meta">
              <span class="category-tag cat-${f.category}">${f.category}</span>
              <span class="meta-sep">·</span>
              <span class="severity-pill sev-${f.severity}">${f.severity}</span>
            </div>
            <span class="status-label ${f.status}">${f.status}</span>
          </div>

          <div class="card-issue">
            <strong>${escapeHtml(f.excerpt.text)}</strong> — ${escapeHtml(f.reason)}
          </div>

          <div class="card-suggestion">
            <div class="suggestion-head">Suggestion</div>
            <div>"${escapeHtml(f.suggestion)}"</div>
          </div>

          <div class="card-citation">
            Rule ${escapeHtml(primarySource.section || "")} · <span class="citation-title">${escapeHtml(primarySource.title || "Brand Standard")}</span>
          </div>

          ${f.creator_response ? `<div class="card-notes notes-dispute"><strong>Creator Note:</strong> ${escapeHtml(f.creator_response)}</div>` : ""}
          ${f.override_reason ? `<div class="card-notes notes-override"><strong>Reviewer Override:</strong> ${escapeHtml(f.override_reason)}</div>` : ""}

          <div class="card-actions">
            ${
              f.status === "open"
                ? `
                <button class="btn-card-accept" onclick="window.brandlens.acceptFinding('${f.id}')">Accept Fix</button>
                <button class="btn-card-text" onclick="window.brandlens.editFinding('${f.id}')">Edit</button>
                <button class="btn-card-text" onclick="window.brandlens.disputeFinding('${f.id}')">Dispute</button>
              `
                : ""
            }

            ${
              (f.status === "disputed" || f.status === "open") && isReviewerOrAdmin
                ? `<button class="btn-card-override" onclick="window.brandlens.overrideFinding('${f.id}')">Override Flag</button>`
                : ""
            }
          </div>
        </div>
      `;
    })
    .join("");
}

function selectFinding(findingId) {
  state.activeFindingId = findingId;
  renderHighlightedText();
  renderFindings();
  
  if (window.innerWidth <= 768) {
    setStudioMobilePane("findings");
  }

  const el = document.getElementById(`card-${findingId}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// ---------------- Finding Action Handlers ----------------
async function acceptFinding(findingId) {
  await api.actOnFinding(state.activeContentId, findingId, {
    action: "accept",
    actor_id: state.currentUser.id,
    actor_name: state.currentUser.name,
    actor_role: state.currentRole,
  });
  await loadContent(state.activeContentId);
}

async function editFinding(findingId) {
  const { content } = state.currentContentData;
  const finding = content.findings.find((f) => f.id === findingId);
  openModal(
    "Edit Text to Replace Flagged Term",
    `Original text: "${finding.excerpt.text}"\nEnter custom replacement:`,
    async (editedText) => {
      if (!editedText) return;
      await api.actOnFinding(state.activeContentId, findingId, {
        action: "edit",
        actor_id: state.currentUser.id,
        actor_name: state.currentUser.name,
        actor_role: state.currentRole,
        edited_text: editedText,
      });
      await loadContent(state.activeContentId);
    },
    finding.suggestion
  );
}

async function disputeFinding(findingId) {
  openModal(
    "Dispute Brand Finding",
    "Explain why this guideline or claim flag is not applicable (routes to Brand Reviewer):",
    async (reason) => {
      if (!reason) return;
      await api.actOnFinding(state.activeContentId, findingId, {
        action: "dispute",
        actor_id: state.currentUser.id,
        actor_name: state.currentUser.name,
        actor_role: state.currentRole,
        reason: reason,
      });
      await loadContent(state.activeContentId);
    }
  );
}

async function overrideFinding(findingId) {
  openModal(
    "Reviewer Override Justification",
    "Enter reason for dismissing/overriding this finding for the audit log (Mandatory per PRD 3.3):",
    async (reason) => {
      if (!reason) return;
      await api.actOnFinding(state.activeContentId, findingId, {
        action: "override",
        actor_id: state.currentUser.id,
        actor_name: state.currentUser.name,
        actor_role: state.currentRole,
        reason: reason,
      });
      await loadContent(state.activeContentId);
    }
  );
}

// Diff View
function renderDiffView() {
  const { content } = state.currentContentData;
  if (!content || content.versions.length < 2) {
    elements.diffContainer.innerHTML = `<p style="color: var(--faint); padding: 20px;">No earlier revisions to compare. Accept fixes or submit a revised version to view live diffs.</p>`;
    return;
  }
  const v1 = content.versions[0].extracted_text;
  const vCurrent = content.versions[content.versions.length - 1].extracted_text;

  elements.diffContainer.innerHTML = `
    <div class="diff-box">
      <div class="diff-tag">Revision Comparison (v1 to v${content.versions.length})</div>
      <p style="margin-bottom: 12px;"><span style="color: #93c5fd; font-weight: 500;">Original:</span> ${escapeHtml(v1)}</p>
      <hr style="border: 0; border-top: 1px solid var(--border); margin: 12px 0;">
      <p><span style="color: #86efac; font-weight: 500;">Current:</span> ${escapeHtml(vCurrent)}</p>
    </div>
  `;
}

// ---------------- Knowledge Base View ----------------
async function loadSources() {
  state.sources = await api.listSources();
  renderSourcesList(state.sources);
}

function renderSourcesList(sources) {
  elements.sourcesGrid.innerHTML = sources
    .map(
      (s) => `
    <div class="source-card">
      <div class="source-card-top">
        <div>
          <div class="source-title">${escapeHtml(s.title)}</div>
          <span style="font-size: 11px; color: ${s.status === "active" ? "var(--positive-ink)" : "var(--faint)"}; font-weight: 500;">${s.status.toUpperCase()}</span>
        </div>
        <span class="source-badge">Sec ${escapeHtml(s.section)}</span>
      </div>
      <div class="source-text">${escapeHtml(s.content)}</div>
      <div class="source-meta">
        <span>${escapeHtml(s.owner)}</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="color: var(--warning-ink); font-weight: 500;">Triggers: ${s.trigger_count || 0}</span>
          <button class="btn-subtle" onclick="window.brandlens.toggleSource('${s.id}')" style="font-size: 11px; padding: 2px 7px;">
            ${s.status === "active" ? "Retire" : "Activate"}
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

async function toggleSource(sourceId) {
  await api.toggleSourceStatus(sourceId);
  await loadSources();
}

// ---------------- Insights & Governance Dashboard ----------------
async function loadInsights() {
  const data = await api.getInsights();
  state.insights = data;

  elements.statTotalContent.textContent = data.summary.total_content_pieces;
  elements.statTotalFlags.textContent = data.summary.total_findings;
  elements.statAcceptanceRate.textContent = `${data.summary.acceptance_rate_pct}%`;
  elements.statOverrideRate.textContent = `${data.summary.dispute_override_rate_pct}%`;

  if (data.unclear_rules && data.unclear_rules.length > 0) {
    elements.unclearRulesList.innerHTML = data.unclear_rules
      .map(
        (ur) => `
      <div class="unclear-item">
        <div class="unclear-detail">
          <div class="unclear-head">Section ${escapeHtml(ur.section)}: ${escapeHtml(ur.title)}</div>
          <div class="unclear-stat">${ur.flags} flags · ${ur.override_rate_pct}% dispute/override rate (${escapeHtml(ur.diagnosis)})</div>
          <div class="unclear-suggestion">Recommendation: ${escapeHtml(ur.recommendation)}</div>
        </div>
        <button class="btn-subtle" onclick="window.brandlens.clarifyRule('${ur.source_id}')" style="font-size: 12px;">Add Example</button>
      </div>
    `
      )
      .join("");
  } else {
    elements.unclearRulesList.innerHTML = `<div style="font-size: 13px; color: var(--faint); padding: 12px 0;">No ambiguous rules detected. Flag-to-override ratios are within healthy limits.</div>`;
  }

  elements.topRulesTableBody.innerHTML = (data.top_flagged_rules || [])
    .map(
      (r) => `
    <tr>
      <td><strong>Section ${escapeHtml(r.section)}</strong></td>
      <td>${escapeHtml(r.title)}</td>
      <td style="font-weight: 700; color: #fbbf24;">${r.flags}</td>
      <td class="n">${r.overrides}</td>
      <td class="n">${r.disputes}</td>
      <td class="n"><span>${r.override_rate_pct}%</span></td>
    </tr>
  `
    )
    .join("");
}

async function clarifyRule(sourceId) {
  const source = state.sources.find((s) => s.id === sourceId);
  if (!source) return;

  openModal(
    `Clarify Guideline: Section ${source.section}`,
    `Current Content:\n"${source.content}"\n\nEnter updated guideline with concrete examples:`,
    async (updatedContent) => {
      if (!updatedContent) return;
      await api.updateSource(sourceId, {
        type: source.type,
        title: source.title,
        section: source.section,
        effective_date: new Date().toISOString().split("T")[0],
        owner: source.owner,
        content: updatedContent,
        tags: source.tags,
      });
      await loadSources();
      await loadInsights();
    },
    `${source.content} (Example: "Verified based on current platform reports.")`
  );
}

// ---------------- Audit Trail ----------------
async function loadAudit() {
  const events = await api.getAuditTrail();
  state.auditLog = events;

  elements.auditTableBody.innerHTML = events
    .map((e) => {
      const date = new Date(e.timestamp * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      return `
      <tr>
        <td class="num" style="font-size: 11.5px;">${date}</td>
        <td><strong>${escapeHtml(e.actor_name)}</strong> <span style="font-size: 11px; color: var(--faint);">(${e.actor_role})</span></td>
        <td><span class="audit-action-tag">${escapeHtml(e.action)}</span></td>
        <td>${escapeHtml(e.entity)} (${escapeHtml(e.entity_id)})</td>
        <td style="font-size: 12px;">${escapeHtml(JSON.stringify(e.metadata))}</td>
      </tr>
    `;
    })
    .join("");
}

// ---------------- Workspace & Settings ----------------
async function loadWorkspace() {
  const data = await api.getWorkspace();
  state.workspace = data.workspace;
  if (elements.chkRulesOnly) elements.chkRulesOnly.checked = !!data.workspace.settings.rules_only_mode;
  if (elements.selAiProvider) elements.selAiProvider.value = data.workspace.settings.ai_provider || "grounded-llm-v1";
  if (elements.txtAiDisclosure) elements.txtAiDisclosure.textContent = data.workspace.settings.ai_disclosure_text || "";
}

// ---------------- Modal Helpers ----------------
function openModal(title, label, callback, defaultVal = "") {
  elements.modalTitle.textContent = title;
  elements.modalInputLabel.textContent = label;
  elements.modalTextarea.value = defaultVal;
  activeModalCallback = callback;
  elements.modalOverlay.classList.add("active");
  elements.modalTextarea.focus();
}

function closeModal() {
  elements.modalOverlay.classList.remove("active");
  elements.modalTextarea.value = "";
  activeModalCallback = null;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Attach global methods for inline HTML onclick handlers
window.brandlens = {
  acceptFinding,
  editFinding,
  disputeFinding,
  overrideFinding,
  clarifyRule,
  toggleSource,
};

// Start application
window.addEventListener("DOMContentLoaded", init);
