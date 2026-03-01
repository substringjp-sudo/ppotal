const fs = require('fs');
const path = require('path');

const platformsPath = path.join(__dirname, 'untranslated_platforms.json');
const stationsPath = path.join(__dirname, 'missing_station_kr.json');

function processPlatforms() {
    if (fs.existsSync(platformsPath)) {
        console.log('Processing untranslated_platforms.json...');
        const data = JSON.parse(fs.readFileSync(platformsPath, 'utf8'));

        // Remove company and line fields
        const processed = data.map(item => ({
            code: item.code,
            name: item.name
        }));

        // Write minified JSON
        fs.writeFileSync(platformsPath, JSON.stringify(processed));
        console.log('untranslated_platforms.json updated and minified.');
    }
}

function processStations() {
    if (fs.existsSync(stationsPath)) {
        console.log('Processing missing_station_kr.json...');
        const data = JSON.parse(fs.readFileSync(stationsPath, 'utf8'));

        // Write minified JSON
        fs.writeFileSync(stationsPath, JSON.stringify(data));
        console.log('missing_station_kr.json minified.');
    }
}

processPlatforms();
processStations();
