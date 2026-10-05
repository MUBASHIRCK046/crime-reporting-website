# Register Page

**Route:** `/register`  
**File:** `src/app/register/page.tsx`

---

## 1. PAGE OVERVIEW

The Register Page allows new users to create a **citizen** account on the Crime Assist platform. Users provide their name, email, password, and date of birth. After successful registration, the user is automatically redirected to the Citizen Dashboard.

> **Note:** Police and Admin accounts are NOT created through this page. Police accounts are created by the Admin via the Admin Dashboard.

---

## 2. DATA USED IN THIS PAGE

- **User Input (collected):**
  - `name` — Full name
  - `email` — Email address
  - `password` — Password (min 8 chars, must include uppercase, lowercase, number, special char)
  - `confirmPassword` — Re-entered password for confirmation
  - `dob` — Date of birth
  - `role` — Hardcoded to `"citizen"` (default)

- **Data sent to Firestore on registration:**
  ```json
  {
    "uid": "firebase-generated-uid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "citizen",
    "dob": "2000-01-15",
    "createdAt": "2026-09-16T08:30:00.000Z"
  }
  ```

---

## 3. API CONNECTION FOR THIS PAGE

This page does **not** call any Next.js API route. It uses the **Firebase Client SDK directly**.

- **Function called:** `registerUser(email, password, name, role, dob)` from `src/lib/auth.ts`
- **Firebase SDK calls inside `registerUser`:**
  1. `createUserWithEmailAndPassword(auth, email, password)` — Creates the Auth account.
  2. `setDoc(doc(db, "users", user.uid), { ... })` — Saves user profile to Firestore.

- **When called:** On form submit (user clicks "Create Account" button).

- **Code snippet:**
  ```typescript
  const result = await registerUser(email, password, name, role, dob);
  if (result.error) {
    setToast({ message: userFriendlyError, type: "error" });
  } else {
    setToast({ message: "Account created successfully!", type: "success" });
    setTimeout(() => router.push("/citizen"), 1500);
  }
  ```

---

## 4. BACKEND CONNECTION FOR THIS PAGE

- **No dedicated backend route.**
- Firebase Auth creates the authentication account directly from the browser.
- Firestore `users` collection stores the user's profile document with the Auth UID as the document ID.

---

## 5. CODE FLOW

1. User opens `/register` page.
2. User fills in: Name, Email, Password, Confirm Password, Date of Birth.
3. User clicks "Create Account" → `handleRegister()` fires.
4. **Client-side validations run in sequence:**
   - Email format check (regex).
   - Password strength check (min 8 chars, uppercase, lowercase, number, special char).
   - Password confirmation match.
   - Date of birth validation (not empty, not in future, not unrealistically old).
5. If validations pass, `registerUser()` is called.
6. Firebase Auth creates the user account.
7. Firestore `users` document is created with `uid`, `name`, `email`, `role: "citizen"`, `dob`, `createdAt`.
8. Success toast is shown → User is redirected to `/citizen` after 1.5 seconds.
9. On error (e.g., email already exists), a friendly error toast is shown.

---

## 6. SIMPLE EXPLANATION (IN EASY WORDS)

This is the sign-up page. If you're a new user, you come here to create your account. You fill in your name, email, password, and birthday, then click "Create Account." The system creates your account and saves your information. Think of it like filling out a form at a new office — you write down your details and they give you a membership card (your account). After signing up, you're automatically taken to your dashboard where you can start using the app.

---

## 7. BLOCK-BY-BLOCK SUMMARY

| Block Name | What It Does | One-Line Summary |
|---|---|---|
| **Imports** | Imports React hooks, router, `registerUser`, icons, Framer Motion, Toast | Loads UI and auth dependencies |
| **State Variables** | `name`, `email`, `password`, `confirmPassword`, `dob`, `role`, `showPassword`, `showConfirmPassword`, `toast`, `loading` | Manages all form inputs and UI toggles |
| **handleRegister** | Validates all inputs, calls `registerUser()`, handles success/error, redirects to `/citizen` | Core registration logic |
| **Email Validation** | Regex check for valid email format | Prevents invalid emails |
| **Password Validation** | Checks min length (8), uppercase, lowercase, number, special character | Enforces strong passwords |
| **Password Match Check** | Compares `password` and `confirmPassword` | Prevents typos in password |
| **DOB Validation** | Checks for valid date, not in future, not older than 120 years | Ensures realistic date of birth |
| **Animation Variants** | Staggered fade-in animations for form elements | Smooth entrance animations |
| **Left Column (Branding)** | Shield icon, "Crime Assist Portal", "Create Account" heading | Visual branding |
| **Name Input** | Text input with User icon | Collects full name |
| **Email Input** | Email input with Mail icon | Collects email address |
| **Password Inputs** | Two password fields with show/hide toggles | Collects and confirms password |
| **DOB Input** | Date input with Calendar icon | Collects date of birth |
| **Submit Button** | Animated button to trigger registration | Submits the form |
| **Login Link** | Link to `/login` for existing users | Navigates to login page |
| **Toast Component** | Renders success/error/warning notifications | Displays user feedback |
