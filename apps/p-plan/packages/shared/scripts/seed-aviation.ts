const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue, GeoPoint } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

/**
 * Aviation Data Seeding (Airports, Airlines, Routes)
 */

const PROJECT_ID = 'p-plan';
const DATABASE_ID = '(default)';
const DATA_ROOT = path.join(__dirname, '../../../data'); // f:/p-plan/data

async function startSeeding() {
    console.log('--- AVIATION DATA SEEDING START ---');
    
    try {
        if (getApps().length === 0) initializeApp({ projectId: PROJECT_ID });
        const db = getFirestore(DATABASE_ID);

        // 1. Load Tree Data for name resolution
        console.log('Loading tree.json for name resolution...');
        const treePath = path.join(__dirname, '../../../data/region/tree.json');
        const treeData = JSON.parse(fs.readFileSync(treePath, 'utf8'));
        
        // Create a flat map for quick name lookup
        const nameMap = new Map();
        treeData.forEach(country => {
            const countryId = String(country.id).padStart(3, '0');
            nameMap.set(countryId, country.name);
            country.prefectures?.forEach(pref => {
                const prefId = String(pref.id);
                nameMap.set(prefId, pref.name);
                pref.cities?.forEach(city => {
                    const cityId = String(city.id);
                    nameMap.set(cityId, city.name);
                });
            });
        });

        // 2. Seed Airports
        console.log('Seeding Airports...');
        const airportsPath = path.join(DATA_ROOT, 'airport/airports.json');
        const airports = JSON.parse(fs.readFileSync(airportsPath, 'utf8'));
        
        let batch = db.batch();
        let count = 0;
        for (const a of airports) {
            if (!a.code) continue;
            
            const docRef = db.collection('airports').doc(a.code);
            batch.set(docRef, {
                id: a.id,
                iata: a.code,
                nameEn: a.name,
                nameKo: a.name_ko || a.name, // Use name_ko if available
                type: a.type,
                location: new GeoPoint(a.coord[0], a.coord[1]),
                regionIds: {
                    countryId: String(a.country).padStart(3, '0'),
                    countryName: nameMap.get(String(a.country).padStart(3, '0')) || '',
                    prefectureId: String(a.prefecture),
                    prefectureName: nameMap.get(String(a.prefecture)) || '',
                    cityId: String(a.city),
                    cityName: nameMap.get(String(a.city)) || ''
                },
                updatedAt: FieldValue.serverTimestamp()
            });
            
            count++;
            if (count % 500 === 0) {
                await batch.commit();
                batch = db.batch();
                process.stdout.write(`.` );
            }
        }
        await batch.commit();
        console.log(`\n- Seeded ${count} airports`);

        // 3. Seed Airlines
        console.log('Seeding Airlines...');
        const airlinesPath = path.join(DATA_ROOT, 'airlines.json');
        const airlines = JSON.parse(fs.readFileSync(airlinesPath, 'utf8'));
        
        batch = db.batch();
        count = 0;
        for (const a of airlines) {
            if (!a.code) continue;
            const docRef = db.collection('airlines').doc(a.code);
            batch.set(docRef, {
                code: a.code,
                nameEn: a.name_en,
                nameKo: a.name_ko,
                updatedAt: FieldValue.serverTimestamp()
            });
            count++;
            if (count % 500 === 0) {
                await batch.commit();
                batch = db.batch();
                process.stdout.write(`.` );
            }
        }
        await batch.commit();
        console.log(`\n- Seeded ${count} airlines`);

        // 4. Seed Routes
        console.log('Seeding Routes...');
        const routesPath = path.join(DATA_ROOT, 'routes.json');
        const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
        
        batch = db.batch();
        count = 0;
        for (const r of routes) {
            if (!r.src || !r.dst) continue;
            // Generate a unique ID for route
            const routeId = `${r.src}_${r.dst}_${r.airline}`;
            const docRef = db.collection('routes').doc(routeId);
            batch.set(docRef, {
                src: r.src,
                dst: r.dst,
                airline: r.airline,
                updatedAt: FieldValue.serverTimestamp()
            });
            count++;
            if (count % 500 === 0) {
                await batch.commit();
                batch = db.batch();
                process.stdout.write(`.` );
            }
        }
        await batch.commit();
        console.log(`\n- Seeded ${count} routes`);

        console.log('--- ALL AVIATION DATA SEEDED ---');

    } catch (err) {
        console.error('SEVERE ERROR:', err);
    }
}

startSeeding();
