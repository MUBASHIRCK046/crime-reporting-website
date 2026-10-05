# File CSR Page (Community Service Register)

**Route:** `/citizen/csr`  
**File:** `src/app/citizen/csr/page.tsx`

---

## 1. PAGE OVERVIEW

The File CSR Page allows citizens to file a **Community Service Register (CSR)** complaint — a simpler, shorter form compared to a full FIR. Citizens provide a title, location, description, and optionally upload an evidence image. On submission, a CSR document is created in Firestore and a unique CSR ID is returned.

---

## 2. DATA USED IN THIS PAGE

- **User Input (collected):**
  - `title` — Incident title (min 3 chars)
  - `location` — Where the incident happened (min 3 chars)
  - `description` — Detailed description (min 10 chars)
  - `selectedImage` — Optional evidence image file (JPG, PNG, WebP; max 10 MB)

- **Data sent to Firestore `complaints` collection:**
  ```json
  {
    "citizenId": "user-uid",
    "title": "Bag Stolen at Market",
    "description": "My bag was snatched while walking...",
    "location": "Main Market Road",
    "status": "Pending",
    "imageUrl": "https://storage.googleapis.com/...",
    "createdAt": "2026-09-16T10:00:00.000Z"
  }
  ```

- **State Variables:**
  - `userUid`, `checkingAuth` — Authentication state
  - `title`, `location`, `description` — Form fields
  - `selectedImage`, `imagePreview` — Image file and preview URL
  - `loading`, `success`, `csrId` — Submission state
  - `errors`, `touched` — Validation state

---

## 3. API CONNECTION FOR THIS PAGE

This page does **not** call any Next.js API route. It uses **Firebase Client SDK directly**.

- **Functions called from `lib/complaints.ts`:**
  1. `uploadEvidenceImage(file, citizenId)` — Uploads image to Firebase Storage path `evidence/{citizenId}/{timestamp}_{filename}`, returns download URL.
  2. `fileComplaint(citizenId, title, description, location, imageUrl)` — Creates document in `complaints` collection.

- **When called:** On form submit (user clicks "Submit CSR Complaint").

- **Code snippet:**
  ```typescript
  let imageUrl: string | null = null;
  if (selectedImage) {
    imageUrl = await uploadEvidenceImage(selectedImage, userUid);
  }
  const result = await fileComplaint(userUid, title.trim(), description.trim(), location.trim(), imageUrl);
  if (result.success) {
    setCsrId(result.id);
    setSuccess(true);
  }
  ```

---

## 4. BACKEND CONNECTION FOR THIS PAGE

- **No backend route involved.**
- **Firebase Storage:** Image is uploaded to `evidence/{citizenId}/{filename}`.
- **Firestore:** New document is created in `complaints` collection using `addDoc()`.
- The complaint starts with status `"Pending"` and no assigned officer.

---

## 5. CODE FLOW

1. Page mounts → Auth listener checks if user is logged in; if not, redirects to `/login`.
2. User fills in title, location, and description.
3. User optionally selects an evidence image.
4. Image is validated (must be image type, max 10 MB).
5. User clicks "Submit" → `handleSubmit()` fires.
6. Client-side validation checks all required fields.
7. If an image was selected, it's uploaded to Firebase Storage first.
8. `fileComplaint()` creates a new document in Firestore `complaints`.
9. On success, the CSR ID is displayed with a copy button.
10. User can copy the CSR ID or navigate back to dashboard.

---

## 6. SIMPLE EXPLANATION (IN EASY WORDS)

This page is like a short complaint form. If something happened to you — like someone stole your phone or damaged your property — you fill in what happened, where it happened, and describe the incident. You can also attach a photo as proof. When you submit the form, you get a unique complaint number (CSR ID) that you can use to track your case later. Think of it like filling out a complaint slip at a police station counter, but you can do it from your phone or computer.

---

## 7. BLOCK-BY-BLOCK SUMMARY

| Block Name | What It Does | One-Line Summary |
|---|---|---|
| **Imports** | React hooks, router, Firebase Auth, lib helpers, icons, Sonner, Framer Motion | Loads dependencies |
| **State Variables** | `userUid`, form fields, image state, submission state, validation state | Manages all form data and UI |
| **useEffect (Auth)** | Listens for auth state, sets `userUid` or redirects to login | Authentication guard |
| **handleImageChange** | Validates file type/size, creates preview URL | Handles image selection |
| **removeImage** | Clears selected image and preview, revokes object URL | Removes uploaded image |
| **validateForm** | Checks title (≥3 chars), location (≥3 chars), description (≥10 chars) | Client-side form validation |
| **handleSubmit** | Validates form, uploads image, creates complaint, shows success | Core submission logic |
| **Form UI** | Title input, location input, description textarea | Collects incident details |
| **Image Upload Section** | File input, image preview, remove button | Evidence image attachment |
| **Submit Button** | Animated button with loading state | Triggers form submission |
| **Success View** | Displays CSR ID with copy button and navigation options | Post-submission confirmation |
