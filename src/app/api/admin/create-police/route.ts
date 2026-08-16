import { NextResponse } from "next/server";
import { adminAuth, adminDb, isFirebaseAdminConfigured } from "@/firebase/server";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

function generateSecureTemporaryPassword(name: string): string {
  const firstName = name.trim().split(/\s+/)[0] || "Officer";
  const firstLetter = firstName.charAt(0).toUpperCase();
  
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
  
  const allPool = uppers + lowers + digits + specials;
  for (let i = 0; i < 7; i++) {
    pwdChars.push(allPool[crypto.randomInt(allPool.length)]);
  }
  
  // Shuffle cryptographically
  pwdChars = pwdChars.sort(() => crypto.randomInt(3) - 1);
  
  return firstLetter + pwdChars.join("");
}

function buildProfileData(uid: string, autoTemporaryPassword: string, body: any, autoPoliceId: string) {
  return {
    uid,
    name: body.name,
    email: body.email,
    phone: body.phone || "",
    role: "police",
    policeId: autoPoliceId,
    policeEmail: `${autoPoliceId}@police.gov`,
    badgeNumber: body.badgeNumber,
    dob: body.dob || "",
    gender: body.gender || "Male",
    doj: body.doj || new Date().toISOString().split("T")[0],
    rank: body.rank || "Sub-Inspector",
    stationName: body.stationName || "Central Police Station",
    yearsOfService: body.yearsOfService || "0",
    previousExperience: body.previousExperience || "",
    casesHandled: Number(body.casesHandled) || 0,
    casesSolved: Number(body.casesSolved) || 0,
    medalsAwards: Number(body.medalsAwards) || 0,
    specialSkills: body.specialSkills || "",
    postingLocation: body.postingLocation || body.stationName || "",
    promotionHistory: body.promotionHistory || "",
    emergencyContact: body.emergencyContact || "",
    bloodGroup: body.bloodGroup || "",
    education: body.education || "",
    transferHistory: body.transferHistory || "",
    commendations: body.commendations || "",
    serviceStatus: body.serviceStatus || "Active",
    dutyStatus: body.serviceStatus || "Active Duty",
    isActive: body.serviceStatus !== "Retired",
    mustChangePassword: true,
    credentialsGenerated: true,
    temporaryPassword: autoTemporaryPassword,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      email, 
      name, 
      adminUid,
      badgeNumber
    } = body;

    if (!email || !name || !adminUid || !badgeNumber) {
      return NextResponse.json({ error: "Missing required fields (Email, Name, Admin UID, or Badge Number)" }, { status: 400 });
    }

    // Auto-generate secure temporary password and Police ID using actual officer name and badge number
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, "");
    const cleanBadge = String(badgeNumber).replace(/[^a-zA-Z0-9]/g, "");
    const autoPoliceId = `${cleanName}${cleanBadge}`;

    // Generate secure temporary password cryptographically
    const autoTemporaryPassword = generateSecureTemporaryPassword(name);

    let uid = "";
    let policeProfileData: any;

    // 1. Check if Firebase Admin SDK is configured
    if (isFirebaseAdminConfigured && adminAuth && adminDb) {
      // 2. Verify the caller is an admin
      try {
        const adminDoc = await adminDb.collection("users").doc(adminUid).get();
        if (adminDoc.exists && adminDoc.data()?.role !== "admin") {
          return NextResponse.json({ error: "Unauthorized access. Admin role required." }, { status: 403 });
        }
      } catch (authErr) {
        console.warn("Admin verification check warning:", authErr);
      }

      // 3. Verify unique Email in Firestore
      const emailQuery = await adminDb.collection("users")
        .where("email", "==", email)
        .get();
      if (!emailQuery.empty) {
        return NextResponse.json({ error: "An account already exists for this email address." }, { status: 400 });
      }

      // 4. Verify unique Badge Number in Firestore
      const badgeQuery = await adminDb.collection("users")
        .where("badgeNumber", "==", badgeNumber)
        .get();
      if (!badgeQuery.empty) {
        return NextResponse.json({ error: `A police officer with badge number '${badgeNumber}' already exists.` }, { status: 400 });
      }

      // Verify unique Police ID
      const duplicateQuery = await adminDb.collection("users")
        .where("policeId", "==", autoPoliceId)
        .get();
      if (!duplicateQuery.empty) {
        return NextResponse.json({ error: `A police officer with Police ID '${autoPoliceId}' already exists.` }, { status: 400 });
      }

      // 5. Create the user in Firebase Auth using Admin SDK
      try {
        const userRecord = await adminAuth.createUser({
          email,
          password: autoTemporaryPassword,
          displayName: name,
        });
        uid = userRecord.uid;
      } catch (authErr: any) {
        console.error("adminAuth.createUser error:", authErr);
        if (authErr.code === "auth/email-already-in-use") {
          return NextResponse.json({ error: "An account already exists for this email address in Firebase Authentication." }, { status: 400 });
        }
        return NextResponse.json({ error: `Failed to create authentication account: ${authErr.message}` }, { status: 400 });
      }

      // 6. Add complete police user document in Firestore
      policeProfileData = buildProfileData(uid, autoTemporaryPassword, body, autoPoliceId);

      try {
        await adminDb.collection("users").doc(uid).set(policeProfileData);
      } catch (dbErr: any) {
        console.error("adminDb write error:", dbErr);
        
        // Clean up orphaned Auth user to maintain database consistency
        try {
          await adminAuth.deleteUser(uid);
          console.log(`Cleaned up orphaned Firebase Auth user: ${uid}`);
        } catch (cleanupErr: any) {
          console.error("Failed to clean up orphaned auth user:", cleanupErr.message || cleanupErr);
        }

        return NextResponse.json({
          error: "Failed to create officer database record. Authentication account creation rolled back."
        }, { status: 500 });
      }
    } else {
      // ----------------------------------------------------
      // FALLBACK MODE: Use Client Firebase SDK on the server (does not require private key!)
      // ----------------------------------------------------
      try {
        const { initializeApp: clientInitializeApp, getApps: clientGetApps, getApp: clientGetApp } = await import("firebase/app");
        const { getAuth: clientGetAuth, createUserWithEmailAndPassword: clientCreateUser } = await import("firebase/auth");
        const { getFirestore: clientGetFirestore, doc: clientDoc, setDoc: clientSetDoc, collection: clientCollection, query: clientQuery, where: clientWhere, getDocs: clientGetDocs } = await import("firebase/firestore");

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

        const fallbackAuth = clientGetAuth(fallbackApp);
        const fallbackDb = clientGetFirestore(fallbackApp);

        // Verify duplicate Email in fallback Firestore
        const qEmail = clientQuery(clientCollection(fallbackDb, "users"), clientWhere("email", "==", email));
        const emailSnap = await clientGetDocs(qEmail);
        if (!emailSnap.empty) {
          return NextResponse.json({ error: "An account already exists for this email address." }, { status: 400 });
        }

        // Verify duplicate Badge Number in fallback Firestore
        const qBadge = clientQuery(clientCollection(fallbackDb, "users"), clientWhere("badgeNumber", "==", badgeNumber));
        const badgeSnap = await clientGetDocs(qBadge);
        if (!badgeSnap.empty) {
          return NextResponse.json({ error: `A police officer with badge number '${badgeNumber}' already exists.` }, { status: 400 });
        }

        // Verify unique Police ID
        const qPoliceId = clientQuery(clientCollection(fallbackDb, "users"), clientWhere("policeId", "==", autoPoliceId));
        const policeIdSnap = await clientGetDocs(qPoliceId);
        if (!policeIdSnap.empty) {
          return NextResponse.json({ error: `A police officer with Police ID '${autoPoliceId}' already exists.` }, { status: 400 });
        }

        // Create Auth account using client SDK on the server
        let userCredential;
        try {
          userCredential = await clientCreateUser(fallbackAuth, email, autoTemporaryPassword);
          uid = userCredential.user.uid;
        } catch (authErr: any) {
          console.error("Fallback auth creation error:", authErr);
          if (authErr.code === "auth/email-already-in-use") {
            return NextResponse.json({ error: "An account already exists for this email address in Firebase Authentication." }, { status: 400 });
          }
          return NextResponse.json({ error: `Failed to create authentication account: ${authErr.message}` }, { status: 400 });
        }

        // Write Firestore Profile using client SDK on the server
        policeProfileData = buildProfileData(uid, autoTemporaryPassword, body, autoPoliceId);
        try {
          await clientSetDoc(clientDoc(fallbackDb, "users", uid), policeProfileData);
        } catch (dbErr: any) {
          console.error("Fallback firestore write error:", dbErr);
          return NextResponse.json({ error: `Failed to create database record: ${dbErr.message}` }, { status: 500 });
        }
      } catch (fallbackErr: any) {
        console.error("Fallback creation error:", fallbackErr);
        return NextResponse.json({ 
          error: `Server authentication credentials are not configured. Please configure them in .env.local to enable Admin operations.` 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      uid,
      officerName: name,
      policeId: autoPoliceId,
      badgeNumber: badgeNumber,
      temporaryPassword: autoTemporaryPassword,
      profile: policeProfileData,
      generatedCredentials: {
        userId: email,
        email,
        temporaryPassword: autoTemporaryPassword,
        policeId: autoPoliceId,
        badgeNumber: badgeNumber,
        officerName: name,
        rank: policeProfileData.rank,
        stationName: policeProfileData.stationName
      }
    });
  } catch (error: any) {
    console.error("Create police error:", error);
    return NextResponse.json({ error: error.message || "Failed to create police officer account" }, { status: 500 });
  }
}
