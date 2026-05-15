const fs = require('fs');
const path = require('path');

const platformsPath = path.join(__dirname, '../public/rail/platforms_meta.json');
const namesPath = path.join(__dirname, 'names.json');
const outputPath = path.join(__dirname, 'platforms_meta_final.json');

function main() {
    console.log('Loading data...');
    const platformsData = JSON.parse(fs.readFileSync(platformsPath, 'utf8'));
    const namesData = JSON.parse(fs.readFileSync(namesPath, 'utf8'));

    console.log(`Loaded ${Object.keys(platformsData).length} platforms and ${namesData.length} translations from names.json.`);

    // Create a map for quick lookup
    const nameMap = new Map();
    namesData.forEach(item => {
        if (item.id && item.name_kr) {
            nameMap.set(item.id, item.name_kr);
        }
    });

    let updatedCount = 0;
    Object.keys(platformsData).forEach(key => {
        const platform = platformsData[key];
        if (nameMap.has(platform.code)) {
            platform.name_kr = nameMap.get(platform.code);
            updatedCount++;
        }
    });

    console.log(`Updated ${updatedCount} platforms with new translations.`);

    console.log('Writing updated platforms data...');
    fs.writeFileSync(outputPath, JSON.stringify(platformsData, null, 2));

    console.log(`Success! Updated file saved to: scripts/platforms_meta_final.json`);
}

main();
