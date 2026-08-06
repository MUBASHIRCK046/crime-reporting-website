import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Check if we already initialized to prevent duplicate app errors in Next.js
if (!getApps().length) {
  try {
    if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      // If no private key is provided (e.g., during build or in GCP environment), try default initialization
      initializeApp();
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

let adminAuth: any;
let adminDb: any;

try {
  adminAuth = getAuth();
  adminDb = getFirestore();
} catch (error) {
  console.error("Firebase admin services not available:", error);
}

export { adminAuth, adminDb };
