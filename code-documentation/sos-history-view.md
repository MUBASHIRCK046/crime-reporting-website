# SOS History View Page (Public)

**Route:** `/sos/history/view/[token]`  
**File:** `src/app/sos/history/view/[token]/page.tsx`

---

## 1. PAGE OVERVIEW

The SOS History View Page is a **public-facing page** that displays the details of a resolved SOS emergency record. It does NOT require authentication — anyone with the correct token URL (from a QR code or shared link) can view it. This page is used for official verification of emergency incident records.

---

## 2. DATA USED IN THIS PAGE

- **URL Parameter:**
  - `token` — Secure, non-guessable token encoding the SOS alert ID

- **From Firestore `sos_alerts` collection (via `getSOSRecordByToken`):**
  - `citizenName`, `citizenPhone`, `citizenEmail`, `citizenAddress`
  - `latitude`, `longitude`
  - `status`, `createdAt`, `resolvedAt`
  - `resolutionNote`, `resolutionNoteImmutable`

- **Displayed data:**
  - Case ID (formatted: `SOS-XXXXXXXX`)
  - Trigger date and time
  - Resolution date and time
  - Citizen profile information
  - GPS coordinates with Google Maps link
  - Resolution note

---

## 3. API CONNECTION FOR THIS PAGE

This page does **not** call any Next.js API route.

- **Function called:** `getSOSRecordByToken(token)` from `src/lib/sos-token.ts`
- **Steps inside `getSOSRecordByToken`:**
  1. `decodeSOSTokenId(token)` — Extracts the real Firestore document ID from the secure token.
  2. `getDoc(doc(db, "sos_alerts", alertId))` — Fetches the SOS alert document.
  3. Returns the alert data or `null` if not found.

- **When called:** On page mount (useEffect).

---

## 4. BACKEND CONNECTION FOR THIS PAGE

- **No backend route.** Firestore Client SDK reads the `sos_alerts` document directly.
- **Token decoding:** The token is a combination of a hash signature and base64url-encoded document ID, decoded using `decodeSOSTokenId()`.

---

## 5. CODE FLOW

1. Page mounts → Reads `token` from URL params.
2. Calls `getSOSRecordByToken(token)` which decodes the token and fetches from Firestore.
3. If record found → displays full SOS record details.
4. If not found → displays "SOS Record Not Found" error page with "Return to Main Portal" link.
5. While loading → shows spinner with "Verifying Public SOS Record Token..." message.
6. Record displays: Case ID, status badge, trigger/resolution dates, citizen info, GPS with map link, resolution note.

---

## 6. SIMPLE EXPLANATION (IN EASY WORDS)

This is a **public receipt page** for an emergency incident. When an admin generates a QR code for a resolved SOS alert, the QR code links to this page. Anyone who scans the QR code (or clicks the link) can see the official record of what happened — when the emergency was triggered, who triggered it, where they were, and how it was resolved. It's like a digital certificate that proves the emergency was officially handled. No login is needed to view it.

---

## 7. BLOCK-BY-BLOCK SUMMARY

| Block Name | What It Does | One-Line Summary |
|---|---|---|
| **Imports** | React hooks, `useParams`, icons, `getSOSRecordByToken`, Next.js Link | Loads dependencies |
| **State Variables** | `alert`, `loading`, `notFound` | Manages data and loading state |
| **useEffect (Fetch)** | Reads token from URL, calls `getSOSRecordByToken()` | Loads SOS record on mount |
| **Loading State** | Spinner with "Verifying" message | Shows while fetching |
| **Not Found State** | Error icon, "Record Not Found" message, "Return" link | Displays on invalid token |
| **Case Header** | Case ID badge, status badge, verification icon | Record identification |
| **Incident Details** | Trigger date, resolution date, status | Timeline information |
| **Citizen Profile** | Name, ID, phone, email, address | Who triggered the SOS |
| **GPS Location** | Latitude, longitude, Google Maps external link | Where the emergency happened |
| **Resolution Statement** | Locked resolution note with lock icon | How it was resolved |
