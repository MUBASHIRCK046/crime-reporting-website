import { db, storage } from "@/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Fetches a user's profile data from Firestore.
 */
export async function getUserProfile(uid: string) {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return { profile: { id: userDoc.id, ...userDoc.data() } as any, error: null };
    } else {
      return { profile: null, error: "User profile not found." };
    }
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    return { profile: null, error: error.message };
  }
}

/**
 * Updates a user's extended profile fields in Firestore.
 */
export async function updateUserProfile(uid: string, profileData: any) {
  try {
    const userDocRef = doc(db, "users", uid);
    // Use setDoc with merge: true to avoid "No document to update" errors
    await setDoc(userDocRef, profileData, { merge: true });
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Uploads a profile document (like a photograph or signature) to Firebase Storage
 * and returns the public URL.
 */
export async function uploadProfileDocument(file: File, citizenId: string, documentType: string): Promise<string | null> {
  try {
    const uniqueFileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `profile_docs/${citizenId}/${documentType}_${uniqueFileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error(`Error uploading ${documentType}:`, error);
    return null;
  }
}
