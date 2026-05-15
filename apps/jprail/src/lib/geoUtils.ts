// Points are [lat, lng]
export const convexHull = (points: [number, number][]): [number, number][] => {
    if (points.length < 3) return points;

    // Sort by lat, then lng
    const sorted = [...points].sort((a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);

    // Cross product of vectors OA and OB
    // A value > 0 means counter-clockwise turn, < 0 clockwise, 0 collinear
    const cross = (o: [number, number], a: [number, number], b: [number, number]) => {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    };

    const lower: [number, number][] = [];
    for (const p of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }

    const upper: [number, number][] = [];
    for (const p of sorted.reverse()) {
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }

    lower.pop();
    upper.pop();
    return [...lower, ...upper];
};
