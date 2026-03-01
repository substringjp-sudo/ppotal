const fs = require('fs');
const path = require('path');

const prefecturePath = path.join(__dirname, 'prefecture.txt');
const regionNamesPath = path.join(__dirname, '../public/data/region_names.json');

function main() {
    console.log('Reading prefecture.txt...');
    const prefectureContent = fs.readFileSync(prefecturePath, 'utf8');
    const lines = prefectureContent.split('\n');

    // Skip header and empty lines, extract translations
    const nameMap = new Map(); // Japanese Name -> Korean Name
    lines.forEach(line => {
        const parts = line.trim().split(/\t/);
        if (parts.length >= 4) {
            const jpName = parts[1].trim();
            const koName = parts[3].trim();
            if (jpName && koName) {
                nameMap.set(jpName, koName);
            }
        }
    });

    console.log(`Extracted ${nameMap.size} translations from prefecture.txt.`);

    console.log('Reading region_names.json...');
    const regionNames = JSON.parse(fs.readFileSync(regionNamesPath, 'utf8'));

    let updatedAdm1Count = 0;
    if (regionNames.adm1) {
        Object.keys(regionNames.adm1).forEach(key => {
            const item = regionNames.adm1[key];
            const jpName = item.shapeName;
            if (nameMap.has(jpName)) {
                item.shapeName_kr = nameMap.get(jpName);
                updatedAdm1Count++;
            }
        });
    }

    console.log(`Updated ${updatedAdm1Count} entries in adm1.`);

    console.log('Writing updated region_names.json...');
    fs.writeFileSync(regionNamesPath, JSON.stringify(regionNames, null, 2));

    console.log('Success!');
}

main();
