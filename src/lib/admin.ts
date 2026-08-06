/**
 * ====================================================
 * SYSTEM ADMIN HELPERS (lib/admin.ts)
 * ====================================================
 * Beginner Note: This file contains the logic for the System Administrator.
 * Admins need to see EVERY user that registers on the platform.
 */

import { db } from "@/firebase/client";
import { collection, getDocs, query, orderBy, doc, updateDoc, where } from "firebase/firestore";

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
 */
export async function assignCaseToOfficer(complaintId: string, type: string, firNumber: string | null, officerId: string, officerName: string) {
  try {
    if (type === "FIR" && firNumber) {
      // Find the officer_review document for this FIR
      const q = query(collection(db, "officer_reviews"), where("firNumber", "==", firNumber));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const reviewDocId = snapshot.docs[0].id;
        await updateDoc(doc(db, "officer_reviews", reviewDocId), {
          officerId: officerId,
          officerName: officerName,
          status: "Under Review",
          updatedAt: new Date().toISOString()
        });
      } else {
        // Fallback just in case review document wasn't created initially
        throw new Error("Review document not found for this FIR.");
      }
    } else {
      // It's a CSR (or old simple FIR)
      await updateDoc(doc(db, "complaints", complaintId), {
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

