/**
 * 운행계통(運転系統) 생성기.
 *
 * `public/rail` 의 노선 데이터는 전부 **선적(線籍)** 이다. 국토수치정보 N02 가
 * 그렇게 생겼기 때문이고, 그 자체로는 옳다. 다만 사람이 타는 단위와 다르다.
 * 山手線(320)은 데이터에서 시나가와~다바타 17역이 전부고, 우리가 아는 순환선은
 * 山手線·東北線·東海道線 세 선적을 밟는 운행계통이다. 같은 이유로 京浜東北線·
 * 湘南新宿ライン 은 데이터에 아예 없다.
 *
 * 이 스크립트는 OpenStreetMap 의 `route=train` 릴레이션을 받아 운행계통 정의를
 * 만들고, **기존 선로 그래프로 검증한 것만** 내보낸다.
 *
 *   node scripts/build_services.mjs [--in data/osm] [--out public/rail/services.json]
 *
 * 출력은 앱(assets/rail)과 웹(public/rail)이 그대로 함께 쓴다. 두 클라이언트가
 * 런타임에 할 일은 "구간 → 이 구간을 품은 계통" 색인뿐이다.
 *
 * 데이터 출처: © OpenStreetMap contributors, ODbL 1.0
 * https://www.openstreetmap.org/copyright
 */

import fs from 'fs';
import path from 'path';

const RAIL_DIR = 'public/rail';

/** OSM 정차점을 우리 역에 붙일 때 허용하는 거리(km). */
const MAX_MATCH_KM = 0.6;

/**
 * 역과 역 사이에 낄 수 있는 구간 수의 상한.
 * 분기점이 여럿 이어진 곳이 있어 한두 개로는 모자라지만, 제한이 없으면
 * 분기점 덩어리를 타고 엉뚱하게 먼 역까지 이웃으로 잡힌다.
 */
const MAX_JOINT_HOPS = 6;

/** JR 6개사 회사 ID (companies.json 기준) */
const JR_COMPANY_IDS = new Set([28, 50, 65, 103, 106, 147]);

/** 역이 아닌 통과점(분기점)인지. */
const isJoint = (id) => id.startsWith('J_');

function haversineKm(aLat, aLon, bLat, bLon) {
    const R = 6371;
    const dLat = ((bLat - aLat) * Math.PI) / 180;
    const dLon = ((bLon - aLon) * Math.PI) / 180;
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
}

// ---------------------------------------------------------------- 회사 매핑

const COMPANY_ALIASES = {
    'JR東日本': '東日本旅客鉄道',
    'JR西日本': '西日本旅客鉄道',
    'JR東海': '東海旅客鉄道',
    'JR九州': '九州旅客鉄道',
    'JR北海道': '北海道旅客鉄道',
    'JR四国': '四国旅客鉄道',
    '東京メトロ': '東京地下鉄',
    '南海電鉄': '南海電気鉄道',
    '南海電철': '南海電気鉄道',
    '京都丹後鉄道': 'WILLER TRAINS',
    '富士急行': '富士山麓電気鉄道',
    '近鉄': '近畿日本鉄道',
    'Kintetsu Corporation': '近畿日本鉄道',
};

function buildCompanyLookup(companies) {
    const compMap = new Map();
    for (const [id, c] of Object.entries(companies)) {
        compMap.set(c.name, Number(id));
        if (c.name_en) compMap.set(c.name_en, Number(id));
    }
    return (operator) => {
        if (!operator) return null;
        let op = COMPANY_ALIASES[operator] || operator;
        if (compMap.has(op)) return compMap.get(op);
        for (const [name, id] of compMap.entries()) {
            if (op.includes(name) || name.includes(op)) return id;
        }
        return null;
    };
}

// ---------------------------------------------------------------- 선로 그래프

/**
 * 구간을 "역과 역 사이의 이음"으로 접어 둔다.
 *
 * 원본 구간은 역이 아닌 분기점을 거칠 수 있어서, 그대로 보면 이웃한 두 역이
 * 안 붙어 있는 것처럼 보인다. 분기점만 거쳐 닿는 역은 이웃으로 친다.
 *
 * 나란히 놓인 선로(전차선·열차선) 때문에 두 역 사이에 길이 여럿일 수 있다.
 * 그럴 때는 가장 짧은 길을 쓴다 — 기준이 없으면 돌릴 때마다 다른 답이 나온다.
 */
function buildStationAdjacency(sectionsMeta) {
    const raw = new Map();
    const addEdge = (from, to, sectionId, lengthKm) => {
        if (!raw.has(from)) raw.set(from, []);
        raw.get(from).push({ to, sectionId, lengthKm });
    };
    for (const [key, s] of Object.entries(sectionsMeta)) {
        const id = Number(key);
        // 원본 length 는 **미터**다. public/rail/rail_data_schema.md 에는 km 로
        // 적혀 있지만 실제 값은 미터다(중앙값 1364).
        const km = (s.length || 0) / 1000;
        addEdge(s.start, s.end, id, km);
        addEdge(s.end, s.start, id, km);
    }

    const links = new Map();
    for (const node of raw.keys()) {
        if (isJoint(node)) continue;
        const best = new Map();
        const queue = [{ node, sectionIds: [], km: 0 }];
        while (queue.length > 0) {
            const walk = queue.shift();
            for (const edge of raw.get(walk.node) || []) {
                if (walk.sectionIds.includes(edge.sectionId)) continue;
                const next = {
                    node: edge.to,
                    sectionIds: [...walk.sectionIds, edge.sectionId],
                    km: walk.km + edge.lengthKm,
                };
                if (isJoint(edge.to)) {
                    if (next.sectionIds.length <= MAX_JOINT_HOPS) queue.push(next);
                    continue;
                }
                if (edge.to === node) continue;
                const current = best.get(edge.to);
                if (!current || next.km < current.km) best.set(edge.to, next);
            }
        }
        links.set(node, best);
    }
    return links;
}

/**
 * 역 단위 선로 그래프 상에서 두 역 사이의 최단 경로(구간 목록)를 찾는다.
 *
 * 우등 열차(급행, 특급, 쾌특, 신칸센)는 중간 역을 건너뛰므로,
 * 정차역 사이가 직결 인접역이 아니더라도 통과역을 거쳐 연결되어 있는지 확인한다.
 */
function findStationPath(fromId, toId, links, stationsMaster) {
    if (fromId === toId) return { sectionIds: [], km: 0 };
    const direct = links.get(fromId)?.get(toId);
    if (direct) return direct;

    const fromS = stationsMaster[fromId];
    const toS = stationsMaster[toId];
    const airDist = fromS && toS ? haversineKm(fromS.lat, fromS.lon, toS.lat, toS.lon) : 50;
    const maxAllowedKm = Math.max(30, airDist * 3);

    const queue = [{ node: fromId, sectionIds: [], km: 0, hops: 0 }];
    const visited = new Map([[fromId, 0]]);

    while (queue.length > 0) {
        const curr = queue.shift();
        if (curr.node === toId) return curr;
        if (curr.hops >= 60) continue; // 최대 60개 역 통과 허용 (장거리 무정차 특급 등)
        if (curr.km > maxAllowedKm) continue;

        for (const [nextStation, walk] of links.get(curr.node) || []) {
            const nextKm = curr.km + walk.km;
            if (nextKm > maxAllowedKm) continue;
            const prevBest = visited.get(nextStation);
            if (prevBest !== undefined && prevBest <= nextKm) continue;
            visited.set(nextStation, nextKm);
            queue.push({
                node: nextStation,
                sectionIds: [...curr.sectionIds, ...walk.sectionIds],
                km: nextKm,
                hops: curr.hops + 1,
            });
        }
    }
    return null;
}

// ---------------------------------------------------------------- 역 찾기

/** 좌표 및 운영사 정보를 바탕으로 가장 적합한 역을 찾기 위한 격자 색인. */
function buildStationIndex(stationsMaster, platformsMeta, activeStations) {
    const CELL = 0.05; // 약 5km
    const grid = new Map();
    const key = (la, lo) => `${Math.floor(la / CELL)}:${Math.floor(lo / CELL)}`;
    const all = [];

    for (const [id, s] of Object.entries(stationsMaster)) {
        if (typeof s.lat !== 'number' || typeof s.lon !== 'number') continue;
        const companies = new Set();
        for (const pid of s.platform_ids || []) {
            if (platformsMeta[pid]?.company !== undefined) {
                companies.add(platformsMeta[pid].company);
            }
        }
        const station = {
            id,
            name: s.name,
            nameKr: s.name_kr || '',
            lat: s.lat,
            lon: s.lon,
            companies,
        };
        all.push(station);
        const k = key(s.lat, s.lon);
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(station);
    }

    return {
        all,
        nearest(lat, lon, maxKm, compId, isJr) {
            const rings = Math.max(1, Math.ceil(maxKm / (CELL * 111)));
            const baseLa = Math.floor(lat / CELL);
            const baseLo = Math.floor(lon / CELL);
            const candidates = [];

            for (let dLa = -rings; dLa <= rings; dLa++) {
                for (let dLo = -rings; dLo <= rings; dLo++) {
                    const list = grid.get(`${baseLa + dLa}:${baseLo + dLo}`);
                    if (!list) continue;
                    for (const s of list) {
                        // 선로가 없는 고립역은 매칭 대상에서 제외
                        if (activeStations && !activeStations.has(s.id)) continue;
                        const km = haversineKm(lat, lon, s.lat, s.lon);
                        if (km <= maxKm) candidates.push({ station: s, km });
                    }
                }
            }

            if (candidates.length === 0) return null;

            // 1. JR 노선인 경우 JR 계열사 승강장을 가진 역을 최우선
            if (isJr) {
                const jrCandidates = candidates.filter((c) =>
                    [...c.station.companies].some((id) => JR_COMPANY_IDS.has(id))
                );
                if (jrCandidates.length > 0) {
                    jrCandidates.sort((a, b) => a.km - b.km);
                    return jrCandidates[0];
                }
            } else if (compId !== null) {
                // 2. 일반 사철의 경우 운영사 일치 역 우선
                const compCandidates = candidates.filter((c) => c.station.companies.has(compId));
                if (compCandidates.length > 0) {
                    compCandidates.sort((a, b) => a.km - b.km);
                    return compCandidates[0];
                }
            }

            // 3. 노면전차/버스 정류장 이름('~駅前', '~口')보다 본선 역명 우선
            const mainCandidates = candidates.filter(
                (c) => !c.station.name.endsWith('駅前') && !c.station.name.endsWith('口')
            );
            if (mainCandidates.length > 0) {
                mainCandidates.sort((a, b) => a.km - b.km);
                return mainCandidates[0];
            }

            candidates.sort((a, b) => a.km - b.km);
            return candidates[0];
        },
    };
}

// ---------------------------------------------------------------- OSM 읽기

/**
 * overpass-turbo 가 내보낸 GeoJSON 에서 route 릴레이션을 뽑는다.
 */
function readOsmRoutes(file) {
    const geo = JSON.parse(fs.readFileSync(file, 'utf8'));
    const features = geo.features || [];
    const routes = [];

    for (const feature of features) {
        const geometry = feature.geometry;
        if (!geometry || geometry.type !== 'MultiLineString') continue;
        const props = feature.properties || {};
        if (props.type !== 'route') continue;

        const relId = Number(String(props['@id'] || '').replace('relation/', ''));
        const stops = features
            .filter(
                (f) =>
                    f.geometry &&
                    f.geometry.type === 'Point' &&
                    (f.properties['@relations'] || []).some((r) => r.rel === relId)
            )
            .map((f) => ({ lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }));

        routes.push({
            id: `relation_${relId}`,
            name: props.name || props['name:ja'] || `relation ${relId}`,
            nameKr: props['name:ko'] || '',
            operator: props.operator || props['operator:ja'] || '',
            color: props.colour || '',
            isLoop: props.roundtrip === 'yes',
            path: chainSegments(geometry.coordinates),
            stops,
            source: path.basename(file),
        });
    }
    return routes;
}

/**
 * 흩어진 선분을 하나의 선으로 잇는다.
 */
function chainSegments(segments) {
    if (segments.length === 0) return [];
    const keyOf = (p) => `${p[0]},${p[1]}`;
    const byEnd = new Map();
    segments.forEach((seg, i) => {
        for (const p of [seg[0], seg[seg.length - 1]]) {
            const k = keyOf(p);
            if (!byEnd.has(k)) byEnd.set(k, []);
            byEnd.get(k).push(i);
        }
    });

    const used = new Set([0]);
    const chain = segments[0].slice();
    for (;;) {
        const tail = chain[chain.length - 1];
        const next = (byEnd.get(keyOf(tail)) || []).find((i) => !used.has(i));
        if (next === undefined) break;
        const seg = segments[next];
        const forward = keyOf(seg[0]) === keyOf(tail);
        chain.push(...(forward ? seg.slice(1) : seg.slice().reverse().slice(1)));
        used.add(next);
    }
    return chain.map((p) => ({ lon: p[0], lat: p[1] }));
}

// ---------------------------------------------------------------- 계통 만들기

/** 정차역을 선로 위에 투영해 순서를 세우고, 선로 그래프로 검증한다. */
function toService(route, index, links, stationsMaster, resolveCompany) {
    const compId = resolveCompany(route.operator);
    const isJr =
        (route.operator && (route.operator.includes('JR') || route.operator.includes('旅客鉄道'))) ||
        (route.name && (route.name.startsWith('JR') || route.name.includes('新幹線')));

    const unmatched = [];
    const matched = new Map();
    for (const stop of route.stops) {
        const hit = index.nearest(stop.lat, stop.lon, MAX_MATCH_KM, compId, isJr);
        if (!hit) unmatched.push(stop);
        else if (!matched.has(hit.station.id)) matched.set(hit.station.id, hit.station);
    }
    if (matched.size < 2) {
        return { service: null, unmatched, gaps: [], reason: '붙은 역이 둘 미만' };
    }

    const cumulative = [0];
    for (let i = 1; i < route.path.length; i++) {
        const a = route.path[i - 1];
        const b = route.path[i];
        cumulative.push(cumulative[i - 1] + haversineKm(a.lat, a.lon, b.lat, b.lon));
    }

    const ordered = [...matched.values()]
        .map((station) => {
            let bestIndex = 0;
            let bestKm = Infinity;
            route.path.forEach((p, i) => {
                const km = haversineKm(station.lat, station.lon, p.lat, p.lon);
                if (km < bestKm) {
                    bestKm = km;
                    bestIndex = i;
                }
            });
            return { station, along: cumulative[bestIndex] };
        })
        .sort((a, b) => a.along - b.along)
        .map((entry) => entry.station);

    // 선언한 순서가 선로에서 실제로 이어지는지 (우등 열차는 통과역을 거치는 경로 탐색 지원)
    const gaps = [];
    const sectionIds = new Set();
    const lastIndex = route.isLoop ? ordered.length - 1 : ordered.length - 2;
    for (let i = 0; i <= lastIndex; i++) {
        const from = ordered[i];
        const to = ordered[(i + 1) % ordered.length];
        const pathRes = findStationPath(from.id, to.id, links, stationsMaster);
        if (!pathRes) {
            gaps.push({ from: from.nameKr || from.name, to: to.nameKr || to.name });
        } else {
            pathRes.sectionIds.forEach((id) => sectionIds.add(id));
        }
    }

    return {
        service: {
            id: route.id,
            name: route.name,
            name_kr: route.nameKr,
            color: route.color || '#2563EB',
            kind: route.isLoop ? 'LOOP' : 'THROUGH',
            is_loop: route.isLoop,
            stops: ordered.map((s) => s.id),
            sections: [...sectionIds].sort((a, b) => a - b),
        },
        unmatched,
        gaps,
        lengthKm: cumulative[cumulative.length - 1],
    };
}

// ---------------------------------------------------------------- 실행

function main() {
    const args = process.argv.slice(2);
    const arg = (flag, fallback) => {
        const i = args.indexOf(flag);
        return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
    };
    const inDir = arg('--in', 'data/osm');
    const outFile = arg('--out', path.join(RAIL_DIR, 'services.json'));

    const sectionsMeta = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'sections_meta.json'), 'utf8'));
    const stationsMaster = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'stations_master.json'), 'utf8'));
    const platformsMeta = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'platforms_meta.json'), 'utf8'));
    const companies = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'companies.json'), 'utf8'));

    const resolveCompany = buildCompanyLookup(companies);

    console.log('선로 그래프를 접는 중…');
    const links = buildStationAdjacency(sectionsMeta);
    const activeStations = new Set(links.keys());
    const index = buildStationIndex(stationsMaster, platformsMeta, activeStations);
    console.log(`  역 ${index.all.length}개, 인접 관계를 가진 유효 역 ${links.size}개`);

    const files = fs
        .readdirSync(inDir)
        .filter((f) => f.endsWith('.geojson'))
        .map((f) => path.join(inDir, f));
    if (files.length === 0) {
        console.error(`${inDir} 에 OSM GeoJSON 내보내기 파일이 없습니다.`);
        process.exit(1);
    }

    const services = {};
    let rejected = 0;
    for (const file of files) {
        for (const route of readOsmRoutes(file)) {
            const result = toService(route, index, links, stationsMaster, resolveCompany);
            const label = `${route.name}${route.nameKr ? ` (${route.nameKr})` : ''}`;
            if (!result.service || result.gaps.length > 0) {
                rejected++;
                const why =
                    result.reason ||
                    `선로가 끊김: ${result.gaps.map((g) => `${g.from}→${g.to}`).join(', ')}`;
                console.warn(`  ✗ ${label} — ${why}`);
                continue;
            }
            // 같은 계통의 상행·하행이 따로 들어오면 역 집합이 같다. 하나만 남긴다.
            // 남길 쪽은 이름이 짧은 것 — 방향이나 운영사 수식이 덜 붙은 쪽이다.
            const fingerprint = [...result.service.stops].sort().join('|');
            const twinId = Object.keys(services).find(
                (k) => [...services[k].stops].sort().join('|') === fingerprint
            );
            if (twinId) {
                const twin = services[twinId];
                const better =
                    (result.service.name_kr || result.service.name).length <
                    (twin.name_kr || twin.name).length;
                if (better) {
                    delete services[twinId];
                    services[route.id] = result.service;
                    console.log(`  · ${label} — ${twin.name_kr || twin.name} 과 같은 계통. 이름이 짧은 이쪽을 남김`);
                } else {
                    console.log(`  · ${label} — ${twin.name_kr || twin.name} 과 같은 계통이라 건너뜀`);
                }
                continue;
            }
            services[route.id] = result.service;
            const miss = result.unmatched.length > 0 ? `, 못 붙인 정차점 ${result.unmatched.length}` : '';
            console.log(
                `  ✓ ${label} — ${result.service.stops.length}역, ` +
                    `구간 ${result.service.sections.length}개, 선로 ${result.lengthKm.toFixed(1)}km${miss}`
            );
        }
    }

    const out = {
        _source: 'OpenStreetMap route=train 릴레이션. scripts/build_services.mjs 로 생성.',
        _copyright: '© OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright)',
        _note:
            '선적(線籍)이 아니라 운행계통(運転系統). 모든 정차역 순서는 기존 선로 그래프로 ' +
            '이어지는지 검증했고, 검증을 통과한 것만 들어 있다.',
        services,
    };
    fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n');
    console.log(`\n${outFile} 에 계통 ${Object.keys(services).length}개를 썼습니다. (버린 것 ${rejected}개)`);

    if (Object.keys(services).length === 0) process.exit(1);
}

main();
