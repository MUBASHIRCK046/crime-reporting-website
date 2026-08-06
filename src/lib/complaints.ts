/**
 * ====================================================
 * COMPLAINTS & SOS HELPERS (lib/complaints.ts)
 * ====================================================
 * Beginner Note: This file contains functions to handle uploading images
 * to Firebase Storage and saving complaint data to Firestore Database.
 */

import { db, storage } from "@/firebase/client";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Uploads an image file to Firebase Storage and returns the public URL.
 */
export async function uploadEvidenceImage(file: File, citizenId: string): Promise<string | null> {
  try {
    // 1. Create a unique file name so we don't overwrite other images
    const uniqueFileName = `${Date.now()}_${file.name}`;
    
    // 2. Create a "reference" (a path) in our Storage Bucket
    // Path looks like: evidence/user123/1623432423_photo.jpg
    const storageRef = ref(storage, `evidence/${citizenId}/${uniqueFileName}`);
    
    // 3. Upload the file to that path
    await uploadBytes(storageRef, file);
    
    // 4. Get the public URL so we can display the image on our website
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
}

/**
 * Saves a new complaint to the Firestore Database.
 */
export async function fileComplaint(citizenId: string, title: string, description: string, location: string, imageUrl: string | null) {
  try {
    // "addDoc" automatically creates a random unique ID for our new complaint document
    const docRef = await addDoc(collection(db, "complaints"), {
      citizenId: citizenId,
      title: title,
      description: description,
      location: location,
      status: "Pending", // All new complaints start as Pending
      imageUrl: imageUrl, // Can be null if they didn't upload a picture
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
    const docRef = await addDoc(collection(db, "sos_alerts"), {
      citizenId: citizenId,
      location: { latitude, longitude }, // Real GPS coordinates
      status: "Active",
      timestamp: new Date().toISOString(),
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
    // 1. Fetch CSR complaints
    const q1 = query(
      collection(db, "complaints"), 
      where("citizenId", "==", citizenId)
    );
    const snapshot1 = await getDocs(q1);
    
    const complaints: any[] = [];
    snapshot1.forEach((doc) => {
      complaints.push({ id: doc.id, type: "CSR", ...doc.data() });
    });

    // 2. Fetch FIR incidents
    const q2 = query(
      collection(db, "incidents"),
      where("complainantId", "==", citizenId)
    );
    const snapshot2 = await getDocs(q2);

    if (!snapshot2.empty) {
      // Need reviews to get status for FIRs
      const reviewsSnapshot = await getDocs(collection(db, "officer_reviews"));
      const reviewsMap: Record<string, any> = {};
      reviewsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.firNumber) {
          reviewsMap[data.firNumber] = data;
        }
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
    }

    // 4. Sort newest first — we do this ourselves instead of asking Firebase
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
