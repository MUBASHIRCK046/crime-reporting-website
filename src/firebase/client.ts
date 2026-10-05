/**
 * ====================================================
 * FIREBASE CLIENT SETUP (src/firebase/client.ts)
 * ====================================================
 * Connects the web application to Firebase Auth, Firestore, and Storage.
 *
 * Implements lazy singleton initialization with Firebase `_delegate` proxies.
 * This PERMANENTLY prevents:
 * 1. Next.js Turbopack / SSR crash: "Service firestore is not available"
 * 2. Firebase modular runtime validation: "Expected first argument to collection() / doc() to be a CollectionReference..."
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD6fGNTldXE3qUpmbg3fvs0AgbFPc3fGxA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "crime-assist.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "crime-assist",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "crime-assist.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "77593118812",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:77593118812:web:339f4238177358e83b3e99",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-RP37FWSYD1"
};

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _storage: FirebaseStorage | null = null;

/**
 * Returns the singleton FirebaseApp instance, initializing it lazily.
 */
export function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return _app;
}

/**
 * Returns the singleton Firestore instance.
 */
export function getDb(): Firestore {
  if (!_db) {
    const appInstance = getFirebaseApp();
    try {
      _db = getFirestore(appInstance);
    } catch {
      try {
        _db = initializeFirestore(appInstance, {
          experimentalAutoDetectLongPolling: true
        });
      } catch {
        _db = getFirestore(appInstance);
      }
    }
  }
  return _db;
}

/**
 * Returns the singleton Auth instance.
 */
export function getAuthClient(): Auth {
  if (!_auth) {
    const appInstance = getFirebaseApp();
    _auth = getAuth(appInstance);
  }
  return _auth;
}

/**
 * Returns the singleton Cloud Storage instance.
 */
export function getStorageClient(): FirebaseStorage {
  if (!_storage) {
    const appInstance = getFirebaseApp();
    _storage = getStorage(appInstance);
  }
  return _storage;
}

/**
 * Helper to create a proxy that seamlessly unwraps via `_delegate` for
 * Firebase's internal `getModularInstance()` check (used by `collection()`, `doc()`, etc.)
 */
function createFirebaseProxy<T extends object>(getInstance: () => T): T {
  return new Proxy({} as T, {
    get(target, prop, receiver) {
      if (prop === "_delegate") {
        return getInstance();
      }
      const instance = getInstance();
      const val = (instance as any)[prop];
      if (typeof val === "function") {
        return val.bind(instance);
      }
      if (val !== undefined) {
        return val;
      }
      return Reflect.get(target, prop, receiver);
    },
    getPrototypeOf() {
      return Object.getPrototypeOf(getInstance());
    },
    has(_, prop) {
      return prop === "_delegate" || prop in getInstance();
    }
  });
}

// Exported Proxies that satisfy both Next.js SSR (no eager execution) and Firebase modular type checks (`_delegate`)
export const app: FirebaseApp = createFirebaseProxy(getFirebaseApp);
export const auth: Auth = createFirebaseProxy(getAuthClient);
export const db: Firestore = createFirebaseProxy(getDb);
export const storage: FirebaseStorage = createFirebaseProxy(getStorageClient);

// Initialize Analytics on client-side only
export let analytics: any = null;
if (typeof window !== "undefined" && firebaseConfig.measurementId) {
  import("firebase/analytics")
    .then(({ getAnalytics, isSupported }) => {
      isSupported().then((supported) => {
        if (supported) {
          analytics = getAnalytics(getFirebaseApp());
        }
      });
    })
    .catch(() => {});
}
