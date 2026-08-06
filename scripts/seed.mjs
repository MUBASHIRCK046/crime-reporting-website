import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = getAuth();
const db = getFirestore();

async function unseed() {
  console.log("Cleaning up old dummy data first...");
  const complaintsSnapshot = await db.collection("complaints").where("isTestData", "==", true).get();
  const batch1 = db.batch();
  complaintsSnapshot.forEach(doc => batch1.delete(doc.ref));
  await batch1.commit();

  const usersSnapshot = await db.collection("users").where("isTestData", "==", true).get();
  const authUids = [];
  const batch2 = db.batch();
  usersSnapshot.forEach(doc => {
    authUids.push(doc.id);
    batch2.delete(doc.ref);
  });
  await batch2.commit();

  if (authUids.length > 0) {
    try {
      await auth.deleteUsers(authUids);
    } catch (e) {
      console.error("Error deleting from Firebase Auth:", e.message);
    }
  }
}

async function seed() {
  await unseed();
  
  console.log("Starting seed process...");

  // 1. Create Dummy Police Officers
  const policeData = [
    { name: "Officer Alex Mercer", email: "alex.mercer@police.test", rank: "Inspector", station: "Central Station", phone: "9876543210" },
    { name: "Officer Sarah Connor", email: "sarah.connor@police.test", rank: "Sub-Inspector", station: "North Zone", phone: "9876543211" },
    { name: "Officer James Gordon", email: "james.gordon@police.test", rank: "Superintendent", station: "South Zone", phone: "9876543212" }
  ];

  const policeUids = [];
  for (let i = 0; i < policeData.length; i++) {
    const p = policeData[i];
    try {
      const userRecord = await auth.createUser({
        email: p.email,
        password: "password123",
        displayName: p.name,
      });
      await db.collection("users").doc(userRecord.uid).set({
        name: p.name,
        email: p.email,
        phone: p.phone,
        role: "police",
        badgeNumber: `TEST-BADGE-00${i+1}`,
        rank: p.rank,
        stationName: p.station,
        isActive: true,
        createdAt: new Date().toISOString(),
        isTestData: true // IDENTIFIER
      });
      policeUids.push(userRecord.uid);
      console.log(`Created police officer: ${p.name}`);
    } catch (err) {
      console.error(`Failed to create officer ${p.name}:`, err.message);
    }
  }

  // 2. Create Dummy Complaints (3 CSRs, 4 FIRs)
  const complaints = [
    // --- CSR CASES ---
    {
      type: "CSR",
      title: "Lost Mobile Phone at Central Mall",
      description: "I lost my Samsung Galaxy S23 Ultra at the food court around 2 PM. It has a blue cover.",
      category: "Lost Property",
      location: "Central Mall, Main Street",
      citizenId: "dummy-citizen-1",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      status: "Resolved",
      priority: "Low",
      assignedTo: policeUids[0] || null,
      isTestData: true
    },
    {
      type: "CSR",
      title: "Neighbour Dispute over Parking",
      description: "My neighbor repeatedly parks his car in front of my gate blocking my exit. Argument happened today.",
      category: "Public Nuisance",
      location: "House 42, Oakwood Avenue",
      citizenId: "dummy-citizen-2",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      status: "Pending",
      priority: "Normal",
      assignedTo: null,
      isTestData: true
    },
    {
      type: "CSR",
      title: "Missing Passport and Documents",
      description: "Lost a file folder containing my passport and educational certificates while traveling in bus route 4A.",
      category: "Lost Property",
      location: "Bus Route 4A, Downtown",
      citizenId: "dummy-citizen-3",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      status: "In Progress",
      priority: "High",
      assignedTo: policeUids[1] || null,
      isTestData: true
    },

    // --- FIR CASES ---
    {
      type: "FIR",
      title: "Burglary at Electronics Shop",
      description: "Shop broken into during the night. Laptops and mobile phones worth Rs 5 Lakh stolen.",
      category: "Theft",
      location: "Tech World, Market Road",
      citizenId: "dummy-citizen-4",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      status: "Under Investigation",
      priority: "High",
      assignedTo: policeUids[2] || null,
      isTestData: true
    },
    {
      type: "FIR",
      title: "Credit Card Fraud / Phishing",
      description: "Received a fake call from 'bank' and Rs 45,000 was deducted from my account unauthorized.",
      category: "Cyber Crime",
      location: "Online",
      citizenId: "dummy-citizen-5",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      status: "Pending",
      priority: "High",
      assignedTo: null,
      isTestData: true
    },
    {
      type: "FIR",
      title: "Physical Assault in Park",
      description: "Attacked by two unknown individuals while jogging. Suffered minor injuries to the arm.",
      category: "Assault",
      location: "Sunrise Park, East Zone",
      citizenId: "dummy-citizen-6",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      status: "Resolved",
      priority: "Critical",
      assignedTo: policeUids[0] || null,
      isTestData: true
    },
    {
      type: "FIR",
      title: "Stolen Motorcycle",
      description: "Red Honda CB Hornet (Reg: MH12-AB-3456) stolen from outside my apartment building.",
      category: "Vehicle Theft",
      location: "Building C, Residency Complex",
      citizenId: "dummy-citizen-7",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      status: "In Progress",
      priority: "High",
      assignedTo: policeUids[1] || null,
      isTestData: true
    }
  ];

  for (const c of complaints) {
    await db.collection("complaints").add(c);
    console.log(`Created dummy ${c.type} case: ${c.title}`);
  }

  console.log("Seed complete! You can now test the application.");
  console.log("To remove this data later, run: node --env-file=.env.local scripts/unseed.mjs");
}

seed().catch(console.error).then(() => process.exit(0));
