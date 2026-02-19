export interface Trip {
    id: string;
    start: string;
    end: string;
    distance: number;
    path: string[];
    waypoints: string[];
    geometries: number[][][]; // Array of segments, each segment is array of points [lon, lat]
}
