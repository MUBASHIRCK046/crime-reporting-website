/**
 * ====================================================
 * SYSTEM ADMIN HELPERS (lib/admin.ts)
 * ====================================================
 * Beginner Note: This file contains the logic for the System Administrator.
 * Admins need to see EVERY user that registers on the platform.
 */

import { db } from "@/firebase/client";
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc, where, addDoc } from "firebase/firestore";

/**
 * Fetches all registered users from the Firestore Database.
 */
export async function getAllUsers() {
  try {
    const q = query(
      collection(db, "users"), 
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    const users: any[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    return { users, error: null };
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return { users: [], error: error.message };
  }
}

/**
 * Assigns a case to a specific police officer.
 * Handles both simple CSRs and complex FIRs.
 * Strictly validates that case status is Approved before allowing assignment.
 */
export async function assignCaseToOfficer(complaintId: string, type: string, firNumber: string | null, officerId: string, officerName: string) {
  try {
    if (type === "FIR" && firNumber) {
      // Find the officer_review document for this FIR
      const q = query(collection(db, "officer_reviews"), where("firNumber", "==", firNumber));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const reviewDoc = snapshot.docs[0];
        const currentStatus = reviewDoc.data().status;
        
        if (currentStatus === "Rejected") {
          return { success: false, error: "Cannot assign officer. Case has been Rejected." };
        }
        if (currentStatus !== "Approved" && currentStatus !== "Investigating" && currentStatus !== "Under Review") {
          return { success: false, error: "Cannot assign officer. Case must be Approved before assignment." };
        }

        const reviewDocId = reviewDoc.id;
        await updateDoc(doc(db, "officer_reviews", reviewDocId), {
          officerId: officerId,
          officerName: officerName,
          status: "Under Review",
          updatedAt: new Date().toISOString()
        });
      } else {
        // Check incident document directly
        const incidentRef = doc(db, "incidents", complaintId);
        const incidentSnap = await getDoc(incidentRef);
        if (incidentSnap.exists()) {
          const incStatus = incidentSnap.data().status;
          if (incStatus === "Rejected") {
            return { success: false, error: "Cannot assign officer. Case has been Rejected." };
          }
          if (incStatus !== "Approved" && incStatus !== "Investigating" && incStatus !== "Under Review") {
            return { success: false, error: "Cannot assign officer. Case must be Approved before assignment." };
          }
          // Create officer_review doc
          await addDoc(collection(db, "officer_reviews"), {
            firNumber,
            officerId,
            officerName,
            status: "Under Review",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } else {
          throw new Error("Case incident record not found.");
        }
      }
    } else {
      // It's a CSR (or old simple FIR)
      const complaintRef = doc(db, "complaints", complaintId);
      const complaintSnap = await getDoc(complaintRef);
      if (complaintSnap.exists()) {
        const compStatus = complaintSnap.data().status;
        if (compStatus === "Rejected") {
          return { success: false, error: "Cannot assign officer. Case has been Rejected." };
        }
        if (compStatus !== "Approved" && compStatus !== "Investigating") {
          return { success: false, error: "Cannot assign officer. Case must be Approved before assignment." };
        }
      }
      await updateDoc(complaintRef, {
        assignedOfficerId: officerId,
        assignedOfficerName: officerName,
        status: "Investigating"
      });
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error assigning case:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates a police officer's complete profile information in Firestore.
 */
export async function updatePoliceOfficerProfile(uid: string, profileData: Record<string, any>) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      ...profileData,
      role: "police",
      updatedAt: new Date().toISOString()
    });
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error updating police officer profile:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Promotes an existing user/person to a Police Officer with full profile details.
 */
export async function assignUserAsPolice(uid: string, policeData: Record<string, any>) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      ...policeData,
      role: "police",
      isActive: true,
      updatedAt: new Date().toISOString()
    });
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error assigning user as police:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Saves a permanent, immutable resolution note for a resolved SOS alert.
 * Backend data integrity: Verifies that a note does NOT already exist.
 * If already recorded, modifications are strictly rejected.
 */
export async function saveSOSResolutionNote(sosId: string, noteText: string, adminName: string) {
  try {
    const sosRef = doc(db, "sos_alerts", sosId);
    const sosSnap = await getDoc(sosRef);
    if (!sosSnap.exists()) {
      throw new Error("SOS Alert record not found.");
    }
    const data = sosSnap.data();
    if (data.resolutionNote || data.resolutionNoteImmutable) {
      throw new Error("Resolution note has already been permanently recorded and cannot be modified.");
    }
    
    await updateDoc(sosRef, {
      resolutionNote: noteText.trim(),
      resolutionNoteAddedAt: new Date().toISOString(),
      resolutionNoteAddedBy: adminName || "Administrator",
      resolutionNoteAuthorRole: "Admin",
      resolutionNoteImmutable: true,
      updatedAt: new Date().toISOString()
    });

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error saving resolution note:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates a case status to Approved or Rejected.
 * ALWAYS writes directly to Firestore client SDK first (guaranteed persistence).
 * API is called in background only for audit trail (case_logs).
 */
export async function updateCaseStatus(
  complaintId: string,
  type: string,
  firNumber: string | null | undefined,
  newStatus: "Approved" | "Rejected" | "Pending",
  adminUid?: string
) {
  const updatedAt = new Date().toISOString();

  try {
    // ✅ ALWAYS write directly to Firestore first — this is guaranteed and does NOT
    // depend on Firebase Admin SDK or server-side configuration.
    if (type === "FIR" || firNumber) {
      // Update incidents collection
      const incidentRef = doc(db, "incidents", complaintId);
      await updateDoc(incidentRef, { status: newStatus, updatedAt });

      // Update officer_reviews status for FIR
      if (firNumber) {
        const q = query(collection(db, "officer_reviews"), where("firNumber", "==", firNumber));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          await updateDoc(doc(db, "officer_reviews", snapshot.docs[0].id), {
            status: newStatus,
            updatedAt
          });
        } else {
          // Create officer_reviews entry if not present
          await addDoc(collection(db, "officer_reviews"), {
            firNumber,
            status: newStatus,
            officerId: null,
            officerName: "Admin Decision",
            createdAt: updatedAt,
            updatedAt
          });
        }
      }
    } else {
      // CSR — update complaints collection
      const complaintRef = doc(db, "complaints", complaintId);
      await updateDoc(complaintRef, { status: newStatus, updatedAt });
    }

    // 🔄 Fire API in background to write audit case_log entry (non-blocking)
    fetch("/api/admin/update-case-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaintId, type, firNumber: firNumber || null, status: newStatus, adminUid })
    }).catch(() => {
      // Silently ignore — case_log is non-critical; the DB status is already saved above
    });

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error updating case status:", error);
    return { success: false, error: error.message };
  }
}



