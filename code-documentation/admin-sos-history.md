# Admin SOS History Page

**Route:** `/admin/sos-history`  
**File:** `src/app/admin/sos-history/page.tsx`

---

## 1. PAGE OVERVIEW

The Admin SOS History Page displays all **resolved** SOS emergency alerts in a searchable, scrollable archive. Admins can:
- Search resolved alerts by citizen name, ID, location, or phone
- View full alert details (citizen info, GPS coordinates, timestamps)
- Add immutable resolution notes (one-time, permanent record)
- View the citizen's full profile
- Generate QR codes linking to the public SOS record
- Print formatted SOS records

---

## 2. DATA USED IN THIS PAGE

- **From Firestore `sos_alerts` collection (real-time listener):**
  All SOS alerts where `status == "Resolved"`, including:
  - `citizenId`, `citizenName`, `citizenPhone`, `citizenEmail`, `citizenAddress`
  - `latitude`, `longitude`
  - `status`, `createdAt`, `resolvedAt`
  - `resolutionNote`, `resolutionNoteImmutable`, `resolutionNoteAddedBy`

- **From Firestore `users` collection:**
  Citizen profiles for the "View Profile" modal.

---

## 3. API CONNECTION FOR THIS PAGE

This page does **not** call any Next.js API route. It uses **Firebase Client SDK directly**.

| Function | Source File | What It Does | When Called |
|---|---|---|---|
| `onSnapshot(query(...))` | Firebase SDK | Real-time listener for resolved SOS alerts | On page mount |
| `saveSOSResolutionNote(sosId, noteText, adminName)` | `lib/admin.ts` | Saves immutable resolution note | On note submit |
| `getUserProfile(citizenId)` | `lib/profile.ts` | Fetches citizen's full profile | On "View Profile" click |
| `printSOSHistoryRecord(alert)` | `lib/export.ts` | Opens formatted print-friendly window | On "Print" button click |

- **Real-time listener code snippet:**
  ```typescript
  const sosQuery = query(
    collection(db, "sos_alerts"),
    where("status", "==", "Resolved")
  );
  onSnapshot(sosQuery, (snapshot) => {
    const alerts = [];
    snapshot.forEach((doc) => alerts.push({ id: doc.id, ...doc.data() }));
    setResolvedAlerts(alerts);
  });
  ```

---

## 4. BACKEND CONNECTION FOR THIS PAGE

- **No API route called.** All data comes from Firebase Client SDK.
- **Firestore real-time listener** ensures the list updates automatically when a new SOS is resolved.
- **Resolution note immutability** is enforced in `saveSOSResolutionNote()` — it checks if `resolutionNote` or `resolutionNoteImmutable` already exists before allowing a write.

---

## 5. CODE FLOW

1. Page mounts → Auth listener checks login.
2. If not logged in → redirect to `/login`.
3. Real-time Firestore listener starts for `sos_alerts` where `status == "Resolved"`.
4. Alerts are sorted by resolved date (newest first) and displayed as cards.
5. Admin can search/filter alerts by name, phone, ID, or location.
6. **View details:** Clicking an alert expands to show full citizen info, GPS location, timestamps.
7. **Add resolution note:** Opens modal → admin types note → `saveSOSResolutionNote()` saves permanently.
8. **View citizen profile:** Opens modal → `getUserProfile()` fetches and displays full KYC.
9. **Generate QR:** Opens SOSQRModal with a QR code linking to `/sos/history/view/[token]`.
10. **Print record:** Calls `printSOSHistoryRecord()` → opens print-formatted window.
11. On unmount, real-time listener is cleaned up.

---

## 6. SIMPLE EXPLANATION (IN EASY WORDS)

This page is like an **archive cabinet** for past emergencies. Every time a citizen pressed the SOS button and the situation was later resolved, the record goes here. Admins can look back at these records, add official notes about how the emergency was handled (these notes can never be changed once written — like a sealed police report), view the citizen's personal details, generate a QR code that anyone can scan to see the record, or print it as an official document. It updates in real-time, so if another alert gets resolved while the admin is on this page, it appears automatically.

---

## 7. BLOCK-BY-BLOCK SUMMARY

| Block Name | What It Does | One-Line Summary |
|---|---|---|
| **Imports** | React hooks, Firebase, admin/export/profile libs, icons, AnimatedSubmitButton, Framer Motion, SOSQRModal | Loads dependencies |
| **State Variables** | `resolvedAlerts`, `searchQuery`, note modal state, QR modal state, profile modal state | Manages all page data |
| **useEffect (Title)** | Sets document title | Page title configuration |
| **useEffect (Realtime)** | Auth check + `onSnapshot` listener for resolved SOS alerts | Real-time data streaming |
| **Search/Filter** | Filters alerts by citizen name, phone, ID, or location | Search functionality |
| **Alert Cards** | Renders each resolved SOS with citizen info, location, timestamps | Displays historical records |
| **Resolution Note Modal** | Text input for permanent note, immutability check | Saves unchangeable notes |
| **Citizen Profile Modal** | Fetches and displays full citizen KYC profile | Identity verification |
| **SOS QR Modal** | Generates QR code for public record URL | Shareable record links |
| **Print Button** | Calls `printSOSHistoryRecord()` | Physical record printing |
| **Back Navigation** | Link back to `/admin` dashboard | Page navigation |
