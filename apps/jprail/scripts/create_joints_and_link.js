const fs = require('fs');
const path = require('path');

const SECTIONS_PATH = path.join(__dirname, '../public/rail/sections.json');
const GRAPH_PATH = path.join(__dirname, '../public/rail/railroad_graph.json');
const JOINTS_PATH = path.join(__dirname, '../public/rail/joints.json');
const HIERARCHY_PATH = path.join(__dirname, '../public/rail/railroad_hierarchy.json');
const PLATFORMS_PATH = path.join(__dirname, '../public/rail/platforms.json');

// Coordinate precision helper
const coordKey = (pt) => `${Number(pt[0]).toFixed(6)},${Number(pt[1]).toFixed(6)}`;

function main() {
    console.log('Loading data...');
    const sectionsData = JSON.parse(fs.readFileSync(SECTIONS_PATH, 'utf8'));
    let sections = sectionsData.sections;

    // Load Platforms for mid-point detection
    let platformMap;
    try {
        platformMap = JSON.parse(fs.readFileSync(PLATFORMS_PATH, 'utf8'));
    } catch (e) {
        console.warn("Could not load platforms.json. Skipping platform geometry checks.");
        platformMap = {};
    }

    // --- Step 0: Build Platform Point Lookup ---
    console.log('Phase 0: Building Platform Point Map...');
    const pointToStation = new Map(); // "lat,lng" -> StationID
    let platformPointsCount = 0;

    Object.keys(platformMap).forEach(stationId => {
        const station = platformMap[stationId];
        if (station.geometries) {
            station.geometries.forEach(geo => {
                geo.forEach(pt => {
                    const key = coordKey(pt);
                    pointToStation.set(key, stationId);
                    platformPointsCount++;
                });
            });
        }
    });
    console.log(`Mapped ${platformPointsCount} platform points to stations.`);


    // --- Step 1: Identify Joints and Update Sections ---
    console.log('Phase 1: Analyzing Sections for Connections...');

    const jointMap = new Map(); // Key: "lat,lng", Value: JointID
    const joints = [];
    const jointToLines = new Map(); // JointID -> Set<LineID>
    const lineToJoints = new Map(); // LineID -> Set<JointID>
    let jointCounter = 0;

    const getOrCreateJoint = (coords) => {
        const key = coordKey(coords);
        if (pointToStation.has(key)) {
            return { type: 'station', id: pointToStation.get(key) };
        }
        if (jointMap.has(key)) {
            return { type: 'joint', id: jointMap.get(key) };
        }
        const jointId = `J_${++jointCounter}`;
        jointMap.set(key, jointId);
        joints.push({ id: jointId, coordinates: coords });
        return { type: 'joint', id: jointId };
    };

    let updatedCount = 0;
    let midPlatformConnections = 0;

    sections.forEach(section => {
        let changed = false;
        const lineId = section.line_id;

        const processEndpoint = (currentVal, coords) => {
            if (currentVal && !String(currentVal).startsWith('J_')) {
                return currentVal;
            }
            const result = getOrCreateJoint(coords);
            if (result.type === 'station') {
                if (String(currentVal).startsWith('J_')) midPlatformConnections++;
                return result.id;
            } else {
                // It's a joint
                const jId = result.id;

                // Track line associations
                if (!jointToLines.has(jId)) jointToLines.set(jId, new Set());
                jointToLines.get(jId).add(lineId);

                if (!lineToJoints.has(lineId)) lineToJoints.set(lineId, new Set());
                lineToJoints.get(lineId).add(jId);

                return jId;
            }
        };

        const newStart = processEndpoint(section.start, section.geometry[0]);
        if (newStart !== section.start) {
            section.start = newStart;
            changed = true;
        }

        const newEnd = processEndpoint(section.end, section.geometry[section.geometry.length - 1]);
        if (newEnd !== section.end) {
            section.end = newEnd;
            changed = true;
        }

        if (changed) updatedCount++;
    });

    // Add line_ids to joints objects
    joints.forEach(j => {
        const lines = jointToLines.get(j.id);
        j.line_ids = lines ? Array.from(lines) : [];
    });

    console.log(`Created ${joints.length} unique joints.`);
    console.log(`Updated ${updatedCount} sections.`);
    console.log(`Identified ${midPlatformConnections} connections to mid-platform points (replacing Joints).`);

    fs.writeFileSync(JOINTS_PATH, JSON.stringify({ joints: joints }, null, 2));
    console.log(`Saved joints to ${JOINTS_PATH}`);

    // Filter out internal platform sections
    sections = sections.filter(s => s.start !== s.end);

    fs.writeFileSync(SECTIONS_PATH, JSON.stringify({ sections: sections }, null, 2));
    console.log(`Updated sections saved to ${SECTIONS_PATH}`);


    // --- Step 2: Build Enhanced Railroad Graph ---
    console.log('Phase 2: Building Station-to-Station Connectivity Graph...');

    const adj = new Map();
    const addEdge = (from, to, sectionId) => {
        if (!adj.has(from)) adj.set(from, []);
        adj.get(from).push({ target: to, sectionId });
        if (!adj.has(to)) adj.set(to, []);
        adj.get(to).push({ target: from, sectionId });
    };

    sections.forEach(s => {
        if (s.start && s.end) {
            addEdge(s.start, s.end, s.id);
        }
    });

    const isStation = (id) => !String(id).startsWith('J_');

    const newGraph = {};
    const allNodes = new Set();
    sections.forEach(s => {
        if (s.start) allNodes.add(s.start);
        if (s.end) allNodes.add(s.end);
    });
    const allStations = [...allNodes].filter(id => isStation(id));

    console.log(`Finding paths for ${allStations.length} stations...`);

    allStations.forEach(startStationId => {
        const queue = [{ curr: startStationId, sections: [] }];
        const visitedInThisSearch = new Set([startStationId]);
        const foundConnections = new Map();

        let head = 0;
        while (head < queue.length) {
            const { curr, sections } = queue[head++];
            if (sections.length > 50) continue;

            const neighbors = adj.get(curr) || [];
            for (const edge of neighbors) {
                const target = edge.target;
                const secId = edge.sectionId;
                if (sections.length > 0 && sections[sections.length - 1] === secId) continue;

                if (isStation(target)) {
                    if (!foundConnections.has(target)) {
                        foundConnections.set(target, [...sections, secId]);
                    }
                } else {
                    if (!visitedInThisSearch.has(target)) {
                        visitedInThisSearch.add(target);
                        queue.push({ curr: target, sections: [...sections, secId] });
                    }
                }
            }
        }

        if (foundConnections.size > 0) {
            newGraph[startStationId] = {};
            for (const [targetId, secIds] of foundConnections) {
                newGraph[startStationId][targetId] = secIds;
            }
        }
    });

    fs.writeFileSync(GRAPH_PATH, JSON.stringify(newGraph, null, 2));
    console.log(`Saved new graph to ${GRAPH_PATH}`);


    // --- Step 3: Update Hierarchy (Refactor Sections to IDs and add Joints) ---
    console.log('Phase 3: Refactoring Railroad Hierarchy...');
    let hierarchy;
    try {
        hierarchy = JSON.parse(fs.readFileSync(HIERARCHY_PATH, 'utf8'));
    } catch (e) {
        console.error("Failed to load hierarchy:", e);
        return;
    }

    const processHierarchy = (obj) => {
        if (Array.isArray(obj)) {
            obj.forEach(item => processHierarchy(item));
        } else if (obj && typeof obj === 'object') {
            // Check if this object represents a line
            // Line objects in our hierarchy have an 'id' which is the line_id
            if (obj.id !== undefined && obj.sections !== undefined) {
                const lineId = obj.id;

                // 1. Refactor sections to IDs if needed (should already be done, but defensive)
                if (Array.isArray(obj.sections) && obj.sections.length > 0 && typeof obj.sections[0] === 'object') {
                    obj.sections = obj.sections.map(s => s.id);
                }

                // 2. Add joints
                const jointsForLine = lineToJoints.get(lineId);
                obj.joints = jointsForLine ? Array.from(jointsForLine).sort() : [];
            }

            for (const key in obj) {
                if (key !== 'sections' && key !== 'joints') { // Avoid re-processing
                    processHierarchy(obj[key]);
                }
            }
        }
    };

    if (hierarchy.companies) {
        processHierarchy(hierarchy.companies);
    }

    fs.writeFileSync(HIERARCHY_PATH, JSON.stringify(hierarchy, null, 2));
    console.log(`Updated hierarchy saved to ${HIERARCHY_PATH}`);
    console.log('Done.');
}

main();
