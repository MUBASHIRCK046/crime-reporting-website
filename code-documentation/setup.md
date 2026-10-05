# Setup Page

**Route:** `/setup`  
**File:** `src/app/setup/page.tsx`

---

## 1. PAGE OVERVIEW

The Setup Page is a **development/testing utility** that creates three test accounts (Citizen, Police Officer, Admin) with a single click. It is intended for developers and testers to quickly bootstrap the application with demo accounts. This page is NOT for end-users.

---

## 2. DATA USED IN THIS PAGE

- **Hardcoded Test Accounts:**
  ```json
  [
    { "name": "Test Citizen", "email": "citizen@crimeassist.com", "password": "Citizen@123", "role": "citizen" },
    { "name": "Test Officer", "email": "officer@crimeassist.com", "password": "Officer@123", "role": "police" },
    { "name": "System Admin", "email": "admin@crimeassist.com", "password": "Admin@123", "role": "admin" }
  ]
  ```

- **State:**
  - `status` — Tracks each account's creation status (`idle`, `loading`, `done`, `exists`)
  - `allDone` — Whether all accounts have been processed
  - `running` — Whether the setup process is running

- **Data written to Firestore per account:**
  ```json
  {
    "uid": "firebase-uid",
    "name": "Test Citizen",
    "email": "citizen@crimeassist.com",
    "role": "citizen",
    "createdAt": "2026-09-16T08:30:00.000Z"
  }
  ```

---

## 3. API CONNECTION FOR THIS PAGE

This page does **not** call any Next.js API route. It uses **Firebase Client SDK directly**.

- **Firebase SDK calls:**
  1. `createUserWithEmailAndPassword(auth, email, password)` — Creates Auth account.
  2. `setDoc(doc(db, "users", uid), { ... })` — Saves user profile to Firestore.

- **When called:** When user clicks "Create All Test Accounts" button.

---

## 4. BACKEND CONNECTION FOR THIS PAGE

- **No backend route involved.** Firebase Auth and Firestore are accessed directly from the browser.
- If an account already exists (`auth/email-already-in-use` error), the status is set to `"exists"` and no error is thrown.

---

## 5. CODE FLOW

1. User opens `/setup`.
2. Three account cards are displayed with credentials shown.
3. User clicks "Create All Test Accounts".
4. `handleSetupAll()` loops through all three accounts sequentially.
5. For each account, `createAccount()` is called:
   - Creates the user in Firebase Auth.
   - Saves the profile document in Firestore `users` collection.
   - If account already exists, status is set to `"exists"` (no error).
6. When all accounts are processed, `allDone` is set to true.
7. A success message and a "Go to Login" button appear.

---

## 6. SIMPLE EXPLANATION (IN EASY WORDS)

This is a quick-setup page for developers. Instead of manually creating test accounts, you click one button and it creates three accounts for you — one for a citizen, one for a police officer, and one for an admin. It shows you all the emails and passwords so you can log in as any of them. It's like an installation wizard that sets up demo data for testing.

---

## 7. BLOCK-BY-BLOCK SUMMARY

| Block Name | What It Does | One-Line Summary |
|---|---|---|
| **Imports** | React hooks, Firebase Auth & Firestore, Lucide icons, Next.js Link | Loads dependencies |
| **TEST_ACCOUNTS** | Hardcoded array of 3 test accounts with credentials | Defines demo accounts |
| **State Variables** | `status`, `allDone`, `running` | Tracks setup progress |
| **createAccount** | Creates a single account in Firebase Auth + Firestore, handles "already exists" | Core account creation logic |
| **handleSetupAll** | Loops through all accounts and calls `createAccount` for each | Orchestrates bulk setup |
| **Status Helpers** | `getStatusIcon()`, `getStatusText()`, `getRoleColor()` | Returns UI elements for each status |
| **Account Cards** | Renders each account's name, email, password, role badge, and status | Displays credentials and progress |
| **Action Button** | "Create All Test Accounts" button or success state with "Go to Login" link | Triggers setup or navigates after completion |
| **Credentials Reference** | Bottom panel showing all credentials in a compact format | Quick reference for login details |
