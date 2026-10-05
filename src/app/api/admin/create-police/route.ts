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
      badgeNumber,
      adminIdToken
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
      // FALLBACK MODE: Use Firebase REST API (works in Node.js server without Admin SDK)
      // The client-side Firebase Auth SDK CANNOT be used in server-side API routes because
      // it depends on browser-only APIs (IndexedDB, localStorage) and will hang indefinitely.
      // ----------------------------------------------------
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "crime-assist";

      if (!apiKey) {
        return NextResponse.json({
          error: "Firebase API key is not configured. Please check your .env.local file."
        }, { status: 500 });
      }

      // Use Firestore REST API to check for duplicate email
      const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

      // Query Firestore REST API for duplicate email

      const emailQueryBody = {
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "email" },
              op: "EQUAL",
              value: { stringValue: email }
            }
          },
          limit: 1
        }
      };

      // Build auth header using admin's token if available (for read queries)
      const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (adminIdToken) authHeaders["Authorization"] = `Bearer ${adminIdToken}`;

      const emailCheckRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(emailQueryBody)
        }
      );
      const emailCheckData = await emailCheckRes.json();
      const emailExists = Array.isArray(emailCheckData) && emailCheckData.some((r: any) => r.document);
      if (emailExists) {
        return NextResponse.json({ error: "An account already exists for this email address." }, { status: 400 });
      }

      // Query Firestore REST API for duplicate badge number
      const badgeQueryBody = {
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "badgeNumber" },
              op: "EQUAL",
              value: { stringValue: String(badgeNumber) }
            }
          },
          limit: 1
        }
      };

      const badgeCheckRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(badgeQueryBody)
        }
      );
      const badgeCheckData = await badgeCheckRes.json();
      const badgeExists = Array.isArray(badgeCheckData) && badgeCheckData.some((r: any) => r.document);
      if (badgeExists) {
        return NextResponse.json({ error: `A police officer with badge number '${badgeNumber}' already exists.` }, { status: 400 });
      }

      // Query Firestore REST API for duplicate police ID
      const policeIdQueryBody = {
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "policeId" },
              op: "EQUAL",
              value: { stringValue: autoPoliceId }
            }
          },
          limit: 1
        }
      };

      const policeIdCheckRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(policeIdQueryBody)
        }
      );
      const policeIdCheckData = await policeIdCheckRes.json();
      const policeIdExists = Array.isArray(policeIdCheckData) && policeIdCheckData.some((r: any) => r.document);
      if (policeIdExists) {
        return NextResponse.json({ error: `A police officer with Police ID '${autoPoliceId}' already exists.` }, { status: 400 });
      }

      // Create Firebase Auth user via REST API (works in Node.js server environment)
      // returnSecureToken: true — we need the new officer's ID token to authenticate the Firestore write
      const signUpRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password: autoTemporaryPassword,
            displayName: name,
            returnSecureToken: true
          })
        }
      );

      const signUpData = await signUpRes.json();
      if (!signUpRes.ok || signUpData.error) {
        const errMsg = signUpData.error?.message || "Failed to create authentication account.";
        if (errMsg.includes("EMAIL_EXISTS")) {
          return NextResponse.json({ error: "An account already exists for this email address in Firebase Authentication." }, { status: 400 });
        }
        return NextResponse.json({ error: `Failed to create authentication account: ${errMsg}` }, { status: 400 });
      }

      uid = signUpData.localId;
      // The new officer's ID token — used to authenticate the Firestore write.
      // Firestore rule: `allow create: if request.auth.uid == userId`
      // Since the doc ID IS the new officer's UID, using their own token satisfies this rule.
      const newOfficerIdToken = signUpData.idToken;

      // Write Firestore profile via REST API
      policeProfileData = buildProfileData(uid, autoTemporaryPassword, body, autoPoliceId);

      // Convert profile to Firestore REST API format
      function toFirestoreValue(value: any): any {
        if (value === null || value === undefined) return { nullValue: null };
        if (typeof value === "boolean") return { booleanValue: value };
        if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
        if (typeof value === "string") return { stringValue: value };
        if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
        if (typeof value === "object") {
          const fields: Record<string, any> = {};
          for (const [k, v] of Object.entries(value)) fields[k] = toFirestoreValue(v);
          return { mapValue: { fields } };
        }
        return { stringValue: String(value) };
      }

      const firestoreFields: Record<string, any> = {};
      for (const [k, v] of Object.entries(policeProfileData)) {
        firestoreFields[k] = toFirestoreValue(v);
      }

      // Use the new officer's own ID token as Bearer auth — satisfies `request.auth.uid == userId`
      const writeHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (newOfficerIdToken) writeHeaders["Authorization"] = `Bearer ${newOfficerIdToken}`;

      const firestoreWriteRes = await fetch(
        `${firestoreBase}/users/${uid}?key=${apiKey}`,
        {
          method: "PATCH",
          headers: writeHeaders,
          body: JSON.stringify({ fields: firestoreFields })
        }
      );

      if (!firestoreWriteRes.ok) {
        const fsErr = await firestoreWriteRes.json();
        console.error("Firestore REST write error:", fsErr);
        // Attempt to clean up the orphaned Auth user via REST API
        try {
          if (newOfficerIdToken) {
            await fetch(
              `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken: newOfficerIdToken })
              }
            );
          }
        } catch (cleanupErr) {
          console.error("Failed to clean up orphaned auth user:", cleanupErr);
        }
        return NextResponse.json({ error: `Failed to create database record: ${fsErr?.error?.message || "Unknown error"}` }, { status: 500 });
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
