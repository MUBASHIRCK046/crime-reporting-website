# Police Change Password Page

**Route:** `/police/change-password`  
**File:** `src/app/police/change-password/page.tsx`

---

## 1. PAGE OVERVIEW

The Police Change Password Page is a **mandatory first-login screen** for police officers. When an admin creates a police account, the officer receives a temporary password. On their first login, they are automatically redirected here and must set a new permanent password before accessing the Police Dashboard.

---

## 2. DATA USED IN THIS PAGE

- **User Input:**
  - `newPasswordInput` — New permanent password (min 6 characters)
  - `confirmPasswordInput` — Confirmation of new password

- **From Firestore `users` collection:**
  - `role` — Must be `"police"` (otherwise redirected)
  - `mustChangePassword` — Must be `true` (otherwise redirected to `/police`)

---

## 3. API CONNECTION FOR THIS PAGE

This page does **not** call any Next.js API route. It uses **Firebase Client SDK directly**.

- **Function called:** `changePolicePassword(newPassword)` from `src/lib/auth.ts`
- **Firebase SDK calls inside `changePolicePassword`:**
  1. `updatePassword(auth.currentUser, newPassword)` — Updates Firebase Auth password.
  2. `updateDoc(doc(db, "users", uid), { mustChangePassword: false, temporaryPassword: null })` — Clears the flag.

- **When called:** On form submit.

- **Code snippet:**
  ```typescript
  const result = await changePolicePassword(newPasswordInput);
  if (result.success) {
    toast.success("Password updated successfully!");
    router.push("/police");
  }
  ```

---

## 4. BACKEND CONNECTION FOR THIS PAGE

- **No backend route.** Firebase Auth handles the password update directly.
- **Firestore update:** Sets `mustChangePassword: false` and clears `temporaryPassword`.

---

## 5. CODE FLOW

1. Page mounts → Auth listener checks if user is logged in.
2. If not logged in → redirect to `/login`.
3. Fetches user document from Firestore to check role and `mustChangePassword`.
4. If role is not `"police"` → redirect to appropriate dashboard.
5. If `mustChangePassword` is false → redirect to `/police` (no password change needed).
6. User enters new password and confirmation.
7. User clicks "Save New Password" → `handleSubmit()` validates and calls `changePolicePassword()`.
8. On success → toast message → redirect to `/police`.
9. "Cancel & Sign Out" button calls `logoutUser()` and redirects to `/login`.

---

## 6. SIMPLE EXPLANATION (IN EASY WORDS)

When a police officer is first created by the admin, they get a temporary password. The first time they log in with this temporary password, they are forced to come to this page and set their own permanent password. It's like when your IT department gives you a temporary password and makes you change it immediately — for security. Once they set their new password, they're taken to their police dashboard and will never see this page again.

---

## 7. BLOCK-BY-BLOCK SUMMARY

| Block Name | What It Does | One-Line Summary |
|---|---|---|
| **Imports** | React hooks, router, Firebase, auth lib, Sonner, icons | Loads dependencies |
| **State Variables** | `currentUser`, `loading`, `newPasswordInput`, `confirmPasswordInput`, `changingPassword` | Manages form and auth state |
| **useEffect (Auth)** | Auth check, role enforcement, `mustChangePassword` check | Guards and redirects |
| **handleSignOut** | Calls `logoutUser()`, redirects to `/login` | Cancel and sign out |
| **handleSubmit** | Validates password (≥6 chars, match), calls `changePolicePassword()` | Password change logic |
| **Loading Screen** | Spinner while checking auth state | Loading indicator |
| **Header Section** | Lock icon, title, explanation text | Page header with context |
| **Password Form** | Two password inputs (new + confirm) | Collects new password |
| **Save Button** | Submits password change | Triggers update |
| **Cancel Button** | Signs out and redirects to login | Alternative exit |
