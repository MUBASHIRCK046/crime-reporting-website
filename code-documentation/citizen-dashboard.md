# Citizen Dashboard

**Route:** `/citizen`  
**File:** `src/app/citizen/page.tsx`

---

## 1. PAGE OVERVIEW

The Citizen Dashboard is the main hub for registered citizens. It provides:
- **Dashboard** — Overview of filed complaints with statistics
- **My Complaints** — List of all filed CSRs and FIRs with status tracking
- **File a Report** — Navigation to CSR and FIR filing pages
- **Safety Map** — Interactive map showing incident locations
- **Emergency SOS** — One-tap emergency alert with GPS location
- **Profile Management** — View and edit personal profile, upload photo/signature
- **Case Timeline** — Track investigation progress on individual complaints

---

## 2. DATA USED IN THIS PAGE

- **From Firestore `users` collection:**
  Profile data including name, email, phone, DOB, address, blood group, occupation, ID proof, photo, signature, emergency contacts.

- **From Firestore `complaints` + `incidents` collections:**
  All CSRs and FIRs filed by this citizen, including status, title, description, location, assigned officer.

- **From Firestore `case_logs` collection:**
  Investigation timeline entries for selected complaints.

- **From Browser Geolocation API:**
  Latitude and longitude for SOS alert trigger.

- **Example complaint object:**
  ```json
  {
    "id": "abc123",
    "type": "CSR",
    "title": "Theft at Market",
    "description": "My bag was stolen...",
    "location": "Main Market, City Center",
    "status": "Pending",
    "citizenId": "user-uid",
    "imageUrl": "https://storage.googleapis.com/...",
    "createdAt": "2026-09-15T10:30:00.000Z"
  }
  ```

---

## 3. API CONNECTION FOR THIS PAGE

### Direct Firebase SDK Calls (via lib helpers):

| Function | Source File | Firebase Operation | When Called |
|---|---|---|---|
| `getMyComplaints(uid)` | `lib/complaints.ts` | Queries `complaints` and `incidents` collections | On page load |
| `getUserProfile(uid)` | `lib/profile.ts` | Reads `users` document | On page load |
| `triggerSOS(uid, lat, lng)` | `lib/complaints.ts` | Reads user data, creates `sos_alerts` document | On SOS button click |
| `updateUserProfile(uid, data)` | `lib/profile.ts` | Updates `users` document | On profile save |
| `uploadProfileDocument(file, uid, type)` | `lib/profile.ts` | Uploads to Firebase Storage | On photo/signature upload |
| `getCaseLogs(complaintId)` | `lib/police.ts` | Queries `case_logs` collection | When viewing case timeline |

### API Route Call:

| Endpoint | Method | When Called |
|---|---|---|
| `/api/sos` | POST | After `triggerSOS()` — sends mock SMS alert |

- **Code snippet (SOS trigger):**
  ```typescript
  const { success } = await triggerSOS(userUid, latitude, longitude);
  if (success) {
    fetch("/api/sos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userUid, lat: latitude, lng: longitude })
    });
  }
  ```

---

## 4. BACKEND CONNECTION FOR THIS PAGE

- **SOS API (`/api/sos`):** Receives `userId`, `lat`, `lng`. Logs a mock SMS alert to the server console. In production, this would integrate with Twilio or similar SMS service.
- **All other operations** use Firebase Client SDK directly — no backend route needed.
- **Firestore queries:**
  - `where("citizenId", "==", uid)` on `complaints` collection
  - `where("complainantId", "==", uid)` on `incidents` collection
  - `where("complaintId", "==", id)` on `case_logs` collection

---

## 5. CODE FLOW

1. Page mounts → `onAuthStateChanged` listener checks if user is logged in.
2. If not logged in → redirects to `/login`.
3. If logged in but role is `admin` or `police` → redirects to their respective dashboard.
4. Fetches complaints and profile in parallel using `Promise.all()`.
5. Profile data populates the profile form; complaints populate the dashboard/complaints list.
6. **Dashboard tab:** Shows complaint statistics (total, pending, resolved), complaint cards.
7. **SOS button:** Gets browser geolocation → calls `triggerSOS()` → calls `/api/sos` API.
8. **Profile tab:** Allows editing all profile fields, uploading photo/signature.
9. **Complaint tracking:** Clicking a complaint opens a timeline modal showing investigation logs.
10. **Logout:** Calls `logoutUser()` and redirects to `/login`.

---

## 6. SIMPLE EXPLANATION (IN EASY WORDS)

This is your personal control panel after you log in as a citizen. It's like your personal desk in a police station, but digital. You can see all the complaints you've filed, file new ones, check if the police have started investigating your case, update your personal information, and — most importantly — hit an emergency SOS button if you're in danger. The SOS button grabs your phone's GPS location and sends an alert to the police. Everything updates in real-time so you always know the status of your cases.

---

## 7. BLOCK-BY-BLOCK SUMMARY

| Block Name | What It Does | One-Line Summary |
|---|---|---|
| **Imports** | React hooks, Firebase, lib helpers, icons, SafetyMap, Sonner | Loads all dependencies |
| **State Variables** | `loading`, `userUid`, `activeTab`, `complaints`, `profileData`, `sosActive`, `trackingComplaint`, `caseLogs` | Manages all page data and UI state |
| **useEffect (Auth)** | Listens for auth state, enforces role, fetches complaints + profile in parallel | Auth guard and initial data loading |
| **Profile State** | 16-field profile object (name, email, phone, DOB, address, blood group, etc.) | Manages editable profile data |
| **SOS Handler** | Gets geolocation, calls `triggerSOS()`, calls `/api/sos` | Emergency alert trigger |
| **Profile Save Handler** | Uploads photo/signature to Storage, saves all fields to Firestore | Profile update logic |
| **Timeline Modal** | Fetches and displays case investigation logs | Case progress tracking |
| **Tab Navigation** | Dashboard, Complaints, Report, Safety Map, SOS, Profile | Multi-section navigation |
| **Dashboard View** | Statistics cards, complaint list, status badges | Overview of filed cases |
| **Safety Map** | Leaflet/Google Maps component showing incident locations | Visual map display |
| **Complaint Cards** | Individual complaint details with status, date, tracking button | Displays each case |
| **Profile Form** | Editable fields for all profile information | Personal data management |
| **Logout Button** | Signs out and redirects to login | Session termination |
