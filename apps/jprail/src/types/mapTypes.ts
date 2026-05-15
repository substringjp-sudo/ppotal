export interface StaticNode {
    id: string;
    coord: [number, number];
    lineKey: string;
    platforms?: number[][][];
    group?: string;
    isUsed?: boolean;
}

export interface ProcessedStation {
    id: string;
    name: string;
    nodes: StaticNode[];
    centroid: [number, number];
    lines: string[];
    name_en?: string;
    name_kr?: string;
    isJoint?: boolean;
    isUsed?: boolean;
}
