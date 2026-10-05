# SOS Print Page

**Route:** `/sos/print/[token]`  
**File:** `src/app/sos/print/[token]/page.tsx`

---

## 1. PAGE OVERVIEW

The SOS Print Page is a **print-optimized, public-facing page** that renders a resolved SOS emergency record in a clean, printable format. It automatically triggers the browser's print dialog when loaded. This page is designed to produce a professional-looking official document suitable for filing or archiving.

---

## 2. DATA USED IN THIS PAGE

- **URL Parameter:**
  - `token` — Secure token encoding the SOS alert ID

- **From Firestore `sos_alerts` collection (via `getSOSRecordByToken`):**
  Same data as the SOS History View page:
  - `citizenName`, `citizenPhone`, `citizenEmail`, `citizenAddress`
  - `latitude`, `longitude`
  - `status`, `createdAt`, `resolvedAt`
  - `resolutionNote`

---

## 3. API CONNECTION FOR THIS PAGE

This page does **not** call any Next.js API route.

- **Function called:** `getSOSRecordByToken(token)` from `src/lib/sos-token.ts`
- **When called:** On page mount.
- Same token decode + Firestore read flow as the SOS History View page.

---

## 4. BACKEND CONNECTION FOR THIS PAGE

- **No backend route.** Firebase Client SDK reads the SOS record directly from Firestore.

---

## 5. CODE FLOW

1. Page mounts → Reads `token` from URL params.
2. Calls `getSOSRecordByToken(token)` to fetch the SOS record.
3. If record found → renders print-formatted layout.
4. **Auto-print:** After a 700ms delay, `window.print()` is triggered automatically.
5. If not found → shows error message with "Return to Main Portal" link.
6. "Manual Print" button available if auto-print is blocked by browser policy.
7. Print CSS hides the manual print button and non-essential elements.

---

## 6. SIMPLE EXPLANATION (IN EASY WORDS)

This page is like a **printable version** of an emergency record. When someone needs a paper copy of an SOS record (for official filing, court, or records), this page formats everything neatly — like an official police document — and automatically opens the print dialog. It shows all the important details: who called for help, where they were, when it happened, and how it was resolved. Think of it as a formatted report you can print and put in a physical file folder.

---

## 7. BLOCK-BY-BLOCK SUMMARY

| Block Name | What It Does | One-Line Summary |
|---|---|---|
| **Imports** | React hooks, `useParams`, icons, `getSOSRecordByToken`, Next.js Link | Loads dependencies |
| **State Variables** | `alert`, `loading`, `notFound`, `printed` | Manages data, loading, and print state |
| **useEffect (Fetch)** | Reads token, calls `getSOSRecordByToken()` | Loads record on mount |
| **useEffect (Auto-print)** | Triggers `window.print()` after 700ms delay | Automatic print dialog |
| **handleManualPrint** | Calls `window.print()` on button click | Manual print fallback |
| **Loading State** | Spinner with "Preparing" message | Loading indicator |
| **Not Found State** | Error message with return link | Invalid token handling |
| **Document Header** | "Official Emergency SOS Record" title, status badge, precinct branding | Professional document header |
| **Incident Details Section** | Case ID, status, trigger date, resolution date | Timeline identification |
| **Citizen Details Section** | Name, ID, phone, email, address | Who triggered the SOS |
| **GPS Location Section** | Latitude, longitude, Google Maps link | Location data |
| **Resolution Statement Section** | Resolution note in a bordered box | How it was handled |
| **Document Footer** | "Verified Record" line, precinct name, print timestamp | Official footer |
| **Print Button** | Manual print trigger (hidden during actual printing via CSS) | User-initiated print |
| **Print CSS** | `@media print` rules to hide buttons and optimize layout | Print-friendly styling |
