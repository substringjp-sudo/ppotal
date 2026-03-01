
export interface StationNode {
    id: string; // station_id (from stations.json)
    name: string;
    name_en?: string;
    name_kr?: string;
    company: string; // company NAME (looked up)
    company_en?: string;
    company_kr?: string;
    line: string; // line NAME (looked up)
    line_en?: string;
    line_kr?: string;
    companyId: number;
    lineId: number;
    fullLineId: string; // "CompanyID::LineID" format
    coords: [number, number]; // [lon, lat]
}

export interface Edge {
    to: string;
    distance: number;
    geometry: [number, number][];
    lineId?: string; // Add lineId for coloring edges correctly
    sectionIds?: number[]
}

export interface LineSegment {
    stations: string[];
    edges: { from: string, to: string, distance: number }[];
    geometry: [number, number][];
}



export const haversineDistance = (coords1: [number, number], coords2: [number, number]): number => {
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
;
