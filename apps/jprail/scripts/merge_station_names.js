const fs = require('fs');
const path = require('path');

const stationsPath = path.join(__dirname, '../public/rail/stations_master_updated.json');
const namesPath = path.join(__dirname, 'names.json');
const outputPath = path.join(__dirname, 'stations_master_final.json');

function main() {
    console.log('Loading data...');
    const stationsData = JSON.parse(fs.readFileSync(stationsPath, 'utf8'));
    const namesData = JSON.parse(fs.readFileSync(namesPath, 'utf8'));

    console.log(`Loaded ${Object.keys(stationsData).length} stations and ${namesData.length} translations.`);

    // Create a map for quick lookup
    const nameMap = new Map();
    namesData.forEach(item => {
        if (item.id && item.name_kr) {
            nameMap.set(item.id, item.name_kr);
        }
    });

    let updatedCount = 0;
    for (const id in stationsData) {
        if (nameMap.has(id)) {
            stationsData[id].name_kr = nameMap.get(id);
            updatedCount++;
        }
    }

    console.log(`Updated ${updatedCount} stations with new translations.`);

    console.log('Writing updated stations data...');
    fs.writeFileSync(outputPath, JSON.stringify(stationsData, null, 2));

    console.log(`Success! Updated file saved to: scripts/stations_master_final.json`);
}

main();
