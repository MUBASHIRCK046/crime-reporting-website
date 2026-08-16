import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminAuth: any = null;
let adminDb: any = null;
let isFirebaseAdminConfigured = false;

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'crime-assist';
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

if (privateKey && privateKey.trim() !== "" && clientEmail && clientEmail.trim() !== "") {
  isFirebaseAdminConfigured = true;
  if (!getApps().length) {
    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Firebase admin initialization error:', error);
      isFirebaseAdminConfigured = false;
    }
  }

  try {
    adminAuth = getAuth();
    adminDb = getFirestore();
  } catch (error) {
    console.error("Firebase admin services not available:", error);
    isFirebaseAdminConfigured = false;
  }
} else {
  console.warn("Firebase Admin SDK is not configured. Server-side admin operations will fail. Please set FIREBASE_ADMIN_PRIVATE_KEY and FIREBASE_ADMIN_CLIENT_EMAIL in environment variables.");
}

export { adminAuth, adminDb, isFirebaseAdminConfigured };
