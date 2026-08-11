/**
 * ====================================================
 * FIREBASE CLIENT SETUP
 * ====================================================
 * Beginner Note: This file connects the User's Browser (Chrome, Safari, etc.)
 * to Firebase. When someone tries to log in on the website, this file talks
 * to Firebase and asks "Is this password correct?".
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// These are our secret keys loaded from .env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only if it hasn't been initialized already!
// This stops Next.js from throwing an error if the page reloads.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Connect the services we want to use!
const auth = getAuth(app);         // For logging in
const db = getFirestore(app);      // For saving text data (complaints)
const storage = getStorage(app);   // For saving images/videos

// Analytics only runs in the browser environment (client-side)
let analytics = null;
if (typeof window !== "undefined" && firebaseConfig.measurementId) {
  import("firebase/analytics").then(({ getAnalytics, isSupported }) => {
    isSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    });
  });
}

export { app, auth, db, storage, analytics };

/**
 * Beginner Note: We "export" app, auth, db, and storage so that ANY
 * other file in our project can use them! If we didn't export them,
 * we couldn't use Firebase anywhere else.
 * ====================================================
 */
