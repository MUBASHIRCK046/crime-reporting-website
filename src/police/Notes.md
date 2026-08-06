# Learning Notes: Police Module

## What we built
We built the **Police Command Center**. This dashboard allows authorized law enforcement officers to view all incoming citizen complaints, monitor live SOS alerts, and update the status of active cases.

## Why we built it
Without a Police Module, the citizen reports would go into a void! The police need a centralized, real-time interface to prioritize emergencies and manage investigations.

## How it works

### 1. Global Fetch vs. Local Fetch
- In the Citizen module, we used `where("citizenId", "==", user.uid)` to fetch only ONE user's complaints (Local Fetch).
- In the Police module, we removed the `where()` clause. `getDocs(collection(db, "complaints"))` fetches EVERY complaint in the database (Global Fetch).

### 2. Updating Firestore Documents
When a police officer changes a dropdown from "Pending" to "Investigating":
1. We capture the unique `id` of that specific complaint.
2. We use Firestore's `updateDoc()` function.
3. We tell it: "Only change the `status` field, leave the title/description/image alone."

### 3. Extra Security Check
At the top of the Police Dashboard, we have this code:
```javascript
const userDoc = await getDoc(doc(db, "users", user.uid));
if (userDoc.exists() && userDoc.data().role === "police") { ... }
```
This is crucial! It ensures that a normal citizen cannot type `/police` in their browser and access the command center.

## Which folder contains it
- `src/lib/police.ts` (Database logic for global fetch and updates)
- `src/app/police/page.tsx` (Dashboard UI)

## Interview / MCA Viva Questions

**Q1: How do you prevent unauthorized users from accessing the Police Dashboard?**
*Answer*: We implement Role-Based Access Control (RBAC). When the page loads, we fetch the logged-in user's document from the `users` collection in Firestore. If the `role` field does not equal "police", we immediately redirect them back to the login or citizen page.

**Q2: What is the difference between `setDoc` and `updateDoc` in Firestore?**
*Answer*: `setDoc` creates a new document or completely overwrites an existing one. `updateDoc` only modifies the specific fields you pass into it, preserving the rest of the document's data. We use `updateDoc` for changing complaint statuses.

**Q3: How does the SOS alert feature help police?**
*Answer*: The SOS alert grabs the citizen's live GPS coordinates (`latitude` and `longitude`). The Police Dashboard dynamically generates a Google Maps URL (`https://www.google.com/maps/search/?api=1&query=LAT,LONG`), allowing officers to instantly pinpoint the emergency.

## Memory Tricks
- **Citizen Query** = Has a `where()` filter (Local)
- **Police Query** = No `where()` filter (Global)
- **`updateDoc`** = Surgical change (Updates just one field)
- **`setDoc`** = Bulldozer (Replaces everything)
