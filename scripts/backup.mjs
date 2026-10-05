import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const CORE_COLLECTIONS = [
  'users',
  'complaints',
  'sos_signals',
  'police_officers',
  'activity_logs',
  'broadcasts',
  'system_settings'
];

// Initialize Firebase Admin
if (!getApps().length) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'crime-assist';
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

  if (!privateKey || !clientEmail) {
    console.error("❌ Error: FIREBASE_ADMIN_PRIVATE_KEY and FIREBASE_ADMIN_CLIENT_EMAIL environment variables are required.");
    console.error("Make sure to run with: node --env-file=.env.local scripts/backup.mjs");
    process.exit(1);
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

async function runBackup() {
  console.log("📦 Starting Firestore Database Backup...");

  const collectionNames = new Set(CORE_COLLECTIONS);
  try {
    const list = await db.listCollections();
    list.forEach(col => collectionNames.add(col.id));
  } catch (e) {
    console.warn("⚠️  Could not list collections dynamically, falling back to core collections list.");
  }

  const collectionsData = {};
  let totalDocs = 0;

  for (const colName of Array.from(collectionNames)) {
    try {
      const snapshot = await db.collection(colName).get();
      const docs = [];
      snapshot.forEach(doc => {
        docs.push({
          _id: doc.id,
          ...doc.data()
        });
      });
      collectionsData[colName] = docs;
      totalDocs += docs.length;
      console.log(`  ✓ Exported ${colName}: ${docs.length} documents`);
    } catch (err) {
      console.error(`  ❌ Failed to export collection ${colName}:`, err.message);
      collectionsData[colName] = [];
    }
  }

  const now = new Date();
  const timestampStr = now.toISOString().replace(/[:.]/g, '-');
  const backupPayload = {
    app: 'crime-reporting-website',
    version: '1.0',
    exportedAt: now.toISOString(),
    metadata: {
      totalCollections: Object.keys(collectionsData).length,
      totalDocuments: totalDocs,
      collectionStats: Object.fromEntries(
        Object.entries(collectionsData).map(([k, v]) => [k, v.length])
      )
    },
    collections: collectionsData
  };

  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFilePath = path.join(backupDir, `backup_${timestampStr}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupPayload, null, 2), 'utf-8');

  console.log("\n==================================================");
  console.log(`🎉 Backup completed successfully!`);
  console.log(`📁 File saved to: ${backupFilePath}`);
  console.log(`📊 Summary: ${totalDocs} documents across ${Object.keys(collectionsData).length} collections.`);
  console.log("==================================================\n");
}

runBackup()
  .catch(err => {
    console.error("❌ Backup failed:", err);
    process.exit(1);
  })
  .then(() => process.exit(0));
