export interface Company {
    id: number;
    name: string;
    name_en: string;
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
    lat: number;
    lon: number;
    platform_ids: string[];
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

export interface RailData {
    companies: Record<string, Company>;
    lines: Record<string, Line>;
    platforms: Record<string, Platform>;
    stations: Record<string, Station>;
    sections: { sections: Section[] };
    hierarchy: any; // Keep hierarchy flexible for now or define strictly if needed
    joints: { joints: Joint[] };
    railroadGraph: Record<string, Record<string, number[]>>;
}
