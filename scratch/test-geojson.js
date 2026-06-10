const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'apps', 'jprail', 'public', 'data', 'adm2_low.geojson');
if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (data.features && data.features.length > 0) {
        console.log("Feature properties:", data.features[0].properties);
        console.log("Feature ID:", data.features[0].id);
    } else {
        console.log("No features found in geojson");
    }
} else {
    console.log("File not found:", filePath);
}
