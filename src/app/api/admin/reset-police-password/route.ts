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
    const { uid, adminUid, adminIdToken } = body;

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
      // FALLBACK MODE: Use Firestore REST API (works in Node.js server without Admin SDK)
      // The client-side Firestore SDK CANNOT be used in server-side API routes because
      // it depends on browser-only APIs and will hang indefinitely.
      // NOTE: Without Admin SDK, we can only store the password in Firestore (not reset Firebase Auth).
      // ----------------------------------------------------
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "crime-assist";
      const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

      if (!apiKey) {
        return NextResponse.json({ error: "Firebase API key is not configured." }, { status: 500 });
      }

      // Get current officer data from Firestore REST API
      const getHeaders: Record<string, string> = {};
      if (adminIdToken) getHeaders["Authorization"] = `Bearer ${adminIdToken}`;

      const getRes = await fetch(`${firestoreBase}/users/${uid}?key=${apiKey}`, { headers: getHeaders });
      if (getRes.ok) {
        const docData = await getRes.json();
        const fields = docData.fields || {};
        policeId = fields.policeId?.stringValue || fields.badgeNumber?.stringValue || `POL-${uid.slice(-4)}`;
        officerName = fields.name?.stringValue || "Police Officer";
      }

      // Update Firestore via REST API (PATCH only the changed fields)
      // The Firestore rule `allow update: if isPoliceOrAdmin()` allows the admin to update any user doc.
      const patchBody = {
        fields: {
          mustChangePassword: { booleanValue: true },
          temporaryPassword: { stringValue: newTemporaryPassword },
          updatedAt: { stringValue: new Date().toISOString() }
        }
      };

      const patchHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (adminIdToken) patchHeaders["Authorization"] = `Bearer ${adminIdToken}`;

      const patchRes = await fetch(
        `${firestoreBase}/users/${uid}?updateMask.fieldPaths=mustChangePassword&updateMask.fieldPaths=temporaryPassword&updateMask.fieldPaths=updatedAt&key=${apiKey}`,
        {
          method: "PATCH",
          headers: patchHeaders,
          body: JSON.stringify(patchBody)
        }
      );

      if (!patchRes.ok) {
        const patchErr = await patchRes.json();
        return NextResponse.json({ error: `Failed to update officer record: ${patchErr?.error?.message || "Unknown error"}` }, { status: 500 });
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
