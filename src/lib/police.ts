/**
 * ====================================================
 * POLICE COMMAND CENTER HELPERS (lib/police.ts)
 * ====================================================
 * Beginner Note: This file contains the tools that Police Officers use.
 * Unlike citizens who only see their own data, these functions fetch
 * EVERYONE'S data so the police can manage all crimes and alerts.
 */

import { db } from "@/firebase/client";
import { collection, getDocs, query, orderBy, doc, updateDoc, where, addDoc } from "firebase/firestore";
import { CaseLog } from "./types";

/**
 * Fetches ALL complaints from the database, ordered by newest first.
 */
export async function getAllComplaints() {
  try {
    // Fetch Old/Simple CSR complaints
    const q1 = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
    const snapshot1 = await getDocs(q1);
    const complaints: any[] = [];
    snapshot1.forEach((doc) => {
      complaints.push({ id: doc.id, type: "CSR", ...doc.data() });
    });

    // Fetch New Complex FIR incidents
    const q2 = query(collection(db, "incidents"), orderBy("createdAt", "desc"));
    const snapshot2 = await getDocs(q2);
    
    // We also need to fetch officer_reviews for FIRs to get their status, 
    // but for listing, we might just assume 'Submitted' if not found or do a separate fetch.
    // To keep it performant, we fetch all reviews and map them.
    const reviewsSnapshot = await getDocs(collection(db, "officer_reviews"));
    const reviewsMap: Record<string, any> = {};
    reviewsSnapshot.forEach((doc) => {
      const data = doc.data();
      reviewsMap[data.firNumber] = data;
    });

    snapshot2.forEach((doc) => {
      const data = doc.data();
      const review = reviewsMap[data.firNumber];
      complaints.push({ 
        id: doc.id, 
        type: "FIR",
        title: `FIR: ${data.category || 'Incident'} at ${data.location}`,
        citizenId: data.complainantId,
        firNumber: data.firNumber,
        status: review ? review.status : "Submitted",
        assignedOfficerId: review ? review.officerId : null,
        ...data 
      });
    });

    // Sort combined array
    complaints.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return { complaints, error: null };
  } catch (error: any) {
    console.error("Error fetching all complaints:", error);
    return { complaints: [], error: error.message };
  }
}

/**
 * Fetches only Active SOS alerts.
 */
export async function getActiveSOSAlerts() {
  try {
    const q = query(
      collection(db, "sos_alerts"),
      where("status", "==", "Active")
    );
    
    const querySnapshot = await getDocs(q);
    
    const alerts: any[] = [];
    querySnapshot.forEach((doc) => {
      alerts.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort client-side to avoid needing a Firestore composite index
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return { alerts, error: null };
  } catch (error: any) {
    console.error("Error fetching SOS alerts:", error);
    return { alerts: [], error: error.message };
  }
}

/**
 * Updates the status of a specific complaint (e.g., from 'Pending' to 'Resolved').
 */
export async function updateComplaintStatus(complaintId: string, newStatus: string) {
  try {
    // 1. Point exactly to the document we want to change
    const complaintRef = doc(db, "complaints", complaintId);
    
    // 2. Tell Firestore to ONLY update the 'status' field, leaving everything else alone
    await updateDoc(complaintRef, {
      status: newStatus
    });

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error updating status:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Beginner Note: 
 * Notice how we use 'updateDoc' instead of 'setDoc' here?
 * 'updateDoc' only changes the fields you specify (like 'status').
 * If we used 'setDoc', it would erase the whole complaint and replace it!
 * ====================================================
 */

/**
 * Fetches complaints specifically assigned to this police officer.
 */
export async function getAssignedCases(officerId: string) {
  try {
    const q1 = query(collection(db, "complaints"), where("assignedOfficerId", "==", officerId));
    const snapshot1 = await getDocs(q1);
    const complaints: any[] = [];
    snapshot1.forEach((doc) => {
      complaints.push({ id: doc.id, type: "CSR", ...doc.data() });
    });

    const qReviews = query(collection(db, "officer_reviews"), where("officerId", "==", officerId));
    const reviewsSnapshot = await getDocs(qReviews);
    const firNumbers: string[] = [];
    const reviewsMap: Record<string, any> = {};
    
    reviewsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.firNumber) {
        firNumbers.push(data.firNumber);
        reviewsMap[data.firNumber] = data;
      }
    });

    if (firNumbers.length > 0) {
      // Chunk firNumbers if greater than 10 (Firestore 'in' limit is 10), but for this demo assume < 10
      // To be safe and bypass the 10 limit, we fetch all and filter client side
      const q2 = query(collection(db, "incidents"), orderBy("createdAt", "desc"));
      const snapshot2 = await getDocs(q2);
      
      snapshot2.forEach((doc) => {
        const data = doc.data();
        if (firNumbers.includes(data.firNumber)) {
          const review = reviewsMap[data.firNumber];
          complaints.push({ 
            id: doc.id, 
            type: "FIR",
            title: `FIR: ${data.category || 'Incident'} at ${data.location}`,
            citizenId: data.complainantId,
            firNumber: data.firNumber,
            status: review ? review.status : "Submitted",
            assignedOfficerId: review ? review.officerId : null,
            ...data 
          });
        }
      });
    }

    complaints.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { complaints, error: null };
  } catch (error: any) {
    console.error("Error fetching assigned cases:", error);
    return { complaints: [], error: error.message };
  }
}

/**
 * Adds a new entry to the investigation timeline for a specific case.
 */
export async function addCaseLog(logData: Omit<CaseLog, "id">) {
  try {
    const docRef = await addDoc(collection(db, "case_logs"), logData);
    return { success: true, id: docRef.id, error: null };
  } catch (error: any) {
    console.error("Error adding case log:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches the investigation timeline for a specific case.
 */
export async function getCaseLogs(complaintId: string) {
  try {
    const q = query(
      collection(db, "case_logs"),
      where("complaintId", "==", complaintId)
    );
    
    const querySnapshot = await getDocs(q);
    const logs: CaseLog[] = [];
    
    querySnapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() } as CaseLog);
    });
    
    // Sort client-side to avoid needing a Firestore composite index
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return { logs, error: null };
  } catch (error: any) {
    console.error("Error fetching case logs:", error);
    return { logs: [], error: error.message };
  }
}
