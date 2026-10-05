import { NextResponse } from 'next/server';
import { adminDb, isFirebaseAdminConfigured } from '@/firebase/server';

const CORE_COLLECTIONS = [
  'users',
  'complaints',
  'sos_signals',
  'police_officers',
  'activity_logs',
  'broadcasts',
  'system_settings'
];

export async function GET(request: Request) {
  try {
    if (!isFirebaseAdminConfigured || !adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK is not configured on the server.' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get('download') === 'true';

    // Discover collections dynamically + fallback to core collections
    const collectionNames = new Set<string>(CORE_COLLECTIONS);
    try {
      const collections = await adminDb.listCollections();
      collections.forEach((col: any) => collectionNames.add(col.id));
    } catch (e) {
      console.warn("Could not list collections dynamically, using core list:", e);
    }

    const collectionsData: Record<string, any[]> = {};
    let totalDocuments = 0;

    for (const colName of Array.from(collectionNames)) {
      try {
        const snapshot = await adminDb.collection(colName).get();
        const docs: any[] = [];
        snapshot.forEach((doc: any) => {
          docs.push({
            _id: doc.id,
            ...doc.data()
          });
        });
        collectionsData[colName] = docs;
        totalDocuments += docs.length;
      } catch (err) {
        console.error(`Error reading collection ${colName}:`, err);
        collectionsData[colName] = [];
      }
    }

    const backupPayload = {
      app: 'crime-reporting-website',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      metadata: {
        totalCollections: Object.keys(collectionsData).length,
        totalDocuments,
        collectionStats: Object.fromEntries(
          Object.entries(collectionsData).map(([k, v]) => [k, v.length])
        )
      },
      collections: collectionsData
    };

    if (isDownload) {
      const filename = `crime-app-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      return new NextResponse(JSON.stringify(backupPayload, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    return NextResponse.json(backupPayload);
  } catch (error: any) {
    console.error('Backup API Export Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export backup data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isFirebaseAdminConfigured || !adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK is not configured on the server.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { collections, mode = 'merge' } = body;

    if (!collections || typeof collections !== 'object') {
      return NextResponse.json(
        { error: 'Invalid backup format: missing "collections" object.' },
        { status: 400 }
      );
    }

    const restoredStats: Record<string, number> = {};
    let totalRestored = 0;

    for (const [colName, docs] of Object.entries(collections)) {
      if (!Array.isArray(docs)) continue;

      let count = 0;
      // Process in batches of 400 (Firestore limit is 500 per batch)
      const chunkSize = 400;
      for (let i = 0; i < docs.length; i += chunkSize) {
        const chunk = docs.slice(i, i + chunkSize);
        const batch = adminDb.batch();

        for (const item of chunk) {
          const { _id, ...data } = item;
          if (!_id) continue;
          const ref = adminDb.collection(colName).doc(_id);

          if (mode === 'overwrite') {
            batch.set(ref, data);
          } else {
            batch.set(ref, data, { merge: true });
          }
          count++;
        }

        await batch.commit();
      }

      restoredStats[colName] = count;
      totalRestored += count;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully restored ${totalRestored} documents across ${Object.keys(restoredStats).length} collections.`,
      restoredStats,
      restoredAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Backup API Restore Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to restore backup data' },
      { status: 500 }
    );
  }
}
