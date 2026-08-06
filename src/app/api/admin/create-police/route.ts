import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/firebase/server";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, phone, badgeNumber, rank, stationName, adminUid } = body;

    if (!email || !password || !name || !adminUid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the caller is an admin
    const adminDoc = await adminDb.collection("users").doc(adminUid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    // Create the user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // Add user document in Firestore
    await adminDb.collection("users").doc(userRecord.uid).set({
      name,
      email,
      phone: phone || "",
      role: "police",
      badgeNumber: badgeNumber || "",
      rank: rank || "",
      stationName: stationName || "",
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, uid: userRecord.uid });
  } catch (error: any) {
    console.error("Create police error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
