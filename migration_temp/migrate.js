const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();

async function getStationCoord(stationId) {
    if (!stationId) return null;
    const doc = await db.collection('stations').doc(stationId).get(); // Use default db for current project
    // Wait, the script was supposed to access jprail.
    // I should use the projects/{project_id}/databases/(default)/documents/... paths for cross-project access if possible,
    // or just assume we are in p-plan and get from stations collection there (if they are synced).
    // Actually, I'll use the full path to be explicit.
    
    const fullPath = `projects/jprail/databases/(default)/documents/stations/${stationId}`;
    const stationDoc = await db.doc(fullPath).get();
    if (stationDoc.exists) {
        const data = stationDoc.data();
        return [data.lon, data.lat];
    }
    return null;
}

async function migrateUserTrips(jprailUid, pplanUid) {
    console.log(`Migrating trips for ${jprailUid} -> ${pplanUid}`);
    const tripsPath = `projects/jprail/databases/(default)/documents/users/${jprailUid}/trips`;
    const snapshot = await db.collection(tripsPath).get();

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const tripId = data.id || doc.id;
        console.log(`- Migrating trip: ${tripId}`);

        let segments = [];
        if (data.geometries) {
            try {
                const geoArray = JSON.parse(data.geometries);
                segments = geoArray.map(coords => ({
                    type: 'publicTransport',
                    points: coords
                }));
            } catch (e) {
                console.error(`  Error parsing geometries for ${tripId}: ${e.message}`);
            }
        }

        const startCoord = await getStationCoord(data.startId || data.start);
        const endCoord = await getStationCoord(data.endId || data.end);

        const tripDoc = {
            id: tripId,
            userId: pplanUid,
            title: `${data.startName || 'Station'} to ${data.endName || 'Station'}`,
            date: data.date || new Date().toISOString().split('T')[0],
            segments: segments,
            metadata: {
                source: 'jprail_migration',
                legacyTripId: tripId,
                startStationId: data.startId || data.start,
                endStationId: data.endId || data.end
            }
        };

        if (startCoord) tripDoc.metadata.startCoord = startCoord;
        if (endCoord) tripDoc.metadata.endCoord = endCoord;

        await db.collection('trips').doc(tripId).set(tripDoc);
        console.log(`  Migrated ${tripId}`);
    }
}

async function run() {
    const users = [
        { jprail: 'Fnbszuupg8Z0CN8EB1KANE3a2nj1', pplan: 'Fnbszuupg8Z0CN8EB1KANE3a2nj1' }, // deepa
        { jprail: 'wX87XDtCJIX759PdsraxrOnD7lO2', pplan: 'wX87XDtCJIX759PdsraxrOnD7lO2' }  // kase
    ];

    for (const user of users) {
        await migrateUserTrips(user.jprail, user.pplan);
    }
}

run().catch(console.error);
