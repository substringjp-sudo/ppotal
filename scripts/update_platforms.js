const fs = require('fs');
const path = require('path');

const xmlPath = path.join(__dirname, '../public/N02-22.xml');
const jsonPath = path.join(__dirname, '../public/systematic_railroad_network.json');

console.log('Reading files...');
const xmlContent = fs.readFileSync(xmlPath, 'utf8');
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('Extracting Curve coordinates...');
const curveCoords = {};
const curveBlocks = xmlContent.split('<gml:Curve');
for (let i = 1; i < curveBlocks.length; i++) {
    const block = curveBlocks[i];
    const idMatch = block.match(/gml:id="([^"]+)"/);
    const posListMatch = block.match(/<gml:posList>([\s\S]*?)<\/gml:posList>/);

    if (idMatch && posListMatch) {
        const id = idMatch[1];
        const coordsStr = posListMatch[1].trim();
        const coords = [];
        const parts = coordsStr.split(/\s+/);
        for (let j = 0; j < parts.length; j += 2) {
            if (parts[j] && parts[j + 1]) {
                const lat = parseFloat(parts[j]);
                const lon = parseFloat(parts[j + 1]);
                if (!isNaN(lat) && !isNaN(lon)) {
                    coords.push([lon, lat]);
                }
            }
        }
        curveCoords[id] = coords;
    }
}
console.log(`Extracted ${Object.keys(curveCoords).length} curves.`);

console.log('Matching Stations...');
const stationToCurve = {};
const stationBlocks = xmlContent.split('<ksj:Station');
for (let i = 1; i < stationBlocks.length; i++) {
    const block = stationBlocks[i];
    const curveRefMatch = block.match(/xlink:href="#([^"]+)"/);
    const lineMatch = block.match(/<ksj:railwayLineName>([^<]+)<\/ksj:railwayLineName>/);
    const companyMatch = block.match(/<ksj:operationCompany>([^<]+)<\/ksj:operationCompany>/);
    const nameMatch = block.match(/<ksj:stationName>([^<]+)<\/ksj:stationName>/);

    if (curveRefMatch && lineMatch && companyMatch && nameMatch) {
        const curveRef = curveRefMatch[1];
        const line = lineMatch[1];
        const company = companyMatch[1];
        const name = nameMatch[1];
        const key = `${company}::${line}::${name}`;
        stationToCurve[key] = curveRef;
    }
}
console.log(`Found ${Object.keys(stationToCurve).length} stations in XML.`);

console.log('Updating JSON data...');
let updatedCount = 0;
let missingCount = 0;

for (const stationId in jsonData.stations) {
    const station = jsonData.stations[stationId];
    const curveId = stationToCurve[stationId];

    if (curveId && curveCoords[curveId]) {
        station.platforms = [curveCoords[curveId]];
        updatedCount++;
    } else {
        missingCount++;
    }
}

console.log(`Updated ${updatedCount} stations.`);
console.log(`${missingCount} stations remained unchanged or missing data.`);

console.log('Saving updated JSON...');
fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
console.log('Done!');
