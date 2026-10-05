# Login Page

**Route:** `/login`  
**File:** `src/app/login/page.tsx`

---

## 1. PAGE OVERVIEW

The Login Page allows existing users (Citizens, Police Officers, and Admins) to sign into their accounts. It supports login via **email address** or **Police ID**. After successful login, users are redirected to their role-specific dashboard.

---

## 2. DATA USED IN THIS PAGE

- **User Input:**
  - `emailOrPoliceId` (string) — Email address or Police ID
  - `password` (string) — Account password

- **State Variables:**
  - `showPassword` — Toggles password visibility
  - `toast` — Error/success/warning messages
  - `loading` — Submission loading state

- **Data Source:** Firebase Authentication (validates credentials) + Firestore `users` collection (fetches role).

- **Example response from `loginUser()`:**
  ```json
  {
    "user": { "uid": "abc123", "email": "user@example.com" },
    "role": "citizen",
    "mustChangePassword": false,
    "error": null
  }
  ```

---

## 3. API CONNECTION FOR THIS PAGE

This page does **not** call any Next.js API route. It uses the **Firebase Client SDK directly**.

- **Function called:** `loginUser(emailOrPoliceId, password)` from `src/lib/auth.ts`
- **Firebase SDK calls inside `loginUser`:**
  1. If input is NOT an email (no `@`), queries Firestore `users` collection where `policeId == input` to find the associated email.
  2. Calls `signInWithEmailAndPassword(auth, email, password)` — Firebase Auth SDK.
  3. Calls `getDoc(doc(db, "users", user.uid))` — Fetches role and `mustChangePassword` flag.

- **When called:** On form submit (user clicks "Sign In" button).

- **Code snippet:**
  ```typescript
  const result = await loginUser(input, password);
  if (result.error) {
    setToast({ message: userFriendlyError, type: "error" });
  } else {
    const destination =
      result.role === "admin" ? "/admin" :
      result.role === "police" ? "/police" : "/citizen";
    router.push(destination);
  }
  ```

---

## 4. BACKEND CONNECTION FOR THIS PAGE

- **No dedicated backend route** — Firebase Authentication handles login directly from the browser.
- **Firestore query** for Police ID lookup: `query(collection(db, "users"), where("policeId", "==", emailToUse))`
- **Firestore read** for user role: `getDoc(doc(db, "users", user.uid))`

---

## 5. CODE FLOW

1. Page mounts → Prefetches `/citizen`, `/admin`, `/police` routes for instant navigation.
2. User types email (or Police ID) and password.
3. User clicks "Sign In" → `handleLogin()` fires.
4. Client-side validation runs (email format check if input contains `@`).
5. `loginUser()` is called from `lib/auth.ts`.
6. If input has no `@`, Firestore is queried to find the email associated with that Police ID.
7. Firebase Auth's `signInWithEmailAndPassword()` verifies credentials.
8. On success, Firestore `users` document is read to get the user's role.
9. User is redirected: `admin` → `/admin`, `police` → `/police`, `citizen` → `/citizen`.
10. On error, a user-friendly toast message is shown (e.g., "Incorrect email or password").

---

## 6. SIMPLE EXPLANATION (IN EASY WORDS)

This is the page where you type your email and password to get into your account. It works like any login page you've seen — enter your details, click "Sign In", and you're taken to your personal dashboard. Police officers can also log in using their Police ID instead of email. If you type something wrong, the page shows you a clear error message. Behind the scenes, Firebase (Google's authentication service) checks if your email and password are correct.

---

## 7. BLOCK-BY-BLOCK SUMMARY

| Block Name | What It Does | One-Line Summary |
|---|---|---|
| **Imports** | Imports React hooks, Next.js router/Link, `loginUser`, Lucide icons, Framer Motion, Toast | Loads dependencies for UI and auth logic |
| **State Variables** | `emailOrPoliceId`, `password`, `showPassword`, `toast`, `loading` | Manages form inputs and UI state |
| **useEffect (Prefetch)** | Prefetches `/citizen`, `/admin`, `/police` routes on mount | Enables instant navigation after login |
| **handleLogin** | Validates input, calls `loginUser()`, handles success/error, redirects | Core login logic and error handling |
| **Animation Variants** | Defines `containerVariants`, `formContainerVariants`, `itemVariants` for Framer Motion | Controls staggered fade-in animations |
| **Left Column (Branding)** | Renders Shield icon, "Crime Assist Portal" label, "Welcome Back" heading | Visual branding section |
| **Email/Police ID Input** | Text input with Mail icon, accepts email or Police ID | Collects login identifier |
| **Password Input** | Password input with Lock icon and show/hide toggle | Collects password securely |
| **Submit Button** | Animated button that triggers `handleLogin` on click | Submits the login form |
| **Register Link** | Link to `/register` for new users | Navigates to registration |
| **Toast Component** | Renders error/success/warning notifications | Displays feedback messages |
