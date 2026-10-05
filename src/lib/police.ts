/**
 * ====================================================
 * POLICE COMMAND CENTER HELPERS (lib/police.ts)
 * ====================================================
 * Beginner Note: This file contains the tools that Police Officers use.
 * Unlike citizens who only see their own data, these functions fetch
 * EVERYONE'S data so the police can manage all crimes and alerts.
 */

import { db } from "@/firebase/client";
import { collection, getDocs, getDoc, query, orderBy, doc, updateDoc, where, addDoc } from "firebase/firestore";
import { CaseLog } from "./types";

/**
 * Fetches ALL complaints from the database, ordered by newest first.
 */
export async function getAllComplaints() {
  try {
    const q1 = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
    const q2 = query(collection(db, "incidents"), orderBy("createdAt", "desc"));
    
    // 1. Fetch CSRs, FIRs, and Reviews in parallel (single round-trip bundle)
    const [snapshot1, snapshot2, reviewsSnapshot] = await Promise.all([
      getDocs(q1),
      getDocs(q2),
      getDocs(collection(db, "officer_reviews"))
    ]);

    const complaints: any[] = [];
    snapshot1.forEach((doc) => {
      complaints.push({ id: doc.id, type: "CSR", ...doc.data() });
    });

    const reviewsMap: Record<string, any> = {};
    reviewsSnapshot.forEach((doc) => {
      const data = doc.data();
      reviewsMap[data.firNumber] = data;
    });

    snapshot2.forEach((doc) => {
      const data = doc.data();
      const review = reviewsMap[data.firNumber];
      complaints.push({ 
        ...data,
        id: doc.id, 
        type: "FIR",
        title: `FIR: ${data.category || 'Incident'} at ${data.location}`,
        citizenId: data.complainantId,
        firNumber: data.firNumber,
        status: review ? review.status : (data.status || "Pending"),
        assignedOfficerId: review ? review.officerId : (data.assignedOfficerId || null),
      });
    });

    // 2. High-Performance Parallel Batch User Resolution (eliminates N+1 sequential waterfall)
    const uniqueCitizenIds = Array.from(
      new Set(complaints.map((c) => c.citizenId).filter(Boolean))
    );

    const userDocSnaps = await Promise.all(
      uniqueCitizenIds.map((uid) => getDoc(doc(db, "users", uid)).catch(() => null))
    );

    const nameCache: Record<string, string> = {};
    userDocSnaps.forEach((uDoc, idx) => {
      const uid = uniqueCitizenIds[idx];
      if (uDoc && uDoc.exists()) {
        nameCache[uid] = uDoc.data().name || "Name Not Available";
      } else {
        nameCache[uid] = "Name Not Available";
      }
    });

    complaints.forEach((c) => {
      c.citizenName = (c.citizenId && nameCache[c.citizenId]) || "Name Not Available";
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
    
    // Parallel batch citizen name resolution
    const uniqueCitizenIds = Array.from(
      new Set(alerts.map((a) => a.citizenId).filter(Boolean))
    );

    const userDocSnaps = await Promise.all(
      uniqueCitizenIds.map((uid) => getDoc(doc(db, "users", uid)).catch(() => null))
    );

    const nameCache: Record<string, string> = {};
    userDocSnaps.forEach((uDoc, idx) => {
      const uid = uniqueCitizenIds[idx];
      if (uDoc && uDoc.exists()) {
        nameCache[uid] = uDoc.data().name || "Name Not Available";
      } else {
        nameCache[uid] = "Name Not Available";
      }
    });

    alerts.forEach((a) => {
      a.citizenName = (a.citizenId && nameCache[a.citizenId]) || "Name Not Available";
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
    const complaintRef = doc(db, "complaints", complaintId);
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
 * Fetches complaints specifically assigned to this police officer.
 */
export async function getAssignedCases(officerId: string) {
  try {
    const q1 = query(collection(db, "complaints"), where("assignedOfficerId", "==", officerId));
    const qReviews = query(collection(db, "officer_reviews"), where("officerId", "==", officerId));
    
    // Fetch assigned CSRs and officer reviews in parallel
    const [snapshot1, reviewsSnapshot] = await Promise.all([
      getDocs(q1),
      getDocs(qReviews)
    ]);

    const complaints: any[] = [];
    snapshot1.forEach((doc) => {
      complaints.push({ id: doc.id, type: "CSR", ...doc.data() });
    });

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
            status: review ? review.status : (data.status || "Pending"),
            assignedOfficerId: review ? review.officerId : null,
            ...data 
          });
        }
      });
    }

    // Parallel batch citizen name resolution
    const uniqueCitizenIds = Array.from(
      new Set(complaints.map((c) => c.citizenId).filter(Boolean))
    );

    const userDocSnaps = await Promise.all(
      uniqueCitizenIds.map((uid) => getDoc(doc(db, "users", uid)).catch(() => null))
    );

    const nameCache: Record<string, string> = {};
    userDocSnaps.forEach((uDoc, idx) => {
      const uid = uniqueCitizenIds[idx];
      if (uDoc && uDoc.exists()) {
        nameCache[uid] = uDoc.data().name || "Name Not Available";
      } else {
        nameCache[uid] = "Name Not Available";
      }
    });

    complaints.forEach((c) => {
      c.citizenName = (c.citizenId && nameCache[c.citizenId]) || "Name Not Available";
    });

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
