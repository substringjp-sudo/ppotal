const fs = require('fs');
const path = require('path');

const RAIL_DIR = path.join(__dirname, '../public/rail');

/**
 * Encodes a coordinates array [lng, lat] into a Google Polyline string.
 * Using 1e5 precision (standard).
 */
function encodePolyline(points, precision = 1e5) {
    let lastLat = 0;
    let lastLng = 0;
    let polyline = "";

    function encodeValue(value) {
        value = Math.round(value * precision);
        value = value << 1;
        if (value < 0) {
            value = ~value;
        }
        let res = "";
        while (value >= 0x20) {
            res += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
            value >>= 5;
        }
        res += String.fromCharCode(value + 63);
        return res;
    }

    for (let i = 0; i < points.length; i++) {
        // [lng, lat]
        const lat = points[i][1];
        const lng = points[i][0];
        polyline += encodeValue(lat - lastLat);
        polyline += encodeValue(lng - lastLng);
        lastLat = lat;
        lastLng = lng;
    }
    return polyline;
}

function processSections() {
    const highFile = path.join(RAIL_DIR, 'sections.json');
    const midFile = path.join(RAIL_DIR, 'sections_mid.json');
    const lowFile = path.join(RAIL_DIR, 'sections_low.json');

    if (!fs.existsSync(highFile)) return;

    console.log('Optimizing Sections...');
    const highData = JSON.parse(fs.readFileSync(highFile, 'utf8'));
    const midData = fs.existsSync(midFile) ? JSON.parse(fs.readFileSync(midFile, 'utf8')) : null;
    const lowData = fs.existsSync(lowFile) ? JSON.parse(fs.readFileSync(lowFile, 'utf8')) : null;

    const sectionsHigh = Array.isArray(highData) ? highData : highData.sections;

    // 1. Create Metadata (only once from high file)
    const meta = {};
    sectionsHigh.forEach(s => {
        meta[s.id] = {
            company_id: s.company_id,
            line_id: s.line_id,
            start: s.start,
            end: s.end,
            length: s.length
        };
    });
    fs.writeFileSync(path.join(RAIL_DIR, 'sections_meta.json'), JSON.stringify(meta));

    // 2. Create Encoded Geometries
    const createGeom = (data, suffix) => {
        if (!data) return;
        const list = Array.isArray(data) ? data : data.sections;
        const geoms = {};
        list.forEach(s => {
            geoms[s.id] = encodePolyline(s.geometry);
        });
        fs.writeFileSync(path.join(RAIL_DIR, `sections_geom_${suffix}.json`), JSON.stringify(geoms));
    };

    createGeom(highData, 'high');
    createGeom(midData, 'mid');
    createGeom(lowData, 'low');
}

function processPlatforms() {
    const file = path.join(RAIL_DIR, 'platforms.json');
    if (!fs.existsSync(file)) return;

    console.log('Optimizing Platforms...');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const meta = {};
    const geoms = {};

    for (const id in data) {
        const p = data[id];
        meta[id] = {
            code: p.code,
            name: p.name,
            isMatched: p.isMatched,
            company: p.company,
            line: p.line,
            lat: p.lat,
            lon: p.lon,
            length: p.length
        };
        // geometries is [ [ [lng, lat], [lng, lat] ] ]
        geoms[id] = p.geometries.map(line => encodePolyline(line));
    }

    fs.writeFileSync(path.join(RAIL_DIR, 'platforms_meta.json'), JSON.stringify(meta));
    fs.writeFileSync(path.join(RAIL_DIR, 'platforms_geom.json'), JSON.stringify(geoms));
}

function processStations() {
    const file = path.join(RAIL_DIR, 'stations.json');
    if (!fs.existsSync(file)) return;

    console.log('Optimizing Stations...');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    // For stations, it's a Record<string, Station>
    // Just keep it as a master list but we can minify key names if we wanted to
    // Let's keep the names clear but smaller
    const master = {};
    for (const id in data) {
        const s = data[id];
        master[id] = {
            id: s.id,
            name: s.name,
            name_en: s.name_en,
            lat: s.lat,
            lon: s.lon,
            prefecture_id: s.prefecture_id,
            city_id: s.city_id,
            platform_ids: s.platform_ids
        };
    }
    fs.writeFileSync(path.join(RAIL_DIR, 'stations_master.json'), JSON.stringify(master));
}

processSections();
processPlatforms();
processStations();

console.log('Optimization complete.');
