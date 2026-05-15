import fs from 'fs';
import path from 'path';

const geomsDir = 'public/data/region/geoms';
const dataDir = 'public/data/region';

const countriesPath = path.join(dataDir, 'countries.json');
const prefecturesPath = path.join(dataDir, 'prefectures.json');
const citiesPath = path.join(dataDir, 'cities.json');
const treePath = path.join(dataDir, 'tree.json');

const countries = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));
const prefectures = JSON.parse(fs.readFileSync(prefecturesPath, 'utf8'));
const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));

const idMap = {
    country: {},
    prefecture: {},
    city: {}
};

// Generate IDs
// Country: 3 digits
countries.forEach(c => {
    const oldId = c.id;
    const newId = oldId.toString().padStart(3, '0');
    idMap.country[oldId] = newId;
    c.id = newId;
});

// Prefecture: 4 digits + Country 3 digits (7 total)
prefectures.forEach(p => {
    const oldId = p.id;
    const oldCountry = p.country;
    const newCountry = idMap.country[oldCountry];
    const newId = oldId.toString().padStart(4, '0') + newCountry;
    idMap.prefecture[oldId] = newId;
    p.id = newId;
    p.country = newCountry;
});

// City: 5 digits + Prefecture 7 digits (12 total)
cities.forEach(c => {
    const oldId = c.id;
    const oldPref = c.prefecture;
    const oldCountry = c.country;
    
    // Some cities might lack prefecture or country in dirty data
    const newPref = idMap.prefecture[oldPref] || '0000000';
    const newCountry = idMap.country[oldCountry] || '000';
    
    const newId = oldId.toString().padStart(5, '0') + newPref;
    idMap.city[oldId] = newId;
    c.id = newId;
    if (oldPref != null) c.prefecture = newPref;
    if (oldCountry != null) c.country = newCountry;
});

// Update Tree
tree.forEach(c => {
    const oldCId = c.id;
    c.id = idMap.country[oldCId];
    if (c.prefectures) {
        c.prefectures.forEach(p => {
            const oldPId = p.id;
            p.id = idMap.prefecture[oldPId];
            if (p.cities) {
                p.cities.forEach(city => {
                    const oldCityId = city.id;
                    city.id = idMap.city[oldCityId];
                });
            }
        });
    }
});

// Write JSONs back
fs.writeFileSync(countriesPath, JSON.stringify(countries, null, 2));
fs.writeFileSync(prefecturesPath, JSON.stringify(prefectures, null, 2));
fs.writeFileSync(citiesPath, JSON.stringify(cities, null, 2));
fs.writeFileSync(treePath, JSON.stringify(tree, null, 2));

// Save id migration map
fs.writeFileSync(path.join(dataDir, 'id-migration.json'), JSON.stringify(idMap, null, 2));

// Process geoms
const cpDir = path.join(geomsDir, 'country_prefectures');
if (fs.existsSync(cpDir)) {
    const files = fs.readdirSync(cpDir);
    files.forEach(f => {
        if (!f.endsWith('.json')) return;
        const oldId = f.split('.')[0];
        const newId = idMap.country[oldId];
        if (newId) {
            const p = path.join(cpDir, f);
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (data.type === 'FeatureCollection' && data.features) {
                 data.features.forEach(feat => {
                     if (feat.properties) {
                         const type = feat.properties.type;
                         if (feat.properties.id != null) {
                             if (type === 'country') feat.properties.id = idMap.country[feat.properties.id];
                             else if (type === 'prefecture') feat.properties.id = idMap.prefecture[feat.properties.id];
                             else if (type === 'city') feat.properties.id = idMap.city[feat.properties.id];
                         }
                         if (feat.properties.prefectureId != null) feat.properties.prefectureId = idMap.prefecture[feat.properties.prefectureId];
                         if (feat.properties.countryId != null) feat.properties.countryId = idMap.country[feat.properties.countryId];
                     }
                 });
            }
            fs.writeFileSync(path.join(cpDir, `${newId}.json`), JSON.stringify(data));
            if (newId !== oldId) fs.unlinkSync(p);
        }
    });
}

const cityDir = path.join(geomsDir, 'city');
if (fs.existsSync(cityDir)) {
    const countriesDirs = fs.readdirSync(cityDir);
    countriesDirs.forEach(cDirOld => {
        const fullCdirOld = path.join(cityDir, cDirOld);
        if (!fs.statSync(fullCdirOld).isDirectory()) return;

        const cDirNew = idMap.country[cDirOld];
        const targetCDir = cDirNew ? path.join(cityDir, cDirNew) : fullCdirOld;
        
        if (cDirNew && cDirNew !== cDirOld) {
            if (!fs.existsSync(targetCDir)) fs.mkdirSync(targetCDir, { recursive: true });
        }

        const cityGeoms = fs.readdirSync(fullCdirOld);
        cityGeoms.forEach(f => {
            if (!f.endsWith('.json')) return;
            const oldId = f.split('.')[0];
            const newId = idMap.city[oldId] || oldId; 

            const p = path.join(fullCdirOld, f);
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (data.properties) {
                if (data.properties.id != null) data.properties.id = idMap.city[data.properties.id];
                if (data.properties.prefectureId != null) data.properties.prefectureId = idMap.prefecture[data.properties.prefectureId];
                if (data.properties.countryId != null) data.properties.countryId = idMap.country[data.properties.countryId];
            } else if (data.type === 'FeatureCollection' && data.features) {
                data.features.forEach(feat => {
                     if (feat.properties) {
                         if (feat.properties.type === 'city' && feat.properties.id != null) feat.properties.id = idMap.city[feat.properties.id];
                         if (feat.properties.prefectureId != null) feat.properties.prefectureId = idMap.prefecture[feat.properties.prefectureId];
                         if (feat.properties.countryId != null) feat.properties.countryId = idMap.country[feat.properties.countryId];
                     }
                });
            }
            
            fs.writeFileSync(path.join(targetCDir, `${newId}.json`), JSON.stringify(data));
            if (path.join(fullCdirOld, f) !== path.join(targetCDir, `${newId}.json`)) {
                fs.unlinkSync(p);
            }
        });
        
        if (cDirNew && cDirNew !== cDirOld) {
            fs.rmdirSync(fullCdirOld);
        }
    });
}
console.log("Migration complete.");
