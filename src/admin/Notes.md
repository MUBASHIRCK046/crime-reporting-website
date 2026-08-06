# Learning Notes: Admin Module

## What we built
We built the **System Administrator Dashboard**. This is a high-level control panel that aggregates data across multiple Firestore collections (Users, Complaints, and SOS Alerts) to provide a bird's-eye view of the system.

## Why we built it
Every system needs an administrator. The admin module is crucial for auditing purposes (seeing exactly who is registered on the platform) and understanding the overall scale of crimes being reported.

## How it works

### 1. Concurrent Fetching
Notice how the dashboard displays "Total Users", "Total Complaints", and "Active SOS Alerts"? We fetch all this data simultaneously when the page loads by calling our three helper functions (`getAllUsers()`, `getAllComplaints()`, `getActiveSOSAlerts()`).

### 2. Manual Admin Provisioning
Because we do not allow people to select "Admin" on the public registration page (that would be a huge security flaw!), the *only* way to become an Admin is if a Developer directly edits the database in the Firebase Console and changes a user's `role` field from `citizen` to `admin`.

### 3. Ultimate Security Check
Before the page even renders, it queries the `users` collection in Firestore. If the logged-in user is a Citizen or a Police officer trying to sneak into `/admin`, the `if (userDoc.data().role === "admin")` check fails, an alert pops up, and they are kicked out.

## Which folder contains it
- `src/lib/admin.ts` (Database logic for users)
- `src/app/admin/page.tsx` (Dashboard UI)

## Interview / MCA Viva Questions

**Q1: How do you handle security for the Admin dashboard?**
*Answer*: We implement strict client-side Role-Based Access Control (RBAC). Upon authentication, we verify the user's document in Firestore. If their `role` is not explicitly set to `"admin"`, we instantly redirect them away. (In a production app, we would also back this up with Firestore Security Rules!).

**Q2: Why do we have separate `lib/police.ts` and `lib/admin.ts` files instead of one big file?**
*Answer*: This follows the programming principle of **Separation of Concerns (SoC)**. By separating logic based on the module/role, the code is easier to read, test, and maintain.

**Q3: How are Admins created in this system?**
*Answer*: Admins are manually provisioned directly in the Firebase Firestore Database for maximum security, bypassing the public registration flow entirely.

## Memory Tricks
- **RBAC** = Role-Based Access Control (The keyword your examiner wants to hear!)
- **SoC** = Separation of Concerns (Why we split up our `lib/` files)
