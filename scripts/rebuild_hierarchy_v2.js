const fs = require('fs');
const path = require('path');

const SECTIONS_PATH = path.join(__dirname, '../public/rail/sections.json');
const STATIONS_PATH = path.join(__dirname, '../public/rail/stations.json');
const PLATFORMS_PATH = path.join(__dirname, '../public/rail/platforms.json');
const HIERARCHY_PATH = path.join(__dirname, '../public/rail/railroad_hierarchy.json');

function main() {
    console.log('Loading data...');
    const stations = JSON.parse(fs.readFileSync(STATIONS_PATH, 'utf8'));
    const platforms = JSON.parse(fs.readFileSync(PLATFORMS_PATH, 'utf8'));
    const sectionsData = JSON.parse(fs.readFileSync(SECTIONS_PATH, 'utf8'));
    const sections = sectionsData.sections;

    const companies = {};

    console.log('Building hierarchy...');

    // Process sections to get line-to-sections and line-to-joints mapping
    const lineToSections = {};
    const lineToJoints = {};
    const lineToCompany = {};

    sections.forEach(s => {
        if (!lineToSections[s.line_id]) lineToSections[s.line_id] = new Set();
        lineToSections[s.line_id].add(s.id);

        if (!lineToJoints[s.line_id]) lineToJoints[s.line_id] = new Set();
        if (s.start && s.start.startsWith('J_')) lineToJoints[s.line_id].add(s.start);
        if (s.end && s.end.startsWith('J_')) lineToJoints[s.line_id].add(s.end);

        lineToCompany[s.line_id] = s.company_id;
    });

    // Group platforms by company and line
    Object.keys(platforms).forEach(pid => {
        const p = platforms[pid];
        const cid = p.company;
        const lid = p.line;

        if (!companies[cid]) {
            companies[cid] = {
                id: cid,
                lines: {}
            };
        }

        if (!companies[cid].lines[lid]) {
            companies[cid].lines[lid] = {
                id: lid,
                corp_id: cid,
                platforms: [],
                sections: Array.from(lineToSections[lid] || []),
                joints: Array.from(lineToJoints[lid] || [])
            };
        }

        // Find station for this platform
        const stationId = Object.keys(stations).find(sid => (stations[sid].platform_ids || []).includes(pid));
        if (stationId) {
            companies[cid].lines[lid].platforms.push({
                station_id: stationId,
                platform_id: pid
            });
        }
    });

    // Sort sections and joints for consistency
    Object.keys(companies).forEach(cid => {
        Object.keys(companies[cid].lines).forEach(lid => {
            companies[cid].lines[lid].sections.sort((a, b) => a - b);
            companies[cid].lines[lid].joints.sort();
        });
    });

    fs.writeFileSync(HIERARCHY_PATH, JSON.stringify({ companies }, null, 2));
    console.log(`Saved new hierarchy to ${HIERARCHY_PATH}`);
}

main();
