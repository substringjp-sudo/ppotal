const fs = require('fs');
const path = require('path');

const SECTIONS_PATH = path.join(__dirname, '../public/rail/sections.json');

function refineSections() {
    console.log('Loading sections.json...');
    const data = JSON.parse(fs.readFileSync(SECTIONS_PATH, 'utf8'));

    console.log(`Original sections count: ${data.sections.length}`);

    const refinedSections = data.sections
        .filter(s => {
            // Remove entries where start and end stations are the same
            return s.start_station !== s.end_station;
        })
        .map(s => {
            // Transform properties
            const refined = {
                id: s.id,
                company_id: s.company_id,
                line_id: s.line_id,
                geometry: s.geometry,
                start: s.start_station,
                end: s.end_station,
                length: Math.floor(s.length * 1000) // Convert KM to integer Meters
            };
            return refined;
        });

    console.log(`Refined sections count: ${refinedSections.length}`);
    console.log(`Removed ${data.sections.length - refinedSections.length} platform-internal sections.`);

    const output = {
        sections: refinedSections
    };

    console.log('Saving refined sections.json...');
    fs.writeFileSync(SECTIONS_PATH, JSON.stringify(output, null, 2));
    console.log('Done.');
}

refineSections();
