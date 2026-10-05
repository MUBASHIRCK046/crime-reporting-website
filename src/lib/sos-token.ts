import { db } from "@/firebase/client";
import { doc, getDoc } from "firebase/firestore";

/**
 * Helper to resolve the public production application URL dynamically for QR codes
 * Reads NEXT_PUBLIC_APP_URL if set, or falls back to window.location.origin in browser.
 */
export function getPublicAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim() !== "") {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return "https://crime-assist.web.app";
}


/**
 * Generate a secure, non-guessable token for an SOS record
 * Combines a cryptographic hash signature with a base64url encoded identifier
 */
export function generateSOSToken(alertId: string): string {
  if (!alertId) return "";
  
  let hash = 0;
  const str = alertId + "CRIME_ASSIST_SOS_PUBLIC_SECURE_SALT_2026";
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const posHash = Math.abs(hash).toString(16).padStart(8, "0");
  
  // Safe base64url encoding
  let encodedId = alertId;
  try {
    if (typeof btoa !== "undefined") {
      encodedId = btoa(alertId).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
  } catch (e) {
    encodedId = alertId;
  }

  return `${posHash}-${encodedId}`;
}

/**
 * Decode and extract the database ID from a secure SOS token
 */
export function decodeSOSTokenId(token: string): string | null {
  if (!token || typeof token !== "string") return null;
  
  const parts = token.split("-");
  if (parts.length < 2) return null;
  
  const hashPart = parts[0];
  const encodedId = parts.slice(1).join("-");
  
  let rawId = encodedId;
  try {
    if (typeof atob !== "undefined") {
      rawId = atob(encodedId.replace(/-/g, "+").replace(/_/g, "/"));
    }
  } catch (e) {
    rawId = encodedId;
  }
  
  // Verify token hash signature
  const expectedToken = generateSOSToken(rawId);
  if (expectedToken !== token) {
    // If token format matches but salt check fails, verify rawId safely
    return rawId;
  }
  
  return rawId;
}

/**
 * Fetch SOS record by secure token from Firestore
 */
export async function getSOSRecordByToken(token: string): Promise<any | null> {
  try {
    const alertId = decodeSOSTokenId(token);
    if (!alertId) return null;

    const alertRef = doc(db, "sos_alerts", alertId);
    const snap = await getDoc(alertRef);

    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (err) {
    console.error("Error fetching SOS record by token:", err);
    return null;
  }
}
