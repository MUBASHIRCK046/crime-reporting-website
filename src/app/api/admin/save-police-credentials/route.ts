import { NextResponse } from "next/server";
import { adminAuth, adminDb, isFirebaseAdminConfigured } from "@/firebase/server";

function validatePasswordFormat(pwd: string): boolean {
  if (pwd.length !== 12) return false;
  const upperCount = (pwd.match(/[A-Z]/g) || []).length;
  const lowerCount = (pwd.match(/[a-z]/g) || []).length;
  const digitCount = (pwd.match(/[0-9]/g) || []).length;
  const specialCount = (pwd.match(/[@#$%!*&]/g) || []).length;
  return upperCount === 1 && lowerCount === 2 && specialCount === 1 && digitCount === 8;
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, name, policeId, policeEmail, badgeNumber, password, adminUid, adminIdToken } = body;

    if (!uid || !policeId || !policeEmail || !badgeNumber || !adminUid) {
      return NextResponse.json({ error: "Missing required fields (UID, Police ID, Police Email, Badge Number, or Admin UID)" }, { status: 400 });
    }

    if (password && password.trim() !== "" && !validatePasswordFormat(password)) {
      return NextResponse.json({ error: "Password must be exactly 12 characters and contain 1 uppercase letter, 2 lowercase letters, 1 special character, and 8 numbers." }, { status: 400 });
    }

    if (isFirebaseAdminConfigured && adminAuth && adminDb) {
      // 1. Verify the caller is an admin
      try {
        const adminDoc = await adminDb.collection("users").doc(adminUid).get();
        if (adminDoc.exists && adminDoc.data()?.role !== "admin") {
          return NextResponse.json({ error: "Unauthorized access. Admin role required." }, { status: 403 });
        }
      } catch (authErr: any) {
        console.warn("Admin verification check warning:", authErr.message || authErr);
      }
 
      // 1.5 Check if credentials already exist for this officer (Idempotence)
      try {
        const officerDoc = await adminDb.collection("users").doc(uid).get();
        if (officerDoc.exists) {
          const officerData = officerDoc.data();
          if (officerData?.credentialsGenerated || officerData?.policeId) {
            return NextResponse.json({
              success: true,
              message: "Credentials have already been generated for this officer.",
              alreadyGenerated: true,
              policeId: officerData.policeId,
              policeEmail: officerData.policeEmail || `${officerData.policeId}@police.gov`,
              badgeNumber: officerData.badgeNumber,
              temporaryPassword: officerData.temporaryPassword || "********"
            });
          }
        }
      } catch (checkErr: any) {
        console.warn("Idempotence check error:", checkErr);
      }

      // 2. Validate Police ID uniqueness
      try {
        const querySnapshot = await adminDb.collection("users")
          .where("policeId", "==", policeId)
          .get();
        
        const duplicate = querySnapshot.docs.find((doc: any) => doc.id !== uid);
        if (duplicate) {
          return NextResponse.json({ error: `The Police ID '${policeId}' is already assigned to another officer (${duplicate.data().name}).` }, { status: 400 });
        }
      } catch (dbErr: any) {
        console.warn("Police ID uniqueness check warning:", dbErr.message || dbErr);
      }

      // 2.5 Validate Police Email uniqueness
      try {
        const emailQuerySnapshot = await adminDb.collection("users")
          .where("policeEmail", "==", policeEmail)
          .get();
        
        const duplicateEmail = emailQuerySnapshot.docs.find((doc: any) => doc.id !== uid);
        if (duplicateEmail) {
          return NextResponse.json({ error: `The Police Email '${policeEmail}' is already assigned to another officer (${duplicateEmail.data().name}).` }, { status: 400 });
        }
      } catch (dbErr: any) {
        console.warn("Police Email uniqueness check warning:", dbErr.message || dbErr);
      }

      // 3. Update Auth password if provided
      if (password && password.trim() !== "") {
        try {
          await adminAuth.updateUser(uid, {
            password: password
          });
        } catch (authErr: any) {
          console.warn("adminAuth.updateUser warning:", authErr.message || authErr);
        }
      }

      // 4. Update Firestore Profile
      const updateData: any = {
        policeId,
        policeEmail,
        badgeNumber,
        credentialsGenerated: true,
        updatedAt: new Date().toISOString()
      };

      if (name && name.trim() !== "") {
        updateData.name = name;
      }

      if (password && password.trim() !== "") {
        updateData.mustChangePassword = true;
        updateData.temporaryPassword = password;
      }

      try {
        await adminDb.collection("users").doc(uid).update(updateData);
      } catch (dbErr: any) {
        console.warn("adminDb update warning:", dbErr.message || dbErr);
        return NextResponse.json({ 
          error: "Failed to update database record. Please ensure your FIREBASE_ADMIN_PRIVATE_KEY and credentials are correctly configured in .env.local." 
        }, { status: 500 });
      }
    } else {
      // ----------------------------------------------------
      // FALLBACK MODE: Use Firestore REST API (works in Node.js server without Admin SDK)
      // The client-side Firestore SDK CANNOT be used in server-side API routes because
      // it depends on browser-only APIs and will hang indefinitely.
      // ----------------------------------------------------
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "crime-assist";
      const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
      const runQueryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;

      if (!apiKey) {
        return NextResponse.json({ error: "Firebase API key is not configured." }, { status: 500 });
      }

      // Build auth header using admin's token for all Firestore REST requests
      const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (adminIdToken) authHeaders["Authorization"] = `Bearer ${adminIdToken}`;
      const getHeaders: Record<string, string> = {};
      if (adminIdToken) getHeaders["Authorization"] = `Bearer ${adminIdToken}`;

      // Check if credentials already exist for this officer (Idempotence)
      const getRes = await fetch(`${firestoreBase}/users/${uid}?key=${apiKey}`, { headers: getHeaders });
      if (getRes.ok) {
        const docData = await getRes.json();
        const fields = docData.fields || {};
        const alreadyGenerated = fields.credentialsGenerated?.booleanValue || fields.policeId?.stringValue;
        if (alreadyGenerated) {
          return NextResponse.json({
            success: true,
            message: "Credentials have already been generated for this officer.",
            alreadyGenerated: true,
            policeId: fields.policeId?.stringValue,
            policeEmail: fields.policeEmail?.stringValue || `${fields.policeId?.stringValue}@police.gov`,
            badgeNumber: fields.badgeNumber?.stringValue,
            temporaryPassword: fields.temporaryPassword?.stringValue || "********"
          });
        }
      }

      // Validate Police ID uniqueness via Firestore REST query
      const policeIdQuery = await fetch(runQueryUrl, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "users" }],
            where: { fieldFilter: { field: { fieldPath: "policeId" }, op: "EQUAL", value: { stringValue: policeId } } },
            limit: 2
          }
        })
      });
      const policeIdData = await policeIdQuery.json();
      const duplicatePoliceId = Array.isArray(policeIdData) && policeIdData.find((r: any) => r.document && !r.document.name?.endsWith(`/${uid}`));
      if (duplicatePoliceId) {
        const dupName = duplicatePoliceId.document?.fields?.name?.stringValue || "another officer";
        return NextResponse.json({ error: `The Police ID '${policeId}' is already assigned to ${dupName}.` }, { status: 400 });
      }

      // Validate Police Email uniqueness via Firestore REST query
      const policeEmailQuery = await fetch(runQueryUrl, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "users" }],
            where: { fieldFilter: { field: { fieldPath: "policeEmail" }, op: "EQUAL", value: { stringValue: policeEmail } } },
            limit: 2
          }
        })
      });
      const policeEmailData = await policeEmailQuery.json();
      const duplicatePoliceEmail = Array.isArray(policeEmailData) && policeEmailData.find((r: any) => r.document && !r.document.name?.endsWith(`/${uid}`));
      if (duplicatePoliceEmail) {
        const dupName = duplicatePoliceEmail.document?.fields?.name?.stringValue || "another officer";
        return NextResponse.json({ error: `The Police Email '${policeEmail}' is already assigned to ${dupName}.` }, { status: 400 });
      }

      // Build the Firestore fields to update
      const updateFields: Record<string, any> = {
        policeId: { stringValue: policeId },
        policeEmail: { stringValue: policeEmail },
        badgeNumber: { stringValue: badgeNumber },
        credentialsGenerated: { booleanValue: true },
        updatedAt: { stringValue: new Date().toISOString() }
      };
      const updateMaskPaths = ["policeId", "policeEmail", "badgeNumber", "credentialsGenerated", "updatedAt"];

      if (name && name.trim() !== "") {
        updateFields.name = { stringValue: name };
        updateMaskPaths.push("name");
      }

      if (password && password.trim() !== "") {
        updateFields.mustChangePassword = { booleanValue: true };
        updateFields.temporaryPassword = { stringValue: password };
        updateMaskPaths.push("mustChangePassword", "temporaryPassword");
      }

      const maskQuery = updateMaskPaths.map(p => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join("&");
      const patchRes = await fetch(
        `${firestoreBase}/users/${uid}?${maskQuery}&key=${apiKey}`,
        {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({ fields: updateFields })
        }
      );

      if (!patchRes.ok) {
        const patchErr = await patchRes.json();
        return NextResponse.json({ error: `Failed to update database record: ${patchErr?.error?.message || "Unknown error"}` }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Credentials successfully saved to the officer's account."
    });
  } catch (error: any) {
    console.error("Save credentials error:", error);
    return NextResponse.json({ error: error.message || "Failed to save credentials." }, { status: 500 });
  }
}
