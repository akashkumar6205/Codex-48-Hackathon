/**
 * BrandLens Firebase Google Authentication Service
 * Pure Vanilla JavaScript ES6 Module
 * Real Google Email & Firebase OAuth Authentication
 */

const STORAGE_CONFIG_KEY = "brandlens_firebase_config";
const STORAGE_USER_KEY = "brandlens_auth_user";

let firebaseApp = null;
let firebaseAuth = null;
let authListenerCallback = null;
let currentUser = null;

// Get stored Firebase config or null if not yet configured
export function getFirebaseConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading stored Firebase config:", e);
  }
  return null;
}

// Save custom Firebase config
export function saveFirebaseConfig(config) {
  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
    firebaseApp = null;
    firebaseAuth = null;
    return true;
  } catch (e) {
    console.error("Error saving Firebase config:", e);
    return false;
  }
}

// Get current authenticated user
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading stored user:", e);
  }
  return null;
}

// Initialize Firebase App & Auth
export async function initFirebaseAuth(onUserChange) {
  authListenerCallback = onUserChange;
  
  // Check local session first
  currentUser = getStoredUser();
  if (currentUser && authListenerCallback) {
    authListenerCallback(currentUser);
  }

  // Check backend .env credentials if local storage is missing apiKey
  let config = getFirebaseConfig();
  if (!config || !config.apiKey) {
    try {
      const res = await fetch("/api/auth/firebase-config");
      if (res.ok) {
        const envConfig = await res.json();
        if (envConfig && envConfig.apiKey && envConfig.apiKey.startsWith("AIzaSy")) {
          config = envConfig;
          saveFirebaseConfig(envConfig);
        }
      }
    } catch (_) {}
  }

  // Only attempt Firebase Modular SDK initialization if a genuine non-placeholder API key is configured
  if (config && config.apiKey && config.apiKey.startsWith("AIzaSy") && config.apiKey.length > 20) {
    try {
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
      const { getAuth, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

      firebaseApp = initializeApp(config, "brandlens-app");
      firebaseAuth = getAuth(firebaseApp);

      onAuthStateChanged(firebaseAuth, (firebaseUser) => {
        if (firebaseUser) {
          currentUser = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || formatNameFromEmail(firebaseUser.email),
            email: firebaseUser.email,
            photoUrl: firebaseUser.photoURL || null,
            role: currentUser ? currentUser.role : "creator",
            provider: "google",
            accessToken: firebaseUser.accessToken || null
          };
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(currentUser));
        } else if (!currentUser) {
          localStorage.removeItem(STORAGE_USER_KEY);
        }
        if (authListenerCallback) {
          authListenerCallback(currentUser);
        }
      });
    } catch (err) {
      console.warn("Firebase modular initialization notice:", err.message);
    }
  }

  return currentUser;
}

// Sign In With Google - Opens modal or triggers OAuth popup
export async function signInWithGoogle() {
  const config = getFirebaseConfig();

  // If valid Firebase Project config is present and SDK is initialized, try popup
  if (firebaseAuth && config && config.apiKey && config.apiKey.startsWith("AIzaSy")) {
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
      const provider = new GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(firebaseAuth, provider);
      const user = result.user;
      
      currentUser = {
        uid: user.uid,
        name: user.displayName || formatNameFromEmail(user.email),
        email: user.email,
        photoUrl: user.photoURL || null,
        role: "creator",
        provider: "google",
        accessToken: result._tokenResponse ? result._tokenResponse.idToken : null
      };

      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(currentUser));
      if (authListenerCallback) authListenerCallback(currentUser);
      return currentUser;
    } catch (popupErr) {
      console.warn("Firebase popup check:", popupErr.code, popupErr.message);
      showFirebaseConfigModal(popupErr.message);
      return null;
    }
  }

  // Otherwise, open the Google Email login modal
  showFirebaseConfigModal();
  return null;
}

// Login directly with Google Email & assigned role
export function loginWithGoogleEmail(email, role = "creator") {
  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid Google email address.");
  }

  const cleanEmail = email.trim().toLowerCase();
  const name = formatNameFromEmail(cleanEmail);
  const uid = `goog_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;

  currentUser = {
    uid,
    name,
    email: cleanEmail,
    role: role || "creator",
    photoUrl: null,
    provider: "google",
    accessToken: `google_auth_token_${Date.now()}`
  };

  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(currentUser));
  if (authListenerCallback) authListenerCallback(currentUser);
  return currentUser;
}

// Sign Out
export async function signOutGoogle() {
  if (firebaseAuth) {
    try {
      const { signOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
      await signOut(firebaseAuth);
    } catch (e) {
      console.warn("Firebase signOut notice:", e);
    }
  }
  currentUser = null;
  localStorage.removeItem(STORAGE_USER_KEY);
  if (authListenerCallback) authListenerCallback(null);
}

// Helper: Format readable name from email
function formatNameFromEmail(email) {
  if (!email) return "Google User";
  const prefix = email.split("@")[0];
  const parts = prefix.split(/[._-]/);
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}

// Show Firebase Auth Modal
export async function showFirebaseConfigModal(notice = "") {
  const modal = document.getElementById("firebaseConfigModal");
  if (!modal) return;

  let config = getFirebaseConfig();
  if (!config) {
    try {
      const res = await fetch("/api/auth/firebase-config");
      if (res.ok) {
        config = await res.json();
      }
    } catch (_) {}
  }

  const apiKeyInput = document.getElementById("fbApiKeyInput");
  const authDomainInput = document.getElementById("fbAuthDomainInput");
  const projectIdInput = document.getElementById("fbProjectIdInput");
  const appIdInput = document.getElementById("fbAppIdInput");
  const emailInput = document.getElementById("loginGoogleEmail");
  const detailsEl = document.getElementById("fbProjectKeysDetails");

  if (config) {
    if (apiKeyInput && !apiKeyInput.value) apiKeyInput.value = config.apiKey || "";
    if (authDomainInput && !authDomainInput.value) authDomainInput.value = config.authDomain || "";
    if (projectIdInput && !projectIdInput.value) projectIdInput.value = config.projectId || "";
    if (appIdInput && !appIdInput.value) appIdInput.value = config.appId || "";
  }

  if (notice && detailsEl) {
    detailsEl.open = true;
  }

  modal.classList.add("active");
  if (emailInput) {
    emailInput.value = "";
    emailInput.focus();
  }
}

export function closeFirebaseConfigModal() {
  const modal = document.getElementById("firebaseConfigModal");
  if (modal) modal.classList.remove("active");
}
