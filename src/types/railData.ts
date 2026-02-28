export interface Company {
    id: number;
    name: string;
    name_en: string;
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
        stationGraph: Record<string, Record<string, { section_ids: number[], available_lines: number[] }>>;
        platformGraph: Record<string, Record<string, PlatformConnection[]>>;
    };
    stationsLod?: StationLod[];
}
