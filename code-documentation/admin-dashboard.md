# Admin Dashboard

**Route:** `/admin`  
**File:** `src/app/admin/page.tsx`

---

## 1. PAGE OVERVIEW

The Admin Dashboard is the most comprehensive page in the application (~5,500 lines). It is the system administrator's command center with the following modules:

- **Dashboard** — Analytics overview with charts, statistics, case distribution
- **Case Management** — View all CSR and FIR cases, approve/reject, assign officers
- **User Management** — View all registered users, filter by role, view profiles
- **Police Management** — Create new police officers, manage credentials, reset passwords, update profiles
- **SOS Monitoring** — Real-time active SOS alerts with live map, resolve alerts, add resolution notes
- **SOS History** — View resolved SOS alerts, generate QR codes, print records
- **Analytics** — Detailed charts and graphs of crime statistics
- **Safety Map** — Interactive map with all incident locations
- **Backup & Restore** — Export/import complete database as JSON

---

## 2. DATA USED IN THIS PAGE

- **From Firestore `complaints` + `incidents` + `officer_reviews` (via `getAllComplaints()`):**
  All cases in the system with citizen names, statuses, and assigned officers.

- **From Firestore `users` (via `getAllUsers()`):**
  All registered users — citizens, police officers, and admins.

- **From Firestore `sos_alerts` (via `onSnapshot` real-time listener):**
  Active and resolved SOS alerts with citizen info and GPS coordinates.

- **From Firestore `case_logs` (via `getCaseLogs()`):**
  Investigation timeline for selected cases.

- **From Next.js API routes:**
  Police creation, credential management, password resets, case status updates, backup/restore.

---

## 3. API CONNECTION FOR THIS PAGE

### Next.js API Routes Called:

| # | Endpoint | Method | Request Body | Response | When Called |
|---|----------|--------|-------------|----------|------------|
| 1 | `/api/admin/create-police` | POST | `{ email, name, adminUid, badgeNumber, adminIdToken, rank, stationName, ... }` | `{ success, uid, policeId, temporaryPassword, generatedCredentials }` | "Create Police Officer" form submit |
| 2 | `/api/admin/save-police-credentials` | POST | `{ uid, name, policeId, policeEmail, badgeNumber, password, adminUid, adminIdToken }` | `{ success, message }` or `{ alreadyGenerated, policeId, ... }` | "Save Credentials" button |
| 3 | `/api/admin/reset-police-password` | POST | `{ uid, adminUid, adminIdToken }` | `{ success, policeId, officerName, newTemporaryPassword }` | "Reset Password" button |
| 4 | `/api/admin/update-case-status` | POST | `{ complaintId, type, firNumber, status, adminUid }` | `{ success, message }` | Background call after case approve/reject |
| 5 | `/api/admin/backup` | GET | Query: `?download=true` | JSON file download | "Export Backup" button |
| 6 | `/api/admin/backup` | POST | `{ collections: {...}, mode: "merge" \| "overwrite" }` | `{ success, restoredStats }` | "Restore Backup" button |

### Direct Firebase SDK Calls:

| Function | Source File | What It Does |
|---|---|---|
| `getAllComplaints()` | `lib/police.ts` | Fetches all CSRs + FIRs + officer reviews |
| `getAllUsers()` | `lib/admin.ts` | Fetches all users ordered by creation date |
| `assignCaseToOfficer(...)` | `lib/admin.ts` | Assigns officer to a case (validates status first) |
| `updateCaseStatus(...)` | `lib/admin.ts` | Approves/rejects a case (writes to Firestore directly) |
| `saveSOSResolutionNote(...)` | `lib/admin.ts` | Saves immutable resolution note for resolved SOS |
| `updatePoliceOfficerProfile(...)` | `lib/admin.ts` | Updates police officer's profile fields |
| `assignUserAsPolice(...)` | `lib/admin.ts` | Promotes existing user to police role |
| `getCaseLogs(...)` | `lib/police.ts` | Fetches investigation timeline |
| `getUserProfile(...)` | `lib/profile.ts` | Fetches individual user profile |
| `onSnapshot(...)` | Firebase SDK | Real-time listener for SOS alerts |

- **Code snippet (creating police officer):**
  ```typescript
  const res = await fetch("/api/admin/create-police", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email, name, adminUid: currentUser.uid,
      badgeNumber, adminIdToken: token, rank, stationName, ...
    })
  });
  const data = await res.json();
  if (data.success) {
    setGeneratedCredentials(data.generatedCredentials);
  }
  ```

---

## 4. BACKEND CONNECTION FOR THIS PAGE

### `/api/admin/create-police` (route.ts)
- **Receives:** Officer details (email, name, badge number, rank, station, etc.)
- **Steps:**
  1. Validates required fields.
  2. Auto-generates Police ID from name + badge number.
  3. Auto-generates secure temporary password.
  4. Verifies admin authorization.
  5. Checks for duplicate email, badge number, and police ID.
  6. Creates Firebase Auth account (Admin SDK or REST API fallback).
  7. Creates Firestore `users` document with 25+ fields.
  8. Returns generated credentials.

### `/api/admin/save-police-credentials` (route.ts)
- **Receives:** UID, police ID, police email, badge number, optional password.
- **Steps:** Validates uniqueness, checks idempotence, updates Auth password if provided, updates Firestore profile.

### `/api/admin/reset-police-password` (route.ts)
- **Receives:** Officer UID, admin UID.
- **Steps:** Generates new temporary password, updates Firebase Auth, sets `mustChangePassword: true` in Firestore.

### `/api/admin/update-case-status` (route.ts)
- **Receives:** Complaint ID, type, FIR number, new status.
- **Steps:** Validates status value, updates `incidents` or `complaints` collection, updates/creates `officer_reviews`, adds entry to `case_logs`.

### `/api/admin/backup` (route.ts)
- **GET:** Discovers all collections, reads all documents, returns as JSON.
- **POST:** Receives backup JSON, writes documents in batches of 400 (merge or overwrite mode).

---

## 5. CODE FLOW

1. Page mounts → Auth check → role check (must be `"admin"`).
2. Fetches all complaints, users, and starts real-time SOS listener.
3. **Dashboard tab:** Renders analytics cards (total cases, users, SOS alerts), charts, and statistics.
4. **Case Management:** Admin can search/filter cases, view details, approve/reject, assign officers.
5. **Case Approve/Reject:** Writes status directly to Firestore, then fires API in background for audit log.
6. **Police Management:** Admin fills a 23-field form → calls `/api/admin/create-police` → credentials displayed.
7. **Credential generation:** Displayed in a modal with copy buttons for each field.
8. **Password reset:** Calls `/api/admin/reset-police-password` → new temp password displayed.
9. **SOS Monitoring:** Real-time listener shows active alerts with map → admin can resolve and add notes.
10. **SOS History:** Links to `/admin/sos-history` for resolved alerts.
11. **Backup:** Export downloads JSON; Restore uploads JSON file and writes all data back.
12. **Logout:** `logoutUser()` → redirect.

---

## 6. SIMPLE EXPLANATION (IN EASY WORDS)

This is the **boss's control room**. The System Administrator can see everything happening in the entire system — all complaints, all users, all emergency alerts. They can:

- **Approve or reject** citizen complaints (like a manager reviewing requests).
- **Create new police officer accounts** (like an HR department hiring new officers).
- **Assign cases to specific officers** (like a supervisor distributing workload).
- **Monitor emergencies in real-time** on a map (like a 911 dispatch center).
- **Back up the entire database** (like making a safety copy of all records).

It's the most powerful page in the app with access to everything.

---

## 7. BLOCK-BY-BLOCK SUMMARY

| Block Name | What It Does | One-Line Summary |
|---|---|---|
| **Imports** | ~30 imports including React, Firebase, all lib files, icons, dynamic components | Loads extensive dependencies |
| **State Variables** | 50+ state variables for all modules | Manages entire admin state |
| **useEffect (Auth)** | Auth guard, role check, data fetch, real-time SOS listener | Initialization and security |
| **Dashboard Tab** | MorphingCards, StatusDonutChart, AnalyticsChart, statistics | Visual analytics overview |
| **Case Management Tab** | Case list with search/filter, detail modal, approve/reject, assign officer | Case administration |
| **Approve/Reject Logic** | `updateCaseStatus()` → Firestore write → API call for audit log | Case decision workflow |
| **Officer Assignment** | Officer dropdown → `assignCaseToOfficer()` with status validation | Case-to-officer linking |
| **User Management Tab** | User list with search/filter by role, profile viewer | User directory |
| **Police Management Tab** | 23-field form, `/api/admin/create-police`, credential display modals | Police officer creation |
| **Credentials Modal** | Displays generated Police ID, email, temp password with copy buttons | Credential presentation |
| **Password Reset** | Confirm modal → `/api/admin/reset-police-password` → success modal | Password management |
| **SOS Monitoring Tab** | Real-time `onSnapshot`, SafetyMap, resolve button, status update | Emergency response |
| **SOS Resolution Note** | `saveSOSResolutionNote()` — immutable, one-time-only note | Permanent incident documentation |
| **SOS QR Modal** | Generates QR code linking to public SOS record view | Shareable SOS records |
| **SOS History Link** | Navigation to `/admin/sos-history` | Historical SOS records |
| **Analytics Tab** | Charts, graphs, crime distribution | Data visualization |
| **Safety Map Tab** | Leaflet map with incident markers | Geographic case overview |
| **Backup/Restore Tab** | Export GET → JSON download; Restore POST → file upload + write | Database management |
| **AdminNavDock** | Floating navigation dock for tab switching | Persistent navigation |
| **Logout** | `logoutUser()` → redirect | Session termination |
