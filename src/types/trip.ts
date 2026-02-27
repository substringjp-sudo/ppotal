export interface Trip {
    id: string;
    name?: string;
    createdAt?: string;
    start: string;
    end: string;
    startId?: string;
    endId?: string;
    distance: number;
    path: string[];
    waypoints: string[];
    geometries: [number, number][][]; // Array of segments, each segment is array of points [lon, lat]
    sectionIds: number[];
}
