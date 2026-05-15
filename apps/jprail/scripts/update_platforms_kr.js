const fs = require('fs');
const path = require('path');

const stationsPath = path.join(__dirname, '../public/rail/stations_master_updated.json');
const platformsPath = path.join(__dirname, '../public/rail/platforms_meta.json');
const outputPlatformsPath = path.join(__dirname, 'platforms_meta_updated.json');
const untranslatedPath = path.join(__dirname, 'untranslated_platforms.json');

function main() {
    console.log('Loading stations data...');
    const stationsData = JSON.parse(fs.readFileSync(stationsPath, 'utf8'));

    // Build name -> name_kr map
    const nameToKr = {};
    for (const id in stationsData) {
        const station = stationsData[id];
        if (station.name && station.name_kr) {
            // If we encounter the same name with different Korean translations, we might log it,
            // but usually they should be consistent.
            if (nameToKr[station.name] && nameToKr[station.name] !== station.name_kr) {
                // console.log(`Warning: Multiple translations for ${station.name}: ${nameToKr[station.name]}, ${station.name_kr}`);
            }
            nameToKr[station.name] = station.name_kr;
        }
    }

    console.log(`Mapped ${Object.keys(nameToKr).length} station names.`);

    console.log('Loading platforms data...');
    const platformsData = JSON.parse(fs.readFileSync(platformsPath, 'utf8'));

    const untranslated = [];
    let translatedCount = 0;
    let totalPlatforms = 0;

    for (const code in platformsData) {
        totalPlatforms++;
        const platform = platformsData[code];
        const jpName = platform.name;

        if (nameToKr[jpName]) {
            platform.name_kr = nameToKr[jpName];
            translatedCount++;
        } else {
            untranslated.push({
                code: platform.code,
                name: platform.name,
                company: platform.company,
                line: platform.line
            });
        }
    }

    console.log(`Finished processing. ${translatedCount}/${totalPlatforms} platforms translated.`);
    console.log(`${untranslated.length} platforms could not be translated.`);

    console.log('Writing updated platforms data...');
    fs.writeFileSync(outputPlatformsPath, JSON.stringify(platformsData, null, 2));

    console.log('Writing untranslated platforms list...');
    fs.writeFileSync(untranslatedPath, JSON.stringify(untranslated, null, 2));

    console.log('Done.');
}

main();
