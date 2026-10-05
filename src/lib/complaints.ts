/**
 * ====================================================
 * COMPLAINTS & SOS HELPERS (lib/complaints.ts)
 * ====================================================
 * Beginner Note: This file contains functions to handle uploading images
 * to Firebase Storage and saving complaint data to Firestore Database.
 */

import { db, storage } from "@/firebase/client";
import { collection, addDoc, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Uploads evidence files to the local evidence storage backend.
 */
export async function uploadLocalEvidence(
  files: File[],
  citizenName: string,
  complaintId: string
): Promise<{ success: boolean; evidence?: any[]; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("citizenName", citizenName || "Citizen");
    formData.append("complaintId", complaintId || Date.now().toString());

    for (const file of files) {
      formData.append("files", file);
    }

    const res = await fetch("/api/evidence/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to upload evidence to local storage.");
    }

    return { success: true, evidence: data.evidence };
  } catch (err: any) {
    console.error("Local evidence upload error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Uploads an image file to local evidence storage and returns the local serve URL.
 * (Preserves signature for backward compatibility)
 */
export async function uploadEvidenceImage(file: File, citizenId: string, citizenName: string = "Citizen", complaintId?: string): Promise<string | null> {
  try {
    const res = await uploadLocalEvidence([file], citizenName, complaintId || citizenId);
    if (res.success && res.evidence && res.evidence.length > 0) {
      return res.evidence[0].url || res.evidence[0].filePath;
    }
    return null;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
}

/**
 * Saves a new complaint to the Firestore Database with local evidence metadata.
 */
export async function fileComplaint(
  citizenId: string, 
  title: string, 
  description: string, 
  location: string, 
  imageUrl: string | null,
  evidence: any[] = []
) {
  try {
    // "addDoc" automatically creates a random unique ID for our new complaint document
    const docRef = await addDoc(collection(db, "complaints"), {
      citizenId: citizenId,
      title: title,
      description: description,
      location: location,
      status: "Pending", // All new complaints start as Pending
      imageUrl: imageUrl, // Primary thumbnail or first evidence file URL
      evidence: evidence, // Array of local evidence metadata [{ fileName, fileType, filePath, fileSize, url }]
      createdAt: new Date().toISOString(),
    });
    return { success: true, id: docRef.id, error: null };
  } catch (error: any) {
    console.error("Error filing complaint:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Triggers an emergency SOS alert.
 */
export async function triggerSOS(citizenId: string, latitude: number, longitude: number) {
  try {
    // Retrieve the citizen's profile info from /users/{citizenId}
    const userDocRef = doc(db, "users", citizenId);
    const userDoc = await getDoc(userDocRef);
    let citizenName = "Unknown Citizen";
    let citizenPhone = "N/A";
    let citizenEmail = "N/A";
    let citizenAddress = "N/A";

    if (userDoc.exists()) {
      const data = userDoc.data();
      citizenName = data.name || "Unknown Citizen";
      citizenPhone = data.mobileNumber || data.phone || "N/A";
      citizenEmail = data.email || "N/A";
      citizenAddress = data.residentialAddress || data.address || "N/A";
    }

    const docRef = await addDoc(collection(db, "sos_alerts"), {
      citizenId: citizenId,
      citizenName: citizenName,
      citizenPhone: citizenPhone,
      citizenEmail: citizenEmail,
      citizenAddress: citizenAddress,
      latitude: latitude,
      longitude: longitude,
      location: { latitude, longitude }, // Keep for compatibility
      emergencyMessage: "Citizen has activated the Emergency SOS.",
      status: "Active",
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(), // Keep for compatibility
      acknowledgedAt: null,
      respondingAt: null,
      resolvedAt: null,
      responseInfo: ""
    });
    return { success: true, id: docRef.id, error: null };
  } catch (error: any) {
    console.error("Error triggering SOS:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches all complaints created by a specific citizen.
 */
export async function getMyComplaints(citizenId: string) {
  try {
    const q1 = query(
      collection(db, "complaints"), 
      where("citizenId", "==", citizenId)
    );
    const q2 = query(
      collection(db, "incidents"),
      where("complainantId", "==", citizenId)
    );

    // Fetch citizen's CSRs and FIRs in parallel
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2)
    ]);
    
    const complaints: any[] = [];
    snapshot1.forEach((doc) => {
      complaints.push({ id: doc.id, type: "CSR", ...doc.data() });
    });

    if (!snapshot2.empty) {
      const firNumbers = snapshot2.docs.map((d) => d.data().firNumber).filter(Boolean);
      const reviewsMap: Record<string, any> = {};

      if (firNumbers.length > 0) {
        // Fetch only the relevant officer reviews for these FIRs in parallel
        const reviewSnaps = await Promise.all(
          firNumbers.map((fNum) =>
            getDocs(query(collection(db, "officer_reviews"), where("firNumber", "==", fNum))).catch(() => null)
          )
        );

        reviewSnaps.forEach((snap) => {
          if (snap && !snap.empty) {
            const data = snap.docs[0].data();
            if (data.firNumber) {
              reviewsMap[data.firNumber] = data;
            }
          }
        });
      }

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
    }

    // Sort newest first
    complaints.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return { complaints, error: null };
  } catch (error: any) {
    console.error("Error fetching complaints:", error);
    return { complaints: [], error: error.message };
  }
}

/**
 * Beginner Note: 
 * We separate "Storage" (files like JPGs) from "Database" (text like Title).
 * We upload the JPG first, get its URL, and then save that URL in the text database!
 * ====================================================
 */
