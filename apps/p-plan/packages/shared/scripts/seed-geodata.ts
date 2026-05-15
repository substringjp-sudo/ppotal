import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

/**
 * PPLANER Geodata Seeding & Optimization Script (Updated)
 * 
 * 용량 최적화 전략:
 * 1. Coordinate Precision Reduction (소수점 4자리로 제한, 약 11m 오차) - Firestore 문서 크기 제한 준수 목적
 * 2. 모든 레벨(Country, Region, City)의 지오메트리 할당
 */

// 설정
const PROJECT_ROOT = path.resolve(__dirname, '../../../');
const TREE_PATH = path.join(PROJECT_ROOT, 'data/region/tree.json');
const COUNTRY_GEOM_PATH = path.join(PROJECT_ROOT, 'data/region/country_geom.json');
const PREFECTURE_GEOM_PATH = path.join(PROJECT_ROOT, 'data/region/prefecture_geom.json');
const CITY_GEOM_PATH = path.join(PROJECT_ROOT, 'data/region/city_geom.json');

const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_DB = path.join(DATA_DIR, 'geodata.db');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (fs.existsSync(OUTPUT_DB)) {
    fs.unlinkSync(OUTPUT_DB);
}

const db = new Database(OUTPUT_DB);
db.pragma('journal_mode = WAL');

// 테이블 생성
db.exec(`
    CREATE TABLE geodata (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        parentId TEXT,
        bbox_min_lng REAL,
        bbox_min_lat REAL,
        bbox_max_lng REAL,
        bbox_max_lat REAL,
        geometry TEXT,
        properties TEXT
    );
    CREATE INDEX idx_geodata_bbox ON geodata (bbox_min_lng, bbox_max_lng, bbox_min_lat, bbox_max_lat);
    CREATE INDEX idx_geodata_type_parent ON geodata (type, parentId);
`);

const insertGeodata = db.prepare(`
    INSERT INTO geodata (id, type, name, parentId, bbox_min_lng, bbox_min_lat, bbox_max_lng, bbox_max_lat, geometry, properties)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

/**
 * 좌표 정밀도 제한 (소수점 4자리 ~ 11m 오차)
 */
function roundCoordinates(geom: any) {
    if (!geom) return null;
    const precision = 10000;
    const round = (c: number) => Math.round(c * precision) / precision;

    if (geom.type === 'Point') {
        geom.coordinates = geom.coordinates.map(round);
    } else if (geom.type === 'LineString' || geom.type === 'MultiPoint') {
        geom.coordinates = geom.coordinates.map((p: any) => p.map(round));
    } else if (geom.type === 'Polygon' || geom.type === 'MultiLineString') {
        geom.coordinates = geom.coordinates.map((r: any) => r.map((p: any) => p.map(round)));
    } else if (geom.type === 'MultiPolygon') {
        geom.coordinates = geom.coordinates.map((poly: any) => poly.map((r: any) => r.map((p: any) => p.map(round))));
    }
    return geom;
}

function calculateBBox(geometry: any) {
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    const processCoords = (coords: any[]) => {
        if (typeof coords[0] === 'number') {
            const [lng, lat] = coords;
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
        } else {
            coords.forEach(processCoords);
        }
    };
    if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon' || geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
        processCoords(geometry.coordinates);
    }
    return { minLat, maxLat, minLng, maxLng };
}

function unionBBox(b1: any, b2: any) {
    return {
        minLat: Math.min(b1.minLat, b2.minLat),
        maxLat: Math.max(b1.maxLat, b2.maxLat),
        minLng: Math.min(b1.minLng, b2.minLng),
        maxLng: Math.max(b1.maxLng, b2.maxLng)
    };
}

async function main() {
    console.log('--- Geodata Optimization & Seeding Start ---');

    console.log('Loading Geometry Files (This may take a while)...');
    const countryGeoms = JSON.parse(fs.readFileSync(COUNTRY_GEOM_PATH, 'utf-8'));
    const prefGeoms = JSON.parse(fs.readFileSync(PREFECTURE_GEOM_PATH, 'utf-8'));
    const cityGeoms = JSON.parse(fs.readFileSync(CITY_GEOM_PATH, 'utf-8'));
    const treeData = JSON.parse(fs.readFileSync(TREE_PATH, 'utf-8'));
    console.log(`Loaded tree.json and geometry data.`);

    const insertTransaction = db.transaction((region: any) => {
        const countryGeom = roundCoordinates(countryGeoms[region.id]);
        let countryBBox = { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 };
        let countryGeomJson = null;

        if (countryGeom) {
            countryBBox = calculateBBox(countryGeom);
            countryGeomJson = JSON.stringify(countryGeom);
        }

        insertGeodata.run(
            region.id, 'country', region.name, null, 
            countryBBox.minLng === 180 ? null : countryBBox.minLng,
            countryBBox.minLat === 90 ? null : countryBBox.minLat,
            countryBBox.maxLng === -180 ? null : countryBBox.maxLng,
            countryBBox.maxLat === -90 ? null : countryBBox.maxLat,
            countryGeomJson, JSON.stringify({ code: region.code })
        );
        
        for (const pref of region.prefectures || []) {
            const prefGeom = roundCoordinates(prefGeoms[pref.id]);
            let prefBBox = { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 };
            let prefGeomJson = null;

            if (prefGeom) {
                prefBBox = calculateBBox(prefGeom);
                prefGeomJson = JSON.stringify(prefGeom);
            }

            insertGeodata.run(
                pref.id, 'region', pref.name, region.id,
                prefBBox.minLng === 180 ? null : prefBBox.minLng,
                prefBBox.minLat === 90 ? null : prefBBox.minLat,
                prefBBox.maxLng === -180 ? null : prefBBox.maxLng,
                prefBBox.maxLat === -90 ? null : prefBBox.maxLat,
                prefGeomJson, null
            );

            for (const city of pref.cities || []) {
                const cityGeom = roundCoordinates(cityGeoms[city.id]);
                let cityBBox = { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 };
                let cityGeomJson = null;

                if (cityGeom) {
                    cityBBox = calculateBBox(cityGeom);
                    cityGeomJson = JSON.stringify(cityGeom);
                }

                insertGeodata.run(
                    city.id, 'city', city.name, pref.id,
                    cityBBox.minLng === 180 ? null : cityBBox.minLng,
                    cityBBox.minLat === 90 ? null : cityBBox.minLat,
                    cityBBox.maxLng === -180 ? null : cityBBox.maxLng,
                    cityBBox.maxLat === -90 ? null : cityBBox.maxLat,
                    cityGeomJson, null
                );
            }
        }
    });

    for (const region of treeData) {
        console.log(`Processing Region: ${region.name} (${region.id})`);
        insertTransaction(region);
    }

    console.log('--- Geodata Optimization & Seeding Completed ---');
    const stats = fs.statSync(OUTPUT_DB);
    console.log(`Optimized Database size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    db.close();
}

main().catch(err => {
    console.error('Optimization failed:', err);
    process.exit(1);
});
