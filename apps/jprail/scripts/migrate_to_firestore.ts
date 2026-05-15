import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Firebase Admin 초기화
const PROJECT_ID = 'jprail'; 
if (getApps().length === 0) {
  initializeApp({
    projectId: PROJECT_ID,
  });
}

const db = getFirestore();
const RAIL_DIR = path.join(process.cwd(), 'public', 'rail');

async function uploadCollection(collectionName: string, data: Record<string, any>) {
  console.log(`\n🚀 Uploading ${collectionName} (${Object.keys(data).length} items)...`);
  const entries = Object.entries(data);
  let count = 0;
  let batch = db.batch();

  for (const [id, value] of entries) {
    const docRef = db.collection(collectionName).doc(id);
    batch.set(docRef, { ...value, id });
    count++;

    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`  - ${count} items uploaded...`);
    }
  }

  if (count % 500 !== 0) {
    await batch.commit();
  }
  console.log(`✅ Finished uploading ${collectionName}.`);
}

async function migrate() {
  try {
    // 1. 역 데이터 (Stations)
    const stationsMaster = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'stations_master.json'), 'utf8'));
    await uploadCollection('stations', stationsMaster);

    // 2. 회사 데이터 (Companies)
    const companies = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'companies.json'), 'utf8'));
    await uploadCollection('companies', companies);

    // 3. 노선 데이터 (Lines)
    const lines = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'lines.json'), 'utf8'));
    await uploadCollection('lines', lines);

    // 4. 승강장 데이터 (Platforms + Geoms)
    const platformsMeta = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'platforms_meta.json'), 'utf8'));
    const platformsGeom = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'platforms_geom.json'), 'utf8'));
    const mergedPlatforms: Record<string, any> = {};
    for (const id in platformsMeta) {
      mergedPlatforms[id] = {
        ...platformsMeta[id],
        geom: platformsGeom[id] || null
      };
    }
    await uploadCollection('platforms', mergedPlatforms);

    // 5. 구간 데이터 (Sections + Geoms)
    const sectionsMeta = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'sections_meta.json'), 'utf8'));
    const sectionsGeom = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'sections_geom_high.json'), 'utf8'));
    const mergedSections: Record<string, any> = {};
    for (const id in sectionsMeta) {
      mergedSections[id] = {
        ...sectionsMeta[id],
        geom: sectionsGeom[id] || null
      };
    }
    await uploadCollection('sections', mergedSections);

    // 6. 그래프 데이터 (Station Graph)
    const network = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'railroad_network.json'), 'utf8'));
    const stationGraph = network.station_graph;
    console.log(`\n🚀 Uploading station_graph (${Object.keys(stationGraph).length} stations)...`);
    let count = 0;
    let batch = db.batch();
    for (const stationId in stationGraph) {
      const docRef = db.collection('station_graph').doc(stationId);
      // neighbors 구조: { targetStationId: { connections: [...] } }
      batch.set(docRef, { neighbors: stationGraph[stationId] });
      count++;
      if (count % 500 === 0) {
        await batch.commit();
        batch = db.batch();
        console.log(`  - ${count} stations uploaded...`);
      }
    }
    if (count % 500 !== 0) {
      await batch.commit();
    }
    console.log(`✅ Finished uploading station_graph.`);

    console.log('\n✨ ALL DATA MIGRATED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrate();
