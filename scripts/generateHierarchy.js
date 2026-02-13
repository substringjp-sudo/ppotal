const fs = require('fs');
const path = require('path');

const inputPath = '/Users/yunhyeongseob/dev/jprail/public/N02-22_Station.geojson';
const outputPath = '/Users/yunhyeongseob/dev/jprail/public/station_hierarchy.json';

try {
    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const hierarchy = {};

    data.features.forEach(s => {
        const company = s.properties.N02_004;
        const line = s.properties.N02_003;
        const stationName = s.properties.N02_005;

        if (!hierarchy[company]) hierarchy[company] = {};
        if (!hierarchy[company][line]) hierarchy[company][line] = [];

        if (!hierarchy[company][line].includes(stationName)) {
            hierarchy[company][line].push(stationName);
        }
    });

    // Sort entries alphabetically
    const sortedHierarchy = {};
    Object.keys(hierarchy).sort().forEach(company => {
        sortedHierarchy[company] = {};
        Object.keys(hierarchy[company]).sort().forEach(line => {
            sortedHierarchy[company][line] = hierarchy[company][line].sort();
        });
    });

    fs.writeFileSync(outputPath, JSON.stringify(sortedHierarchy, null, 2));
    console.log('Successfully created station_hierarchy.json');
} catch (error) {
    console.error('Error processing hierarchy:', error);
}
