// src/firebase/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Faqat API key mavjud bo'lgandagina Firebase initsializatsiya qilinadi
const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.length > 10);
const app = hasFirebaseConfig
  ? (!getApps().length ? initializeApp(firebaseConfig) : getApp())
  : null;

export const auth = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Perform real Google OAuth authentication using Firebase signInWithPopup.
 * NO FAKE USER FALLBACK — haqiqiy autentifikatsiya yoki xatolik.
 */
export const loginWithGoogleOAuth = async () => {
  if (!auth) {
    throw new Error('Firebase konfiguratsiyasi to‘liq emas. Iltimos, Google Identity Services yoki .env sozlamalaridan foydalaning.');
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return {
      uid: user.uid,
      sub: user.providerData?.[0]?.uid || user.uid,
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || null,
      provider: 'google'
    };
  } catch (error) {
    // Hech qanday fake user qaytarmaymiz, haqiqiy xatoni uzatamiz
    throw error;
  }
};

/**
 * Sign in with another Google account for multi-account support.
 */
export const addAnotherGoogleAccount = async () => {
  if (!auth) {
    throw new Error('Firebase konfiguratsiyasi to‘liq emas.');
  }

  try {
    const customProvider = new GoogleAuthProvider();
    customProvider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, customProvider);
    const user = result.user;
    return {
      uid: user.uid,
      sub: user.providerData?.[0]?.uid || user.uid,
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || null,
      provider: 'google'
    };
  } catch (error) {
    throw error;
  }
};

export const logoutGoogleUser = async () => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (err) {
    console.warn("Logout error:", err);
  }
};
