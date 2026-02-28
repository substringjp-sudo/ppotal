const fs = require('fs');
const path = require('path');

const RAIL_DIR = path.join(__dirname, '../public/rail');

const filesToProcess = [
    {
        name: 'stations.json',
        targets: ['platform_ids']
    },
    {
        name: 'sections.json',
        targets: ['geometry']
    },
    {
        name: 'sections_low.json',
        targets: ['geometry']
    },
    {
        name: 'sections_mid.json',
        targets: ['geometry']
    },
    {
        name: 'railroad_graph.json',
        targets: ['section_ids', 'available_lines']
    },
    {
        name: 'platforms.json',
        targets: ['geometries']
    },
    {
        name: 'joints.json',
        targets: ['coordinates']
    },
    {
        name: 'stations_lod.json',
        targets: ['nodes', 'lines', 'c']
    },
    {
        name: 'railroad_hierarchy.json',
        targets: ['platforms', 'sections', 'joints']
    },
    {
        name: 'companies.json',
        targets: []
    },
    {
        name: 'lines.json',
        targets: []
    }
];

function processFile(fileInfo) {
    const filePath = path.join(RAIL_DIR, fileInfo.name);
    if (!fs.existsSync(filePath)) return;

    console.log(`Processing ${fileInfo.name}...`);
    const startTime = Date.now();

    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Precision Reduction: Truncate coordinates to 5 decimal places (~1m accuracy)
    // This is applied recursively to the entire data structure
    data = reducePrecision(data);

    // Use 1-space indentation for better base compression while keeping structure
    let jsonStr = JSON.stringify(data, null, 1);

    // 1. Collapse inner-most coordinate pairs [lat, lon]
    jsonStr = jsonStr.replace(/\[\n\s+([\d.-]+),\n\s+([\d.-]+)\n\s+\]/g, '[$1,$2]');
    jsonStr = jsonStr.replace(/\[\n\s+([\d.-]+),\n\s+([\d.-]+),\n\s+([\d.-]+)\n\s+\]/g, '[$1,$2,$3]');

    // 2. Collapse specific target arrays
    fileInfo.targets.forEach(target => {
        const targetRegex = new RegExp(`("${target}":\\s*\\[)`, 'g');
        let match;
        let lastIndex = 0;
        let finalOutput = '';

        while ((match = targetRegex.exec(jsonStr)) !== null) {
            finalOutput += jsonStr.substring(lastIndex, match.index);
            const arrayStart = match.index + match[0].length - 1;
            const arrayEnd = findArrayEnd(jsonStr, arrayStart);

            if (arrayEnd !== -1) {
                const inner = jsonStr.substring(arrayStart + 1, arrayEnd - 1);
                // Collapse everything inside this array: remove newlines and redundant spaces
                // Special handling for objects to keep them on one line
                let collapsed = inner.replace(/\{\n\s+/g, '{').replace(/\n\s+\}/g, '}').replace(/,\n\s+/g, ',');
                collapsed = collapsed.replace(/\n\s*/g, ' ').trim();

                finalOutput += match[0] + collapsed + ']';
                lastIndex = arrayEnd;
            } else {
                finalOutput += jsonStr.substring(match.index, match.index + match[0].length);
                lastIndex = match.index + match[0].length;
            }
        }
        finalOutput += jsonStr.substring(lastIndex);
        jsonStr = finalOutput;
    });

    // 3. Global collapse for simple objects that were not in targets
    // Matches: { "a": 1, "b": "2" } across multiple lines
    jsonStr = jsonStr.replace(/\{\n\s+"([^"]+)":\s+("?[^"\n,]+"|[\d.-]+|\[[\d.,\s-]+\]),\n\s+"([^"]+)":\s+("?[^"\n,]+"|[\d.-]+|\[[\d.,\s-]+\])\n\s+\}/g, '{"$1":$2,"$3":$4}');

    fs.writeFileSync(filePath, jsonStr, 'utf8');
    const endTime = Date.now();
    console.log(`Finished ${fileInfo.name} in ${endTime - startTime}ms`);
}

function reducePrecision(obj) {
    if (typeof obj === 'number') {
        // If it looks like a coordinate (lat/lon in Japan range 20-50, 120-155)
        // Or if it's just a float with many decimals
        if (!Number.isInteger(obj)) {
            return parseFloat(obj.toFixed(6)); // Using 6 to be safe but cleaner than 10+
        }
        return obj;
    } else if (Array.isArray(obj)) {
        return obj.map(reducePrecision);
    } else if (obj !== null && typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
            result[key] = reducePrecision(obj[key]);
        }
        return result;
    }
    return obj;
}

function findArrayEnd(str, startPos) {
    let depth = 0;
    for (let i = startPos; i < str.length; i++) {
        if (str[i] === '[') depth++;
        else if (str[i] === ']') depth--;

        if (depth === 0) return i + 1;
    }
    return -1;
}

filesToProcess.forEach(processFile);
console.log('All files processed successfully.');
