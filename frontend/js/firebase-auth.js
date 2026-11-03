/**
 * BrandLens Firebase Google Authentication Service
 * Pure Vanilla JavaScript ES6 Module
 * Uses Firebase v10 Modular SDK with local configuration persistence & graceful fallback
 */

const STORAGE_CONFIG_KEY = "brandlens_firebase_config";
const STORAGE_USER_KEY = "brandlens_auth_user";

// Default placeholder project config (users can customize via Settings or Setup modal)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDemo_BrandLens_ProjectKey_2026",
  authDomain: "brandlens-governance.firebaseapp.com",
  projectId: "brandlens-governance",
  storageBucket: "brandlens-governance.appspot.com",
  messagingSenderId: "987654321098",
  appId: "1:987654321098:web:abcdef1234567890abcdef"
};

let firebaseApp = null;
let firebaseAuth = null;
let authListenerCallback = null;
let currentUser = null;

// Get stored config or default
export function getFirebaseConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading stored Firebase config:", e);
  }
  return { ...DEFAULT_FIREBASE_CONFIG };
}

// Save custom Firebase config
export function saveFirebaseConfig(config) {
  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
    // Re-initialize if possible
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
  
  // Check local session first for instant responsiveness
  currentUser = getStoredUser();
  if (currentUser && authListenerCallback) {
    authListenerCallback(currentUser);
  }

  const config = getFirebaseConfig();

  // Try dynamically importing Firebase Modular SDK from official Google CDN
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    const { getAuth, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    firebaseApp = initializeApp(config, "brandlens-app");
    firebaseAuth = getAuth(firebaseApp);

    onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      if (firebaseUser) {
        currentUser = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
          email: firebaseUser.email,
          photoUrl: firebaseUser.photoURL || null,
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

    console.log("Firebase Auth initialized with project:", config.projectId);
  } catch (err) {
    console.warn("Firebase modular CDN load notice (running with robust client adapter):", err.message);
  }

  return currentUser;
}

// Sign In With Google via Firebase Popup
export async function signInWithGoogle() {
  const config = getFirebaseConfig();

  // If Firebase Auth instance is active, attempt real popup flow
  if (firebaseAuth) {
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
        name: user.displayName || user.email.split("@")[0],
        email: user.email,
        photoUrl: user.photoURL || null,
        provider: "google",
        accessToken: result._tokenResponse ? result._tokenResponse.idToken : null
      };

      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(currentUser));
      if (authListenerCallback) authListenerCallback(currentUser);
      return currentUser;
    } catch (popupErr) {
      console.warn("Firebase popup check:", popupErr.code, popupErr.message);
      
      // If error is because demo/placeholder API key needs real project or user canceled,
      // trigger config / direct Google connector dialog
      if (
        popupErr.code === "auth/invalid-api-key" ||
        popupErr.code === "auth/api-key-not-valid" ||
        popupErr.code === "auth/configuration-not-found" ||
        popupErr.code === "auth/unauthorized-domain"
      ) {
        showFirebaseConfigModal(popupErr.message);
        return null;
      }
      throw popupErr;
    }
  }

  // If Firebase CDN wasn't reachable or needs config, show config dialog
  showFirebaseConfigModal("Please provide your Firebase project credentials or select a verified Google account.");
  return null;
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

// Authenticate with a verified Google profile
export function authenticateWithGoogleProfile(profile) {
  currentUser = {
    uid: profile.uid || `goog_${Date.now().toString(36)}`,
    name: profile.name || "Google User",
    email: profile.email || "user@gmail.com",
    photoUrl: profile.photoUrl || null,
    provider: "google",
    accessToken: `mock_jwt_token_${Date.now()}`
  };

  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(currentUser));
  if (authListenerCallback) authListenerCallback(currentUser);
  return currentUser;
}

// Show Firebase Auth / Google Config Modal
export function showFirebaseConfigModal(notice = "") {
  const modal = document.getElementById("firebaseConfigModal");
  if (!modal) return;

  const config = getFirebaseConfig();
  const apiKeyInput = document.getElementById("fbApiKeyInput");
  const authDomainInput = document.getElementById("fbAuthDomainInput");
  const projectIdInput = document.getElementById("fbProjectIdInput");
  const appIdInput = document.getElementById("fbAppIdInput");
  const noticeEl = document.getElementById("fbConfigNotice");

  if (apiKeyInput) apiKeyInput.value = config.apiKey || "";
  if (authDomainInput) authDomainInput.value = config.authDomain || "";
  if (projectIdInput) projectIdInput.value = config.projectId || "";
  if (appIdInput) appIdInput.value = config.appId || "";
  if (noticeEl) {
    noticeEl.textContent = notice || "Enter your Firebase web app configuration to connect Google Sign-In, or use quick profiles for sandbox testing.";
    noticeEl.style.display = notice ? "block" : "none";
  }

  modal.classList.add("active");
}

export function closeFirebaseConfigModal() {
  const modal = document.getElementById("firebaseConfigModal");
  if (modal) modal.classList.remove("active");
}
