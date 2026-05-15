"use strict";
const lat = 34.8869;
const lng = 128.6239;
const fs = require('fs');
const path = require('path');
// Mock data loading for testing
const loadFile = (relPath) => {
    const fullPath = path.resolve(__dirname, '../../../', relPath);
    if (!fs.existsSync(fullPath)) {
        console.log(`File not found: ${relPath}`);
        return null;
    }
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
};
// Simplified geo-utils
const isPointInPolygon = (point, polygon) => {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
};
const isPointInMultiPolygon = (point, multiPolygon) => {
    return multiPolygon.some(polygon => isPointInPolygon(point, polygon[0]));
};
const checkPointInGeometry = (point, geometry) => {
    if (geometry.type === 'Polygon')
        return isPointInPolygon(point, geometry.coordinates[0]);
    if (geometry.type === 'MultiPolygon')
        return isPointInMultiPolygon(point, geometry.coordinates);
    return false;
};
// Load Korea Topo
const koreaTopo = loadFile('data/region/geoms/country_topo/93.json');
const topojson = require('topojson-client');
const features = topojson.feature(koreaTopo, koreaTopo.objects.regions).features;
console.log(`Checking ${lat}, ${lng} in ${features.length} features of Korea...`);
const point = [lng, lat];
const match = features.find(f => checkPointInGeometry(point, f.geometry));
if (match) {
    console.log('MATCH FOUND!');
    console.log('ID:', match.properties.id);
    console.log('Name:', match.properties.name);
    console.log('Type:', match.properties.type);
}
else {
    console.log('NO MATCH FOUND in Korea topo.');
}
