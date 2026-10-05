# Police Dashboard

**Route:** `/police`  
**File:** `src/app/police/page.tsx`

---

## 1. PAGE OVERVIEW

The Police Dashboard is the command center for police officers. It provides:
- **Assigned Cases** — View cases assigned to this officer (both CSR and FIR)
- **Active SOS Alerts** — View real-time emergency alerts from citizens
- **Case Details Modal** — View full complaint details, investigation timeline, citizen KYC
- **Investigation Logs** — Add timeline updates to assigned cases
- **Status Updates** — Mark cases as Investigating, Resolved, or Closed
- **Case Export** — Export case reports as PDF or print them
- **Officer Profile** — View and edit personal police profile
- **Password Change Modal** — Change password (built-in modal)

---

## 2. DATA USED IN THIS PAGE

- **From Firestore `users` collection:**
  Current officer's profile (name, rank, badge number, station, etc.)

- **From Firestore `complaints` + `incidents` + `officer_reviews` collections:**
  Cases assigned to this officer, with status synced from `officer_reviews`.

- **From Firestore `sos_alerts` collection:**
  Active SOS alerts with citizen information and GPS coordinates.

- **From Firestore `case_logs` collection:**
  Investigation timeline entries for selected cases.

- **From Firestore `users` collection (other citizens):**
  Citizen profiles for KYC verification modal.

---

## 3. API CONNECTION FOR THIS PAGE

This page does **not** call any Next.js API route. It uses **Firebase Client SDK directly**.

| Function | Source File | What It Does | When Called |
|---|---|---|---|
| `getAssignedCases(officerId)` | `lib/police.ts` | Fetches CSRs assigned to officer + FIRs via `officer_reviews` | On page load |
| `getActiveSOSAlerts()` | `lib/police.ts` | Fetches SOS alerts with status "Active" | On page load |
| `updateComplaintStatus(id, status)` | `lib/police.ts` | Updates complaint status in Firestore | On status change button click |
| `addCaseLog(logData)` | `lib/police.ts` | Adds timeline entry to `case_logs` | On investigation log submit |
| `getCaseLogs(complaintId)` | `lib/police.ts` | Fetches timeline logs for a case | When opening case detail modal |
| `getUserProfile(uid)` | `lib/profile.ts` | Fetches officer or citizen profile | For profile view or KYC check |
| `changePolicePassword(newPassword)` | `lib/auth.ts` | Updates Auth password + clears `mustChangePassword` | On password change submit |
| `exportCaseToPDF(complaint, logs)` | `lib/export.ts` | Generates and downloads PDF report | On "Export PDF" button click |
| `printCaseDetails(complaint, logs)` | `lib/export.ts` | Opens print-friendly window | On "Print" button click |

- **Code snippet (adding case log):**
  ```typescript
  const result = await addCaseLog({
    complaintId: selectedComplaint.id,
    text: newLogText,
    authorId: currentUser.uid,
    authorName: currentUser.name,
    authorRole: "police",
    timestamp: new Date().toISOString(),
    isPublic: true
  });
  ```

---

## 4. BACKEND CONNECTION FOR THIS PAGE

- **No dedicated backend/API route is called from this page.**
- All data operations use Firestore Client SDK directly.
- **Key Firestore queries:**
  - `where("assignedOfficerId", "==", officerId)` on `complaints`
  - `where("officerId", "==", officerId)` on `officer_reviews`
  - `where("status", "==", "Active")` on `sos_alerts`
  - `where("complaintId", "==", id)` on `case_logs`

---

## 5. CODE FLOW

1. Page mounts → `onAuthStateChanged` checks login status.
2. If not logged in → `/login`. If role isn't `police` → redirect to correct dashboard.
3. If `mustChangePassword` is true → redirect to `/police/change-password`.
4. `fetchDashboardData(uid)` runs: fetches assigned cases and active SOS alerts in parallel.
5. **Case list:** Displays all assigned CSRs and FIRs with search/filter functionality.
6. **Clicking a case:** Opens detail modal → fetches case logs for timeline.
7. **Adding log:** Officer types investigation update → `addCaseLog()` saves to `case_logs`.
8. **Status update:** Officer changes case status → `updateComplaintStatus()` updates Firestore.
9. **Export/Print:** Generates PDF or opens print dialog with case details + timeline.
10. **KYC Check:** Officer can view the filing citizen's full profile for identity verification.
11. **Profile view:** Officer can see and edit their own profile.
12. **Logout:** `logoutUser()` → redirect to `/login`.

---

## 6. SIMPLE EXPLANATION (IN EASY WORDS)

This is the police officer's workspace. After logging in, the officer sees all cases assigned to them. They can click on any case to see full details — who filed it, what happened, and any previous investigation updates. The officer can add new updates (like "Visited the crime scene today" or "Collected CCTV footage") which the citizen can see on their dashboard. They can also change the case status (e.g., from "Investigating" to "Resolved"), export the case as a PDF report, or print it. There's also a section showing emergency SOS alerts that are currently active. Think of it like a police officer's desk where all their case files are neatly organized.

---

## 7. BLOCK-BY-BLOCK SUMMARY

| Block Name | What It Does | One-Line Summary |
|---|---|---|
| **Imports** | React hooks, Firebase, police/auth/export/profile libs, icons, Sonner | Loads dependencies |
| **State Variables** | `currentUser`, `complaints`, `sosAlerts`, `loading`, `selectedComplaint`, `caseLogs`, `newLogText`, modal states | Manages all dashboard data |
| **useEffect (Auth)** | Auth check, role enforcement, password change redirect, data fetch | Auth guard and initialization |
| **useEffect (Logs)** | Fetches case logs when `selectedComplaint` changes | Auto-loads timeline for selected case |
| **fetchDashboardData** | Calls `getAssignedCases()` and `getActiveSOSAlerts()` in parallel | Loads all dashboard data |
| **Case List** | Filtered/searchable list of assigned cases with status badges | Displays all officer's cases |
| **Case Detail Modal** | Full complaint details, evidence image, citizen info, assigned officer | Detailed case view |
| **Investigation Timeline** | Chronological list of `case_logs` entries | Shows investigation progress |
| **Add Log Form** | Text input + submit button to add new investigation update | Creates new timeline entries |
| **Status Update Buttons** | Buttons to change case status (Investigating/Resolved/Closed) | Case status management |
| **Export PDF / Print** | `exportCaseToPDF()` / `printCaseDetails()` | Case report generation |
| **KYC Modal** | Fetches and displays the filing citizen's full profile | Citizen identity verification |
| **Officer Profile Modal** | Displays/edits current officer's profile | Police profile management |
| **Password Change Modal** | Form to change password with validation | Password update |
| **SOS Alerts Section** | Lists active emergency alerts with location and citizen info | Emergency alert monitoring |
| **Logout** | `logoutUser()` → redirect to `/login` | Session termination |
