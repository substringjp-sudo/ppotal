const fs = require('fs');
const path = require('path');

// 1. Load Migration Data
const migrationDataPath = path.resolve(__dirname, '../../web/public/data/region/id-migration.json');
const migration = JSON.parse(fs.readFileSync(migrationDataPath, 'utf8'));

const countryMap = new Map();
const prefectureMap = new Map();
const cityMap = new Map();

migration.countries.forEach(m => countryMap.set(m.oldId, m.newId));
migration.prefectures.forEach(m => prefectureMap.set(m.oldId, m.newId));
migration.cities.forEach(m => cityMap.set(m.oldId, m.newId));

console.log(`Loaded ${countryMap.size} countries, ${prefectureMap.size} prefectures, ${cityMap.size} cities.`);

// 2. Helper Functions
function replaceInFile(filePath, type) {
    if (!fs.existsSync(filePath)) return;
    console.log(`Processing content of: ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace "id": OLD_ID
    // Also handle "country": OLD_ID, "prefecture": OLD_ID, "city": OLD_ID
    
    // We must be careful with regex boundaries.
    // Logic: Look for "property": VALUE where property is id, country, prefecture, or city.
    
    const replaceByMap = (map, propertyNames) => {
        propertyNames.forEach(prop => {
            const regex = new RegExp(`("${prop}"\\s*:\\s*)([0-9]+)(?=[\\s,}])`, 'g');
            content = content.replace(regex, (match, prefix, oldIdStr) => {
                const oldId = parseInt(oldIdStr);
                if (map.has(oldId)) {
                    return `${prefix}"${map.get(oldId)}"`;
                }
                return match;
            });
        });
    };

    if (type === 'country') {
        replaceByMap(countryMap, ['id', 'country']);
    } else if (type === 'prefecture') {
        replaceByMap(prefectureMap, ['id', 'prefecture']);
        replaceByMap(countryMap, ['country']);
    } else if (type === 'city') {
        replaceByMap(cityMap, ['id', 'city']);
        replaceByMap(prefectureMap, ['prefecture']);
        replaceByMap(countryMap, ['country']);
    } else if (type === 'tree') {
        replaceByMap(countryMap, ['id']);
        replaceByMap(prefectureMap, ['id']);
        replaceByMap(cityMap, ['id']);
    } else if (type === 'airport') {
        replaceByMap(countryMap, ['country']);
        replaceByMap(prefectureMap, ['prefecture']);
        replaceByMap(cityMap, ['city']);
    }

    fs.writeFileSync(filePath, content);
}

function migrateFilenames(dirPath, map, recursive = false) {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory() && recursive) {
            // If the directory name itself is an old ID (for airports)
            const oldId = parseInt(entry.name);
            if (!isNaN(oldId) && map.has(oldId)) {
                const newPath = path.join(dirPath, map.get(oldId));
                fs.renameSync(fullPath, newPath);
                migrateFilenames(newPath, map, recursive);
            } else {
                migrateFilenames(fullPath, map, recursive);
            }
        } else if (entry.isFile()) {
            // Expected format: [oldId].json
            const nameMatch = entry.name.match(/^([0-9]+)\.json$/);
            if (nameMatch) {
                const oldId = parseInt(nameMatch[1]);
                if (map.has(oldId)) {
                    const newName = `${map.get(oldId)}.json`;
                    const newPath = path.join(dirPath, newName);
                    fs.renameSync(fullPath, newPath);
                }
            }
        }
    }
}

// 3. Execution

// Phase 2: Metadata JSONs
const regionDirs = [
    path.resolve(__dirname, '../../data/region'),
    path.resolve(__dirname, '../../web/public/data/region')
];

regionDirs.forEach(dir => {
    replaceInFile(path.join(dir, 'countries.json'), 'country');
    replaceInFile(path.join(dir, 'prefectures.json'), 'prefecture');
    replaceInFile(path.join(dir, 'cities.json'), 'city');
    replaceInFile(path.join(dir, 'tree.json'), 'tree');
});

// Airport metadata
replaceInFile(path.resolve(__dirname, '../../data/airport/airports.json'), 'airport');

// Phase 3: Filenames
migrateFilenames(path.resolve(__dirname, '../../data/region/geoms/country_prefectures'), prefectureMap);
migrateFilenames(path.resolve(__dirname, '../../data/region/geoms/city'), cityMap, true); // city geoms are nested in folders
migrateFilenames(path.resolve(__dirname, '../../data/airport/countries'), countryMap, true); // airport folders are country IDs

console.log('Migration completed (Metadata and Filenames).');
console.log('Note: Large _geom.json files were skipped in content replacement as they appear to be arrays without IDs.');
