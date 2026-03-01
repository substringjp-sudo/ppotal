const fs = require('fs');
const path = require('path');

const stationsPath = path.join(__dirname, '../public/rail/stations_master_updated.json');
const outputPath = path.join(__dirname, 'missing_station_kr.json');

function main() {
    console.log('Loading stations data...');
    const stationsData = JSON.parse(fs.readFileSync(stationsPath, 'utf8'));

    const missing = [];
    let totalCount = 0;

    for (const id in stationsData) {
        totalCount++;
        const station = stationsData[id];

        if (!station.name_kr || station.name_kr.trim() === '') {
            missing.push({
                id: station.id,
                name: station.name,
                name_en: station.name_en
            });
        }
    }

    console.log(`Finished checking ${totalCount} stations.`);
    console.log(`Found ${missing.length} stations without name_kr.`);

    if (missing.length > 0) {
        console.log('Writing missing stations to file...');
        fs.writeFileSync(outputPath, JSON.stringify(missing, null, 2));
        console.log(`Output saved to: scripts/missing_station_kr.json`);
    } else {
        console.log('All stations already have name_kr translations.');
    }
}

main();
