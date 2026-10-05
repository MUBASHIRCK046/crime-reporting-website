import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin
if (!getApps().length) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'crime-assist';
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

  if (!privateKey || !clientEmail) {
    console.error("❌ Error: FIREBASE_ADMIN_PRIVATE_KEY and FIREBASE_ADMIN_CLIENT_EMAIL environment variables are required.");
    console.error("Make sure to run with: node --env-file=.env.local scripts/restore.mjs <backup-file-path>");
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

async function runRestore() {
  const args = process.argv.slice(2);
  let targetFilePath = args[0];

  const backupDir = path.join(process.cwd(), 'backups');

  if (!targetFilePath) {
    // Look for newest file in backups directory
    if (!fs.existsSync(backupDir)) {
      console.error("❌ No backups folder found and no backup file specified.");
      console.error("Usage: node --env-file=.env.local scripts/restore.mjs <path-to-backup.json>");
      process.exit(1);
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        mtime: fs.statSync(path.join(backupDir, f)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      console.error("❌ No backup JSON files found in backups/ directory.");
      process.exit(1);
    }

    targetFilePath = files[0].path;
    console.log(`ℹ️  No backup file specified. Defaulting to newest backup: ${files[0].name}`);
  }

  if (!fs.existsSync(targetFilePath)) {
    console.error(`❌ Specified backup file does not exist: ${targetFilePath}`);
    process.exit(1);
  }

  console.log(`📥 Reading backup file: ${targetFilePath}...`);
  const rawData = fs.readFileSync(targetFilePath, 'utf-8');
  let backupData;
  try {
    backupData = JSON.parse(rawData);
  } catch (err) {
    console.error("❌ Invalid JSON file format:", err.message);
    process.exit(1);
  }

  const collections = backupData.collections;
  if (!collections || typeof collections !== 'object') {
    console.error("❌ Missing or invalid 'collections' object in backup JSON.");
    process.exit(1);
  }

  console.log(`🚀 Restoring collections to Firestore...`);
  let totalRestoredDocs = 0;

  for (const [colName, docs] of Object.entries(collections)) {
    if (!Array.isArray(docs)) continue;

    let count = 0;
    const chunkSize = 400;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const batch = db.batch();

      for (const item of chunk) {
        const { _id, ...data } = item;
        if (!_id) continue;
        const ref = db.collection(colName).doc(_id);
        batch.set(ref, data, { merge: true });
        count++;
      }

      await batch.commit();
    }

    console.log(`  ✓ Restored ${colName}: ${count} documents`);
    totalRestoredDocs += count;
  }

  console.log("\n==================================================");
  console.log(`🎉 Restore completed successfully!`);
  console.log(`📊 Summary: Restored ${totalRestoredDocs} documents across ${Object.keys(collections).length} collections.`);
  console.log("==================================================\n");
}

runRestore()
  .catch(err => {
    console.error("❌ Restore failed:", err);
    process.exit(1);
  })
  .then(() => process.exit(0));
