const fs = require('fs');
const path = require('path');

const SECTIONS_PATH = 'h:/jprail/public/rail/sections.json';
const HIERARCHY_PATH = 'h:/jprail/public/rail/railroad_hierarchy.json';

async function syncSectionsToHierarchy() {
    console.log('Loading sections.json...');
    const sectionsData = JSON.parse(fs.readFileSync(SECTIONS_PATH, 'utf8'));

    // 1. Group section IDs by line_id
    console.log('Grouping sections by line_id...');
    const lineToSections = new Map();

    sectionsData.sections.forEach(section => {
        if (!lineToSections.has(section.line_id)) {
            lineToSections.set(section.line_id, []);
        }
        lineToSections.get(section.line_id).push(section.id);
    });

    console.log('Loading railroad_hierarchy.json...');
    const hierarchy = JSON.parse(fs.readFileSync(HIERARCHY_PATH, 'utf8'));

    // 2. Update hierarchy
    console.log('Updating hierarchy sections...');
    let updatedCount = 0;

    for (const companyId in hierarchy.companies) {
        const company = hierarchy.companies[companyId];
        for (const lineId in company.lines) {
            const line = company.lines[lineId];
            const newSections = lineToSections.get(Number(lineId)) || [];

            // 정렬해서 넣는 것이 추후 비교나 관리에 용이합니다.
            newSections.sort((a, b) => a - b);

            line.sections = newSections;
            updatedCount++;
        }
    }

    // 3. Save updated hierarchy
    console.log(`Writing changes to railroad_hierarchy.json (Updated ${updatedCount} lines)...`);
    fs.writeFileSync(HIERARCHY_PATH, JSON.stringify(hierarchy, null, 2), 'utf8');

    console.log('Sync complete!');
}

syncSectionsToHierarchy().catch(err => {
    console.error('Error during sync:', err);
    process.exit(1);
});
