const fs = require('fs');
const path = require('path');

// Spatial Engine logic based on coordinates
const isPointInBounds = (lng, lat, bbox) => {
    if (!bbox) return false;
    return lng >= bbox[0][0] && lng <= bbox[1][0] && lat >= bbox[0][1] && lat <= bbox[1][1];
};

const isPointInPolygon = (lng, lat, polygon) => {
    let inside = false;
    for (const ring of polygon) {
        if (!ring || ring.length < 3) continue;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][0], yi = ring[i][1];
            const xj = ring[j][0], yj = ring[j][1];
            const intersect = ((yi > lat) !== (yj > lat)) &&
                (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
    }
    return inside;
};

const isPointInMultiPolygon = (lng, lat, multiPolygon) => {
    return multiPolygon.some(polygon => isPointInPolygon(lng, lat, polygon));
};

const checkPointInGeometry = (lng, lat, geometry) => {
    if (!geometry) return false;
    const type = geometry.type;
    const coords = geometry.coordinates;
    if (type === 'Polygon') return isPointInPolygon(lng, lat, coords);
    if (type === 'MultiPolygon') return isPointInMultiPolygon(lng, lat, coords);
    return false;
};

async function resolveAirports() {
    const projectRoot = process.cwd();
    const airportsPath = path.join(projectRoot, 'packages/shared/src/lib/airports.ts');
    const dataDir = path.join(projectRoot, 'apps/web/public/data/region');
    
    console.log('--- 1. Loading Registry and Geometries ---');
    const tree = JSON.parse(fs.readFileSync(path.join(dataDir, 'tree.json'), 'utf8'));
    const countryBounds = JSON.parse(fs.readFileSync(path.join(dataDir, 'geoms/country_bounds.json'), 'utf8'));
    
    // Create lookup maps for names
    const regionNames = new Map();
    tree.forEach(country => {
        regionNames.set(country.id, { name: country.name, type: 'country' });
        (country.prefectures || []).forEach(pref => {
            regionNames.set(pref.id, { name: pref.name, type: 'prefecture' });
            (pref.cities || []).forEach(city => {
                regionNames.set(city.id, { name: city.name, type: 'city' });
            });
        });
    });

    const airportsContent = fs.readFileSync(airportsPath, 'utf8');
    
    // Extract AIRPORTS array entries
    const airportRegex = /\{\s*code:\s*'([^']*)'[^}]*lat:\s*([0-9.-]*),\s*lng:\s*([0-9.-]*)[^}]*\}/g;
    let match;
    const rawAirports = [];
    while ((match = airportRegex.exec(airportsContent)) !== null) {
        rawAirports.push({
            code: match[1],
            lat: parseFloat(match[2]),
            lng: parseFloat(match[3]),
            fullMatch: match[0]
        });
    }

    console.log(`Found ${rawAirports.length} airports in source.`);

    const resolvedAirports = [];
    const countryTopoDir = path.join(dataDir, 'geoms/country_topo');

    for (const airport of rawAirports) {
        console.log(`Resolving ${airport.code}...`);
        const { lat, lng } = airport;
        let result = { countryId: null, prefectureId: null, cityId: null };

        // Find candidate countries
        const candidateCountryIds = Object.entries(countryBounds)
            .filter(([_, bbox]) => isPointInBounds(lng, lat, bbox))
            .map(([id]) => id);

        for (const cid of candidateCountryIds) {
            const topoPath = path.join(countryTopoDir, `${parseInt(cid)}.json`);
            if (!fs.existsSync(topoPath)) continue;

            const topo = JSON.parse(fs.readFileSync(topoPath, 'utf8'));
            const features = topo.features || [];

            // Check if inside any city in this country
            const matchedCity = features.find(f => checkPointInGeometry(lng, lat, f.geometry));
            if (matchedCity) {
                const props = matchedCity.properties;
                result = {
                    countryId: props.countryId ? props.countryId.toString().padStart(3, '0') : cid.padStart(3, '0'),
                    prefectureId: props.prefectureId ? props.prefectureId.toString() : null,
                    cityId: props.id ? props.id.toString() : null
                };
                
                // Fallback for prefecture if not in props
                if (!result.prefectureId && result.cityId && tree) {
                   for (const country of tree) {
                       if (country.id === result.countryId) {
                           for (const pref of (country.prefectures || [])) {
                               if ((pref.cities || []).some(c => c.id === result.cityId)) {
                                   result.prefectureId = pref.id;
                                   break;
                               }
                           }
                           break;
                       }
                   }
                }
                break;
            } else {
                result.countryId = cid.padStart(3, '0');
            }
        }

        resolvedAirports.push({ ...airport, ...result });
    }

    // --- 3. Update the source file ---
    let newContent = airportsContent;
    
    // Update individual airport entries
    // For this rewrite, we will maintain the existing formatting as much as possible but update regionIds
    const updatedEntries = resolvedAirports.map(ra => {
        const entryRegex = new RegExp(`\\{\\s*code:\\s*'${ra.code}'[\\s\\S]*?\\}`);
        const existingMatch = airportsContent.match(entryRegex);
        if (!existingMatch) return null;
        
        const content = existingMatch[0];
        
        // Extract basic fields
        const nameKo = content.match(/nameKo:\s*'([^']*)'/)?.[1] || '';
        const nameEn = content.match(/nameEn:\s*'([^']*)'/)?.[1] || '';
        const timezone = content.match(/timezone:\s*([0-9.-]*)/)?.[1] || '0';

        // Prepare RegionIds with names
        const ids = {};
        if (ra.countryId) {
            ids.countryId = ra.countryId;
            ids.countryName = regionNames.get(ra.countryId)?.name;
        }
        if (ra.prefectureId) {
            ids.prefectureId = ra.prefectureId;
            ids.prefectureName = regionNames.get(ra.prefectureId)?.name;
        }
        if (ra.cityId) {
            ids.cityId = ra.cityId;
            ids.cityName = regionNames.get(ra.cityId)?.name;
        }

        // Handle case where we have old hardcoded names or want to prioritize tree names
        // But for Global ones, if tree doesn't have it, we should fallback to existing?
        // Actually tree should have country names.

        const regionIdsParts = [];
        if (ids.countryId) regionIdsParts.push(`countryId: '${ids.countryId}'`);
        if (ids.countryName) regionIdsParts.push(`countryName: '${ids.countryName}'`);
        if (ids.prefectureId) regionIdsParts.push(`prefectureId: '${ids.prefectureId}'`);
        if (ids.prefectureName) regionIdsParts.push(`prefectureName: '${ids.prefectureName}'`);
        if (ids.cityId) regionIdsParts.push(`cityId: '${ids.cityId}'`);
        if (ids.cityName) regionIdsParts.push(`cityName: '${ids.cityName}'`);

        const regionIdsStr = `regionIds: { ${regionIdsParts.join(', ')} }`;

        return `    { code: '${ra.code}', nameKo: '${nameKo}', nameEn: '${nameEn}', lat: ${ra.lat}, lng: ${ra.lng}, timezone: ${timezone}, ${regionIdsStr} }`;
    });

    const arrayRegex = /export const AIRPORTS: Airport\[\] = \[([\s\S]*?)\];/;
    const arrayMatch = airportsContent.match(arrayRegex);
    if (arrayMatch) {
         newContent = airportsContent.replace(arrayRegex, `export const AIRPORTS: Airport[] = [\n${updatedEntries.join(',\n')}\n];`);
    }

    fs.writeFileSync(airportsPath, newContent);
    console.log('Successfully updated airports.ts with resolved region IDs and names!');
}

resolveAirports().catch(console.error);
