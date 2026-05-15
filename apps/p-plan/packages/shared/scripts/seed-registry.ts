const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'p-plan';
const DATABASE_ID = '(default)';
const TREE_PATH = path.join(__dirname, '../../../data/region/tree.json');

async function seedSearchRegistry() {
    console.log('--- SEARCH REGISTRY SEEDING START ---');
    
    try {
        if (getApps().length === 0) initializeApp({ projectId: PROJECT_ID });
        const db = getFirestore(DATABASE_ID);

        const treeData = JSON.parse(fs.readFileSync(TREE_PATH, 'utf8'));
        const collection = db.collection('search_registry');

        // localNameMap 생성 (한국어 이름 매핑)
        const localNameMap = new Map<string, string>();
        try {
            const countriesArr = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/region/countries.json'), 'utf8'));
            const prefecturesArr = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/region/prefectures.json'), 'utf8'));
            const citiesArr = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/region/cities.json'), 'utf8'));

            [...countriesArr, ...prefecturesArr, ...citiesArr].forEach((item: any) => {
                if (item.id && item.name_local) {
                    localNameMap.set(String(item.id), item.name_local);
                }
            });
            console.log(`Loaded ${localNameMap.size} local names for mapping.`);
        } catch (e) {
            console.warn('Could not load local name mapping files, skipping localization support.');
        }
        let batch = db.batch();
        let count = 0;

        const processNode = async (item: any, type: string, parentName = '', parentId: string | null = null, ids: any = {}) => {
            const currentIds = { ...ids };
            if (type === 'country') currentIds.countryId = String(item.id).padStart(3, '0');
            else if (type === 'region') currentIds.prefectureId = String(item.id);
            else if (type === 'city') currentIds.cityId = String(item.id);

            const localName = localNameMap.get(String(item.id));

            const seedEntry = async (name: string, suffix: string = '') => {
                const docData = {
                    id: item.id,
                    name: name,
                    type: type,
                    parentId: parentId,
                    parentName: parentName,
                    ids: currentIds,
                    updatedAt: FieldValue.serverTimestamp()
                };

                const docId = `${type}_${item.id}${suffix}`;
                const docRef = collection.doc(docId);
                batch.set(docRef, docData);
                count++;

                if (count % 500 === 0) {
                    await batch.commit();
                    batch = db.batch();
                    process.stdout.write('.');
                }
            };

            // 1. 기본 이름 등록 (영어)
            await seedEntry(item.name);

            // 2. 한국어 이름이 다른 경우 추가 등록
            if (localName && localName !== item.name) {
                await seedEntry(localName, '_local');
            }

            if (item.prefectures) {
                for (const p of item.prefectures) {
                    await processNode(p, 'region', item.name, String(item.id).padStart(3, '0'), currentIds);
                }
            }
            if (item.cities) {
                for (const c of item.cities) {
                    await processNode(c, 'city', parentName ? `${parentName} › ${item.name}` : item.name, String(item.id), currentIds);
                }
            }
            if (item.unassigned_cities) {
                for (const c of item.unassigned_cities) {
                    await processNode(c, 'city', item.name, String(item.id), currentIds);
                }
            }
        };

        for (const country of treeData) {
            await processNode(country, 'country');
        }

        await batch.commit();
        console.log(`\n- Seeded ${count} registry entries (incl. local names)`);
        console.log('--- SEARCH REGISTRY SEEDED ---');

    } catch (err) {
        console.error('ERROR:', err);
    }
}

seedSearchRegistry();
