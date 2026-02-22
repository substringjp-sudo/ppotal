const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const RAIL_DIR = path.join(PUBLIC_DIR, 'rail');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');

/**
 * Simplifies a GeoJSON file using mapshaper.
 * Mapshaper preserves topology between features in a FeatureCollection.
 */
function simplifyGeoJSON(inputPath, outputPath, percentage) {
    console.log(`Simplifying ${inputPath} to ${outputPath} (${percentage})...`);
    try {
        // -simplify dp (Douglas-Peucker) or vis (Visvalingam)
        // dp is usually better for preserving general shape.
        // keep-shapes prevents features from disappearing.
        execSync(`npx mapshaper "${inputPath}" -simplify dp ${percentage} keep-shapes -o "${outputPath}" force`);
    } catch (err) {
        console.error(`Error simplifying ${inputPath}:`, err.message);
    }
}

/**
 * Simplifies Railroad Sections.
 * Since it's a custom JSON, we convert to GeoJSON, simplify, then convert back.
 */
function simplifyRailroads() {
    const sectionsPath = path.join(RAIL_DIR, 'sections.json');
    const sectionsData = JSON.parse(fs.readFileSync(sectionsPath, 'utf-8'));

    // Convert to GeoJSON
    const features = sectionsData.sections.map(s => ({
        type: 'Feature',
        properties: { id: s.id, line_id: s.line_id, company_id: s.company_id, start: s.start, end: s.end, length: s.length },
        geometry: {
            type: 'LineString',
            coordinates: s.geometry // [lon, lat]
        }
    }));

    const geojson = { type: 'FeatureCollection', features };
    const tempGeoJSON = path.join(RAIL_DIR, 'temp_sections.geojson');
    fs.writeFileSync(tempGeoJSON, JSON.stringify(geojson));

    const levels = [
        { name: 'low', percent: '1%' },   // z5-8
        { name: 'mid', percent: '10%' }   // z9-13
    ];

    levels.forEach(level => {
        const tempOut = path.join(RAIL_DIR, `temp_sections_${level.name}.geojson`);
        simplifyGeoJSON(tempGeoJSON, tempOut, level.percent);

        // Convert back to custom JSON
        const simplifiedGeoJSON = JSON.parse(fs.readFileSync(tempOut, 'utf-8'));
        const simplifiedSections = {
            sections: simplifiedGeoJSON.features.map(f => ({
                id: f.properties.id,
                company_id: f.properties.company_id,
                line_id: f.properties.line_id,
                geometry: f.geometry.coordinates,
                start: f.properties.start,
                end: f.properties.end,
                length: f.properties.length
            }))
        };

        fs.writeFileSync(path.join(RAIL_DIR, `sections_${level.name}.json`), JSON.stringify(simplifiedSections));
        fs.unlinkSync(tempOut);
    });

    fs.unlinkSync(tempGeoJSON);
}

function simplifyBoundaries() {
    const targets = [
        { file: 'geoBoundaries-JPN-ADM1_simplified.geojson', name: 'adm1' },
        { file: 'geoBoundaries-JPN-ADM2_simplified.geojson', name: 'adm2' }
    ];

    targets.forEach(t => {
        const input = path.join(DATA_DIR, t.file);
        // Low
        simplifyGeoJSON(input, path.join(DATA_DIR, `${t.name}_low.geojson`), '5%');
        // Mid
        simplifyGeoJSON(input, path.join(DATA_DIR, `${t.name}_mid.geojson`), '25%');
    });
}

console.log('Starting LOD data generation...');
simplifyRailroads();
simplifyBoundaries();
console.log('LOD data generation complete.');
