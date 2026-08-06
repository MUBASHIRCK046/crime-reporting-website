# Firebase and Application Architecture Documentation

This document provides a comprehensive technical overview of the application, detailing its architecture, Firebase integration, database structure, and providing setup instructions for developers.

## 1. Project Overview

**What this application does:**
This is a crime reporting and management application ("Crime Assist") designed to facilitate interaction between citizens, police officers, and system administrators. 

**Main Purpose & Features:**
- **Citizens:** Can register, file complaints (FIR or CSR), upload photo evidence, view their own complaints, and trigger emergency SOS alerts.
- **Police Officers:** Can view all complaints (or those assigned to them/their area), update complaint statuses, update incident locations, broadcast verified complaints to the public, and monitor active SOS alerts.
- **Administrators:** Can manage users, assign user roles (citizen, police, admin), create departments, areas/divisions, and crime categories, as well as assign complaints to specific officers.

**Architecture:**
- **Frontend:** Built with **Next.js** (App Router) and **React**, styled with **Tailwind CSS**.
- **Backend/Services:** Entirely serverless using **Firebase** (Client SDK and Admin SDK).
- **Communication Flow:**
  `User (Browser)` → `Next.js Frontend` → `Firebase JS SDK` (Auth, Firestore, Storage)
  (For secure admin operations and backend tasks) `Next.js API Route` → `Firebase Admin SDK` → `Firebase Services`

## 2. Firebase Configuration

Firebase is the core backend for this application, utilizing Authentication, Firestore (Database), and Storage.

**Firebase Configuration Locations:**
- **Environment Variables:** Secrets and keys are stored in `.env.local` at the root of the project.
- **Client Configuration:** `src/firebase/client.ts` initializes the Firebase app for the browser.
- **Admin Configuration:** `src/firebase/server.ts` initializes the Firebase Admin SDK for server-side trusted operations.

**Enabled Services Identified:**
- Firebase Authentication (Email/Password)
- Cloud Firestore
- Cloud Storage

**Environment Variables Structure (`.env.local`):**
```env
# Client-side visible variables
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_FIREBASE_MEASUREMENT_ID

# Server-side (Admin) variables
FIREBASE_ADMIN_PRIVATE_KEY="YOUR_SERVICE_ACCOUNT_PRIVATE_KEY"
FIREBASE_ADMIN_CLIENT_EMAIL="YOUR_SERVICE_ACCOUNT_EMAIL"
```

## 3. Firebase Initialization

### Client-side Initialization (`src/firebase/client.ts`)
1. **Configuration Loaded:** Environment variables (`NEXT_PUBLIC_FIREBASE_*`) are read.
2. **App Initialization:** The app is initialized using `initializeApp(firebaseConfig)`. It first checks `getApps().length` to prevent duplicate initialization during Next.js Hot Module Replacement (HMR).
3. **Service Connections:** 
   - `getAuth(app)`
   - `getFirestore(app)`
   - `getStorage(app)`
4. **Export:** `app`, `auth`, `db`, and `storage` are exported for use in frontend UI and `src/lib/` helpers.

### Server-side Initialization (`src/firebase/server.ts`)
1. **SDK:** Uses `firebase-admin` package.
2. **Configuration:** Uses the `FIREBASE_ADMIN_CLIENT_EMAIL` and `FIREBASE_ADMIN_PRIVATE_KEY` along with the Project ID.
3. **App Initialization:** `admin.initializeApp()` is called with `admin.credential.cert(...)`.
4. **Export:** `adminAuth` and `adminDb` are exported for secure server operations.

## 4. Firebase Authentication

**Methods Supported:** Email and Password Authentication.

**User Flow:**
1. **Registration:** `registerUser()` in `src/lib/auth.ts` calls `createUserWithEmailAndPassword`. After the user is created in Firebase Auth, a corresponding document is created in the Firestore `users` collection using the user's UID as the document ID, storing their name, email, and default role.
2. **Login:** `loginUser()` uses `signInWithEmailAndPassword`. It then fetches the user's profile from the Firestore `users` collection to retrieve their role.
3. **Logout:** `logoutUser()` uses `signOut(auth)`.

**User Roles:** `citizen`, `police`, `admin`.

## 5. Database Structure (Cloud Firestore)

The application uses Firestore to store all application data.

### Collections

#### `users`
Stores user profiles and roles.
- `uid` (string) - Matches Firebase Auth UID
- `name` (string)
- `email` (string)
- `role` (string) - "citizen", "police", "admin"
- `department` (string, optional) - For police/admin
- `assignedArea` (string, optional) - For police
- `createdAt` (string) - ISO date string

#### `complaints`
Stores FIR or CSR reports filed by citizens.
- `id` (auto-generated document ID)
- `citizenId` (string) - ID of the user who filed it
- `type` (string) - "FIR" or "CSR"
- `title` (string)
- `description` (string)
- `location` (string)
- `category` (string, optional)
- `area` (string, optional)
- `status` (string) - "Pending", "In Progress", "Resolved", "Closed"
- `imageUrl` (string | null) - URL to evidence in Firebase Storage
- `assignedOfficerId` (string, optional)
- `isVerified` (boolean, optional)
- `isBroadcasted` (boolean, optional)
- `createdAt` (string)

#### `sos_alerts`
Stores emergency alerts triggered by citizens.
- `userId` (string)
- `location` (map) - { lat: number, lng: number }
- `status` (string) - "Active" or "Resolved"
- `createdAt` (string) / `timestamp` (string)

#### `departments`
Stores available police departments.
- `name` (string)
- `createdAt` (string)

#### `areas`
Stores geographical areas or divisions.
- `name` (string)
- `city` (string)
- `createdAt` (string)

#### `categories`
Stores crime categories.
- `name` (string)
- `createdAt` (string)

## 6. Firebase Security Rules

*Note: There are no local `firestore.rules` or `storage.rules` files found in the repository, which means rules are currently managed directly within the Firebase Console.*

**Security Recommendations:**
Since data logic is heavily client-side, the following Firestore Rules should be implemented in the Firebase Console:
- **users:** Users can read and update their own document. Only Admins can update roles.
- **complaints:** 
  - Citizens can create complaints and read their own (`resource.data.citizenId == request.auth.uid`).
  - Police and Admins can read all complaints.
  - Police can update `status`, `location`, `isVerified`, etc.
  - Public can read complaints where `isBroadcasted == true`.
- **sos_alerts:** Citizens can create. Police can read and update.

## 7. Firebase Storage

**Usage:** Used for uploading evidence photos when filing a complaint.

**File Flow:**
1. Citizen selects an image file.
2. `uploadEvidenceImage()` in `src/lib/complaints.ts` generates a unique name: `${Date.now()}_${file.name}`.
3. The file is uploaded to the path: `evidence/{citizenId}/{uniqueFileName}`.
4. Firebase returns a public download URL.
5. The URL is saved in the Firestore `complaints` document under `imageUrl`.

## 8. Application Working Flow

1. **App Start:** Next.js loads the application. `src/firebase/client.ts` initializes the Firebase connection.
2. **Authentication:** User logs in via the `/login` route. `loginUser()` authenticates and fetches their role.
3. **Dashboard:** Based on the role, the user is routed to the citizen dashboard, police command center, or admin panel.
4. **Filing a Complaint:** Citizen fills out a form, optionally uploads an image (sent to Storage), and the data is saved to Firestore's `complaints` collection (`fileComplaint()`).
5. **SOS Alert:** Citizen presses an SOS button. The app gets their geolocation, saves it to the `sos_alerts` collection, and triggers a backend API (`/api/sos`) to send an SMS/notification (`triggerSOS()`).
6. **Police Management:** Police officers fetch all complaints or those assigned to them (`getAllComplaints()`). They can update statuses or verify/broadcast complaints.
7. **Admin Management:** Admins view all registered users (`getAllUsers()`), update their roles (`updateUserRole()`), and manage system metadata (categories, areas, departments).

## 9. File-by-File Explanation

| File | Purpose | Firebase Usage | Used By |
| --- | --- | --- | --- |
| `src/firebase/client.ts` | Client initialization | Initialize App, Auth, Firestore, Storage | All Client UI and Libs |
| `src/firebase/server.ts` | Admin initialization | Initialize Admin Auth, Firestore | Server API Routes |
| `src/lib/auth.ts` | Authentication | Firebase Auth & Firestore (`users` collection) | Login/Register Pages |
| `src/lib/complaints.ts` | Citizen functions | Firestore (`complaints`, `sos_alerts`), Storage | Citizen Dashboard / SOS |
| `src/lib/police.ts` | Police functions | Firestore (Read/Update `complaints`, `sos_alerts`) | Police Dashboard |
| `src/lib/admin.ts` | Admin functions | Firestore (Read/Update `users`, `departments`, etc.) | Admin Dashboard |
| `src/lib/types.ts` | TypeScript Interfaces | None (Data shapes) | All Lib and UI files |
| `.env.local` | Secrets | Environment configuration | `client.ts`, `server.ts` |

## 10. How to Connect Firebase to This Project

### Step 1: Create Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click "Add Project" and follow the prompts.

### Step 2: Enable Required Services
1. Go to **Build > Authentication**, click "Get Started", and enable the **Email/Password** provider.
2. Go to **Build > Firestore Database**, click "Create Database". Start in test mode or define your rules.
3. Go to **Build > Storage**, click "Get Started".

### Step 3: Get Client Credentials
1. In Firebase Console, go to Project Settings (gear icon) > General.
2. Under "Your apps", add a Web App `</>`.
3. Copy the configuration object provided.

### Step 4: Get Admin Credentials
1. In Project Settings, go to "Service Accounts".
2. Click "Generate new private key". A `.json` file will download.

### Step 5: Configure Environment Variables
Create a `.env.local` file in the root of the project with the following placeholders:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_FIREBASE_MEASUREMENT_ID

FIREBASE_ADMIN_CLIENT_EMAIL=YOUR_SERVICE_ACCOUNT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY="YOUR_SERVICE_ACCOUNT_PRIVATE_KEY"
```

### Step 6: Install Dependencies & Run
```bash
# Install packages
npm install

# Run the development server
npm run dev
```

## 11. What Needs to Be Connected

**Required Connections:**
- Firebase Authentication (Email/Password)
- Cloud Firestore
- Cloud Storage
- Environment Variables (`.env.local`)

**Secrets and Credentials:**
- Firebase API Key (Publicly safe, used by Client SDK)
- Firebase Admin Private Key (Extremely sensitive, must NEVER be exposed to the client. Keep in `.env.local` server-side only).

## 12. API and External Service Connections

**Internal API Route for SOS (`/api/sos`):**
- **Purpose:** When a citizen triggers an SOS, the client sends a `POST` request to `/api/sos`.
- **Data Sent:** `userId`, `lat`, `lng`.
- **Implementation Note:** The backend logic for this API (e.g., sending an actual SMS via Twilio or a push notification) is meant to be implemented in the Next.js API route.

## 13. Data Flow

**Example Flow: Filing a Complaint**
1. **Frontend Component:** User submits the complaint form.
2. **Service (`src/lib/complaints.ts`):** Checks if an image is provided.
3. **Firebase Storage (Optional):** If an image exists, it's uploaded via `uploadBytes`, returning a `downloadURL`.
4. **Firestore:** `addDoc` is called with the complaint details and the `imageUrl`.
5. **Firebase Response:** Firestore returns the newly generated document `id`.
6. **State Management / UI:** The component receives the success status and redirects the user or shows a success toast.

## 14. Common Developer Tasks

- **Adding a new Firestore field to a Complaint:**
  1. Update `Complaint` interface in `src/lib/types.ts`.
  2. Update the `addDoc` object in `fileComplaint()` (`src/lib/complaints.ts`).
  3. Update the UI to input and display this field.
- **Adding a new protected route:**
  1. Create the page in `src/app/[role]/page.tsx`.
  2. Implement a check (via context or layout) that ensures `user.role` matches the expected role before rendering.

## 15. Troubleshooting Guide

- **Error: "Firebase App named '[DEFAULT]' already exists"**
  - *Cause:* Next.js hot-reloaded the file and tried to initialize Firebase twice.
  - *Solution:* Ensure `getApps().length` is checked before calling `initializeApp()` (Already implemented in `client.ts`).
- **Error: "Missing or insufficient permissions"**
  - *Cause:* Firestore Security Rules in the console are blocking the read/write request.
  - *Solution:* Go to Firebase Console > Firestore > Rules and ensure they allow the operation.
- **Error: Admin SDK Initialization fails (e.g. invalid private key)**
  - *Cause:* The `FIREBASE_ADMIN_PRIVATE_KEY` in `.env.local` is missing or improperly formatted (newlines not parsed).
  - *Solution:* Ensure the private key is wrapped in quotes and `\\n` is handled correctly (Already handled in `server.ts` with `.replace(/\\n/g, '\n')`).

## 16. Security Review

**Security Concerns Found:**
1. **Missing Local Security Rules:** There are no `firestore.rules` or `storage.rules` in the repository. If the Firebase project is in "Test Mode", anyone can read/write data. *Recommendation:* Write and deploy strict security rules immediately via the console or CLI.
2. **Client-side Role Checks:** If the application relies solely on client-side state for role authorization without matching Firestore rules, a malicious user could manipulate client requests to access admin/police data. *Recommendation:* Enforce role-based access in Firestore Security Rules.
3. **No Database Index Requirements Defined:** Some queries (like `orderBy` combined with `where`) might require composite indexes, which must be created in the Firebase console to prevent runtime errors.

## 17. Developer Quick Start

1. `git clone <repository>`
2. `npm install`
3. Create a Firebase Project and enable Auth, Firestore, and Storage.
4. Create `.env.local` and populate it with Client config and Admin Service Account credentials.
5. Create initial Firestore Security Rules (e.g. allow read/write for development).
6. `npm run dev`
7. Register a user on `http://localhost:3000/register`.
8. Change your user role manually in Firestore Console to `admin` to access admin features.
9. Test filing a complaint and updating its status.
