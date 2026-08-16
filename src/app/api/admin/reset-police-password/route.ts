import { NextResponse } from "next/server";
import { adminAuth, adminDb, isFirebaseAdminConfigured } from "@/firebase/server";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

function generateSecureTemporaryPassword(length: number = 12): string {
  const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowers = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const specials = "@#$%!*&";
  
  let pwdChars = [
    uppers[crypto.randomInt(uppers.length)],
    lowers[crypto.randomInt(lowers.length)],
    digits[crypto.randomInt(digits.length)],
    specials[crypto.randomInt(specials.length)]
  ];
  
  const allChars = uppers + lowers + digits + specials;
  for (let i = pwdChars.length; i < length; i++) {
    pwdChars.push(allChars[crypto.randomInt(allChars.length)]);
  }
  
  // Shuffle cryptographically
  return pwdChars.sort(() => crypto.randomInt(3) - 1).join('');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, adminUid } = body;

    if (!uid || !adminUid) {
      return NextResponse.json({ error: "Missing required fields (UID or Admin UID)" }, { status: 400 });
    }

    // Generate new secure temporary password
    const newTemporaryPassword = generateSecureTemporaryPassword(12);
    let policeId = "POL-2026";
    let officerName = "Police Officer";

    if (isFirebaseAdminConfigured && adminAuth && adminDb) {
      // Verify the caller is an admin
      try {
        const adminDoc = await adminDb.collection("users").doc(adminUid).get();
        if (adminDoc.exists && adminDoc.data()?.role !== "admin") {
          return NextResponse.json({ error: "Unauthorized access. Admin role required." }, { status: 403 });
        }
      } catch (authErr) {
        console.warn("Admin verification check warning:", authErr);
      }

      // Update in Firebase Auth
      try {
        await adminAuth.updateUser(uid, {
          password: newTemporaryPassword
        });
      } catch (authErr: any) {
        console.warn("adminAuth.updateUser warning:", authErr);
        return NextResponse.json({ error: `Auth password update failed: ${authErr.message}` }, { status: 400 });
      }

      // Get current officer data from Firestore
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        policeId = data?.policeId || data?.badgeNumber || `POL-${uid.slice(-4)}`;
        officerName = data?.name || "Police Officer";
      }

      await adminDb.collection("users").doc(uid).update({
        mustChangePassword: true,
        temporaryPassword: newTemporaryPassword,
        updatedAt: new Date().toISOString()
      });
    } else {
      // ----------------------------------------------------
      // FALLBACK MODE: Use Client Firebase SDK on the server
      // ----------------------------------------------------
      try {
        const { initializeApp: clientInitializeApp, getApps: clientGetApps, getApp: clientGetApp } = await import("firebase/app");
        const { getFirestore: clientGetFirestore, doc: clientDoc, getDoc: clientGetDoc, updateDoc: clientUpdateDoc } = await import("firebase/firestore");

        const clientFirebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
        };

        const fallbackAppName = "police-creation-fallback";
        const fallbackApp = !clientGetApps().some(app => app.name === fallbackAppName)
          ? clientInitializeApp(clientFirebaseConfig, fallbackAppName)
          : clientGetApp(fallbackAppName);

        const fallbackDb = clientGetFirestore(fallbackApp);

        // Get current officer data from Firestore
        const userDoc = await clientGetDoc(clientDoc(fallbackDb, "users", uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          policeId = data?.policeId || data?.badgeNumber || `POL-${uid.slice(-4)}`;
          officerName = data?.name || "Police Officer";
        }

        await clientUpdateDoc(clientDoc(fallbackDb, "users", uid), {
          mustChangePassword: true,
          temporaryPassword: newTemporaryPassword,
          updatedAt: new Date().toISOString()
        });
      } catch (fallbackErr: any) {
        console.warn("Fallback reset password warning:", fallbackErr);
        return NextResponse.json({ error: `Failed to reset password: ${fallbackErr.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      policeId,
      officerName,
      newTemporaryPassword,
      message: "Password reset successfully. The officer must change the password on next login."
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: error.message || "Failed to reset password" }, { status: 500 });
  }
}
