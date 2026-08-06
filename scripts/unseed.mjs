import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = getAuth();
const db = getFirestore();

async function unseed() {
  console.log("Starting unseed process...");
  
  // 1. Delete all dummy complaints
  const complaintsSnapshot = await db.collection("complaints").where("isTestData", "==", true).get();
  console.log(`Found ${complaintsSnapshot.size} dummy complaints to delete.`);
  const batch1 = db.batch();
  complaintsSnapshot.forEach(doc => {
    batch1.delete(doc.ref);
  });
  await batch1.commit();
  console.log("Deleted dummy complaints.");

  // 2. Delete all dummy police officers from Firestore and Auth
  const usersSnapshot = await db.collection("users").where("isTestData", "==", true).get();
  console.log(`Found ${usersSnapshot.size} dummy users to delete.`);
  
  const authUids = [];
  const batch2 = db.batch();
  usersSnapshot.forEach(doc => {
    authUids.push(doc.id);
    batch2.delete(doc.ref);
  });
  
  await batch2.commit();
  console.log("Deleted dummy users from Firestore.");

  if (authUids.length > 0) {
    try {
      await auth.deleteUsers(authUids);
      console.log(`Deleted ${authUids.length} dummy users from Firebase Auth.`);
    } catch (e) {
      console.error("Error deleting from Firebase Auth:", e.message);
    }
  }
  
  console.log("Unseed complete!");
}

unseed().catch(console.error).then(() => process.exit(0));
