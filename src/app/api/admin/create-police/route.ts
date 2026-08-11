import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/firebase/server";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      email, 
      password, 
      name, 
      phone, 
      adminUid,
      policeId,
      dob,
      gender,
      doj,
      rank,
      stationName,
      yearsOfService,
      previousExperience,
      casesHandled,
      casesSolved,
      medalsAwards,
      specialSkills,
      postingLocation,
      promotionHistory,
      emergencyContact,
      bloodGroup,
      education,
      transferHistory,
      commendations,
      serviceStatus
    } = body;

    if (!email || !password || !name || !adminUid) {
      return NextResponse.json({ error: "Missing required fields (Email, Password, Name, or Admin UID)" }, { status: 400 });
    }

    // Verify the caller is an admin if adminDb is available
    if (adminDb) {
      try {
        const adminDoc = await adminDb.collection("users").doc(adminUid).get();
        if (adminDoc.exists && adminDoc.data()?.role !== "admin") {
          return NextResponse.json({ error: "Unauthorized access. Admin role required." }, { status: 403 });
        }
      } catch (authErr) {
        console.warn("Admin verification check warning:", authErr);
      }
    }

    let uid = "";

    // 1. Create the user in Firebase Auth using Admin SDK
    if (adminAuth) {
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
      });
      uid = userRecord.uid;
    } else {
      // Fallback generate a unique UID if adminAuth is not configured
      uid = "pol_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }

    // 2. Add complete police user document in Firestore
    const policeProfileData = {
      uid,
      name,
      email,
      phone: phone || "",
      role: "police",
      policeId: policeId || `POL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      badgeNumber: policeId || "",
      dob: dob || "",
      gender: gender || "Male",
      doj: doj || new Date().toISOString().split("T")[0],
      rank: rank || "Sub-Inspector",
      stationName: stationName || "Central Police Station",
      yearsOfService: yearsOfService || "0",
      previousExperience: previousExperience || "",
      casesHandled: Number(casesHandled) || 0,
      casesSolved: Number(casesSolved) || 0,
      medalsAwards: Number(medalsAwards) || 0,
      specialSkills: specialSkills || "",
      postingLocation: postingLocation || stationName || "",
      promotionHistory: promotionHistory || "",
      emergencyContact: emergencyContact || "",
      bloodGroup: bloodGroup || "",
      education: education || "",
      transferHistory: transferHistory || "",
      commendations: commendations || "",
      serviceStatus: serviceStatus || "Active",
      dutyStatus: serviceStatus || "Active Duty",
      isActive: serviceStatus !== "Retired",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (adminDb) {
      await adminDb.collection("users").doc(uid).set(policeProfileData);
    }

    return NextResponse.json({ 
      success: true, 
      uid,
      policeId: policeProfileData.policeId,
      profile: policeProfileData,
      generatedCredentials: {
        userId: email,
        email,
        password,
        policeId: policeProfileData.policeId
      }
    });
  } catch (error: any) {
    console.error("Create police error:", error);
    return NextResponse.json({ error: error.message || "Failed to create police officer account" }, { status: 500 });
  }
}
