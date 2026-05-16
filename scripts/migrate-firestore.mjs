
import fs from 'fs';

const TOKEN = "ya29.a0AQvPyIMjzBFTDfW1vrvpCM4tBlWxRtWVMCU2q31IM7GWKdGxxirgGPYR__ri_wvG5Vqr6uHXiaEiO8xU_3M__yTUnju5SzWAZa-9_BBoBQ4Dr6h1p8E9CCm6Rh29QS7BBmJ526rZIFbsWq2TL85hBbOofV85kOmemxpOcn_AQ0O3IZfTKp8Au4Il_pZgtedrn7GyIL6_8urfoCoaCgYKAaESARESFQHGX2Miahdwi1tWYqtDEFQ9NlHTZg0214";
const DEST_PROJECT = "p-plan";
const BATCH_SIZE = 50;

async function migrateCollection(sourceProject, collectionId, options = {}) {
  const { prefix = "" } = options;
  console.log(`Migrating ${collectionId} from ${sourceProject} to ${DEST_PROJECT}...`);

  let url = `https://firestore.googleapis.com/v1/projects/${sourceProject}/databases/(default)/documents/${collectionId}?pageSize=300`;
  let pageToken = null;
  let totalMigrated = 0;

  while (url) {
    const currentUrl = pageToken ? `${url}&pageToken=${pageToken}` : url;
    const response = await fetch(currentUrl, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    if (!response.ok) {
      console.error(`Failed to fetch from ${sourceProject}/${collectionId}:`, await response.text());
      break;
    }

    const data = await response.json();
    if (!data.documents) break;

    const destCollection = prefix ? `${prefix}_${collectionId}` : collectionId;

    // Process in batches
    for (let i = 0; i < data.documents.length; i += BATCH_SIZE) {
      const batch = data.documents.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (doc) => {
        const docId = doc.name.split('/').pop();
        const destName = `projects/${DEST_PROJECT}/databases/(default)/documents/${destCollection}/${docId}`;

        const newDoc = { fields: doc.fields };

        try {
          const writeResponse = await fetch(`https://firestore.googleapis.com/v1/${destName}`, {
            method: 'PATCH',
            headers: { 
              'Authorization': `Bearer ${TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(newDoc)
          });

          if (!writeResponse.ok) {
            console.error(`Failed to write ${docId}:`, await writeResponse.text());
          }
        } catch (e) {
          console.error(`Error writing ${docId}:`, e.message);
        }
      }));
      totalMigrated += batch.length;
      process.stdout.write(`\rMigrated ${totalMigrated} documents...`);
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  console.log(`\nDone migrating ${collectionId}.`);
}

async function run() {
  const jprailCollections = ['companies', 'lines', 'platforms', 'sections', 'station_graph', 'stations', 'feedbacks'];
  for (const col of jprailCollections) {
    await migrateCollection('jprail', col, { prefix: 'jprail' });
  }

  const regionevelCollections = ['geometries', 'geometries_bundles', 'maps', 'regions'];
  for (const col of regionevelCollections) {
    // Keep regions without prefix as per plan
    const prefix = col === 'regions' ? "" : "regionevel";
    await migrateCollection('regionevel', col, { prefix });
  }

  console.log("Migration complete!");
}

run().catch(console.error);
