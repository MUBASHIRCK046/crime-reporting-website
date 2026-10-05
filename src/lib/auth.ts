/**
 * ====================================================
 * AUTHENTICATION HELPERS (lib/auth.ts)
 * ====================================================
 * Beginner Note: This file contains all the functions we need for 
 * logging in, signing up, and logging out. By keeping them here,
 * our UI code (the screens) stays clean and easy to read.
 */

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updatePassword,
  signOut
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/firebase/client";

/**
 * Registers a new user with Firebase Authentication and saves their 
 * details (like name, role, and date of birth) into the Firestore database.
 */
export async function registerUser(email: string, password: string, name: string, role: string, dob?: string) {
  try {
    // 1. Create the user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Save additional data (name, role, dob) in Firestore Database
    // We use the user's unique ID (user.uid) as the document ID
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      role: role, // e.g., 'citizen' or 'police'
      dob: dob || null,
      createdAt: new Date().toISOString(),
    });

    return { user, error: null };
  } catch (error: any) {
    console.error("Registration error:", error.message);
    return { user: null, error: error.message };
  }
}

/**
 * Logs in an existing user and fetches their role from Firestore.
 * Supports login by either Email or Police ID!
 */
export async function loginUser(emailOrPoliceId: string, password: string) {
  try {
    let emailToUse = emailOrPoliceId.trim();

    // Support logging in directly with Police ID (e.g. POL-2026-XXXX)
    if (!emailToUse.includes("@")) {
      const q = query(collection(db, "users"), where("policeId", "==", emailToUse));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const foundData = querySnapshot.docs[0].data();
        if (foundData.email) {
          emailToUse = foundData.email;
        }
      }
    }

    // 1. Log the user in with Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
    const user = userCredential.user;

    // 2. Fetch their role and password reset status from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return { 
        user, 
        role: userData.role, 
        mustChangePassword: !!userData.mustChangePassword,
        error: null 
      };
    }
    
    return { user, role: "citizen", error: null };
  } catch (error: any) {
    console.error("Login error:", error.message);
    return { user: null, role: null, error: error.message };
  }
}

/**
 * Allows a police officer to change their temporary password to a permanent one on first login.
 */
export async function changePolicePassword(newPassword: string) {
  try {
    if (!auth.currentUser) throw new Error("No authenticated user found.");
    
    // 1. Update Firebase Auth Password
    await updatePassword(auth.currentUser, newPassword);

    // 2. Clear mustChangePassword and remove temporaryPassword field
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      mustChangePassword: false,
      temporaryPassword: null,
      updatedAt: new Date().toISOString()
    });

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Password change error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Logs the current user out of Firebase.
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Logout error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Beginner Note: We use "try...catch" blocks. 
 * "try" means: "Attempt to do this code."
 * "catch" means: "If it fails (like wrong password), catch the error so the app doesn't crash!"
 * ====================================================
 */
