const fs = require('fs');
const path = require('path');

const companiesPath = path.join(__dirname, '../public/rail/companies.json');
const linesPath = path.join(__dirname, '../public/rail/lines.json');
const platformsPath = path.join(__dirname, '../public/rail/platforms.json');
const hierarchyPath = path.join(__dirname, '../public/rail/railroad_hierarchy.json');
const stationsPath = path.join(__dirname, '../public/rail/stations.json');

function fixPlatforms() {
    console.log('Loading data...');
    const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
    const lines = JSON.parse(fs.readFileSync(linesPath, 'utf8'));
    const platforms = JSON.parse(fs.readFileSync(platformsPath, 'utf8'));
    const hierarchy = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
    const stations = JSON.parse(fs.readFileSync(stationsPath, 'utf8'));

    // 1. Index lines by name within each company
    const linesByCompanyAndName = {};
    Object.values(lines).forEach(line => {
        if (!linesByCompanyAndName[line.corp_id]) {
            linesByCompanyAndName[line.corp_id] = {};
        }
        linesByCompanyAndName[line.corp_id][line.name] = line.id;
    });

    // 2. Build platform -> station map
    const platformToStation = {};
    Object.values(stations).forEach(station => {
        if (station.platform_ids) {
            station.platform_ids.forEach(pid => {
                platformToStation[pid] = station.id;
            });
        }
    });

    // 3. Find lines in hierarchy with empty platforms
    const emptyLines = [];
    for (const corpId in hierarchy.companies) {
        const company = hierarchy.companies[corpId];
        for (const lineId in company.lines) {
            if (!company.lines[lineId].platforms || company.lines[lineId].platforms.length === 0) {
                emptyLines.push({ corpId: parseInt(corpId), lineId: parseInt(lineId) });
            }
        }
    }
    console.log(`Found ${emptyLines.length} lines with empty platforms in hierarchy.`);

    // 4. Fix corrupted platforms in platforms.json
    console.log('Checking for corrupted platforms in platforms.json...');
    let fixCount = 0;
    const platformIds = Object.keys(platforms);

    for (const pid of platformIds) {
        const platform = platforms[pid];
        const corpId = platform.company;
        const lineId = platform.line;

        const lineEntry = lines[lineId];
        if (!lineEntry) continue;

        // If this line does NOT belong to the platform's company
        if (lineEntry.corp_id !== corpId) {
            const lineName = lineEntry.name;
            const correctLineId = linesByCompanyAndName[corpId] ? linesByCompanyAndName[corpId][lineName] : null;

            if (correctLineId !== null && correctLineId !== undefined) {
                platform.line = correctLineId;
                fixCount++;
            }
        }
    }
    console.log(`Fixed ${fixCount} platform line assignments in platforms.json.`);

    // 5. Rebuild platform arrays in hierarchy
    // We strictly rebuild based on what's in platforms.json to ensure consistency
    console.log('Rebuilding platform arrays in hierarchy...');

    // Clear ALL line platform arrays in hierarchy
    for (const corpId in hierarchy.companies) {
        const company = hierarchy.companies[corpId];
        for (const lineId in company.lines) {
            company.lines[lineId].platforms = [];
        }
    }

    // Fill them back
    for (const pid of platformIds) {
        const platform = platforms[pid];
        const corpId = platform.company;
        const lineId = platform.line;

        if (hierarchy.companies[corpId] && hierarchy.companies[corpId].lines[lineId]) {
            const stationId = platformToStation[pid] || pid.substring(0, 6);
            hierarchy.companies[corpId].lines[lineId].platforms.push({
                station_id: stationId,
                platform_id: pid
            });
        }
    }

    // Remove duplicates and sort (optional but good)
    for (const corpId in hierarchy.companies) {
        const company = hierarchy.companies[corpId];
        for (const lineId in company.lines) {
            const seen = new Set();
            company.lines[lineId].platforms = company.lines[lineId].platforms.filter(p => {
                const key = `${p.station_id}-${p.platform_id}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }
    }

    console.log('Saving updated files...');
    fs.writeFileSync(platformsPath, JSON.stringify(platforms, null, 2));
    fs.writeFileSync(hierarchyPath, JSON.stringify(hierarchy, null, 2));

    console.log('Done!');

    // Summary of lines that were empty and now have platforms
    let restoredCount = 0;
    for (const { corpId, lineId } of emptyLines) {
        const line = hierarchy.companies[corpId]?.lines[lineId];
        if (line && line.platforms && line.platforms.length > 0) {
            restoredCount++;
        }
    }
    console.log(`Successfully restored platforms for ${restoredCount} out of ${emptyLines.length} previously empty lines.`);
}

fixPlatforms();
