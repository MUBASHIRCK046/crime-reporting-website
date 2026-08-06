# Learning Notes: Citizen Module

## What we built
We built the **Citizen Dashboard** where users can view their complaints and trigger an SOS. We also built the **Report a Crime Form**, allowing users to submit text descriptions and upload photo evidence.

## Why we built it
This is the core feature of the app. Citizens need a fast, reliable way to request help (SOS) and provide detailed evidence to authorities without visiting a physical police station.

## How it works

### 1. The Two-Step Upload Process
You cannot upload a photo directly into a Firestore Text Database. Instead, we use two Firebase services:
- **Step 1 (Firebase Storage)**: We upload the physical `.jpg` file into our "Storage Bucket". Firebase gives us a public URL (like a website link) pointing to that image.
- **Step 2 (Firestore Database)**: We take that URL string and save it into our NoSQL database along with the Complaint Title and Description.

### 2. Geolocation (SOS)
When the user clicks the SOS button, we use `navigator.geolocation` (a built-in browser feature) to get their exact Latitude and Longitude. We save this directly to the `sos_alerts` collection.

### 3. Querying "My Complaints"
We don't want a Citizen seeing someone else's complaint!
We use a Firebase Query: `where("citizenId", "==", currentUser.uid)`.
This asks the database to *only* return documents that belong to the logged-in user.

## Which folder contains it
- `src/lib/complaints.ts` (Database logic)
- `src/app/citizen/page.tsx` (Dashboard UI)
- `src/app/citizen/report/page.tsx` (Form UI)

## Interview / MCA Viva Questions

**Q1: How do you handle file uploads in your application?**
*Answer*: We handle file uploads using Firebase Storage. First, we generate a unique filename using `Date.now()`. Then we use `uploadBytes` to send the file. Finally, we use `getDownloadURL` to retrieve the link and store that link in Firestore.

**Q2: What is the difference between Firebase Storage and Firestore?**
*Answer*: Firebase Storage is an Object Storage service used for large binary files like images, videos, and PDFs. Firestore is a NoSQL document database used for storing structured text data, like user profiles and complaint descriptions.

**Q3: How does the SOS feature get the user's location?**
*Answer*: It uses the HTML5 Geolocation API (`navigator.geolocation.getCurrentPosition()`). This prompts the user for permission and returns high-accuracy GPS coordinates which are immediately written to the database.

## Memory Tricks
- **Storage = Stuff** (Big heavy files like pictures)
- **Firestore = Facts** (Text data about the stuff)
