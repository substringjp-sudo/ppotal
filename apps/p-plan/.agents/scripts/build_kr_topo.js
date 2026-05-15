const fs = require('fs');
const path = require('path');

async function buildIntegratedKR() {
    const projectRoot = process.cwd();
    const treePath = path.join(projectRoot, 'data/region/tree.json');
    const cityDir = path.join(projectRoot, 'data/region/geoms/city');
    const outputPath = path.join(projectRoot, 'apps/web/public/data/region/geoms/country_topo/93.json');

    console.log('Loading region tree...');
    const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));
    
    // 한국(93) 찾기
    const kr = tree.find(c => c.id === '093' || c.id === '93');
    if (!kr) throw new Error('KR not found in tree');

    const features = [];

    // 1. 광역 지자체 (Prefectures) 추가
    for (const pref of kr.prefectures || []) {
        const prefPath = path.join(projectRoot, `data/region/geoms/prefecture/${pref.id}.json`);
        if (fs.existsSync(prefPath)) {
            const geom = JSON.parse(fs.readFileSync(prefPath, 'utf8'));
            features.push({
                type: 'Feature',
                properties: { id: pref.id, name: pref.name, type: 'prefecture', countryId: '93' },
                geometry: geom
            });
            console.log(`Added prefecture: ${pref.name} (${pref.id})`);
        }

        // 2. 기초 지자체 (Cities) 추가
        for (const city of pref.cities || []) {
            // 샤딩 경로 계산 (024/...)
            const shard = '024'; // 데이터 구조상 24로 시작하는 것들이 024에 있음
            const cityPath = path.join(cityDir, shard, `${city.id}.json`);
            
            if (fs.existsSync(cityPath)) {
                const geom = JSON.parse(fs.readFileSync(cityPath, 'utf8'));
                features.push({
                    type: 'Feature',
                    properties: { id: city.id, name: city.name, type: 'city', countryId: '93', prefectureId: pref.id },
                    geometry: geom
                });
            } else {
                console.warn(`City file not found: ${city.id} (${city.name})`);
            }
        }
    }

    console.log(`Total features collected: ${features.length}`);

    // FeatureCollection 형태로 저장해도 SpatialEngine의 preloadIntegratedCountry가 이를 인식하도록 함
    // (현재 preload는 TopoJSON을 기대하고 있으므로, 간단하게 TopoJSON 구조를 흉내내거나 
    // 엔진 코드를 조금 수정하여 GeoJSON 집합도 지원하게 만들겠습니다.)
    
    // 여기서는 엔진의 호환성을 위해 "간이 TopoJSON" 형태로 감싸거나, 
    // 혹은 엔진이 FeatureCollection도 읽을 수 있게 수정하는게 나아보입니다.
    
    // 일단 GeoJSON FeatureCollection으로 저장
    const collection = {
        type: 'FeatureCollection',
        features: features
    };

    fs.writeFileSync(outputPath, JSON.stringify(collection));
    console.log(`Integrated KR data saved to ${outputPath}`);
}

buildIntegratedKR().catch(console.error);
