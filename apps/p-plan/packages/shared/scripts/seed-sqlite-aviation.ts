const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

/**
 * SQLite geodata.db Aviation Data Seeding
 * Seeds airports, airlines, and routes for mobile offline usage.
 */

const DB_PATH = path.join(__dirname, '../data/geodata.db');
const DATA_ROOT = path.join(__dirname, '../../../data'); // f:/p-plan/data

function startSeeding() {
    console.log('--- SQLITE AVIATION DATA SEEDING START ---');
    console.log(`Target DB: ${DB_PATH}`);
    
    try {
        const db = new Database(DB_PATH);
        
        // 1. Create Tables
        console.log('Creating tables...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS airports (
                iata TEXT PRIMARY KEY,
                nameEn TEXT,
                nameKo TEXT,
                lat REAL,
                lng REAL,
                timezone REAL,
                countryId TEXT,
                countryName TEXT,
                prefectureId TEXT,
                prefectureName TEXT,
                cityId TEXT,
                cityName TEXT
            );

            CREATE TABLE IF NOT EXISTS airlines (
                code TEXT PRIMARY KEY,
                nameEn TEXT,
                nameKo TEXT
            );

            CREATE TABLE IF NOT EXISTS routes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                src TEXT,
                dst TEXT,
                airline TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_airports_loc ON airports (lat, lng);
            CREATE INDEX IF NOT EXISTS idx_routes_src ON routes (src);
            CREATE INDEX IF NOT EXISTS idx_routes_dst ON routes (dst);
        `);

        // 2. Load Tree for name resolution (same logic as firestore seeding)
        console.log('Loading name mapping data...');
        const treePath = path.join(__dirname, '../../../apps/web/public/data/region/tree.json');
        const treeData = JSON.parse(fs.readFileSync(treePath, 'utf8'));
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

        // 3. Seed Airports
        console.log('Seeding Airports...');
        const airportsPath = path.join(DATA_ROOT, 'airport/airports.json');
        const airports = JSON.parse(fs.readFileSync(airportsPath, 'utf8'));
        
        const insertAirport = db.prepare(`
            INSERT OR REPLACE INTO airports 
            (iata, nameEn, nameKo, lat, lng, timezone, countryId, countryName, prefectureId, prefectureName, cityId, cityName)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const transaction = db.transaction((data) => {
            for (const a of data) {
                if (!a.code) continue;
                const countryId = String(a.country).padStart(3, '0');
                insertAirport.run(
                    a.code,
                    a.name,
                    a.nameKo || a.name, // Try Ko if exists, fallback to En
                    a.coord[0],
                    a.coord[1],
                    a.timezone || 0,
                    countryId,
                    nameMap.get(countryId) || '',
                    String(a.prefecture || ''),
                    nameMap.get(String(a.prefecture)) || '',
                    String(a.city || ''),
                    nameMap.get(String(a.city)) || ''
                );
            }
        });

        transaction(airports);
        console.log(`- Seeded ${airports.length} airports`);

        // 4. Seed Airlines
        console.log('Seeding Airlines...');
        const airlinesPath = path.join(DATA_ROOT, 'airlines.json');
        const airlines = JSON.parse(fs.readFileSync(airlinesPath, 'utf8'));
        
        const insertAirline = db.prepare('INSERT OR REPLACE INTO airlines (code, nameEn, nameKo) VALUES (?, ?, ?)');
        const airlineTx = db.transaction((data) => {
            for (const a of data) {
                if (!a.code) continue;
                insertAirline.run(a.code, a.name_en, a.name_ko);
            }
        });
        airlineTx(airlines);
        console.log(`- Seeded ${airlines.length} airlines`);

        // 5. Seed Routes
        console.log('Seeding Routes (Large Task)...');
        const routesPath = path.join(DATA_ROOT, 'routes.json');
        const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
        
        const insertRoute = db.prepare('INSERT INTO routes (src, dst, airline) VALUES (?, ?, ?)');
        const routeTx = db.transaction((data) => {
            for (const r of data) {
                if (!r.src || !r.dst) continue;
                insertRoute.run(r.src, r.dst, r.airline);
            }
        });
        routeTx(routes);
        console.log(`- Seeded ${routes.length} routes`);

        db.close();
        console.log('--- ALL SQLITE AVIATION DATA SEEDED SUCCESSFULLY ---');

    } catch (err) {
        console.error('SEVERE ERROR DURING SQLITE SEEDING:', err);
    }
}

startSeeding();
