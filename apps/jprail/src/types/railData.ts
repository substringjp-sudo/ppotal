export interface Company {
    id: number;
    name: string;
    name_en: string;
    name_kr?: string;
    color?: string;
    category_id?: number;
}

export interface HierarchyLine {
    id: number;
    corp_id: number;
    platforms: {
        platform_id: string;
        station_id: string;
    }[];
    sections?: number[];
}

export interface HierarchyCompany {
    id: number;
    lines: Record<string, string[] | HierarchyLine>;
}

export interface Line {
    id: number;
    name: string;
    name_en: string;
    name_kr?: string;
    corp_id: number;
    total_length?: number;
    color?: string; // Optional, can be derived or fetched from constants if not in JSON
}

export interface Platform {
    code: string;
    name: string;
    isMatched: boolean;
    company: number; // corp_id
    line: number; // line_id
    lat: number;
    lon: number;
    geometries: [number, number][][]; // MultiLineString-like for platform shape
    length?: number;
}

export interface Station {
    id: string; // group_id or station_id
    name: string;
    name_en?: string;
    name_kr?: string;
    lat: number;
    lon: number;
    platform_ids: string[];
    prefecture_id?: string;
    city_id?: string;
    neighbors?: { [neighborId: string]: { connections: NetworkConnection[] } };
}

export interface Section {
    id: number;
    company_id: number;
    line_id: number;
    geometry: [number, number][]; // LineString
    start: string; // Station group_id or platform_id
    end: string;
    length: number; // In integer meters
}

export interface Joint {
    id: string;
    coordinates: [number, number];
    line_ids: number[];
    /** 이 조인트에서 직통(through-route)으로 연결된 섹션 쌍 목록.
     * 각 쌍 [secA, secB]는 secA로 진입 시 secB로 직통이고 그 반대도 같음. */
    through_pairs?: [string, string][];
}

export interface SectionNeighbor {
    station_id: string;
    name: string;
    line_id: number;
    available_lines: number[];
    sections: number[];
    skipped?: string[];
}

export interface StationLod {
    id: string;
    name: string;
    name_en?: string;
    name_kr?: string;
    z: number;
    lines: string[];
    nodes: { id: string, c: [number, number] }[];
    c: [number, number];
}

export interface PlatformConnection {

    point: [number, number];
    point_index: number;
    neighbors: SectionNeighbor[];
}

export interface NetworkConnection {
    line_id: number;
    company_id: number;
    section_ids: string[];
    via_joints: string[];
    distance: number;
    parallel_section_ids?: string[];
}

export interface NetworkStationGraph {
    [stationId: string]: {
        [neighborId: string]: {
            connections: NetworkConnection[];
        };
    };
}

export interface NetworkLineData {
    [lineId: string]: {
        line_id: number;
        company_id: number;
        name: string;
        name_en: string;
        color: string;
        sections: string[];
        stations: string[];
    };
}

export interface NetworkSection {
    start: string;
    end: string;
    start_type: 'station' | 'joint';
    end_type: 'station' | 'joint';
    line_id: number;
    company_id: number;
    length: number;
}

export interface RailroadNetwork {
    _metadata: {
        version: string;
        generated: string;
        stats: Record<string, number>;
    };
    station_graph: NetworkStationGraph;
    line_data: NetworkLineData;
    sections: Record<string, NetworkSection>;
}

/**
 * 미리 계산해 둔 그래프 보수 간선 한 줄.
 *
 * `station_graph.json` 은 노선이 갈리는 자리에서 간선을 빠뜨린다. 그걸 되살리는
 * 규칙이 웹(`lib/routeSearch`)과 앱(`domain/engine/GraphRepair.kt`)에 **따로**
 * 구현되어 있어 한쪽만 틀리는 일이 실제로 있었다. 그래서 규칙은 빌드 때 한 번만
 * 돌리고(`scripts/build_graph_patch.cjs`) 결과를 `public/rail/graph_patch.json`
 * 으로 내보낸다. 앱과 웹은 이 목록을 읽기만 한다.
 *
 * 한 역쌍은 한 줄로만 적혀 있고, 읽는 쪽이 양방향으로 넣는다.
 */
export interface GraphPatchEdge {
    from: string;
    to: string;
    /** 두 역 사이 선로 길이(km). */
    km: number;
    /** 길이가 긴 노선부터. */
    line_ids: number[];
    section_ids: number[];
    /** 어느 규칙이 만들었는지. 사람이 읽기 위한 것으로 적용에는 쓰지 않는다. */
    rule?: string;
}

export interface GraphPatch {
    edges: GraphPatchEdge[];
}

/**
 * `rail/rules.json` — 앱과 웹이 함께 읽는 값.
 *
 * 같은 뜻을 가진 값이 Kotlin 과 TypeScript 에 따로 적혀 있으면 언젠가 갈라진다.
 * 실제로 갈라졌다 — 이름이 같은 역을 걸어서 잇는 거리가 웹 1.5km, 앱 1.0km 였다.
 * 여기 있는 것만 런타임에 읽고, 나머지(환승 시간 어림값 등)는 양쪽 코드에 상수로
 * 두되 이 파일과 같은지 검증이 본다.
 */
export interface RailRules {
    walk_transfer?: {
        same_name_max_km?: number;
        nearby_max_km?: number;
    };
}

export interface RailData {
    companies: Record<string, Company>;
    lines: Record<string, Line>;
    platforms: Record<string, Platform>;
    stations: Record<string, Station>;
    sections: {
        sections: Section[]; // Original high-res data
        lod?: {
            low: Section[];
            mid: Section[];
            high: Section[];
        }
    };
    hierarchy: {
        companies: Record<string, HierarchyCompany>;
    };
    joints: { joints: Joint[] };
    railroadGraph?: {
        stationGraph: NetworkStationGraph | Record<string, Record<string, { section_ids: number[], available_lines: number[] }>>;
    };
    railroadNetwork?: RailroadNetwork;
    stationsLod?: StationLod[];
    /** 빌드 때 미리 계산한 보수 간선. 없으면 규칙을 그 자리에서 돌린다. */
    graphPatch?: GraphPatch;
    /** 앱과 함께 읽는 값. 없으면 아래 기본값을 쓴다. */
    rules?: RailRules;
}

/**
 * 운행계통(運転系統).
 *
 * `lines.json` 이 담은 **선적(線籍)** 과는 다른 층이다. 원본 국토수치정보 N02 는
 * 선적만 담기 때문에 `山手線`(320)은 시나가와~다바타 17역이 전부이고, 우리가 아는
 * 순환선은 선적 세 개를 밟는 운행계통이다. `京浜東北線`·`湘南新宿ライン` 은 데이터에
 * 아예 없다.
 *
 * `scripts/build_services.mjs` 가 OpenStreetMap 에서 만들고, 정차역 순서가 실제
 * 선로에서 이어지는지 검증까지 끝낸 결과가 `public/rail/services.json` 이다.
 *
 * © OpenStreetMap contributors, ODbL 1.0
 */
export interface ServiceGroup {
    id: string;
    name: string;
    name_kr?: string;
    color: string;
    kind: 'LOOP' | 'LIMITED_EXPRESS' | 'RAPID' | 'THROUGH' | 'TRACK';
    is_loop: boolean;
    /** 정차역 ID 를 운행 순서대로. `is_loop` 면 마지막에서 첫 역으로 돌아온다. */
    stops: string[];
    /** 이 계통이 밟는 구간 ID. 지도에 그릴 선이자 완승률을 셀 단위. */
    sections: number[];
}

export interface ServicesFile {
    services: Record<string, ServiceGroup>;
}

/** 지도의 선을 무엇으로 묶어 보여줄지. */
export type GroupingMode = 'track' | 'service';
