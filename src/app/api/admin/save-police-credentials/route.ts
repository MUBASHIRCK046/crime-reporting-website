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
    const { uid, name, policeId, policeEmail, badgeNumber, password, adminUid } = body;

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
      // FALLBACK MODE: Use Client Firebase SDK on the server
      // ----------------------------------------------------
      try {
        const { initializeApp: clientInitializeApp, getApps: clientGetApps, getApp: clientGetApp } = await import("firebase/app");
        const { getFirestore: clientGetFirestore, doc: clientDoc, updateDoc: clientUpdateDoc, getDoc: clientGetDoc, collection: clientCollection, query: clientQuery, where: clientWhere, getDocs: clientGetDocs } = await import("firebase/firestore");

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
 
        // Check if credentials already exist for this officer (Idempotence)
        const docRef = clientDoc(fallbackDb, "users", uid);
        const officerDoc = await clientGetDoc(docRef);
        if (officerDoc.exists()) {
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

        // Validate Police ID uniqueness
        const qPoliceId = clientQuery(clientCollection(fallbackDb, "users"), clientWhere("policeId", "==", policeId));
        const policeIdSnap = await clientGetDocs(qPoliceId);
        const duplicate = policeIdSnap.docs.find((doc: any) => doc.id !== uid);
        if (duplicate) {
          return NextResponse.json({ error: `The Police ID '${policeId}' is already assigned to another officer (${duplicate.data().name}).` }, { status: 400 });
        }

        // Validate Police Email uniqueness
        const qPoliceEmail = clientQuery(clientCollection(fallbackDb, "users"), clientWhere("policeEmail", "==", policeEmail));
        const policeEmailSnap = await clientGetDocs(qPoliceEmail);
        const duplicateEmail = policeEmailSnap.docs.find((doc: any) => doc.id !== uid);
        if (duplicateEmail) {
          return NextResponse.json({ error: `The Police Email '${policeEmail}' is already assigned to another officer (${duplicateEmail.data().name}).` }, { status: 400 });
        }

        // Update Firestore Profile
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

        await clientUpdateDoc(clientDoc(fallbackDb, "users", uid), updateData);
      } catch (dbErr: any) {
        console.warn("Fallback client update error:", dbErr);
        return NextResponse.json({ error: `Failed to update database record: ${dbErr.message}` }, { status: 500 });
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
