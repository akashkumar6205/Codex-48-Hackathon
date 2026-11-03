/**
 * BrandLens Firebase Service: Authentication & Firestore Integration
 * Pure Vanilla JavaScript ES6 Module
 * Target Firebase Project: codex-48
 *
 * Implements:
 * 1. Email/Password Authentication (Sign In & Sign Up)
 * 2. Role-based user profile creation in Firestore
 * 3. Firestore database storage for drafts, finding resolutions, and guidelines
 * 4. Google OAuth popup fallback
 */

const STORAGE_CONFIG_KEY = "brandlens_firebase_config";
const STORAGE_USER_KEY = "brandlens_auth_user";

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBgGrE67pw5feJCxndu15fmf3lg2ruM8ag",
  authDomain: "codex-48.firebaseapp.com",
  projectId: "codex-48",
  storageBucket: "codex-48.firebasestorage.app",
  messagingSenderId: "33915284795",
  appId: "1:33915284795:web:9a612f7e335aeade939b1e"
};

let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;
let authListenerCallback = null;
let currentUser = null;

// Get stored Firebase config or fallback to codex-48 default
export function getFirebaseConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading stored Firebase config:", e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(config) {
  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
    firebaseApp = null;
    firebaseAuth = null;
    firestoreDb = null;
    return true;
  } catch (e) {
    console.error("Error saving Firebase config:", e);
    return false;
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading stored user:", e);
  }
  return null;
}

// Initialize Firebase App, Auth, and Firestore
export async function initFirebaseAuth(onUserChange) {
  authListenerCallback = onUserChange;
  
  // Check local session first for instantaneous UI rendering
  currentUser = getStoredUser();
  if (currentUser && authListenerCallback) {
    authListenerCallback(currentUser);
  }

  let config = getFirebaseConfig();
  if (!config || !config.apiKey) {
    try {
      const res = await fetch("/api/auth/firebase-config");
      if (res.ok) {
        const envConfig = await res.json();
        if (envConfig && envConfig.apiKey) {
          config = envConfig;
          saveFirebaseConfig(envConfig);
        }
      }
    } catch (_) {}
  }

  if (config && config.apiKey && config.apiKey.startsWith("AIzaSy")) {
    try {
      const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
      const { getAuth, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
      const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

      const existingApps = getApps();
      firebaseApp = existingApps.length > 0 ? existingApps[0] : initializeApp(config, "brandlens-codex-48");
      firebaseAuth = getAuth(firebaseApp);
      firestoreDb = getFirestore(firebaseApp);

      onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
        if (firebaseUser) {
          // Fetch user role and profile from Firestore if available
          let role = "creator";
          try {
            const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const userDoc = await getDoc(doc(firestoreDb, "users", firebaseUser.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              if (data.role) role = data.role;
            }
          } catch (e) {
            console.warn("Firestore user profile fetch note:", e);
          }

          currentUser = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || formatNameFromEmail(firebaseUser.email),
            email: firebaseUser.email,
            photoUrl: firebaseUser.photoURL || null,
            role: currentUser && currentUser.role ? currentUser.role : role,
            provider: "firebase_email",
            accessToken: await firebaseUser.getIdToken()
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
      console.warn("Firebase initialization notice:", err.message);
    }
  }

  return currentUser;
}

// Sign In With Email & Password
export async function signInWithEmailPassword(email, password, role = "creator") {
  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  await ensureSdkReady();

  if (firebaseAuth) {
    const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
    const { doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

    const cred = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
    const user = cred.user;

    // Check / Sync profile in Firestore
    let userRole = role;
    try {
      const uDocRef = doc(firestoreDb, "users", user.uid);
      const uSnap = await getDoc(uDocRef);
      if (uSnap.exists()) {
        userRole = uSnap.data().role || role;
      } else {
        await setDoc(uDocRef, {
          email: user.email,
          displayName: user.displayName || formatNameFromEmail(user.email),
          role: userRole,
          createdAt: Date.now()
        }, { merge: true });
      }
    } catch (fsErr) {
      console.warn("Firestore user record note:", fsErr);
    }

    currentUser = {
      uid: user.uid,
      name: user.displayName || formatNameFromEmail(user.email),
      email: user.email,
      role: userRole,
      photoUrl: user.photoURL || null,
      provider: "firebase_email",
      accessToken: await user.getIdToken()
    };

    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(currentUser));
    if (authListenerCallback) authListenerCallback(currentUser);
    closeFirebaseConfigModal();
    return currentUser;
  }

  throw new Error("Firebase Authentication is initializing. Please verify credentials in .env.");
}

// Sign Up / Register New Account With Email & Password
export async function signUpWithEmailPassword(email, password, displayName, role = "creator") {
  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  await ensureSdkReady();

  if (firebaseAuth) {
    const { createUserWithEmailAndPassword, updateProfile } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

    const cred = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
    const user = cred.user;

    const formattedName = displayName && displayName.trim() ? displayName.trim() : formatNameFromEmail(email);
    try {
      await updateProfile(user, { displayName: formattedName });
    } catch (_) {}

    // Save user document in Firestore 'users' collection
    try {
      await setDoc(doc(firestoreDb, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: formattedName,
        role: role || "creator",
        createdAt: Date.now()
      });
    } catch (fsErr) {
      console.warn("Firestore record creation note:", fsErr);
    }

    currentUser = {
      uid: user.uid,
      name: formattedName,
      email: user.email,
      role: role || "creator",
      photoUrl: null,
      provider: "firebase_email",
      accessToken: await user.getIdToken()
    };

    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(currentUser));
    if (authListenerCallback) authListenerCallback(currentUser);
    closeFirebaseConfigModal();
    return currentUser;
  }

  throw new Error("Firebase Auth SDK not ready.");
}

// Firestore Database Integration: Save Content Item to Firestore
export async function saveContentToFirestore(contentItem) {
  if (!firestoreDb) return;
  try {
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    await setDoc(doc(firestoreDb, "content", contentItem.id), {
      ...contentItem,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    console.warn("Firestore save draft notice:", err);
  }
}

// Firestore Database Integration: Load Content Items from Firestore
export async function loadContentFromFirestore() {
  if (!firestoreDb) return [];
  try {
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const snap = await getDocs(collection(firestoreDb, "content"));
    const items = [];
    snap.forEach((d) => items.push(d.data()));
    return items;
  } catch (err) {
    console.warn("Firestore load drafts notice:", err);
    return [];
  }
}

// Sign In With Google (OAuth Popup)
export async function signInWithGoogle() {
  await ensureSdkReady();

  if (firebaseAuth) {
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
      const { doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

      const provider = new GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");

      const result = await signInWithPopup(firebaseAuth, provider);
      const user = result.user;

      let role = "creator";
      try {
        const uSnap = await getDoc(doc(firestoreDb, "users", user.uid));
        if (uSnap.exists()) {
          role = uSnap.data().role || "creator";
        } else {
          await setDoc(doc(firestoreDb, "users", user.uid), {
            email: user.email,
            displayName: user.displayName || formatNameFromEmail(user.email),
            role: "creator",
            createdAt: Date.now()
          });
        }
      } catch (_) {}

      currentUser = {
        uid: user.uid,
        name: user.displayName || formatNameFromEmail(user.email),
        email: user.email,
        photoUrl: user.photoURL || null,
        role: role,
        provider: "google",
        accessToken: await user.getIdToken()
      };

      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(currentUser));
      if (authListenerCallback) authListenerCallback(currentUser);
      closeFirebaseConfigModal();
      return currentUser;
    } catch (popupErr) {
      console.warn("Google popup error:", popupErr.code, popupErr.message);
      showFirebaseConfigModal(popupErr.message);
      return null;
    }
  }

  showFirebaseConfigModal();
  return null;
}

// Sign Out
export async function signOutFirebase() {
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
  if (!email) return "BrandLens User";
  const prefix = email.split("@")[0];
  const parts = prefix.split(/[._-]/);
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}

// Helper to ensure SDK is loaded
async function ensureSdkReady() {
  if (firebaseAuth && firestoreDb) return;
  let config = getFirebaseConfig();
  if (!config || !config.apiKey) {
    try {
      const res = await fetch("/api/auth/firebase-config");
      if (res.ok) {
        config = await res.json();
        saveFirebaseConfig(config);
      }
    } catch (_) {}
  }
  if (config && config.apiKey) {
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const existing = getApps();
    firebaseApp = existing.length > 0 ? existing[0] : initializeApp(config, "brandlens-codex-48");
    firebaseAuth = getAuth(firebaseApp);
    firestoreDb = getFirestore(firebaseApp);
  }
}

// Show Firebase Modal
export function showFirebaseConfigModal(notice = "") {
  const modal = document.getElementById("firebaseConfigModal");
  if (!modal) return;

  const noticeEl = document.getElementById("fbAuthNotice");
  if (noticeEl) {
    if (notice) {
      noticeEl.textContent = notice;
      noticeEl.style.display = "block";
    } else {
      noticeEl.style.display = "none";
    }
  }

  modal.classList.add("active");
  const emailInput = document.getElementById("loginFirebaseEmail");
  if (emailInput) {
    emailInput.focus();
  }
}

export function closeFirebaseConfigModal() {
  const modal = document.getElementById("firebaseConfigModal");
  if (modal) modal.classList.remove("active");
}
