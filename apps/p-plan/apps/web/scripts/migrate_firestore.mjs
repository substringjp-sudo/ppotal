import { execSync } from 'child_process';

const SOURCE_PROJECT = 'pplan-52a07';
const SOURCE_DB = '(default)';
const TARGET_PROJECT = 'p-plan';
const TARGET_DB = '(default)';

const COLLECTIONS = [
    'users',
    'trips',
    'timelines',
    'notifications',
    'regions',
    'cities',
    'countries',
    'timelineItems',
    'bucketItems',
    'checklists',
    'projects',
    'social',
    'travelTemplates',
    'travelogs',
    'tripChecklistFolders',
    'tripChecklistItems',
    'tripWishlistFolders',
    'tripWishlistItems',
    'trip_folders'
];

async function getAccessToken() {
    return execSync('gcloud auth print-access-token').toString().trim();
}

async function migrateCollection(collectionId, token) {
    console.log(`\n>>> Migrating collection: ${collectionId}`);
    let pageToken = '';
    let migratedCount = 0;

    do {
        const url = `https://firestore.googleapis.com/v1/projects/${SOURCE_PROJECT}/databases/${SOURCE_DB}/documents/${collectionId}?pageSize=50&pageToken=${pageToken}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const error = await response.json();
            console.error(`Failed to fetch documents from ${collectionId}:`, error);
            break;
        }

        const data = await response.json();
        const documents = data.documents || [];

        for (const doc of documents) {
            const docId = doc.name.split('/').pop();
            const targetUrl = `https://firestore.googleapis.com/v1/projects/${TARGET_PROJECT}/databases/${TARGET_DB}/documents/${collectionId}/${docId}`;
            
            // Remove 'name', 'createTime', 'updateTime' as they are system fields
            const { name, createTime, updateTime, ...docData } = doc;

            const pushResponse = await fetch(targetUrl, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(docData)
            });

            if (pushResponse.ok) {
                migratedCount++;
            } else {
                const error = await pushResponse.json();
                console.error(`Failed to push document ${docId} to ${collectionId}:`, error);
            }
        }

        pageToken = data.nextPageToken || '';
        console.log(`Migrated ${migratedCount} documents so far...`);
    } while (pageToken);

    console.log(`--- Finished ${collectionId}: ${migratedCount} migrated`);
}

async function run() {
    try {
        const token = await getAccessToken();
        console.log("Got access token, starting migration...");

        for (const collection of COLLECTIONS) {
            await migrateCollection(collection, token);
        }

        console.log("\n✅ Migration complete!");
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

run();
