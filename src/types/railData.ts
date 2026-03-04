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
}
