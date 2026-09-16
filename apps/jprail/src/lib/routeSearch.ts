import { RailData, Station, Section, GraphPatch, GraphPatchEdge } from '../types/railData';
import {
    TransferPlatform,
    bearingOf,
    transferLinksFor,
    transferCostFactor,
    MIN_MINUTES as TRANSFER_MIN_MINUTES
} from './transferWalk';
import { haversineDistance } from './graphUtils';

export interface RouteLineInfo {
    id: number;
    name: string;
    name_en?: string;
    name_kr?: string;
    color?: string;
}

/**
 * One continuous ride on a single line (or one walking transfer between
 * co-located stations). This is what the UI draws as a coloured bar / map stroke.
 */
export interface RouteSegment {
    kind: 'rail' | 'walk';
    line: RouteLineInfo | null;
    fromStationId: string;
    toStationId: string;
    fromName: string;
    toName: string;
    stationIds: string[];
    distance: number;
    sectionIds: number[];
    geometries: [number, number][][];
}

export interface CandidateRoute {
    id: string;
    distance: number; // in km
    transferCount: number; // number of line transfers (incl. walking transfers)
    walkCount: number;
    /**
     * 갈아타며 걷는 시간의 합(분).
     *
     * 승강장 좌표에서 구한 추정값이다 — 열차를 기다리는 시간은 들어 있지 않다(다이어가
     * 없으므로 알 수 없다). 그래서 화면에는 "약"을 붙여 보여 준다.
     */
    transferWalkMinutes: number;
    stationIds: string[];
    stationNames: string[];
    sectionIds: number[];
    geometries: [number, number][][];
    lines: RouteLineInfo[];
    segments: RouteSegment[];
    transfers: string[]; // Names of transfer stations
    transferStationIds: string[];
    score: number;
    isShortest?: boolean;
    isFewestTransfers?: boolean;
    isRecommended?: boolean;
}

export interface LegSearchResult {
    legIndex: number;
    startStation: Station;
    endStation: Station;
    candidates: CandidateRoute[];
}

export interface RouteSearchResult {
    legs: LegSearchResult[];
    totalCandidatesCount: number;
    hasTooManyCandidates: boolean;
}

/* ------------------------------------------------------------------ *
 * Graph
 * ------------------------------------------------------------------ */

/**
 * 도보 환승을 나타내는 가짜 노선 id.
 *
 * 0 이면 **안 된다** — `lines.json` 의 0 번은 IRいしかわ鉄道線 이라 진짜 노선과
 * 값이 겹친다. 겹친 채로 두면 이시카와선을 탄 구간이 "걸어서 갈아탔다"로 세어진다.
 * -1 은 [UNBOARDED] 가 쓰므로 -2 를 쓴다.
 */
const WALK_LINE = -2;
const UNBOARDED = -1; // state line id meaning "not on a train yet"

/** Walking transfers are only created between same-named stations closer than this. */
const MAX_WALK_TRANSFER_KM = 1.5;
/**
 * How close two *differently named* stations must be to count as one place.
 *
 * Linking only same-name stations leaves 鷹ノ巣 and 鷹巣, 諫早 and 諫早（雲仙・島原口）,
 * 人吉 and 人吉温泉 as strangers even though their coordinates are identical — so a
 * 1.2km hop came out as a 240km detour. Same-name pairs number 49 in this dataset;
 * differently-named pairs within 300m number 474.
 *
 * Beyond 300m the question stops being "can you walk it" and becomes "do the rails
 * actually join", which this rule cannot answer.
 */
const MAX_NEARBY_TRANSFER_KM = 0.3;

export interface RouteEdge {
    to: string;
    distance: number; // km
    /** Real line ids serving this edge, ordered by how much of the edge they cover. */
    lineIds: number[];
    sectionIds: number[];
    isWalk: boolean;
}

export interface RouteGraph {
    adj: Map<string, RouteEdge[]>;
    sections: Map<number, Section>;
    stationsByName: Map<string, string[]>;
    /**
     * Some lines are split into several ids at a company border (e.g. 本四備讃線
     * is one id on the JR West side and another on the JR Shikoku side). Riders
     * stay on the same train there, so those ids share a group and crossing
     * between them is not a transfer.
     */
    lineGroup: Map<number, number>;
    /**
     * 같은 역에서 노선 그룹을 갈아탈 때 걸어야 하는 시간(분).
     *
     * 키는 `역id|그룹A_그룹B`(그룹은 작은 쪽부터). 없는 짝은 예전처럼 상수를 쓴다 —
     * 승강장 좌표가 없는 역까지 벌점을 받아서는 안 된다. 규칙은 `lib/transferWalk`.
     */
    transferMinutes: Map<string, number>;
}

/** 환승 표의 키. 그룹 순서를 타지 않는다. */
function transferKey(stationId: string, a: number, b: number): string {
    return a <= b ? `${stationId}|${a}_${b}` : `${stationId}|${b}_${a}`;
}

/**
 * 노선별 승강장 좌표에서 환승 시간을 구한다.
 *
 * 예전에는 환승 비용이 상수 하나였다. 新宿에서 547m 를 걸어 층을 오르내리는 환승과
 * 같은 승강장 건너편으로 28m 가는 환승이 라우터에게 같은 값이었다.
 *
 * 탐색은 노선을 **그룹**으로 묶어 보므로(회사 경계에서 id 가 갈리는 노선을 한 줄로
 * 본다) 표도 그룹 단위로 만든다. 같은 그룹 안에서 승강장이 갈리는 것은 환승이 아니다.
 */
function buildTransferMinutes(
    railData: RailData,
    lineGroup: Map<number, number>
): Map<string, number> {
    const table = new Map<string, number>();
    const platforms = railData.platforms;
    const stations = railData.stations;
    if (!platforms || !stations) return table;

    Object.entries(stations).forEach(([stationId, station]) => {
        const ids = station.platform_ids || [];
        if (ids.length < 2) return;

        const stops: TransferPlatform[] = [];
        ids.forEach(pid => {
            const p = platforms[pid];
            if (!p) return;
            const line = lineGroup.get(p.line) ?? p.line;
            stops.push({
                id: pid,
                lineId: line,
                lat: p.lat,
                lon: p.lon,
                bearingDeg: bearingOf(p.geometries?.[0] || [])
            });
        });
        if (stops.length < 2) return;

        transferLinksFor(stationId, stops).forEach(link => {
            table.set(transferKey(stationId, link.lineA, link.lineB), link.minutes);
        });
    });

    return table;
}

/** Groups line ids that carry the same name and physically meet at a station. */
function buildLineGroups(adj: Map<string, RouteEdge[]>, railData: RailData): Map<number, number> {
    const parent = new Map<number, number>();
    const find = (id: number): number => {
        const p = parent.get(id);
        if (p === undefined || p === id) return id;
        const root = find(p);
        parent.set(id, root);
        return root;
    };
    const union = (a: number, b: number) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent.set(rb, ra);
    };

    const nameOf = (id: number) => railData.lines?.[String(id)]?.name;

    adj.forEach(edges => {
        const lineIds = new Set<number>();
        edges.forEach(edge => {
            if (!edge.isWalk) edge.lineIds.forEach(id => lineIds.add(id));
        });
        if (lineIds.size < 2) return;

        const ids = Array.from(lineIds);
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                const nameA = nameOf(ids[i]);
                if (nameA && nameA === nameOf(ids[j])) union(ids[i], ids[j]);
            }
        }
    });

    const groups = new Map<number, number>();
    parent.forEach((_, id) => groups.set(id, find(id)));
    return groups;
}

const graphCache = new WeakMap<RailData, RouteGraph>();

/** Longest chain of joints we will collapse into a single station-to-station edge. */
const MAX_JOINT_CHAIN = 40;

/**
 * station_graph.json is missing a handful of station-to-station links — most
 * importantly the Seto-Ohashi crossing, which leaves all of Shikoku
 * unreachable. The raw section data does contain them, so we rebuild any
 * missing link by collapsing chains of pass-through joints (degree 2) into a
 * single edge. Junction joints are left alone; station_graph already covers
 * those and guessing a through-route there would invent services.
 */
function addContractedJointEdges(
    railData: RailData,
    sections: Map<number, Section>,
    adj: Map<string, RouteEdge[]>
) {
    const incident = new Map<string, { sectionId: number; other: string }[]>();
    const link = (node: string, sectionId: number, other: string) => {
        const list = incident.get(node);
        if (list) list.push({ sectionId, other });
        else incident.set(node, [{ sectionId, other }]);
    };

    sections.forEach(section => {
        if (!section.start || !section.end || section.start === section.end) return;
        link(section.start, section.id, section.end);
        link(section.end, section.id, section.start);
    });

    const isStation = (id: string) => Boolean(railData.stations?.[id]);

    const existing = new Set<string>();
    adj.forEach((edges, from) => edges.forEach(edge => existing.add(`${from}|${edge.to}`)));

    incident.forEach((startEdges, stationId) => {
        if (!isStation(stationId)) return;

        startEdges.forEach(first => {
            const sectionIds = [first.sectionId];
            let previousSection = first.sectionId;
            let cursor = first.other;

            while (!isStation(cursor) && sectionIds.length < MAX_JOINT_CHAIN) {
                const next = (incident.get(cursor) || []).filter(e => e.sectionId !== previousSection);
                if (next.length !== 1) break; // junction or dead end — do not guess
                previousSection = next[0].sectionId;
                sectionIds.push(previousSection);
                cursor = next[0].other;
            }

            if (!isStation(cursor) || cursor === stationId) return;
            if (existing.has(`${stationId}|${cursor}`)) return;

            const lengthByLine = new Map<number, number>();
            let distance = 0;
            sectionIds.forEach(sid => {
                const section = sections.get(sid);
                if (!section) return;
                const km = (section.length || 0) / 1000;
                distance += km;
                if (section.line_id >= 0) {
                    lengthByLine.set(section.line_id, (lengthByLine.get(section.line_id) || 0) + km);
                }
            });

            const lineIds = Array.from(lengthByLine.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([lineId]) => lineId);
            if (lineIds.length === 0) return;

            const edge: RouteEdge = {
                to: cursor,
                distance: distance > 0 ? distance : 0.4,
                lineIds,
                sectionIds,
                isWalk: false
            };
            const list = adj.get(stationId);
            if (list) list.push(edge);
            else adj.set(stationId, [edge]);
            existing.add(`${stationId}|${cursor}`);
        });
    });
}

/**
 * 접합부 너머로 끊긴 이음매를 되살린다.
 *
 * [addContractedJointEdges] 는 **통과형** 접합부(차수 2)만 접는다. 분기형은 들어온
 * 선로에서 나갈 선로를 골라야 해서 건드리지 않는데, 그 바람에 醒ヶ井(JR 도카이)에서
 * 米原(JR 서일본)까지 5.9km 를 두고 **138km 를 돌아갔다.** 그 사이가
 * `醒ヶ井–J_642–J_493–米原` 이고 접합부 차수가 3~4 다.
 *
 * 고를 것이 없는 경우만 넘는다.
 *
 *  1. 체인의 **모든 구간이 같은 `line_id`** 여야 한다. 각도로 고르는 것이 아니라
 *     데이터가 스스로 "같은 노선"이라 말한 것만 따라간다.
 *  2. 그 노선의 **이름이 양 끝 역의 승강장에** 있어야 한다. 소속을 구간에서 읽으면
 *     스쳐 지나가기만 하는 선로도 그 역의 노선이 되어, 名鉄名古屋本線이 下地 를
 *     스치는 것만으로 `下地 ↔ 伊奈` 가 살아난다 — 그 둘은 平井신호장에서 선로가
 *     붙어 있을 뿐 다니는 열차가 없다.
 *
 * 이름으로 보는 이유는 같은 노선이 여러 레코드로 쪼개져 있어서다(東海道線 하나가
 * 330·381·382·484). OpenStreetMap 선로로 43쌍을 따로 맞췄고, OSM 에 자료가 있던
 * 23쌍에서 답이 모두 같았다. 앱(jpApp)의 `domain/engine/GraphRepair.kt` 와 같은 규칙이다.
 */
const MAX_JUNCTION_CHAIN_KM = 30;
const MAX_JUNCTION_CHAIN_SECTIONS = 40;

function addJunctionEdges(
    railData: RailData,
    sections: Map<number, Section>,
    adj: Map<string, RouteEdge[]>
) {
    const incident = new Map<string, { sectionId: number; other: string; lineId: number; km: number }[]>();
    const link = (node: string, entry: { sectionId: number; other: string; lineId: number; km: number }) => {
        const list = incident.get(node);
        if (list) list.push(entry);
        else incident.set(node, [entry]);
    };
    sections.forEach(section => {
        if (!section.start || !section.end || section.start === section.end) return;
        const km = (section.length || 0) / 1000;
        const lineId = section.line_id;
        link(section.start, { sectionId: section.id, other: section.end, lineId, km });
        link(section.end, { sectionId: section.id, other: section.start, lineId, km });
    });

    const isStation = (id: string) => Boolean(railData.stations?.[id]);
    const existing = new Set<string>();
    adj.forEach((edges, from) => edges.forEach(edge => existing.add(`${from}|${edge.to}`)));

    // 역의 노선 소속은 **승강장**에서 읽는다.
    const lineNameOf = (id: number) => railData.lines?.[String(id)]?.name || '';
    const platformLines = new Map<string, Set<string>>();
    Object.values(railData.stations || {}).forEach(station => {
        const names = new Set<string>();
        (station.platform_ids || []).forEach(pid => {
            const name = lineNameOf(railData.platforms?.[pid]?.line ?? -1);
            if (name) names.add(name);
        });
        if (names.size > 0) platformLines.set(station.id, names);
    });

    const push = (from: string, to: string, distance: number, lineId: number, sectionIds: number[]) => {
        const edge: RouteEdge = { to, distance: distance > 0 ? distance : 0.4, lineIds: [lineId], sectionIds, isWalk: false };
        const list = adj.get(from);
        if (list) list.push(edge);
        else adj.set(from, [edge]);
        existing.add(`${from}|${to}`);
    };

    Array.from(incident.keys()).filter(isStation).sort().forEach(start => {
        const startLines = platformLines.get(start);
        if (!startLines) return;

        (incident.get(start) || []).forEach(first => {
            if (isStation(first.other)) return;       // 역↔역은 station_graph 의 몫
            const lineName = lineNameOf(first.lineId);
            if (!lineName || !startLines.has(lineName)) return;

            // 짧은 쪽부터 꺼내 같은 역쌍을 여러 경로로 만나도 가장 짧은 것이 남는다.
            const queue: { km: number; joint: string; used: number[] }[] =
                [{ km: first.km, joint: first.other, used: [first.sectionId] }];
            const settled = new Set<string>();
            while (queue.length > 0) {
                queue.sort((a, b) => a.km - b.km);
                const step = queue.shift()!;
                if (step.km > MAX_JUNCTION_CHAIN_KM) continue;
                if (step.used.length > MAX_JUNCTION_CHAIN_SECTIONS) continue;
                if (settled.has(step.joint)) continue;
                settled.add(step.joint);

                (incident.get(step.joint) || []).forEach(next => {
                    if (next.lineId !== first.lineId || next.other === start) return;
                    if (step.used.includes(next.sectionId)) return;
                    const km = step.km + next.km;
                    if (km > MAX_JUNCTION_CHAIN_KM) return;

                    if (isStation(next.other)) {
                        if (!platformLines.get(next.other)?.has(lineName)) return;
                        if (existing.has(`${start}|${next.other}`)) return;
                        const sectionIds = [...step.used, next.sectionId];
                        push(start, next.other, km, first.lineId, sectionIds);
                        push(next.other, start, km, first.lineId, sectionIds);
                    } else if (!settled.has(next.other)) {
                        queue.push({ km, joint: next.other, used: [...step.used, next.sectionId] });
                    }
                });
            }
        });
    });
}

/** `station_graph.json` 이 말하는 간선만 담는다. 보수는 하지 않는다. */
function addStationGraphEdges(
    railData: RailData,
    sections: Map<number, Section>,
    adj: Map<string, RouteEdge[]>
) {
    const stationGraph = railData.railroadNetwork?.station_graph as
        | Record<string, Record<string, { section_ids?: (number | string)[]; available_lines?: (number | string)[] }>>
        | undefined;
    if (!stationGraph) return;

    Object.entries(stationGraph).forEach(([from, neighbors]) => {
        if (!adj.has(from)) adj.set(from, []);

        Object.entries(neighbors || {}).forEach(([to, conn]) => {
            if (!conn || from === to) return;

            const sectionIds: number[] = [];
            const lengthByLine = new Map<number, number>();
            let distance = 0;

            (conn.section_ids || []).forEach(raw => {
                const sid = Number(raw);
                const sec = sections.get(sid);
                if (!sec) return;
                sectionIds.push(sid);
                const km = (sec.length || 0) / 1000;
                distance += km;
                if (sec.line_id >= 0) {
                    lengthByLine.set(sec.line_id, (lengthByLine.get(sec.line_id) || 0) + km);
                }
            });

            if (sectionIds.length === 0) return;
            if (distance <= 0) distance = 0.4;

            const lineIds = Array.from(lengthByLine.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([lineId]) => lineId);

            if (lineIds.length === 0) return;

            const list = adj.get(from);
            const edge: RouteEdge = { to, distance, lineIds, sectionIds, isWalk: false };
            if (list) list.push(edge);
            else adj.set(from, [edge]);
        });
    });
}

/** 미리 계산해 둔 보수 간선을 얹는다. 이미 있는 방향은 건드리지 않는다. */
function applyGraphPatch(patch: GraphPatch, adj: Map<string, RouteEdge[]>) {
    const existing = new Set<string>();
    adj.forEach((edges, from) => edges.forEach(edge => existing.add(`${from}|${edge.to}`)));

    const add = (from: string, to: string, source: GraphPatchEdge) => {
        if (!from || !to || from === to) return;
        if (existing.has(`${from}|${to}`)) return;
        existing.add(`${from}|${to}`);
        const edge: RouteEdge = {
            to,
            distance: source.km > 0 ? source.km : 0.4,
            lineIds: source.line_ids,
            sectionIds: source.section_ids,
            isWalk: false
        };
        const list = adj.get(from);
        if (list) list.push(edge);
        else adj.set(from, [edge]);
    };

    patch.edges.forEach(edge => {
        add(edge.from, edge.to, edge);
        add(edge.to, edge.from, edge);
    });
}

/**
 * 보수 규칙을 돌려 **새로 생긴 간선만** 뽑는다. `scripts/build_graph_patch.cjs`
 * 의 입구이고, 검증에서는 실려 나가는 파일이 규칙과 같은지 맞대는 데 쓴다.
 *
 * 한 역쌍은 한 줄로만 적는다. 읽는 쪽이 양방향으로 넣는다.
 */
export function collectRepairEdges(railData: RailData): GraphPatchEdge[] {
    const sections = new Map<number, Section>();
    railData.sections?.sections?.forEach(s => sections.set(s.id, s));

    const adj = new Map<string, RouteEdge[]>();
    addStationGraphEdges(railData, sections, adj);

    const seen = new Set<string>();
    adj.forEach((edges, from) => edges.forEach(edge => seen.add(`${from}|${edge.to}`)));

    const collected: GraphPatchEdge[] = [];
    const harvest = (rule: string) => {
        adj.forEach((edges, from) => {
            edges.forEach(edge => {
                if (edge.isWalk || seen.has(`${from}|${edge.to}`)) return;
                seen.add(`${from}|${edge.to}`);
                seen.add(`${edge.to}|${from}`);
                collected.push({
                    from,
                    to: edge.to,
                    km: Math.round(edge.distance * 1000) / 1000,
                    line_ids: edge.lineIds,
                    section_ids: edge.sectionIds,
                    rule
                });
            });
        });
    };

    addContractedJointEdges(railData, sections, adj);
    harvest('joint-chain');
    addJunctionEdges(railData, sections, adj);
    harvest('junction');

    return collected.sort((a, b) => (a.from === b.from ? a.to.localeCompare(b.to) : a.from.localeCompare(b.from)));
}

/**
 * Builds a station-level routing graph.
 *
 * Only `section_ids` are used to decide which lines serve an edge — the
 * `available_lines` field in station_graph.json also contains every line that
 * merely *touches* the endpoint stations, so trusting it invents through
 * services that do not exist (and therefore fake "0 transfer" routes).
 */
export function buildRouteGraph(railData: RailData): RouteGraph {
    const cached = graphCache.get(railData);
    if (cached) return cached;

    const sections = new Map<number, Section>();
    railData.sections?.sections?.forEach(s => sections.set(s.id, s));

    const adj = new Map<string, RouteEdge[]>();
    const pushEdge = (from: string, edge: RouteEdge) => {
        const list = adj.get(from);
        if (list) list.push(edge);
        else adj.set(from, [edge]);
    };

    addStationGraphEdges(railData, sections, adj);

    // 보수 간선은 **빌드 때 미리 계산해 둔 것**을 읽는다. 규칙을 런타임에 다시
    // 돌리면 앱(`GraphRepair.kt`)의 같은 규칙과 갈라질 수 있다. 파일이 없을 때만
    // 규칙으로 되돌아간다 — 그 결과가 곧 파일의 내용이므로 동작은 같다.
    const patch = railData.graphPatch;
    if (patch && patch.edges && patch.edges.length > 0) {
        applyGraphPatch(patch, adj);
    } else {
        addContractedJointEdges(railData, sections, adj);
        addJunctionEdges(railData, sections, adj);
    }

    const lineGroup = buildLineGroups(adj, railData);

    // Same-name stations that are not linked by rails (e.g. JR 東京 / 京葉線 東京)
    // get a walking transfer so multi-company itineraries stay reachable.
    const stationsByName = new Map<string, string[]>();
    Object.values(railData.stations || {}).forEach(st => {
        const list = stationsByName.get(st.name);
        if (list) list.push(st.id);
        else stationsByName.set(st.name, [st.id]);
    });

    const walked = new Set<string>();
    const linkWalk = (a: Station, b: Station, km: number) => {
        if (!a || !b || a.id === b.id) return;
        if (!adj.has(a.id) || !adj.has(b.id)) return;
        const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
        if (walked.has(key)) return;
        walked.add(key);
        pushEdge(a.id, { to: b.id, distance: km, lineIds: [WALK_LINE], sectionIds: [], isWalk: true });
        pushEdge(b.id, { to: a.id, distance: km, lineIds: [WALK_LINE], sectionIds: [], isWalk: true });
    };

    stationsByName.forEach(ids => {
        if (ids.length < 2) return;
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                const a = railData.stations[ids[i]];
                const b = railData.stations[ids[j]];
                if (!a || !b) continue;
                const km = haversineDistance([a.lon, a.lat], [b.lon, b.lat]);
                if (km > MAX_WALK_TRANSFER_KM) continue;
                linkWalk(a, b, km);
            }
        }
    });

    // Differently named stations that sit on top of each other. Bucketed by a
    // 0.01° grid: comparing all 9,000 stations pairwise is 80M checks.
    const CELL = 0.01;
    const cells = new Map<string, Station[]>();
    Object.values(railData.stations || {}).forEach(st => {
        const key = `${Math.floor(st.lat / CELL)}|${Math.floor(st.lon / CELL)}`;
        const bucket = cells.get(key);
        if (bucket) bucket.push(st);
        else cells.set(key, [st]);
    });
    Object.values(railData.stations || {}).forEach(st => {
        const cy = Math.floor(st.lat / CELL);
        const cx = Math.floor(st.lon / CELL);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const bucket = cells.get(`${cy + dy}|${cx + dx}`);
                if (!bucket) continue;
                for (const other of bucket) {
                    if (other.id === st.id || other.name === st.name) continue;
                    const km = haversineDistance([st.lon, st.lat], [other.lon, other.lat]);
                    if (km > MAX_NEARBY_TRANSFER_KM) continue;
                    linkWalk(st, other, km);
                }
            }
        }
    });

    const graph: RouteGraph = {
        adj,
        sections,
        stationsByName,
        lineGroup,
        transferMinutes: buildTransferMinutes(railData, lineGroup)
    };
    graphCache.set(railData, graph);
    return graph;
}

/** The id all same-line variants collapse to; used everywhere a transfer is judged. */
export function groupOf(graph: RouteGraph, lineId: number): number {
    return graph.lineGroup.get(lineId) ?? lineId;
}

/** Every graph node that can stand in for the station the user picked. */
function resolveEndpoints(station: Station, graph: RouteGraph, railData: RailData): Set<string> {
    const ids = new Set<string>();

    if (graph.adj.has(station.id)) ids.add(station.id);
    station.platform_ids?.forEach(pid => {
        if (graph.adj.has(pid)) ids.add(pid);
    });

    // Same-name stations nearby belong to the same "place" for the traveller.
    (graph.stationsByName.get(station.name) || []).forEach(id => {
        if (id === station.id || !graph.adj.has(id)) return;
        const other = railData.stations[id];
        if (!other) return;
        if (haversineDistance([station.lon, station.lat], [other.lon, other.lat]) <= MAX_WALK_TRANSFER_KM) {
            ids.add(id);
        }
    });

    return ids;
}

/* ------------------------------------------------------------------ *
 * Dijkstra over (station, boarded line) states
 * ------------------------------------------------------------------ */

interface HeapItem {
    cost: number;
    node: string;
    line: number;
}

class MinHeap {
    private items: HeapItem[] = [];

    get size() {
        return this.items.length;
    }

    push(item: HeapItem) {
        const items = this.items;
        items.push(item);
        let i = items.length - 1;
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (items[parent].cost <= items[i].cost) break;
            [items[parent], items[i]] = [items[i], items[parent]];
            i = parent;
        }
    }

    pop(): HeapItem | undefined {
        const items = this.items;
        if (items.length === 0) return undefined;
        const top = items[0];
        const last = items.pop()!;
        if (items.length > 0) {
            items[0] = last;
            let i = 0;
            for (;;) {
                const l = i * 2 + 1;
                const r = l + 1;
                let smallest = i;
                if (l < items.length && items[l].cost < items[smallest].cost) smallest = l;
                if (r < items.length && items[r].cost < items[smallest].cost) smallest = r;
                if (smallest === i) break;
                [items[smallest], items[i]] = [items[i], items[smallest]];
                i = smallest;
            }
        }
        return top;
    }
}

interface SearchOptions {
    /** Extra cost (in km) charged for every line change. */
    transferPenalty: number;
    /** Line groups whose usage is multiplied in cost, used to force genuinely different alternatives. */
    penalizedLines?: Set<number>;
    /**
     * When false, never walk between stations — only rails count.
     *
     * Some places are then unreachable, which is the honest answer rather than a
     * failure: it means the rails do not join.
     */
    allowWalkTransfer?: boolean;
}

interface RawPath {
    /** nodes[i] -> nodes[i+1] is travelled with lineIds[i] (0 = walking transfer). */
    nodes: string[];
    lineIds: number[];
    /** Same as lineIds, collapsed onto line groups — this is what decides transfers. */
    groupIds: number[];
    edges: RouteEdge[];
    distance: number;
    transfers: number;
}

const PENALIZED_LINE_MULTIPLIER = 3;

/**
 * 이 역에서 이 환승이 보통 환승의 몇 배로 무거운지.
 *
 * **환승 최소** 목적(MIN_TRANSFER_PENALTY)에는 적용하지 않는다. 그 목적의 벌점은
 * 거리를 압도하는 큰 수여서 "환승 횟수를 먼저 세고 그 다음 거리"라는 뜻인데, 거기에
 * 배수를 곱하면 "쉬운 환승 여덟 번"이 "어려운 환승 한 번"보다 싸져서 목적 자체가
 * 뒤집힌다. 환승 최소는 말 그대로 횟수를 세는 목적이다.
 *
 * 아는 것이 없으면 1 — 예전과 같은 값이다. 승강장 좌표가 없다고 그 역의 환승을 비싸게
 * 매기면, 데이터가 빈 시골역이 도심역보다 불리해진다.
 */
function transferWeight(
    graph: RouteGraph,
    stationId: string,
    from: number,
    to: number,
    penalty: number
): number {
    // 사전식 목적은 횟수만 센다. 배수를 곱하면 목적이 뒤집힌다.
    if (penalty >= MIN_TRANSFER_PENALTY) return 1;
    const minutes = graph.transferMinutes.get(transferKey(stationId, from, to));
    if (minutes === undefined) return 1;
    return transferCostFactor(minutes);
}

function searchPath(
    graph: RouteGraph,
    startIds: Set<string>,
    targetIds: Set<string>,
    options: SearchOptions
): RawPath | null {
    if (startIds.size === 0 || targetIds.size === 0) return null;

    const { transferPenalty, penalizedLines } = options;

    const best = new Map<string, number>();
    const prev = new Map<string, { key: string | null; edge: RouteEdge | null; from: string | null }>();
    const heap = new MinHeap();

    const stateKey = (node: string, line: number) => `${node}|${line}`;

    startIds.forEach(id => {
        const key = stateKey(id, UNBOARDED);
        best.set(key, 0);
        prev.set(key, { key: null, edge: null, from: null });
        heap.push({ cost: 0, node: id, line: UNBOARDED });
    });

    let goalKey: string | null = null;

    while (heap.size > 0) {
        const current = heap.pop()!;
        const currentKey = stateKey(current.node, current.line);
        if (current.cost > (best.get(currentKey) ?? Infinity) + 1e-9) continue;

        // Reaching the target while already on a train ends the search: the
        // heap is ordered by cost, so this is the optimal path for the objective.
        if (current.line !== UNBOARDED && targetIds.has(current.node)) {
            goalKey = currentKey;
            break;
        }

        const edges = graph.adj.get(current.node);
        if (!edges) continue;

        for (const edge of edges) {
            if (edge.isWalk) {
                if (options.allowWalkTransfer === false) continue;
                // Walking only makes sense between two rides.
                if (current.line === UNBOARDED) continue;
                const nextKey = stateKey(edge.to, UNBOARDED);
                const nextCost = current.cost + transferPenalty * 0.7 + edge.distance * 2;
                if (nextCost < (best.get(nextKey) ?? Infinity) - 1e-9) {
                    best.set(nextKey, nextCost);
                    prev.set(nextKey, { key: currentKey, edge, from: current.node });
                    heap.push({ cost: nextCost, node: edge.to, line: UNBOARDED });
                }
                continue;
            }

            // States are keyed by line *group*, so riding across a company
            // border on the same line never looks like a transfer.
            const seenGroups = new Set<number>();
            for (const lineId of edge.lineIds) {
                const group = groupOf(graph, lineId);
                if (seenGroups.has(group)) continue;
                seenGroups.add(group);

                const isTransfer = current.line !== UNBOARDED && current.line !== group;
                const multiplier = penalizedLines?.has(group) ? PENALIZED_LINE_MULTIPLIER : 1;
                // 갈아타는 자리는 지금 서 있는 역(current.node)이다. 거기서 두 노선의
                // 승강장이 얼마나 떨어져 있는지에 따라 값이 달라진다.
                const changeCost = isTransfer
                    ? transferPenalty * transferWeight(graph, current.node, current.line, group, transferPenalty)
                    : 0;
                const nextCost = current.cost + edge.distance * multiplier + changeCost;
                const nextKey = stateKey(edge.to, group);
                if (nextCost < (best.get(nextKey) ?? Infinity) - 1e-9) {
                    best.set(nextKey, nextCost);
                    prev.set(nextKey, { key: currentKey, edge, from: current.node });
                    heap.push({ cost: nextCost, node: edge.to, line: group });
                }
            }
        }
    }

    if (!goalKey) return null;

    const nodes: string[] = [];
    const lineIds: number[] = [];
    const groupIds: number[] = [];
    const edges: RouteEdge[] = [];

    let cursor: string | null = goalKey;
    while (cursor) {
        const link = prev.get(cursor);
        if (!link) break;
        const [node, line] = cursor.split('|');
        nodes.push(node);
        if (link.edge && link.key) {
            const edge = link.edge;
            edges.push(edge);
            if (edge.isWalk) {
                lineIds.push(WALK_LINE);
                groupIds.push(WALK_LINE);
            } else {
                const group = Number(line);
                groupIds.push(group);
                // Show the concrete line this edge is signed with, not the group id.
                lineIds.push(edge.lineIds.find(id => groupOf(graph, id) === group) ?? group);
            }
        }
        cursor = link.key;
    }

    nodes.reverse();
    lineIds.reverse();
    groupIds.reverse();
    edges.reverse();

    if (nodes.length < 2) return null;

    let distance = 0;
    edges.forEach(edge => {
        if (!edge.isWalk) distance += edge.distance;
    });

    let transfers = 0;
    let boarded = UNBOARDED;
    groupIds.forEach(group => {
        if (group === WALK_LINE) {
            transfers += 1;
            boarded = UNBOARDED;
            return;
        }
        if (boarded !== UNBOARDED && boarded !== group) transfers += 1;
        boarded = group;
    });

    return { nodes, lineIds, groupIds, edges, distance, transfers };
}

/* ------------------------------------------------------------------ *
 * Candidate assembly
 * ------------------------------------------------------------------ */

/** Objectives, in the order they are attempted. */
const MIN_TRANSFER_PENALTY = 1_000_000; // effectively lexicographic: transfers first, then km
const BALANCED_PENALTY = 25; // a transfer is worth ~25 km of detour
const FAST_PENALTY = 6; // mostly distance, but still avoids nonsense line-hopping

/** How much worse than the best result an alternative may be before it is dropped. */
const ALT_DISTANCE_SLACK = 1.45;
const ALT_DISTANCE_MARGIN = 5;
const ALT_TRANSFER_SLACK = 2;

const MAX_CANDIDATES_PER_LEG = 4;

/** Score used to order the list — distance with a realistic price on transfers. */
function routeScore(distance: number, transfers: number) {
    return distance + transfers * 12;
}

function buildSegments(path: RawPath, graph: RouteGraph, railData: RailData): RouteSegment[] {
    const nameOf = (id: string) => railData.stations[id]?.name || id;
    const lineInfo = (lineId: number): RouteLineInfo | null => {
        if (lineId === WALK_LINE) return null;
        const meta = railData.lines?.[String(lineId)];
        return {
            id: lineId,
            name: meta?.name || `Line ${lineId}`,
            name_en: meta?.name_en,
            name_kr: meta?.name_kr,
            color: meta?.color || '#64748b'
        };
    };

    const segments: RouteSegment[] = [];
    const segmentGroups: number[] = [];

    for (let i = 0; i < path.lineIds.length; i++) {
        const lineId = path.lineIds[i];
        const group = path.groupIds[i];
        const edge = path.edges[i];
        const from = path.nodes[i];
        const to = path.nodes[i + 1];
        const isWalk = lineId === WALK_LINE;

        const last = segments[segments.length - 1];
        const continues =
            last && !isWalk && last.kind === 'rail' && segmentGroups[segments.length - 1] === group;

        const geometries: [number, number][][] = [];
        edge.sectionIds.forEach(sid => {
            const geometry = graph.sections.get(sid)?.geometry;
            if (geometry && geometry.length > 0) geometries.push(geometry);
        });

        if (continues) {
            last.toStationId = to;
            last.toName = nameOf(to);
            last.stationIds.push(to);
            last.distance += edge.distance;
            last.sectionIds.push(...edge.sectionIds);
            last.geometries.push(...geometries);
        } else {
            segments.push({
                kind: isWalk ? 'walk' : 'rail',
                line: lineInfo(lineId),
                fromStationId: from,
                toStationId: to,
                fromName: nameOf(from),
                toName: nameOf(to),
                stationIds: [from, to],
                distance: isWalk ? 0 : edge.distance,
                sectionIds: [...edge.sectionIds],
                geometries
            });
            segmentGroups.push(group);
        }
    }

    segments.forEach(seg => {
        seg.distance = Math.round(seg.distance * 10) / 10;
    });

    return segments;
}

function toCandidate(
    path: RawPath,
    graph: RouteGraph,
    railData: RailData,
    legIndex: number,
    index: number
): CandidateRoute {
    const segments = buildSegments(path, graph, railData);

    const sectionIds: number[] = [];
    const geometries: [number, number][][] = [];
    segments.forEach(seg => {
        sectionIds.push(...seg.sectionIds);
        geometries.push(...seg.geometries);
    });

    const lines: RouteLineInfo[] = [];
    segments.forEach(seg => {
        if (seg.line && (lines.length === 0 || lines[lines.length - 1].id !== seg.line.id)) {
            lines.push(seg.line);
        }
    });

    const transferStationIds: string[] = [];
    const transfers: string[] = [];
    for (let i = 1; i < segments.length; i++) {
        const id = segments[i].fromStationId;
        if (!transferStationIds.includes(id)) {
            transferStationIds.push(id);
            transfers.push(segments[i].fromName);
        }
    }

    const distance = Math.round(path.distance * 10) / 10;

    // 선로에서 선로로 갈아탄 자리마다 걷는 시간을 더한다. 걸어서 갈아탄 구간(walk)은
    // 빼고 센다 — 그쪽은 이미 도보 간선의 몫이라 두 번 세게 된다.
    let transferWalkMinutes = 0;
    for (let i = 1; i < segments.length; i += 1) {
        const prev = segments[i - 1];
        const cur = segments[i];
        if (prev.kind !== 'rail' || cur.kind !== 'rail') continue;
        if (!prev.line || !cur.line || prev.line.id === cur.line.id) continue;
        const from = groupOf(graph, prev.line.id);
        const to = groupOf(graph, cur.line.id);
        if (from === to) continue;
        transferWalkMinutes +=
            graph.transferMinutes.get(transferKey(cur.fromStationId, from, to)) ??
            TRANSFER_MIN_MINUTES;
    }

    return {
        id: `leg${legIndex}_cand${index}`,
        distance,
        transferCount: path.transfers,
        walkCount: segments.filter(s => s.kind === 'walk').length,
        transferWalkMinutes: Math.round(transferWalkMinutes * 10) / 10,
        stationIds: path.nodes,
        stationNames: path.nodes.map(id => railData.stations[id]?.name || id),
        sectionIds,
        geometries,
        lines,
        segments,
        transfers,
        transferStationIds,
        score: routeScore(distance, path.transfers)
    };
}

/** Lines that carry most of a route — banning these produces a genuinely different itinerary. */
function dominantLines(path: RawPath): number[] {
    const byLine = new Map<number, number>();
    path.groupIds.forEach((group, i) => {
        if (group === WALK_LINE) return;
        byLine.set(group, (byLine.get(group) || 0) + path.edges[i].distance);
    });
    return Array.from(byLine.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([group]) => group);
}

function lineSignature(path: RawPath): string {
    const seq: number[] = [];
    path.groupIds.forEach(group => {
        if (seq.length === 0 || seq[seq.length - 1] !== group) seq.push(group);
    });
    return seq.join('-');
}

/** Fraction of the shorter route's sections that the two routes share. */
function overlapRatio(a: RawPath, b: RawPath): number {
    const setA = new Set<number>();
    a.edges.forEach(e => e.sectionIds.forEach(s => setA.add(s)));
    const setB = new Set<number>();
    b.edges.forEach(e => e.sectionIds.forEach(s => setB.add(s)));
    if (setA.size === 0 || setB.size === 0) return 0;

    let shared = 0;
    setA.forEach(s => {
        if (setB.has(s)) shared += 1;
    });
    return shared / Math.min(setA.size, setB.size);
}

function searchLeg(
    graph: RouteGraph,
    railData: RailData,
    startStation: Station,
    endStation: Station,
    legIndex: number,
    allowWalkTransfer: boolean
): CandidateRoute[] {
    const startIds = resolveEndpoints(startStation, graph, railData);
    const targetIds = resolveEndpoints(endStation, graph, railData);

    // A leg whose endpoints resolve to the same place has nothing to search.
    const isSamePlace =
        startIds.size > 0 &&
        startIds.size === targetIds.size &&
        Array.from(startIds).every(id => targetIds.has(id));
    if (isSamePlace) return [];

    const found: RawPath[] = [];
    const signatures = new Set<string>();

    const accept = (path: RawPath | null): boolean => {
        if (!path) return false;
        const signature = lineSignature(path);
        if (signatures.has(signature)) return false;
        if (found.some(existing => overlapRatio(existing, path) >= 0.9)) return false;
        signatures.add(signature);
        found.push(path);
        return true;
    };

    // Primary objectives: fewest transfers, a realistic balance, and near-shortest.
    [MIN_TRANSFER_PENALTY, BALANCED_PENALTY, FAST_PENALTY].forEach(transferPenalty => {
        if (found.length >= MAX_CANDIDATES_PER_LEG) return;
        accept(searchPath(graph, startIds, targetIds, { transferPenalty, allowWalkTransfer }));
    });

    if (found.length === 0) return [];

    const bestDistance = Math.min(...found.map(p => p.distance));
    const bestTransfers = Math.min(...found.map(p => p.transfers));

    // Alternatives: push the search away from the lines already proposed, but
    // discard anything that is only "different" because it detours absurdly.
    const penalizedLines = new Set<number>();
    for (let attempt = 0; attempt < 3 && found.length < MAX_CANDIDATES_PER_LEG; attempt++) {
        found.forEach(path => dominantLines(path).forEach(id => penalizedLines.add(id)));

        const alternative = searchPath(graph, startIds, targetIds, {
            transferPenalty: BALANCED_PENALTY,
            penalizedLines,
            allowWalkTransfer
        });
        if (!alternative) break;
        if (alternative.distance > bestDistance * ALT_DISTANCE_SLACK + ALT_DISTANCE_MARGIN) break;
        if (alternative.transfers > bestTransfers + ALT_TRANSFER_SLACK) break;
        if (!accept(alternative)) break;
    }

    const candidates = found.map((path, index) => toCandidate(path, graph, railData, legIndex, index));

    candidates.sort((a, b) => a.score - b.score || a.distance - b.distance);

    // Badges describe what each route actually is, rather than which query found it.
    let shortest = candidates[0];
    let fewest = candidates[0];
    candidates.forEach(candidate => {
        if (candidate.distance < shortest.distance) shortest = candidate;
        if (
            candidate.transferCount < fewest.transferCount ||
            (candidate.transferCount === fewest.transferCount && candidate.distance < fewest.distance)
        ) {
            fewest = candidate;
        }
    });
    shortest.isShortest = true;
    fewest.isFewestTransfers = true;
    candidates[0].isRecommended = true;

    return candidates;
}

/**
 * Searches candidate routes connecting a series of waypoints (Start -> Via 1 -> ... -> End).
 * Each leg is solved independently and returns up to 4 meaningfully different itineraries.
 */
export interface RouteSearchOptions {
    /** When false, routes are found using rails only — no walking between stations. */
    allowWalkTransfer?: boolean;
}

export function findCandidateRoutes(
    waypoints: Station[],
    railData: RailData | null,
    options: RouteSearchOptions = {}
): RouteSearchResult {
    if (!railData || !waypoints || waypoints.length < 2) {
        return { legs: [], totalCandidatesCount: 0, hasTooManyCandidates: false };
    }

    const graph = buildRouteGraph(railData);

    const legs: LegSearchResult[] = [];
    let totalCandidatesCount = 0;
    let hasTooManyCandidates = false;

    for (let i = 0; i < waypoints.length - 1; i++) {
        const startStation = waypoints[i];
        const endStation = waypoints[i + 1];
        const candidates = searchLeg(
            graph, railData, startStation, endStation, i, options.allowWalkTransfer !== false
        );

        if (candidates.length === 0) {
            return { legs: [], totalCandidatesCount: 0, hasTooManyCandidates: false };
        }

        totalCandidatesCount += candidates.length;
        if (candidates.length >= MAX_CANDIDATES_PER_LEG) hasTooManyCandidates = true;

        legs.push({ legIndex: i, startStation, endStation, candidates });
    }

    return { legs, totalCandidatesCount, hasTooManyCandidates };
}

export interface RouteSearchProgress {
    currentLeg: number;
    totalLegs: number;
    percent: number;
    startName?: string;
    endName?: string;
}

/**
 * Asynchronously searches candidate routes with UI event loop yields and progress reporting.
 * Prevents UI lockup and allows smooth progress animations.
 */
export async function findCandidateRoutesAsync(
    waypoints: Station[],
    railData: RailData | null,
    onProgress?: (progress: RouteSearchProgress) => void,
    options: RouteSearchOptions = {}
): Promise<RouteSearchResult> {
    if (!railData || !waypoints || waypoints.length < 2) {
        return { legs: [], totalCandidatesCount: 0, hasTooManyCandidates: false };
    }

    const totalLegs = waypoints.length - 1;
    onProgress?.({ currentLeg: 0, totalLegs, percent: 5 });
    await new Promise(r => setTimeout(r, 16));

    const graph = buildRouteGraph(railData);
    onProgress?.({ currentLeg: 0, totalLegs, percent: 15 });
    await new Promise(r => setTimeout(r, 16));

    const legs: LegSearchResult[] = [];
    let totalCandidatesCount = 0;
    let hasTooManyCandidates = false;

    for (let i = 0; i < totalLegs; i++) {
        const startStation = waypoints[i];
        const endStation = waypoints[i + 1];
        
        const basePercent = 15 + Math.round((i / totalLegs) * 80);
        onProgress?.({
            currentLeg: i + 1,
            totalLegs,
            percent: basePercent,
            startName: startStation.name,
            endName: endStation.name
        });
        await new Promise(r => setTimeout(r, 10));

        const candidates = searchLeg(
            graph, railData, startStation, endStation, i, options.allowWalkTransfer !== false
        );

        if (candidates.length === 0) {
            return { legs: [], totalCandidatesCount: 0, hasTooManyCandidates: false };
        }

        totalCandidatesCount += candidates.length;
        if (candidates.length >= MAX_CANDIDATES_PER_LEG) hasTooManyCandidates = true;

        legs.push({ legIndex: i, startStation, endStation, candidates });

        const endPercent = 15 + Math.round(((i + 1) / totalLegs) * 80);
        onProgress?.({
            currentLeg: i + 1,
            totalLegs,
            percent: endPercent,
            startName: startStation.name,
            endName: endStation.name
        });
        await new Promise(r => setTimeout(r, 10));
    }

    onProgress?.({ currentLeg: totalLegs, totalLegs, percent: 100 });
    return { legs, totalCandidatesCount, hasTooManyCandidates };
}
