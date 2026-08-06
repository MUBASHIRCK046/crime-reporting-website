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
  signOut,
  User 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/client";

/**
 * Registers a new user with Firebase Authentication and saves their 
 * details (like name and role) into the Firestore database.
 */
export async function registerUser(email: string, password: string, name: string, role: string) {
  try {
    // 1. Create the user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Save additional data (name, role) in Firestore Database
    // We use the user's unique ID (user.uid) as the document ID
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      role: role, // e.g., 'citizen' or 'police'
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
 */
export async function loginUser(email: string, password: string) {
  try {
    // 1. Log the user in with Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Fetch their role from the Firestore Database
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return { user, role: userData.role, error: null };
    } else {
      return { user, role: null, error: "User data not found in database." };
    }
  } catch (error: any) {
    console.error("Login error:", error.message);
    return { user: null, role: null, error: error.message };
  }
}

/**
 * Logs the current user out.
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Beginner Note: We use "try...catch" blocks. 
 * "try" means: "Attempt to do this code."
 * "catch" means: "If it fails (like wrong password), catch the error so the app doesn't crash!"
 * ====================================================
 */
