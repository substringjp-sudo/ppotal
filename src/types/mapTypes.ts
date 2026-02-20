export interface StaticNode {
    id: string;
    coord: [number, number];
    lineKey: string;
    platforms?: [number, number][][];
    group?: string;
}

export interface ProcessedStation {
    nodes: StaticNode[];
    centroid: [number, number];
    lines: string[];
    name_en?: string;
    isJoint?: boolean;
}
