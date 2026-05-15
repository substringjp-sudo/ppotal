const fs = require('fs');
const path = require('path');

const SECTIONS_PATH = path.join(__dirname, '../public/rail/sections.json');
const GRAPH_PATH = path.join(__dirname, '../public/rail/railroad_graph.json');
const HIERARCHY_PATH = path.join(__dirname, '../public/rail/railroad_hierarchy.json');

// Coordinate precision helper
const coordKey = (pt) => `${pt[0].toFixed(6)},${pt[1].toFixed(6)}`;

function generateId() {
    return Math.floor(Math.random() * 90000000) + 10000000;
}

function main() {
    console.log('Loading data...');
    let sectionsData = JSON.parse(fs.readFileSync(SECTIONS_PATH, 'utf8'));
    let graphData = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
    let hierarchyData = JSON.parse(fs.readFileSync(HIERARCHY_PATH, 'utf8'));

    const allSections = sectionsData.sections;
    console.log(`Original sections count: ${allSections.length}`);

    // Group sections by "CompanyID-LineID" because we only merge within the same line.
    const sectionsByLine = new Map();
    allSections.forEach(s => {
        const key = `${s.company_id}-${s.line_id}`;
        if (!sectionsByLine.has(key)) sectionsByLine.set(key, []);
        sectionsByLine.get(key).push(s);
    });

    const finalSections = [];
    const sectionUsage = new Map(); // sectionId -> count
    allSections.forEach(s => sectionUsage.set(s.id, 0));

    let processedLines = 0;
    let pathsFoundTotal = 0;

    // Process each line group
    for (const [key, groupSections] of sectionsByLine) {
        processedLines++;

        // 1. Build Adjacency Graph for this line
        // Nodes: Coordinate String
        // Edges: { section, isStart } (if isStart=true, section.start is at node, implies we can enter section and go to end)
        const adj = new Map();

        const addEdge = (coord, section, isStart) => {
            if (!adj.has(coord)) adj.set(coord, []);
            adj.get(coord).push({ section, isStart });
        };

        groupSections.forEach(s => {
            const startKey = coordKey(s.geometry[0]);
            const endKey = coordKey(s.geometry[s.geometry.length - 1]);
            addEdge(startKey, s, true);
            addEdge(endKey, s, false);
        });

        // 2. Identify "Sources" (Start Node candidates)
        // We start traversals from any section endpoint that corresponds to a Station.
        const sources = [];
        groupSections.forEach(s => {
            if (s.start_station) {
                sources.push({
                    section: s,
                    isStartNode: true, // Start walking from StartNode (geometry[0])
                    stationId: s.start_station
                });
            }
            if (s.end_station) {
                sources.push({
                    section: s,
                    isStartNode: false, // Start walking from EndNode (geometry[last])
                    stationId: s.end_station
                });
            }
        });

        // 3. DFS Traversal to find paths to other stations
        const mergedPaths = []; // { pathInfo: [], startId, endId }

        const findPaths = (startNode, currentPath, visitedIds, startStationId) => {
            // Safety break for too long paths (unlikely but safe)
            if (currentPath.length > 500) return;

            const currentNode = currentPath[currentPath.length - 1].endCoord;
            const edges = adj.get(currentNode) || [];

            for (const edge of edges) {
                // Determine direction based on entry point
                // if edge.isStart, section starts at currentNode. We traverse Forward.
                // if !edge.isStart, section ends at currentNode. We traverse Backward.

                // Avoid using section already in THIS path
                if (visitedIds.has(edge.section.id)) continue;

                const nextNode = edge.isStart ?
                    coordKey(edge.section.geometry[edge.section.geometry.length - 1]) :
                    coordKey(edge.section.geometry[0]);

                const potentialEndStation = edge.isStart ? edge.section.end_station : edge.section.start_station;

                const step = {
                    section: edge.section,
                    reverse: !edge.isStart,
                    endCoord: nextNode
                };

                // Found a station?
                if (potentialEndStation) {
                    // Path completed.
                    const finalPath = [...currentPath, step];
                    mergedPaths.push({
                        pathInfo: finalPath,
                        startStationId: startStationId,
                        endStationId: potentialEndStation
                    });
                    // Do not continue past a station (station-to-station segment)
                } else {
                    // Continue
                    const newVisited = new Set(visitedIds);
                    newVisited.add(edge.section.id);
                    findPaths(startNode, [...currentPath, step], newVisited, startStationId);
                }
            }
        };

        // Execute searches
        // To avoid duplicate work, we track which (SourceStation -> InitialSection) pairs we've processed?
        // Actually, sources list is unique per section end.

        sources.forEach(src => {
            const startCoord = src.isStartNode ?
                coordKey(src.section.geometry[0]) :
                coordKey(src.section.geometry[src.section.geometry.length - 1]);

            const nextCoord = src.isStartNode ?
                coordKey(src.section.geometry[src.section.geometry.length - 1]) :
                coordKey(src.section.geometry[0]);

            const immediateEndStation = src.isStartNode ? src.section.end_station : src.section.start_station;

            const firstStep = {
                section: src.section,
                reverse: !src.isStartNode, // if isStartNode=true, we walk Fwd. reverse=false.
                endCoord: nextCoord
            };

            if (immediateEndStation) {
                // Immediate connection
                mergedPaths.push({
                    pathInfo: [firstStep],
                    startStationId: src.stationId,
                    endStationId: immediateEndStation
                });
            } else {
                const visited = new Set();
                visited.add(src.section.id);
                findPaths(startCoord, [firstStep], visited, src.stationId);
            }
        });

        // 4. Create Final Sections from Paths
        // Dedup: A->B might be found multiple times if multiple sources point to it?
        // Actually, we iterate sources. 
        // A single source (Station A, Section S1) will find all paths starting with S1.
        // It won't duplicate unless there are multiple ways to reach B from S1 (Branching then rejoining).
        // If they split and rejoin, they are distinct physical paths?
        // Yes, likely passing loops. We Keep BOTH.

        // We should deduplicate EXACT path signatures (sequence of section IDs).
        const pathSignatures = new Set();

        mergedPaths.forEach(mp => {
            const sig = mp.pathInfo.map(s => s.section.id).join(',');
            if (pathSignatures.has(sig)) return;
            pathSignatures.add(sig);

            // Construct Geometry
            const newGeo = [];
            let totalLen = 0;
            mp.pathInfo.forEach((step, idx) => {
                let g = step.section.geometry;
                if (step.reverse) g = [...g].reverse();

                if (idx > 0) newGeo.push(...g.slice(1));
                else newGeo.push(...g);

                totalLen += step.section.length || 0;

                // Mark usage
                sectionUsage.set(step.section.id, sectionUsage.get(step.section.id) + 1);
            });

            finalSections.push({
                id: generateId(),
                company_id: mp.pathInfo[0].section.company_id,
                line_id: mp.pathInfo[0].section.line_id,
                geometry: newGeo,
                start_station: mp.startStationId,
                end_station: mp.endStationId,
                length: totalLen
            });
            pathsFoundTotal++;
        });

        // 5. Recover Unused Sections (Orphans/Dead ends)
        // If a section was never used in a station-to-station path, keep it.
        // Or if it was part of a "Spur" from a station that didn't reach another station?
        // Our current logic only saves "Complete" paths.
        // What about A->B->Null?
        // We ignored it.
        // We should try to save "Spurs" connected to at least one station.

        // Let's do a second pass for spurs?
        // Or just keep all unused sections as they were?
        // If we keep unused sections, they might be "Middle" pieces that were skipped by algorithm?
        // No, if they were reachable, they would be traversed.
        // If they were not reachable from a station, they are truly isolated (or null-null cycles).
        // If they were reachable but didn't hit a destination, they are spurs.

        // Let's simple-keep unused sections for data integrity.
        groupSections.forEach(s => {
            if (sectionUsage.get(s.id) === 0) {
                // Check if we can merge it locally? 
                // Using the old logic "Merge pairs"?
                // Maybe too complex for now. Just keep them.
                finalSections.push(s);
            }
        });
    }

    console.log(`Path finding complete. Total paths/sections generated: ${pathsFoundTotal}`);
    console.log(`Total sections after processing: ${finalSections.length}`);

    // Update Graph based on Final Sections
    const newGraphData = {};
    const newIds = new Set(finalSections.map(s => s.id));

    finalSections.forEach(s => {
        if (s.start_station && s.end_station) {
            // Forward
            if (!newGraphData[s.start_station]) newGraphData[s.start_station] = {};
            if (!newGraphData[s.start_station][s.end_station]) newGraphData[s.start_station][s.end_station] = [];
            newGraphData[s.start_station][s.end_station].push(s.id);

            // Backward (Graph is usually undirected in terms of adjacency, or bidirectional)
            // Sections have direction, but graph indicates connection "Between A and B".
            if (!newGraphData[s.end_station]) newGraphData[s.end_station] = {};
            if (!newGraphData[s.end_station][s.start_station]) newGraphData[s.end_station][s.start_station] = [];
            newGraphData[s.end_station][s.start_station].push(s.id);
        }
    });

    // Update Hierarchy
    // Only keep sections that exist in finalSections
    const newHierarchy = JSON.parse(JSON.stringify(hierarchyData));

    // Clear old
    for (const cId in newHierarchy.companies) {
        for (const lId in newHierarchy.companies[cId].lines) {
            newHierarchy.companies[cId].lines[lId].sections = [];
        }
    }

    // Populate
    finalSections.forEach(s => {
        const cId = s.company_id;
        const lId = s.line_id;
        if (newHierarchy.companies[cId] && newHierarchy.companies[cId].lines[lId]) {
            newHierarchy.companies[cId].lines[lId].sections.push({
                id: s.id,
                start_station: s.start_station,
                end_station: s.end_station
            });
        }
    });

    console.log('Writing output files...');
    fs.writeFileSync(SECTIONS_PATH, JSON.stringify({ sections: finalSections }, null, 2));
    fs.writeFileSync(GRAPH_PATH, JSON.stringify(newGraphData, null, 2));
    fs.writeFileSync(HIERARCHY_PATH, JSON.stringify(newHierarchy, null, 2));

    console.log("Done.");
}

main();
