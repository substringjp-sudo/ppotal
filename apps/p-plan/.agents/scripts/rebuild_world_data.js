const fs = require('fs');
const path = require('path');

/**
 * [CLEAN REBUILD] Spatial Data Integrator v2
 * 
 * 원칙:
 * 1. tree.json이 모든 데이터의 기준이다. (Single Source of Truth)
 * 2. 원본 데이터의 지저분한 ID를 무시하고 12자리 표준 ID([City5][Pref4][Country3])를 강제 주입한다.
 * 3. 통합된 country_topo 파일을 통해서만 공간 탐색이 이루어지게 한다.
 */

function walkSync(dir, filelist = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const dirPath = path.join(dir, file);
        if (fs.statSync(dirPath).isDirectory()) {
            walkSync(dirPath, filelist);
        } else if (file.endsWith('.json')) {
            filelist.push(dirPath);
        }
    }
    return filelist;
}

async function cleanRebuild() {
    const projectRoot = process.cwd();
    const treePath = path.join(projectRoot, 'data/region/tree.json');
    const sourceGeomDir = path.join(projectRoot, 'data/region/geoms');
    const outDirs = [
        path.join(projectRoot, 'apps/web/public/data/region/geoms/country_topo'),
        path.join(projectRoot, 'apps/web/out/data/region/geoms/country_topo')
    ];

    console.log('--- 1. [Purge] Cleaning up old artifacts ---');
    for (const outDir of outDirs) {
        if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
        fs.mkdirSync(outDir, { recursive: true });
    }

    console.log('--- 2. [Index] Parsing tree.json (Registry) ---');
    const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));
    const registry = new Map(); // idPrefix -> { countryCode, prefCode, pid, name }

    tree.forEach(country => {
        const countryIdNum = parseInt(country.id).toString();
        const countryCode = countryIdNum.padStart(3, '0');

        // 1. Prefectures
        (country.prefectures || []).forEach(pref => {
            const pidStr = pref.id.toString();
            // Ensure we have a valid 4-digit pref code by logic (last 3 are usually country)
            const prefCode = pidStr.length >= 7 
                ? pidStr.substring(0, pidStr.length - 3).padStart(4, '0') 
                : pidStr.padStart(4, '0');

            (pref.cities || []).forEach(city => {
                const cityIdStr = city.id.toString();
                // We always take only the identifying Prefix (first 5 digits) 
                // and REBUILD the ID from current valid parents.
                let cityPrefix = cityIdStr.substring(0, 5).padStart(5, '0');
                
                // If it was already a long valid ID, the first 5 are still correct.
                // Rebuild forces [5-city][4-pref][3-country] 12-digit standard.
                const fullStandardId = `${cityPrefix}${prefCode}${countryCode}`;

                registry.set(cityIdStr, { 
                    countryCode, 
                    prefCode, 
                    pid: pidStr, 
                    name: city.name, 
                    type: 'city',
                    fullStandardId
                });
            });
        });

        // 2. Unassigned Cities
        (country.unassigned_cities || []).forEach(city => {
            const cityIdStr = city.id.toString();
            let cityPrefix = cityIdStr.substring(0, 5).padStart(5, '0');
            const fullStandardId = `${cityPrefix}0000${countryCode}`;

            registry.set(cityIdStr, {
                countryCode,
                prefCode: '0000',
                pid: countryIdNum,
                name: city.name,
                type: 'city',
                fullStandardId
            });
        });


    });

    console.log(`Registered ${registry.size} valid cities from tree.json.`);

    // --- 3. [Update] Write back CLEANED tree.json ---
    console.log('--- 3. [Output] Saving CLEANED tree.json ---');
    // First, update all IDs in the memory object to match the registry's standardized IDs
    tree.forEach(country => {
        const cCode = parseInt(country.id).toString().padStart(3, '0');
        country.id = cCode; // Standardize country ID
        
        (country.prefectures || []).forEach(pref => {
            const pCode = pref.id.toString().length >= 7 
                ? pref.id.toString().substring(0, pref.id.toString().length - 3).padStart(4, '0') 
                : pref.id.toString().padStart(4, '0');
            pref.id = `${pCode}${cCode}`; // Standardize prefecture ID (4+3=7 digits)
            
            (pref.cities || []).forEach(city => {
                const info = registry.get(city.id.toString());
                if (info) city.id = info.fullStandardId;
            });
        });
        
        (country.unassigned_cities || []).forEach(city => {
            const info = registry.get(city.id.toString());
            if (info) city.id = info.fullStandardId;
        });
    });
    
    fs.writeFileSync(treePath, JSON.stringify(tree, null, 2));
    console.log(`Successfully cleaned and overwrote ${treePath}`);

    console.log('--- 4. [Process] Mapping Geometries to Registry ---');

    const countryFeatures = new Map(); // countryCode -> Feature[]

    // Scan all city files
    const cityFiles = walkSync(path.join(sourceGeomDir, 'city'));
    console.log(`Scanning ${cityFiles.length} raw geometry files...`);

    cityFiles.forEach(fullPath => {
        const fileName = path.basename(fullPath, '.json');
        // Extract 5 digit prefix (e.g. 24386 from 243860000000)
        let prefix = fileName;
        if (fileName.length >= 5) prefix = fileName.substring(0, 5);

        const info = registry.get(prefix) || registry.get(fileName);

        if (info) {
            try {
                const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                const geometry = content.geometry || content;
                
                if (!countryFeatures.has(info.countryCode)) countryFeatures.set(info.countryCode, []);
                
                countryFeatures.get(info.countryCode).push({
                    type: 'Feature',
                    properties: {
                        id: info.fullStandardId,
                        name: info.name,
                        type: 'city',
                        prefectureId: info.pid,
                        countryId: info.countryCode
                    },
                    geometry: geometry
                });
            } catch (e) {}
        }
    });

    console.log('--- 4. [Output] Saving standardized country_topo files ---');
    for (const [cCode, features] of countryFeatures.entries()) {
        const collection = { type: 'FeatureCollection', features };
        const id = parseInt(cCode).toString();
        for (const outDir of outDirs) {
            fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(collection));
        }
        console.log(`Created ${id}.json: ${features.length} cities integrated.`);
    }

    console.log('\n--- SUCCESS: Search system has been rebuilt from scratch! ---');
}

cleanRebuild().catch(console.error);
