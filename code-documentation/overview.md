# Crime Assist — Project Overview

## 1. Project Purpose (In Simple Words)

**Crime Assist** is a web-based crime reporting and emergency management platform. It connects three types of users:

- **Citizens** can register, file crime complaints (CSR and FIR), trigger emergency SOS alerts, view their case status, and manage their profile.
- **Police Officers** can view assigned cases, add investigation notes, update case statuses, export/print case reports, and view citizen profiles.
- **System Administrators** can manage all users, create police officer accounts, assign cases to officers, approve/reject complaints, manage SOS alerts, generate QR codes for SOS records, and perform database backup/restore operations.

Think of it as a digital bridge between citizens and law enforcement — replacing paper-based FIRs and phone calls with a real-time web portal.

---

## 2. Tech Stack

| Layer | Technology | Version / Details |
|---|---|---|
| **Frontend Framework** | Next.js (App Router) | v16.2.10 |
| **UI Library** | React | v19.2.4 |
| **Language** | TypeScript | v5+ |
| **Styling** | Tailwind CSS | v4 |
| **Animations** | Framer Motion | v12.43.0 |
| **Icons** | Lucide React | v1.24.0 |
| **Toast Notifications** | Sonner | v2.0.7 |
| **Maps** | Leaflet + react-leaflet | v1.9.4 / v5.0.0 |
| **PDF Export** | jsPDF + jspdf-autotable | v4.2.1 / v5.0.8 |
| **QR Codes** | qrcode + qrcode.react | v1.5.4 / v4.2.0 |
| **Authentication** | Firebase Authentication | v12.16.0 |
| **Database** | Firebase Firestore (NoSQL) | Cloud-hosted |
| **File Storage** | Firebase Cloud Storage | Cloud-hosted |
| **Server-side Admin** | Firebase Admin SDK | v14.1.0 |
| **Analytics** | Firebase Analytics | Optional |
| **Backend (API Routes)** | Next.js API Routes (serverless) | Runs on Node.js |

### External Services
- **Firebase** (Google) — Authentication, Firestore Database, Cloud Storage, Analytics
- **Google Maps API** — For map display and geolocation (API key required)
- **Leaflet / OpenStreetMap** — Alternative map rendering in SafetyMap component

---

## 3. Overall Data Flow Diagram

```
User (Browser)
    │
    ▼
┌──────────────────────────┐
│  Next.js Frontend Page   │   (React Components + Client-side logic)
│  (citizen / police /     │
│   admin dashboard)       │
└──────────┬───────────────┘
           │
    ┌──────┴──────────────────────────┐
    │                                 │
    ▼                                 ▼
┌──────────────────┐      ┌─────────────────────────┐
│ Firebase Client  │      │ Next.js API Routes       │
│ SDK (Direct)     │      │ (/api/admin/*, /api/sos) │
│                  │      │                          │
│ • Auth (login,   │      │ • Firebase Admin SDK     │
│   register)      │      │ • OR Firebase REST API   │
│ • Firestore      │      │   (fallback mode)        │
│   (read/write)   │      │                          │
│ • Storage        │      └──────────┬──────────────┘
│   (file upload)  │                 │
└──────┬───────────┘                 │
       │                             │
       ▼                             ▼
┌─────────────────────────────────────────┐
│          Firebase Cloud Services        │
│                                         │
│  ┌──────────────┐  ┌────────────────┐   │
│  │ Firestore DB │  │ Cloud Storage  │   │
│  │ (NoSQL)      │  │ (Files/Images) │   │
│  └──────────────┘  └────────────────┘   │
│                                         │
│  ┌──────────────┐  ┌────────────────┐   │
│  │ Firebase     │  │ Firebase       │   │
│  │ Auth         │  │ Analytics      │   │
│  └──────────────┘  └────────────────┘   │
└─────────────────────────────────────────┘
```

**Summary:** The frontend talks to Firebase directly (via the client SDK) for most operations. For privileged server-side actions (creating police accounts, resetting passwords), it calls Next.js API routes which use the Firebase Admin SDK.

---

## 4. List of ALL APIs Used in the Project

### Internal APIs (Next.js API Routes)

| # | Endpoint | Method | What It Does | Which Pages Call It |
|---|----------|--------|-------------|---------------------|
| 1 | `/api/admin/create-police` | POST | Creates a new police officer account in Firebase Auth + Firestore with auto-generated credentials | Admin Dashboard |
| 2 | `/api/admin/save-police-credentials` | POST | Saves/updates police officer credentials (Police ID, email, badge, password) to an existing officer account | Admin Dashboard |
| 3 | `/api/admin/reset-police-password` | POST | Resets a police officer's password to a new temporary password and flags `mustChangePassword` | Admin Dashboard |
| 4 | `/api/admin/update-case-status` | POST | Updates case status to Approved/Rejected and writes an audit entry to `case_logs` | Admin Dashboard (background call) |
| 5 | `/api/admin/backup` | GET | Exports ALL Firestore collections as a JSON backup file | Admin Dashboard |
| 6 | `/api/admin/backup` | POST | Restores Firestore data from a JSON backup file (merge or overwrite mode) | Admin Dashboard |
| 7 | `/api/sos` | POST | Mock SMS alert dispatch for SOS (placeholder for Twilio integration) | Citizen Dashboard |

### External APIs / Services

| # | Service | What It Does | Where It's Used |
|---|---------|-------------|-----------------|
| 1 | Firebase Auth REST API (`identitytoolkit.googleapis.com`) | Fallback for creating auth accounts when Admin SDK is not configured | `/api/admin/create-police` (fallback mode) |
| 2 | Firestore REST API (`firestore.googleapis.com`) | Fallback for Firestore read/write when Admin SDK is not configured | `/api/admin/create-police`, `save-police-credentials`, `reset-police-password` (fallback mode) |
| 3 | Google Maps API | Displays maps and location data | Landing Page, Citizen Dashboard (SafetyMap component) |
| 4 | OpenStreetMap / Leaflet tiles | Tile-based map rendering | SafetyMap component |

### Client-Side Firebase SDK Calls (Not REST — direct SDK)

| # | Firebase Service | Operation | Where It's Used |
|---|-----------------|-----------|-----------------|
| 1 | Firebase Auth | `createUserWithEmailAndPassword` | Register Page, Setup Page |
| 2 | Firebase Auth | `signInWithEmailAndPassword` | Login Page |
| 3 | Firebase Auth | `updatePassword` | Police Change Password |
| 4 | Firebase Auth | `signOut` | All dashboards (logout) |
| 5 | Firestore | `setDoc`, `getDoc`, `getDocs`, `addDoc`, `updateDoc` | All pages |
| 6 | Firestore | `onSnapshot` (real-time listener) | Admin Dashboard (SOS alerts), Admin SOS History |
| 7 | Cloud Storage | `uploadBytes`, `getDownloadURL` | CSR Filing (evidence upload), FIR Filing (evidence upload), Profile (photo/signature upload) |

---

## 5. List of ALL Data Used in the Project

### Database: Firebase Firestore (NoSQL)

#### Collection: `users`
| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | Firebase Auth UID (document ID) |
| `name` | string | Full name |
| `email` | string | Email address |
| `role` | string | `"citizen"`, `"police"`, or `"admin"` |
| `phone` | string | Phone number |
| `dob` | string | Date of birth |
| `gender` | string | Gender |
| `mobileNumber` | string | Mobile number (citizen) |
| `guardianName` | string | Guardian/parent name |
| `residentialAddress` | string | Current address |
| `permanentAddress` | string | Permanent address |
| `bloodGroup` | string | Blood group |
| `occupation` | string | Occupation |
| `nationality` | string | Nationality |
| `idProofType` | string | ID proof type (Aadhaar, PAN, etc.) |
| `idProofNumber` | string | ID proof number |
| `photographUrl` | string | Profile photo URL |
| `signatureUrl` | string | Signature image URL |
| `emergencyContactName` | string | Emergency contact name |
| `emergencyContactPhone` | string | Emergency contact phone |
| `policeId` | string | Auto-generated Police ID (police only) |
| `policeEmail` | string | Police email (police only) |
| `badgeNumber` | string | Badge number (police only) |
| `rank` | string | Rank (police only) |
| `stationName` | string | Station name (police only) |
| `isActive` | boolean | Active duty status (police only) |
| `mustChangePassword` | boolean | First-login password change flag |
| `temporaryPassword` | string | Temporary password (police only) |
| `credentialsGenerated` | boolean | Whether credentials have been generated |
| `createdAt` | string | ISO date of account creation |
| `updatedAt` | string | ISO date of last update |

#### Collection: `complaints` (CSR — Community Service Register)
| Field | Type | Description |
|-------|------|-------------|
| `citizenId` | string | UID of the citizen who filed |
| `title` | string | Complaint title |
| `description` | string | Detailed description |
| `location` | string | Location of incident |
| `status` | string | `"Pending"`, `"Approved"`, `"Rejected"`, `"Investigating"`, `"Resolved"` |
| `imageUrl` | string/null | URL of uploaded evidence image |
| `assignedOfficerId` | string/null | UID of assigned police officer |
| `assignedOfficerName` | string/null | Name of assigned officer |
| `createdAt` | string | ISO date |

#### Collection: `incidents` (FIR — First Information Report)
| Field | Type | Description |
|-------|------|-------------|
| `firNumber` | string | Auto-generated FIR number (e.g., `FIR-2026-ABCD-1234`) |
| `complainantId` | string | UID of the citizen |
| `category` | string | Crime category |
| `location` | string | Incident location |
| `state` | string | State where incident occurred |
| `dateOfIncident` | string | Date of incident |
| `timeOfIncident` | string | Time of incident |
| `status` | string | Case status |
| `createdAt` | string | ISO date |

#### Collection: `offences`
| Field | Type | Description |
|-------|------|-------------|
| `firNumber` | string | Links to incident |
| `offenceDescription` | string | Description of the offence |
| `sections` | string | Applicable legal sections |

#### Collection: `evidence`
| Field | Type | Description |
|-------|------|-------------|
| `firNumber` | string | Links to incident |
| `fileName` | string | Original file name |
| `fileType` | string | Type of evidence |
| `fileURL` | string | Download URL from Cloud Storage |
| `uploadedBy` | string | Citizen UID |
| `uploadedDate` | string | ISO date |

#### Collection: `witnesses`
| Field | Type | Description |
|-------|------|-------------|
| `firNumber` | string | Links to incident |
| `name` | string | Witness name |
| `phone` | string | Witness phone |
| `statementOrAddress` | string | Statement or address |

#### Collection: `statements`
| Field | Type | Description |
|-------|------|-------------|
| `firNumber` | string | Links to incident |
| `statementText` | string | Full statement |
| `date` | string | Date of statement |
| `verificationStatus` | string | `"Pending"`, `"Verified"` |

#### Collection: `officer_reviews`
| Field | Type | Description |
|-------|------|-------------|
| `firNumber` | string | Links to incident |
| `officerId` | string/null | Assigned officer UID |
| `officerName` | string | Assigned officer name |
| `status` | string | `"Submitted"`, `"Approved"`, `"Rejected"`, `"Under Review"`, `"Investigating"` |
| `createdAt` | string | ISO date |
| `updatedAt` | string | ISO date |

#### Collection: `case_logs`
| Field | Type | Description |
|-------|------|-------------|
| `complaintId` | string | ID of the complaint/incident |
| `text` | string | Log entry text |
| `authorId` | string | UID of log author |
| `authorName` | string | Name of log author |
| `authorRole` | string | `"police"` or `"admin"` |
| `timestamp` | string | ISO date |
| `isPublic` | boolean | Whether citizen can see this log |

#### Collection: `sos_alerts`
| Field | Type | Description |
|-------|------|-------------|
| `citizenId` | string | UID of the citizen |
| `citizenName` | string | Citizen's name |
| `citizenPhone` | string | Citizen's phone |
| `citizenEmail` | string | Citizen's email |
| `citizenAddress` | string | Citizen's address |
| `latitude` | number | GPS latitude |
| `longitude` | number | GPS longitude |
| `location` | object | `{latitude, longitude}` for compatibility |
| `emergencyMessage` | string | Default emergency message |
| `status` | string | `"Active"` or `"Resolved"` |
| `createdAt` | string | ISO date |
| `resolvedAt` | string/null | ISO date when resolved |
| `resolutionNote` | string | Immutable resolution note text |
| `resolutionNoteImmutable` | boolean | Lock flag for resolution note |
| `resolutionNoteAddedBy` | string | Admin who added the note |

### Firebase Cloud Storage Buckets (Paths)
| Path Pattern | What's Stored |
|---|---|
| `evidence/{citizenId}/{filename}` | CSR evidence images |
| `fir_evidence/{firNumber}/{filename}` | FIR evidence files (PDF, images, videos, documents) |
| `profile_docs/{citizenId}/{docType}_{filename}` | Profile photographs and signatures |

### Data from External APIs
| Source | Data | Used Where |
|---|---|---|
| Google Maps / OpenStreetMap | Map tiles, geolocation coordinates | SafetyMap component, SOS alert location display |
| Browser Geolocation API | User's latitude/longitude | SOS trigger (citizen dashboard) |

---

## 6. How the Frontend is Connected to the Backend

### Firebase Client SDK (Direct Connection)
- **Configuration file:** `src/firebase/client.ts`
- **Connection method:** Firebase Client SDK initialized with config object containing API key, project ID, auth domain, etc.
- **Config values come from:** Environment variables (`NEXT_PUBLIC_FIREBASE_*`) with hardcoded fallback defaults
- **Exports:** Lazy singleton proxies for `app`, `auth`, `db`, `storage`, `analytics`
- **Used by:** All client-side pages via import `from "@/firebase/client"`

### Firebase Admin SDK (Server-side)
- **Configuration file:** `src/firebase/server.ts`
- **Connection method:** Firebase Admin SDK initialized with service account credentials
- **Config values come from:** Server-side environment variables (`FIREBASE_ADMIN_PRIVATE_KEY`, `FIREBASE_ADMIN_CLIENT_EMAIL`)
- **Exports:** `adminAuth`, `adminDb`, `isFirebaseAdminConfigured`
- **Used by:** API routes in `src/app/api/`

### API Routes (Frontend → Backend)
- **Base URL:** Relative URLs (e.g., `/api/admin/create-police`)
- **HTTP Client:** Native `fetch()` API
- **Content Type:** `application/json`
- **Authentication:** Admin's Firebase ID token passed as `adminIdToken` in request body (used for Firestore REST API fallback authentication)

### Environment Variables
| Variable | Side | Purpose |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Client | Cloud Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Client | FCM sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Client | Firebase App ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Client | Analytics measurement ID |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client | Google Maps API key |
| `NEXT_PUBLIC_APP_URL` | Client | Public application URL (for QR codes) |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Server | Admin SDK private key |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Server | Admin SDK service account email |
