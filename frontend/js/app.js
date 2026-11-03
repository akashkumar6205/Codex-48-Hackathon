/**
 * BrandLens Application Controller
 * Pure Vanilla JavaScript (ES6+) - Real User Production Workflow
 * Zero TypeScript, Zero Next.js
 */

import { api } from "./api.js";
import {
  initFirebaseAuth,
  signInWithGoogle,
  signOutGoogle,
  showFirebaseConfigModal,
  closeFirebaseConfigModal,
  saveFirebaseConfig,
  authenticateWithGoogleProfile,
  getFirebaseConfig
} from "./firebase-auth.js";

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
  diffCompareV1: 0,
  diffCompareV2: null,
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
  btnEditDocCopy: document.getElementById("btnEditDocCopy"),
  docEditContainer: document.getElementById("docEditContainer"),
  docEditTextarea: document.getElementById("docEditTextarea"),
  btnCancelDocEdit: document.getElementById("btnCancelDocEdit"),
  btnSaveDocEdit: document.getElementById("btnSaveDocEdit"),

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

  // Firebase Google Auth Elements
  btnGoogleSignIn: document.getElementById("btnGoogleSignIn"),
  userProfilePill: document.getElementById("userProfilePill"),
  userAvatarImg: document.getElementById("userAvatarImg"),
  userAvatarFallback: document.getElementById("userAvatarFallback"),
  userDisplayName: document.getElementById("userDisplayName"),
  btnSignOut: document.getElementById("btnSignOut"),
  firebaseConfigModal: document.getElementById("firebaseConfigModal"),
  btnSettingsGoogleAuth: document.getElementById("btnSettingsGoogleAuth"),
  txtAuthAccountInfo: document.getElementById("txtAuthAccountInfo"),
  fbStatusBadge: document.getElementById("fbStatusBadge"),
  btnQuickAlex: document.getElementById("btnQuickAlex"),
  btnQuickElena: document.getElementById("btnQuickElena"),
  btnSaveFirebaseConfig: document.getElementById("btnSaveFirebaseConfig"),
  btnCloseFirebaseModal: document.getElementById("btnCloseFirebaseModal"),
  fbApiKeyInput: document.getElementById("fbApiKeyInput"),
  fbAuthDomainInput: document.getElementById("fbAuthDomainInput"),
  fbProjectIdInput: document.getElementById("fbProjectIdInput"),
  fbAppIdInput: document.getElementById("fbAppIdInput"),
};

let activeModalCallback = null;

// Initialization
async function init() {
  setupEventListeners();
  await initFirebaseAuth(handleAuthChange);
  await loadWorkspace();
  await loadSources();
  await reloadDocumentList();
}

function handleAuthChange(user) {
  if (user) {
    if (elements.btnGoogleSignIn) elements.btnGoogleSignIn.style.display = "none";
    if (elements.userProfilePill) elements.userProfilePill.style.display = "inline-flex";
    if (elements.userDisplayName) elements.userDisplayName.textContent = user.name;

    if (user.photoUrl && elements.userAvatarImg) {
      elements.userAvatarImg.src = user.photoUrl;
      elements.userAvatarImg.style.display = "block";
      if (elements.userAvatarFallback) elements.userAvatarFallback.style.display = "none";
    } else if (elements.userAvatarFallback) {
      const initials = (user.name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
      elements.userAvatarFallback.textContent = initials || "G";
      elements.userAvatarFallback.style.display = "inline";
      if (elements.userAvatarImg) elements.userAvatarImg.style.display = "none";
    }

    state.currentUser = {
      id: user.uid,
      name: user.name,
      email: user.email,
      role: state.currentRole,
      photoUrl: user.photoUrl || null,
    };

    if (elements.currentUserName) elements.currentUserName.textContent = user.name;
    if (elements.txtAuthAccountInfo) elements.txtAuthAccountInfo.textContent = `Signed in as ${user.name} (${user.email})`;
    if (elements.fbStatusBadge) {
      elements.fbStatusBadge.textContent = "Active (Google Auth)";
      elements.fbStatusBadge.className = "status-badge status-approved";
    }

    // Sync user with backend session & audit log
    api.syncGoogleUser({
      uid: user.uid,
      email: user.email,
      name: user.name,
      photo_url: user.photoUrl,
      role: state.currentRole,
    }).catch((err) => console.warn("Google auth sync notice:", err));

  } else {
    if (elements.btnGoogleSignIn) elements.btnGoogleSignIn.style.display = "inline-flex";
    if (elements.userProfilePill) elements.userProfilePill.style.display = "none";

    state.currentUser = ROLE_USERS[state.currentRole];
    if (elements.currentUserName) elements.currentUserName.textContent = state.currentUser.name;
    if (elements.txtAuthAccountInfo) elements.txtAuthAccountInfo.textContent = "Not signed in";
    if (elements.fbStatusBadge) {
      elements.fbStatusBadge.textContent = "Configured";
      elements.fbStatusBadge.className = "status-badge status-in_review";
    }
  }
}

function setupEventListeners() {
  // Firebase Google Authentication Handlers
  elements.btnGoogleSignIn?.addEventListener("click", async () => {
    try {
      if (elements.btnGoogleSignIn) {
        elements.btnGoogleSignIn.disabled = true;
        elements.btnGoogleSignIn.style.opacity = "0.7";
      }
      await signInWithGoogle();
    } catch (err) {
      console.warn("Google sign-in check:", err);
      showFirebaseConfigModal(err.message || "Sign in cancelled or configuration required.");
    } finally {
      if (elements.btnGoogleSignIn) {
        elements.btnGoogleSignIn.disabled = false;
        elements.btnGoogleSignIn.style.opacity = "1";
      }
    }
  });

  elements.btnSignOut?.addEventListener("click", async () => {
    await signOutGoogle();
  });

  elements.btnSettingsGoogleAuth?.addEventListener("click", () => {
    showFirebaseConfigModal();
  });

  elements.btnCloseFirebaseModal?.addEventListener("click", () => {
    closeFirebaseConfigModal();
  });

  elements.btnQuickAlex?.addEventListener("click", () => {
    authenticateWithGoogleProfile({
      uid: "usr_alex_google",
      name: "Alex Morgan",
      email: "alex.morgan@brandlens.google",
      photoUrl: null,
    });
    closeFirebaseConfigModal();
  });

  elements.btnQuickElena?.addEventListener("click", () => {
    authenticateWithGoogleProfile({
      uid: "usr_elena_google",
      name: "Elena Vance",
      email: "elena.vance@brandlens.google",
      photoUrl: null,
    });
    closeFirebaseConfigModal();
  });

  elements.btnSaveFirebaseConfig?.addEventListener("click", () => {
    const config = {
      apiKey: elements.fbApiKeyInput?.value.trim() || "",
      authDomain: elements.fbAuthDomainInput?.value.trim() || "",
      projectId: elements.fbProjectIdInput?.value.trim() || "",
      appId: elements.fbAppIdInput?.value.trim() || "",
    };
    saveFirebaseConfig(config);
    alert("Firebase project configuration saved successfully!");
  });

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
    if (elements.docEditContainer) elements.docEditContainer.style.display = "none";
    elements.diffContainer.style.display = "block";
    renderDiffView();
  });

  elements.btnTextTab.addEventListener("click", () => {
    elements.btnTextTab.classList.add("active");
    elements.btnDiffTab.classList.remove("active");
    elements.docTextCanvas.style.display = "block";
    if (elements.docEditContainer) elements.docEditContainer.style.display = "none";
    elements.diffContainer.style.display = "none";
  });

  // Direct Inline Draft Editing in Studio
  if (elements.btnEditDocCopy) {
    elements.btnEditDocCopy.addEventListener("click", () => {
      if (!state.currentContentData || !state.currentContentData.content) {
        alert("Please select or submit a document draft to edit.");
        return;
      }
      const { content } = state.currentContentData;
      const currentVer = content.versions.find((v) => v.id === content.current_version_id) || content.versions[content.versions.length - 1];
      const rawText = currentVer ? currentVer.extracted_text : "";

      elements.docEditTextarea.value = rawText;
      elements.docTextCanvas.style.display = "none";
      elements.diffContainer.style.display = "none";
      elements.btnTextTab.classList.add("active");
      elements.btnDiffTab.classList.remove("active");
      elements.docEditContainer.style.display = "flex";
      elements.docEditTextarea.focus();
    });
  }

  if (elements.btnCancelDocEdit) {
    elements.btnCancelDocEdit.addEventListener("click", () => {
      elements.docEditContainer.style.display = "none";
      elements.docTextCanvas.style.display = "block";
    });
  }

  if (elements.btnSaveDocEdit) {
    elements.btnSaveDocEdit.addEventListener("click", async () => {
      if (!state.currentContentData || !state.currentContentData.content) return;
      const newText = elements.docEditTextarea.value.trim();
      if (!newText) {
        alert("Draft copy cannot be empty.");
        return;
      }

      elements.btnSaveDocEdit.disabled = true;
      elements.btnSaveDocEdit.textContent = "Saving & Re-checking...";

      try {
        await api.submitNewVersion(state.activeContentId, newText);
        elements.docEditContainer.style.display = "none";
        elements.docTextCanvas.style.display = "block";
        await loadContent(state.activeContentId);
      } catch (err) {
        alert("Error saving draft revision: " + err.message);
      } finally {
        elements.btnSaveDocEdit.disabled = false;
        elements.btnSaveDocEdit.textContent = "Save & Re-check";
      }
    });
  }

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
      const isPdf = file.name.toLowerCase().endsWith(".pdf");

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
      } else if (isPdf && elements.modalImagePreviewContainer) {
        elements.modalImagePreviewContainer.style.display = "block";
        if (elements.modalImageFilename) elements.modalImageFilename.textContent = file.name;
        if (elements.modalImageThumb) elements.modalImageThumb.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'></path><polyline points='14 2 14 8 20 8'></polyline><text x='7' y='18' fill='%23ef4444' font-size='6' font-family='sans-serif' font-weight='bold'>PDF</text></svg>";
        if (elements.modalOcrStatus) elements.modalOcrStatus.textContent = "PDF document selected. Extracting text...";
        if (elements.modalOcrProgressBarWrap) {
          elements.modalOcrProgressBarWrap.style.display = "block";
          if (elements.modalOcrProgressBar) elements.modalOcrProgressBar.style.width = "40%";
        }
        if (elements.modalOcrTextSection) elements.modalOcrTextSection.style.display = "none";
        if (elements.modalOcrTextarea) elements.modalOcrTextarea.value = "";

        // Client-side extraction via pdf.js if available
        if (window.pdfjsLib) {
          try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullPdfText = "";
            for (let i = 1; i <= pdfDoc.numPages; i++) {
              const page = await pdfDoc.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item) => item.str).join(" ");
              if (pageText.trim()) {
                fullPdfText += pageText + "\n\n";
              }
            }
            if (elements.modalOcrProgressBar) elements.modalOcrProgressBar.style.width = "100%";
            if (fullPdfText.trim()) {
              if (elements.modalOcrStatus) elements.modalOcrStatus.textContent = `PDF extracted: ${pdfDoc.numPages} page(s) ready`;
              if (elements.modalOcrTextSection) elements.modalOcrTextSection.style.display = "block";
              if (elements.modalOcrTextarea) elements.modalOcrTextarea.value = fullPdfText.trim();
            } else {
              if (elements.modalOcrStatus) elements.modalOcrStatus.textContent = `PDF loaded: ${pdfDoc.numPages} page(s) (Scanned / Visual Document)`;
            }
          } catch (pdfErr) {
            console.warn("Client PDF extraction:", pdfErr);
            if (elements.modalOcrStatus) elements.modalOcrStatus.textContent = "PDF document ready for evaluation";
            if (elements.modalOcrProgressBarWrap) elements.modalOcrProgressBarWrap.style.display = "none";
          }
        } else {
          if (elements.modalOcrStatus) elements.modalOcrStatus.textContent = "PDF document ready for upload & evaluation";
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
  if (elements.docEditContainer) elements.docEditContainer.style.display = "none";
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
  if (elements.docEditContainer) elements.docEditContainer.style.display = "none";
  if (elements.docTextCanvas && (!elements.btnDiffTab || !elements.btnDiffTab.classList.contains("active"))) {
    elements.docTextCanvas.style.display = "block";
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
  if (elements.btnDiffTab && elements.btnDiffTab.classList.contains("active")) {
    renderDiffView();
  }
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

  const matchedList = [];
  for (const f of findings) {
    const isAccepted = f.status === "accepted";
    const isEdited = f.status === "edited";

    // Determine the text to locate in current revision
    let matchStr = "";
    if (isAccepted) {
      if (f.applied_text && fullText.includes(f.applied_text)) {
        matchStr = f.applied_text;
      } else if (f.suggestion && fullText.includes(f.suggestion)) {
        matchStr = f.suggestion;
      } else if (f.excerpt && f.excerpt.text && fullText.includes(f.excerpt.text)) {
        matchStr = f.excerpt.text;
      }
    } else if (isEdited) {
      if (f.applied_text && fullText.includes(f.applied_text)) {
        matchStr = f.applied_text;
      } else if (f.creator_response && fullText.includes(f.creator_response)) {
        matchStr = f.creator_response;
      } else if (f.excerpt && f.excerpt.text && fullText.includes(f.excerpt.text)) {
        matchStr = f.excerpt.text;
      }
    } else if (f.excerpt && f.excerpt.text && fullText.includes(f.excerpt.text)) {
      matchStr = f.excerpt.text;
    }

    if (matchStr) {
      const idx = fullText.indexOf(matchStr);
      if (idx !== -1) {
        matchedList.push({
          ...f,
          matchStr,
          start: idx,
          end: idx + matchStr.length,
          isChanged: (isAccepted || isEdited) && matchStr !== (f.excerpt ? f.excerpt.text : "")
        });
      }
    }
  }

  matchedList.sort((a, b) => a.start - b.start);

  for (const f of matchedList) {
    if (f.start < lastIndex) continue;
    html += escapeHtml(fullText.substring(lastIndex, f.start));

    const isResolved = f.status === "accepted" || f.status === "overridden" || f.status === "edited";
    const isSelected = f.id === state.activeFindingId;
    const isAccepted = f.status === "accepted";
    const isEdited = f.status === "edited";

    let extraClass = "";
    let badgeHtml = "";
    let hoverTitle = "";

    if (isAccepted) {
      extraClass = "highlight-accepted";
      badgeHtml = `<span class="change-tag-badge">✓ Accepted</span>`;
      hoverTitle = `Accepted Fix: '${f.excerpt ? f.excerpt.text : ""}' replaced with '${f.matchStr}'`;
    } else if (isEdited) {
      extraClass = "highlight-edited";
      badgeHtml = `<span class="change-tag-badge">✎ Edited</span>`;
      hoverTitle = `Custom Edit: '${f.excerpt ? f.excerpt.text : ""}' changed to '${f.matchStr}'`;
    } else {
      hoverTitle = `Flagged: ${f.reason}`;
    }

    html += `<span class="highlight-finding highlight-${f.category} ${isSelected ? "selected" : ""} ${isResolved ? "resolved" : ""} ${extraClass}" data-finding-id="${f.id}" title="${escapeHtml(hoverTitle)}">${badgeHtml}${escapeHtml(f.matchStr)}</span>`;
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

  // If content is a PDF document, render the PDF viewer and extracted text
  const pdfUrl = content.pdf_url || (currentVersion && currentVersion.pdf_url);
  if (pdfUrl || content.is_pdf) {
    const isBinary = isHashedOrBinaryText(fullText);
    const hasMeaningfulText = !isBinary && fullText && fullText.trim() && !fullText.startsWith("Document:");

    let html = `
      <div class="studio-pdf-card">
        <div class="studio-pdf-toolbar">
          <div class="pdf-meta-info">
            <span class="badge-pdf-doc">PDF Document</span>
            <span class="pdf-name-label">${escapeHtml(content.file_name || content.title)}</span>
          </div>
          <div class="pdf-toolbar-actions">
            ${pdfUrl ? `<a href="${escapeHtml(pdfUrl)}" target="_blank" rel="noopener noreferrer" class="btn-subtle btn-xs" style="text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
              <span>Open PDF in New Tab</span>
              <span style="font-size: 11px;">↗</span>
            </a>` : ""}
          </div>
        </div>

        ${pdfUrl ? `
        <div class="studio-pdf-viewport">
          <iframe src="${escapeHtml(pdfUrl)}" class="studio-doc-pdf-iframe" title="${escapeHtml(content.title)}"></iframe>
        </div>` : ""}
    `;

    if (hasMeaningfulText) {
      const highlightedTextHtml = generateHighlightedHtml(fullText, findings);
      html += `
        <div class="image-extracted-text-wrap" style="margin-top: 16px;">
          <div class="image-extracted-header">
            <span>Extracted Document Copy</span>
          </div>
          <div class="image-extracted-body">
            <p>${highlightedTextHtml}</p>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="image-visual-notice" style="margin-top: 16px;">
          <div class="notice-title">Document Governance Review Complete</div>
          <p>This PDF document has been evaluated against brand guidelines, approved claims, and asset policies.</p>
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
    if (["claims", "terminology", "tone", "facts", "visual", "accessibility"].includes(state.activeFilter)) {
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
              ${f.detection_method === "llm" ? `<span class="meta-sep">·</span><span class="badge-ai-grounded" style="font-size: 10px; background: rgba(41, 112, 255, 0.15); color: #60a5fa; border: 1px solid rgba(41, 112, 255, 0.3); border-radius: 4px; padding: 1px 5px; font-weight: 500;">AI Grounded</span>` : (f.detection_method === "visual" ? `<span class="meta-sep">·</span><span class="badge-visual-eval" style="font-size: 10px; background: rgba(167, 139, 250, 0.15); color: #c4b5fd; border: 1px solid rgba(167, 139, 250, 0.3); border-radius: 4px; padding: 1px 5px; font-weight: 500;">Visual Inspection</span>` : "")}
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

// ---------------- Revision Diff & Checked Drafts Inspector ----------------

// Word-level LCS Diff Algorithm
function computeWordDiff(textA, textB) {
  if (!textA && !textB) return { diffA: "", diffB: "", changesCount: 0 };
  if (!textA) return { diffA: "", diffB: `<span class="diff-add">${escapeHtml(textB)}</span>`, changesCount: 1 };
  if (!textB) return { diffA: `<span class="diff-del">${escapeHtml(textA)}</span>`, diffB: "", changesCount: 1 };

  const tokensA = textA.match(/\S+|\s+/g) || [];
  const tokensB = textB.match(/\S+|\s+/g) || [];

  const m = tokensA.length;
  const n = tokensB.length;

  if (m * n > 2500000) {
    return {
      diffA: `<span class="diff-del">${escapeHtml(textA)}</span>`,
      diffB: `<span class="diff-add">${escapeHtml(textB)}</span>`,
      changesCount: 1,
    };
  }

  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (tokensA[i] === tokensB[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  let i = m;
  let j = n;
  const resultA = [];
  const resultB = [];
  let changesCount = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokensA[i - 1] === tokensB[j - 1]) {
      resultA.unshift(escapeHtml(tokensA[i - 1]));
      resultB.unshift(escapeHtml(tokensB[j - 1]));
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      resultB.unshift(`<span class="diff-add">${escapeHtml(tokensB[j - 1])}</span>`);
      changesCount++;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      resultA.unshift(`<span class="diff-del">${escapeHtml(tokensA[i - 1])}</span>`);
      changesCount++;
      i--;
    }
  }

  return {
    diffA: resultA.join(""),
    diffB: resultB.join(""),
    changesCount,
  };
}

// Select a draft directly from the Revision Diff strip
async function selectDraftFromDiff(draftId) {
  if (!draftId) return;
  state.activeContentId = draftId;
  if (elements.docSelect) elements.docSelect.value = draftId;
  state.diffCompareV1 = 0;
  state.diffCompareV2 = null;
  await loadContent(draftId);
  renderDiffView();
}

// Change which versions are compared in the Diff view
function changeDiffVersions(v1Index, v2Index) {
  state.diffCompareV1 = parseInt(v1Index, 10);
  state.diffCompareV2 = parseInt(v2Index, 10);
  renderDiffView();
}

// Render Revision Diff View
function renderDiffView() {
  const content = state.currentContentData ? state.currentContentData.content : null;
  const recentDrafts = [...(state.contentList || [])].sort((a, b) => (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0));

  // 1. Build Recently Checked Drafts Strip
  let recentDraftsHtml = "";
  if (recentDrafts.length > 0) {
    recentDraftsHtml = `
      <div class="recent-drafts-panel">
        <div class="recent-drafts-header">
          <div class="recent-drafts-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Recently Checked Drafts (${recentDrafts.length})</span>
          </div>
          <span class="recent-drafts-hint">Select any draft below to inspect its revisions &amp; visual assets</span>
        </div>

        <div class="recent-drafts-scroll">
          ${recentDrafts.map((d) => {
            const isImg = d.is_image || !!d.image_url || (d.file_name && /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(d.file_name));
            const isPdf = d.is_pdf || !!d.pdf_url || (d.file_name && /\.pdf$/i.test(d.file_name));
            const typeBadge = isImg
              ? `<span class="recent-draft-type-badge badge-type-image">🖼️ Image</span>`
              : (isPdf ? `<span class="recent-draft-type-badge badge-type-pdf">📄 PDF</span>` : `<span class="recent-draft-type-badge badge-type-text">✍️ Text</span>`);
            const isActive = content && d.id === content.id;
            const verCount = d.versions ? d.versions.length : 1;
            const dateStr = d.updated_at || d.created_at ? new Date((d.updated_at || d.created_at) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

            return `
              <div class="recent-draft-card ${isActive ? "active" : ""}" onclick="window.brandlens.selectDraftFromDiff('${d.id}')" title="Click to view diff for ${escapeHtml(d.title)}">
                <div class="recent-draft-top">
                  ${typeBadge}
                  <span class="recent-draft-version">v${verCount}</span>
                </div>
                <div class="recent-draft-title">${escapeHtml(d.title || "Untitled Draft")}</div>
                <div class="recent-draft-meta">
                  <span class="status-badge status-${d.status}" style="font-size: 10px; padding: 1px 6px;">${d.status.replace("_", " ")}</span>
                  <span>${dateStr}</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  // If no content selected
  if (!content) {
    elements.diffContainer.innerHTML = `
      <div class="diff-view-wrapper">
        ${recentDraftsHtml}
        <div class="diff-single-version-card">
          <p style="color: var(--muted); text-align: center; padding: 24px;">No draft selected. Please submit or select a draft from above.</p>
        </div>
      </div>
    `;
    return;
  }

  const versions = content.versions || [];
  const currentVersion = versions.find((v) => v.id === content.current_version_id) || versions[versions.length - 1];

  // Visual Assets (Image / PDF)
  const imageUrl = content.image_url || (currentVersion && currentVersion.image_url);
  const isImageDraft = content.is_image || !!imageUrl || (content.file_name && /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(content.file_name));

  const pdfUrl = content.pdf_url || (currentVersion && currentVersion.pdf_url);
  const isPdfDraft = content.is_pdf || !!pdfUrl || (content.file_name && /\.pdf$/i.test(content.file_name));

  let visualAssetHtml = "";
  if (isImageDraft) {
    visualAssetHtml = `
      <div class="diff-visual-card">
        <div class="diff-visual-toolbar">
          <div class="diff-visual-info">
            <span class="badge-visual-asset">Drafted Image Asset</span>
            <span class="diff-filename">${escapeHtml(content.file_name || content.title)}</span>
          </div>
          <div class="diff-visual-actions">
            ${imageUrl ? `<a href="${escapeHtml(imageUrl)}" target="_blank" rel="noopener noreferrer" class="btn-subtle" style="font-size: 11.5px; padding: 4px 10px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
              <span>Open Full Size</span>
              <span>↗</span>
            </a>` : ""}
          </div>
        </div>
        <div class="diff-visual-viewport">
          ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(content.title)}" class="diff-preview-image" />` : `<div style="color: var(--muted); padding: 30px;">[Visual Image Asset Attached]</div>`}
        </div>
      </div>
    `;
  } else if (isPdfDraft) {
    visualAssetHtml = `
      <div class="diff-visual-card">
        <div class="diff-visual-toolbar">
          <div class="diff-visual-info">
            <span class="badge-pdf-doc">Drafted PDF Document</span>
            <span class="diff-filename">${escapeHtml(content.file_name || content.title)}</span>
          </div>
          <div class="diff-visual-actions">
            ${pdfUrl ? `<a href="${escapeHtml(pdfUrl)}" target="_blank" rel="noopener noreferrer" class="btn-subtle" style="font-size: 11.5px; padding: 4px 10px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
              <span>Open PDF in New Tab</span>
              <span>↗</span>
            </a>` : ""}
          </div>
        </div>
        <div class="diff-pdf-viewport">
          ${pdfUrl ? `<iframe src="${escapeHtml(pdfUrl)}" class="diff-preview-iframe" title="${escapeHtml(content.title)}"></iframe>` : `<div style="color: var(--muted); padding: 30px;">[PDF Document Attached]</div>`}
        </div>
      </div>
    `;
  }

  // Multi-version comparison or single baseline version
  let comparisonHtml = "";
  if (versions.length >= 2) {
    const v1Idx = (typeof state.diffCompareV1 === "number" && state.diffCompareV1 < versions.length) ? state.diffCompareV1 : 0;
    const v2Idx = (typeof state.diffCompareV2 === "number" && state.diffCompareV2 < versions.length) ? state.diffCompareV2 : versions.length - 1;

    const vA = versions[v1Idx];
    const vB = versions[v2Idx];

    const v1Num = vA ? (vA.number || (v1Idx + 1)) : 1;
    const v2Num = vB ? (vB.number || (v2Idx + 1)) : 2;

    const textA = vA ? vA.extracted_text : "";
    const textB = vB ? vB.extracted_text : "";

    const diffResult = computeWordDiff(textA, textB);

    comparisonHtml = `
      <div class="diff-comparison-container">
        <div class="diff-active-header">
          <div class="diff-title-row">
            <div class="diff-title-info">
              <span class="recent-draft-version" style="font-size: 12px; background: rgba(99, 102, 241, 0.15); color: #818cf8; padding: 2px 8px; border-radius: 4px;">v${versions.length} Revisions</span>
              <h3 class="diff-doc-title">${escapeHtml(content.title)}</h3>
              <span class="status-badge status-${content.status}">${content.status.replace("_", " ")}</span>
            </div>

            <div class="diff-version-controls">
              <label style="font-size: 12px; color: var(--muted);">Compare:</label>
              <select class="diff-version-select" id="diffSelV1" onchange="window.brandlens.changeDiffVersions(this.value, document.getElementById('diffSelV2').value)">
                ${versions.map((v, idx) => `<option value="${idx}" ${idx === v1Idx ? "selected" : ""}>Version ${v.number || (idx + 1)}${idx === 0 ? " (Baseline)" : ""}</option>`).join("")}
              </select>
              <span style="color: var(--faint);">↔</span>
              <select class="diff-version-select" id="diffSelV2" onchange="window.brandlens.changeDiffVersions(document.getElementById('diffSelV1').value, this.value)">
                ${versions.map((v, idx) => `<option value="${idx}" ${idx === v2Idx ? "selected" : ""}>Version ${v.number || (idx + 1)}${idx === versions.length - 1 ? " (Latest)" : ""}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>

        <div class="diff-comparison-grid">
          <div class="diff-column">
            <div class="diff-col-header">
              <span class="diff-col-version">Version ${v1Num} (Original Baseline)</span>
              <span class="diff-del-badge">Deletions Highlighted</span>
            </div>
            <div class="diff-col-body">
              <p>${diffResult.diffA || `<em style="color: var(--faint);">No text in this version</em>`}</p>
            </div>
          </div>

          <div class="diff-column">
            <div class="diff-col-header">
              <span class="diff-col-version">Version ${v2Num} (Current Revision)</span>
              <span class="diff-add-badge">Additions Highlighted</span>
            </div>
            <div class="diff-col-body">
              <p>${diffResult.diffB || `<em style="color: var(--faint);">No text in this version</em>`}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // Single version (Baseline)
    const baseText = versions.length > 0 ? versions[0].extracted_text : "";
    const findingsCount = (content.findings || []).length;

    comparisonHtml = `
      <div class="diff-single-version-card">
        <div class="diff-single-header">
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span class="diff-version-pill">Version 1 · Initial Baseline Draft</span>
            <span class="status-badge status-${content.status}">${content.status.replace("_", " ")}</span>
          </div>
          <span class="diff-single-status">${findingsCount} brand issues detected in baseline</span>
        </div>

        <div class="diff-single-body">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 700; margin-bottom: 8px; letter-spacing: 0.05em;">Draft Extracted Copy</div>
          <p>${escapeHtml(baseText) || `<em style="color: var(--faint);">Visual image / document asset checked without raw textual body</em>`}</p>
        </div>

        <div class="diff-single-footer">
          <span>💡 <strong>Live Revision Diffs:</strong> This draft is at Version 1 (Baseline). When you accept suggestions, edit text, or submit revised copy, comparative diffs highlighting additions and deletions will automatically appear side-by-side here.</span>
        </div>
      </div>
    `;
  }

  elements.diffContainer.innerHTML = `
    <div class="diff-view-wrapper">
      ${recentDraftsHtml}
      ${visualAssetHtml}
      ${comparisonHtml}
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

  // ── Closed-Loop Learning: Render Proposed Adjustments ──
  const adjContainer = document.getElementById("adjustmentsList");
  if (adjContainer) {
    if (data.pending_adjustments && data.pending_adjustments.length > 0) {
      adjContainer.innerHTML = data.pending_adjustments.map((adj) => `
        <div class="unclear-item" style="border-left: 3px solid #60a5fa; padding-left: 12px; margin-bottom: 12px;">
          <div class="unclear-detail">
            <div class="unclear-head" style="color: var(--text); font-weight: 600;">
              Rule: ${escapeHtml(adj.source_id)} <span style="font-size: 11px; color: #60a5fa; font-weight: 500;">(Context: ${escapeHtml(adj.content_type || "all channels")})</span>
            </div>
            <div class="unclear-stat" style="color: var(--muted); font-size: 12px; margin-top: 3px;">
              ${adj.evidence_count} human decisions · ${adj.override_rate_pct}% override rate · Proposing severity: <strong style="color: #f87171;">${adj.original_severity.toUpperCase()}</strong> → <strong style="color: #fbbf24;">${adj.adjusted_severity.toUpperCase()}</strong>
            </div>
            <div class="unclear-suggestion" style="font-size: 12px; color: var(--faint); margin-top: 4px;">
              <strong>Top justification:</strong> "${escapeHtml(adj.top_reasons[0] || 'Domain-specific phrasing accepted')}"
            </div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn-card-accept" style="padding: 4px 10px; font-size: 12px;" onclick="window.brandlens.approveAdjustment('${adj.id}')">Approve Adjustment</button>
            <button class="btn-subtle" style="padding: 4px 10px; font-size: 12px;" onclick="window.brandlens.rejectAdjustment('${adj.id}')">Dismiss</button>
          </div>
        </div>
      `).join("");
    } else {
      adjContainer.innerHTML = `<div style="font-size: 13px; color: var(--faint); padding: 8px 0;">No pending severity adjustments. System continuously monitors override patterns.</div>`;
    }
  }

  // ── Closed-Loop Learning: Render Guideline Rewrite Suggestions ──
  const rewriteContainer = document.getElementById("rewriteSuggestionsList");
  if (rewriteContainer) {
    if (data.rewrite_suggestions && data.rewrite_suggestions.length > 0) {
      rewriteContainer.innerHTML = data.rewrite_suggestions.map((sugg) => `
        <div class="unclear-item" style="border-left: 3px solid #4ade80; padding-left: 12px; margin-bottom: 12px;">
          <div class="unclear-detail">
            <div class="unclear-head" style="color: var(--text); font-weight: 600;">${escapeHtml(sugg.source_title)}</div>
            <div class="unclear-stat" style="font-size: 12px; color: #4ade80; margin-top: 2px;">${escapeHtml(sugg.evidence_summary)}</div>
            <div style="margin-top: 6px; font-size: 12px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; border: 1px solid var(--border); color: var(--text);">
              <div style="font-weight: 500; font-size: 11px; color: var(--muted); text-transform: uppercase;">Proposed Guideline Amendment</div>
              <p style="margin-top: 4px; white-space: pre-wrap;">${escapeHtml(sugg.suggested_content)}</p>
            </div>
          </div>
          <div style="display: flex; gap: 6px; align-items: flex-start;">
            <button class="btn-primary" style="font-size: 12px; padding: 5px 12px;" onclick="window.brandlens.applyRewriteSuggestion('${sugg.id}', '${sugg.source_id}')">Apply Amendment</button>
          </div>
        </div>
      `).join("");
    } else {
      rewriteContainer.innerHTML = `<div style="font-size: 13px; color: var(--faint); padding: 8px 0;">No active guideline amendment proposals.</div>`;
    }
  }
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

async function approveAdjustment(adjId) {
  await api.approveAdjustment(adjId, state.currentUser.id);
  await loadInsights();
}

async function rejectAdjustment(adjId) {
  await api.rejectAdjustment(adjId);
  await loadInsights();
}

async function applyRewriteSuggestion(suggId, sourceId) {
  const source = state.sources.find((s) => s.id === sourceId);
  const data = state.insights;
  const sugg = (data.rewrite_suggestions || []).find((s) => s.id === suggId);
  if (!source || !sugg) return;

  await api.updateSource(sourceId, {
    type: source.type,
    title: source.title,
    section: source.section,
    effective_date: new Date().toISOString().split("T")[0],
    owner: source.owner,
    content: sugg.suggested_content,
    tags: source.tags,
  });
  alert("Guideline amended successfully with the approved contextual exception.");
  await loadSources();
  await loadInsights();
}

// Attach global methods for inline HTML onclick handlers
window.brandlens = {
  acceptFinding,
  editFinding,
  disputeFinding,
  overrideFinding,
  clarifyRule,
  toggleSource,
  approveAdjustment,
  rejectAdjustment,
  applyRewriteSuggestion,
  selectDraftFromDiff,
  changeDiffVersions,
  signInWithGoogle,
  signOutGoogle,
  showFirebaseConfigModal,
};

// Start application
window.addEventListener("DOMContentLoaded", init);
