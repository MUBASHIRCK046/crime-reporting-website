import { NextResponse } from "next/server";
import { adminDb, isFirebaseAdminConfigured } from "@/firebase/server";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { complaintId, type, firNumber, status, adminUid } = body;

    if (!complaintId || !status) {
      return NextResponse.json(
        { error: "Missing required fields (complaintId, status)" },
        { status: 400 }
      );
    }

    if (status !== "Approved" && status !== "Rejected" && status !== "Pending") {
      return NextResponse.json(
        { error: "Invalid status. Allowed values: Approved, Rejected, Pending" },
        { status: 400 }
      );
    }

    const updatedAt = new Date().toISOString();

    if (isFirebaseAdminConfigured && adminDb) {
      // 1. Verify caller if adminUid provided
      if (adminUid) {
        try {
          const adminDoc = await adminDb.collection("users").doc(adminUid).get();
          if (adminDoc.exists && adminDoc.data()?.role !== "admin") {
            return NextResponse.json(
              { error: "Unauthorized access. Admin role required." },
              { status: 403 }
            );
          }
        } catch (authErr: any) {
          console.warn("Admin verification check warning:", authErr.message || authErr);
        }
      }

      // 2. Update Database based on type (FIR vs CSR)
      if (type === "FIR" || firNumber) {
        // Update incidents collection
        const incidentRef = adminDb.collection("incidents").doc(complaintId);
        const incidentDoc = await incidentRef.get();
        if (incidentDoc.exists) {
          await incidentRef.update({
            status,
            updatedAt
          });
        }

        // Update or create officer_reviews record
        const targetFirNum = firNumber || (incidentDoc.exists ? incidentDoc.data()?.firNumber : null);
        if (targetFirNum) {
          const reviewsSnapshot = await adminDb
            .collection("officer_reviews")
            .where("firNumber", "==", targetFirNum)
            .get();

          if (!reviewsSnapshot.empty) {
            const reviewDocId = reviewsSnapshot.docs[0].id;
            await adminDb.collection("officer_reviews").doc(reviewDocId).update({
              status,
              updatedAt
            });
          } else {
            // Create officer_review entry if non-existent
            await adminDb.collection("officer_reviews").add({
              firNumber: targetFirNum,
              status,
              officerId: null,
              officerName: "Admin Decision",
              createdAt: updatedAt,
              updatedAt
            });
          }
        }
      } else {
        // CSR or default complaints collection
        const complaintRef = adminDb.collection("complaints").doc(complaintId);
        await complaintRef.update({
          status,
          updatedAt
        });
      }

      // 3. Add to case_logs timeline
      await adminDb.collection("case_logs").add({
        complaintId,
        title: status === "Approved" ? "Case Approved by Admin" : status === "Rejected" ? "Case Rejected by Admin" : "Status Updated",
        description: `Admin updated the case decision status to '${status}'.`,
        timestamp: updatedAt,
        isPublic: true,
        authorRole: "Admin"
      });
    }

    return NextResponse.json({
      success: true,
      message: `Case status updated to ${status} successfully.`,
      complaintId,
      status,
      updatedAt
    });
  } catch (error: any) {
    console.error("Error in update-case-status API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update case status." },
      { status: 500 }
    );
  }
}
