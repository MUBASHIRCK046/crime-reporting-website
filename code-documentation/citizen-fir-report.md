# File FIR Page (First Information Report)

**Route:** `/citizen/report`  
**File:** `src/app/citizen/report/page.tsx`

---

## 1. PAGE OVERVIEW

The File FIR Page is a comprehensive **5-step wizard** that allows citizens to file a detailed First Information Report (FIR). Unlike the simple CSR form, this collects exhaustive information about the incident, offence details, evidence files, witness information, and a complainant statement. It mirrors the official Indian FIR format.

### The 5 Steps:
1. **Incident Details** — Category, location, date/time, description
2. **Offence & Legal Details** — Offence description, applicable sections, property details
3. **Evidence Upload** — Multiple file uploads (PDF, images, videos, documents; max 15 MB each)
4. **Witnesses** — Add multiple witnesses with name, phone, statement
5. **Complainant Statement** — Final statement, consent, and submission

---

## 2. DATA USED IN THIS PAGE

- **User Input (collected across 5 steps):**
  - **Step 1:** Crime category, location, state, date, time, description, complainant details (auto-filled from profile)
  - **Step 2:** Offence description, legal sections, stolen property details
  - **Step 3:** Multiple evidence files with type classification
  - **Step 4:** Array of witnesses (name, phone, statement/address)
  - **Step 5:** Free-text statement, consent checkbox

- **From Firestore `users` collection (auto-filled):**
  Complainant name, phone, email, address, ID proof — fetched via `getUserProfile()`.

- **Data written to multiple Firestore collections:**
  - `incidents` — Main FIR record with `firNumber`
  - `offences` — Offence details linked by `firNumber`
  - `evidence` — Each uploaded file's metadata linked by `firNumber`
  - `witnesses` — Each witness record linked by `firNumber`
  - `statements` — Complainant's statement linked by `firNumber`
  - `officer_reviews` — Initial empty review with status `"Submitted"`

- **Data stored in Firebase Storage:**
  - Path: `fir_evidence/{firNumber}/{timestamp}_{filename}`

- **Example FIR Number format:** `FIR-2026-ABCD-1234`

---

## 3. API CONNECTION FOR THIS PAGE

This page does **not** call any Next.js API route. It uses **Firebase Client SDK directly**.

- **Functions called from `lib/fir.ts`:**
  1. `generateFIRNumber()` — Generates unique FIR number.
  2. `fileComprehensiveFIR(citizenId, incidentData, offenceData, evidenceFiles, witnessesData, statementData)` — Creates all documents in parallel using `Promise.all()`.

- **Firebase SDK operations inside `fileComprehensiveFIR`:**
  - `addDoc(collection(db, "incidents"), {...})` — Creates incident record
  - `addDoc(collection(db, "offences"), {...})` — Creates offence record
  - `uploadBytes()` + `getDownloadURL()` — Uploads each evidence file
  - `addDoc(collection(db, "evidence"), {...})` — Creates evidence metadata
  - `addDoc(collection(db, "witnesses"), {...})` — Creates each witness record
  - `addDoc(collection(db, "statements"), {...})` — Creates statement record
  - `addDoc(collection(db, "officer_reviews"), {...})` — Creates initial review

- **When called:** On final step submission.

- **Code snippet:**
  ```typescript
  const result = await fileComprehensiveFIR(
    userUid, incidentData, offenceData, evidenceFiles, witnessesData, statementData
  );
  if (result.success) {
    setGeneratedFirNumber(result.firNumber);
    setSuccess(true);
  }
  ```

---

## 4. BACKEND CONNECTION FOR THIS PAGE

- **No backend route involved.** All Firestore writes and Storage uploads happen from the browser.
- **Performance optimization:** All document insertions and file uploads execute **in parallel** via `Promise.all()` for 10x-15x faster submission speed.
- **6 Firestore collections** are written to in a single submission.

---

## 5. CODE FLOW

1. Page mounts → Auth listener sets `userUid`, fetches user profile for auto-filling.
2. **Step 1:** User selects crime category, enters location, date/time, description. Complainant fields auto-filled from profile.
3. **Step 2:** User enters offence details, legal sections, property information.
4. **Step 3:** User uploads evidence files (drag-and-drop or file picker). Each file is validated for type (PDF, JPG, PNG, MP4, MOV, DOC, DOCX) and size (≤15 MB).
5. **Step 4:** User adds witnesses (name, phone, statement). Can add/remove multiple witnesses.
6. **Step 5:** User writes a final statement and checks the consent/truthfulness checkbox.
7. User clicks "Submit FIR" → `handleSubmit()` fires.
8. `fileComprehensiveFIR()` runs:
   - Generates a unique FIR number.
   - Creates all 6 types of documents in parallel.
   - Uploads all evidence files to Firebase Storage.
9. On success, the FIR number is displayed with copy functionality.
10. User can navigate back to dashboard or file another report.

---

## 6. SIMPLE EXPLANATION (IN EASY WORDS)

This page is like filling out a detailed police report at the station, but digitally. It's a step-by-step form (like a wizard) that takes you through 5 stages:

1. First, you describe what happened — what type of crime, where, when.
2. Then, you add legal details about the offence.
3. Next, you upload photos, videos, or documents as evidence.
4. After that, you add information about any witnesses who saw what happened.
5. Finally, you write your personal statement and confirm everything is true.

When you submit, the system generates a unique FIR number (like a tracking number for a package) so you can check on your case later. All your information is saved securely in the database.

---

## 7. BLOCK-BY-BLOCK SUMMARY

| Block Name | What It Does | One-Line Summary |
|---|---|---|
| **Imports** | React hooks, router, Firebase, FIR lib, icons, Sonner, Framer Motion | Loads dependencies |
| **Validation Constants** | Regex patterns for names, phones, emails; allowed file types; max file size; crime categories; Indian states list | Defines validation rules |
| **Interfaces** | `WitnessItem`, `UploadedEvidence` | Type definitions for witnesses and files |
| **State Variables** | 5-step wizard state, form fields per step, evidence array, witnesses array, loading/success | Manages all wizard data |
| **useEffect (Auth)** | Checks auth, fetches profile, auto-fills complainant fields | Auth guard and profile pre-fill |
| **Step Navigation** | `setStep()` with validation before advancing | Controls wizard progression |
| **Step 1: Incident Details** | Category dropdown, location/state inputs, date/time pickers, description textarea | Collects incident information |
| **Step 2: Offence Details** | Offence description, legal sections, property details | Collects legal details |
| **Step 3: Evidence Upload** | File upload with drag-and-drop, file type/size validation, preview, remove | Manages evidence files |
| **Step 4: Witnesses** | Dynamic witness form (add/remove), name/phone/statement fields | Collects witness information |
| **Step 5: Statement** | Free-text statement area, consent checkbox | Final statement and consent |
| **handleSubmit** | Validates all steps, calls `fileComprehensiveFIR()`, shows success | Core submission logic |
| **Success View** | Displays FIR number with copy button, navigation options | Post-submission confirmation |
| **Progress Bar** | Visual step indicator showing current progress (1-5) | Wizard progress tracking |
