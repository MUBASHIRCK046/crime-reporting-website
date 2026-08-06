# Learning Notes: Authentication Module

## What we built
We built the Login and Registration screens and a helper file (`lib/auth.ts`) to manage how users sign in to the app.

## Why we built it
To secure the application. Citizens need accounts to track their own complaints. Police need secure accounts to manage active cases. Without authentication, anyone could delete evidence or view private data.

## How it works
1. **Registration**: When a user fills out the Sign-Up form, the `registerUser()` function does TWO things:
   - It sends the email and password to **Firebase Auth** to create a secure login.
   - It sends the Name and Role to **Firestore Database** into a collection called `users`.
   - *Why?* Because Firebase Auth only stores email/password. It doesn't store "Roles" by default. We link them using the user's `uid` (Unique ID).
2. **Login**: When a user logs in, `loginUser()` checks their email/password. If successful, it looks up their `uid` in Firestore to find out if they are a `citizen` or `police`, then redirects them to the correct dashboard.

## Which folder contains it
- `src/lib/auth.ts` (The logic)
- `src/app/login/page.tsx` (Login UI)
- `src/app/register/page.tsx` (Register UI)

## Which Firebase service is used
- **Firebase Authentication**: For securely checking passwords without us having to store passwords ourselves (which is a huge security risk!).
- **Firestore Database**: To store the user's name and role.

## Common mistakes
- **Forgetting to check the database on login**: If you only use Firebase Auth, you won't know if the user is a Citizen or Admin. You MUST fetch their document from Firestore after they log in.
- **Not handling errors**: Users will type the wrong password. If you don't use `try...catch` and show an error message, they will click the button forever and think the app is broken.

## Interview / MCA Viva Questions
**Q1: How do you handle Role-Based Access Control (RBAC) in Firebase?**
*Answer*: We store the user's role (citizen/police/admin) in a Firestore document under the `users` collection, using their Auth `uid` as the document ID. When they log in, we fetch this document to determine their permissions and redirect them.

**Q2: What happens if `createUserWithEmailAndPassword` succeeds, but `setDoc` (saving to Firestore) fails?**
*Answer*: This is an edge case! The user will have a login but no role. In production, we would use Firebase Cloud Functions to automatically create the Firestore document when a new user signs up, ensuring they are always in sync.

**Q3: What does `use client` mean at the top of the Login page?**
*Answer*: In Next.js App Router, components run on the Server by default. `use client` tells Next.js to run this code in the user's browser, which is required whenever we need to use React state (like typing in text boxes) or click buttons.

## Memory Tricks
- **Auth = Identity** (Who are you? - Email/Password)
- **Firestore = Attributes** (What are you? - Citizen/Police)
- You always need **BOTH** working together!
