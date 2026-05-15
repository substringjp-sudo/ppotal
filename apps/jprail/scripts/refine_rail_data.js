const fs = require('fs');
const path = require('path');

const RAIL_DIR = path.join(__dirname, '../public/rail');

const linesPath = path.join(RAIL_DIR, 'lines.json');
const hierarchyPath = path.join(RAIL_DIR, 'railroad_hierarchy.json');
const platformsPath = path.join(RAIL_DIR, 'platforms.json');
const sectionsPath = path.join(RAIL_DIR, 'sections.json');
const stationsPath = path.join(RAIL_DIR, 'stations.json');

function loadJson(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err);
        process.exit(1);
    }
}

function saveJson(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`Saved ${filePath}`);
    } catch (err) {
        console.error(`Error writing ${filePath}:`, err);
        process.exit(1);
    }
}

function main() {
    console.log('Loading data...');
    const lines = loadJson(linesPath);
    const hierarchy = loadJson(hierarchyPath);
    const platforms = loadJson(platformsPath);
    const sectionsData = loadJson(sectionsPath);
    const stations = loadJson(stationsPath);

    // 1. Reset total_length in lines.json
    console.log('Step 1: Resetting line lengths...');
    for (const key in lines) {
        if (lines.hasOwnProperty(key)) {
            lines[key].total_length = 0;
        }
    }

    // Prepare platform -> station mapping
    console.log('Building platform to station map...');
    const platformToStation = new Map();
    for (const stationId in stations) {
        if (stations[stationId].platform_ids) {
            for (const platformId of stations[stationId].platform_ids) {
                platformToStation.set(platformId, stationId);
            }
        }
    }

    // 2. Process platforms into hierarchy
    console.log('Step 2: Processing platforms...');

    // First, clear existing stations/sections in hierarchy and init platforms array
    // Iterating companies and lines
    if (hierarchy.companies) {
        for (const corpId in hierarchy.companies) {
            const company = hierarchy.companies[corpId];
            if (company.lines) {
                for (const lineId in company.lines) {
                    const line = company.lines[lineId];
                    // Delete existing fields
                    delete line.stations;
                    delete line.sections;

                    // Initialize new arrays
                    line.platforms = [];
                    line.sections = [];
                }
            }
        }
    }

    // Iterate platforms.json
    let platformsAdded = 0;
    for (const platformId in platforms) {
        const p = platforms[platformId];
        const corpId = String(p.company);
        const lineId = String(p.line);

        // Find in hierarchy
        if (hierarchy.companies[corpId] && hierarchy.companies[corpId].lines[lineId]) {
            const stationId = platformToStation.get(platformId);

            // If we can't find a station ID, fallback to platformID? 
            // The prompt asks for "station_id" and "platform_id". 
            // If station_id is missing, data is incomplete. We'll use platformId as placeholder or skip?
            // "platforms.json을 순회하면서 ... \"station_id\"와 \"platform_id\"를 넣어."
            // I will use platformId if stationId is not found, to be safe, but log warning.

            const sid = stationId || platformId;
            // if (!stationId) console.warn(`Warning: No station ID for platform ${platformId}`);

            hierarchy.companies[corpId].lines[lineId].platforms.push({
                station_id: sid,
                platform_id: platformId
            });
            platformsAdded++;
        }
    }
    console.log(`Added ${platformsAdded} platforms to hierarchy.`);

    // 3. Process sections into hierarchy
    console.log('Step 3: Processing sections...');
    const sections = sectionsData.sections || [];
    let sectionsAdded = 0;
    let sectionsSkipped = 0;

    for (const section of sections) {
        if (section.start_station === section.end_station) {
            sectionsSkipped++;
            continue;
        }

        const corpId = String(section.company_id);
        const lineId = String(section.line_id);

        if (hierarchy.companies[corpId] && hierarchy.companies[corpId].lines[lineId]) {
            hierarchy.companies[corpId].lines[lineId].sections.push({
                id: section.id,
                start_station: section.start_station,
                end_station: section.end_station
            });
            sectionsAdded++;
        }
    }
    console.log(`Added ${sectionsAdded} sections. Skipped ${sectionsSkipped} self-loop sections.`);

    // Save files
    console.log('Saving files...');
    saveJson(linesPath, lines);
    saveJson(hierarchyPath, hierarchy);
    console.log('Done.');
}

main();
