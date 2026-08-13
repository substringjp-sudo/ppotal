/**
 * How the rail network is drawn on the map.
 *
 * The geometry we ship is surveyed track: every curve, every kink where the
 * line follows a river or threads between buildings. That is the truth, but it
 * is not how anyone draws a rail map. These transforms trade some of that
 * truth for legibility — and because they are pure functions of a section's
 * geometry, each result is cached against the array it came from and computed
 * at most once per section per mode.
 */

export type MapShapeMode = 'geographic' | 'smooth' | 'schematic';

export const MAP_SHAPE_MODES: MapShapeMode[] = ['geographic', 'smooth', 'schematic'];

type Ring = [number, number][];

const caches: Record<MapShapeMode, WeakMap<Ring, Ring>> = {
    geographic: new WeakMap(),
    smooth: new WeakMap(),
    schematic: new WeakMap()
};

/** Roughly 45m at Japanese latitudes — below the width of the drawn line. */
const SIMPLIFY_TOLERANCE = 0.0004;
/** Schematic mode throws away far more, since it is redrawing the shape anyway. */
const SCHEMATIC_TOLERANCE = 0.004;
const CHAIKIN_PASSES = 2;

/**
 * Longitude degrees are shorter than latitude degrees away from the equator,
 * so an angle computed in raw lon/lat is not the angle you see on screen. Work
 * in a space stretched by cos(latitude) and everything is isotropic again.
 */
const lonScale = (lat: number) => Math.cos((lat * Math.PI) / 180) || 1;

/** Perpendicular distance from p to the segment ab, in the scaled space. */
function pointSegmentDistance(p: [number, number], a: [number, number], b: [number, number], sx: number): number {
    const px = p[0] * sx, py = p[1];
    const ax = a[0] * sx, ay = a[1];
    const bx = b[0] * sx, by = b[1];
    const dx = bx - ax, dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / lengthSquared;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Douglas-Peucker, iterative so a long section cannot blow the stack. Returns
 * the indices it kept rather than the points, so a caller can still recover
 * which stretch of the original each surviving segment stands for.
 */
function simplifyIndices(points: Ring, tolerance: number, sx: number): number[] {
    if (points.length < 3) return points.map((_, i) => i);

    const keep = new Uint8Array(points.length);
    keep[0] = 1;
    keep[points.length - 1] = 1;

    const stack: [number, number][] = [[0, points.length - 1]];
    while (stack.length) {
        const [first, last] = stack.pop()!;
        let worst = 0;
        let worstIndex = -1;
        for (let i = first + 1; i < last; i++) {
            const distance = pointSegmentDistance(points[i], points[first], points[last], sx);
            if (distance > worst) {
                worst = distance;
                worstIndex = i;
            }
        }
        if (worstIndex >= 0 && worst > tolerance) {
            keep[worstIndex] = 1;
            stack.push([first, worstIndex], [worstIndex, last]);
        }
    }

    const out: number[] = [];
    for (let i = 0; i < points.length; i++) if (keep[i]) out.push(i);
    return out;
}

const simplify = (points: Ring, tolerance: number, sx: number): Ring =>
    simplifyIndices(points, tolerance, sx).map(i => points[i]);

/**
 * Chaikin corner cutting: replace every corner with the two points a quarter
 * and three quarters along its arms. The ends stay put, so the line still
 * meets its stations, but every junction between them becomes a curve.
 */
function chaikin(points: Ring): Ring {
    if (points.length < 3) return points;
    const out: Ring = [points[0]];
    for (let i = 0; i < points.length - 1; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[i + 1];
        out.push([x0 + (x1 - x0) * 0.25, y0 + (y1 - y0) * 0.25]);
        out.push([x0 + (x1 - x0) * 0.75, y0 + (y1 - y0) * 0.75]);
    }
    out.push(points[points.length - 1]);
    return out;
}

/**
 * The metro-map connector: from a to b using one 45° diagonal and one straight
 * run. There are two ways round — diagonal first or straight first — and we
 * take whichever bends closer to where the real track actually goes, so the
 * schematic still reads as the same line.
 */
function octilinear(a: [number, number], b: [number, number], reference: Ring, sx: number): Ring {
    const ax = a[0] * sx, ay = a[1];
    const bx = b[0] * sx, by = b[1];
    const dx = bx - ax, dy = by - ay;
    const adx = Math.abs(dx), ady = Math.abs(dy);

    if (adx < 1e-9 && ady < 1e-9) return [a, b];

    let cornerA: [number, number];
    let cornerB: [number, number];
    if (adx > ady) {
        // Diagonal consumes all the vertical travel; the rest runs horizontally.
        cornerA = [ax + Math.sign(dx) * ady, by];      // diagonal first
        cornerB = [bx - Math.sign(dx) * ady, ay];      // straight first
    } else {
        cornerA = [bx, ay + Math.sign(dy) * adx];      // diagonal first
        cornerB = [ax, by - Math.sign(dy) * adx];      // straight first
    }

    // Which corner sits nearer the real track?
    const cost = (corner: [number, number]) => {
        let worst = 0;
        for (const p of reference) {
            const d = Math.min(
                pointSegmentDistance(p, a, [corner[0] / sx, corner[1]], sx),
                pointSegmentDistance(p, [corner[0] / sx, corner[1]], b, sx)
            );
            if (d > worst) worst = d;
        }
        return worst;
    };

    const corner = cost(cornerA) <= cost(cornerB) ? cornerA : cornerB;
    return [a, [corner[0] / sx, corner[1]], b];
}

/**
 * Reshape one section's geometry for the given mode. The same array in gives
 * the same array out, so callers can compare by identity.
 */
export function shapeGeometry(geometry: Ring, mode: MapShapeMode): Ring {
    if (mode === 'geographic' || !geometry || geometry.length < 3) return geometry;

    const cache = caches[mode];
    const cached = cache.get(geometry);
    if (cached) return cached;

    const sx = lonScale(geometry[Math.floor(geometry.length / 2)][1]);
    let result: Ring;

    if (mode === 'smooth') {
        result = simplify(geometry, SIMPLIFY_TOLERANCE, sx);
        for (let pass = 0; pass < CHAIKIN_PASSES; pass++) result = chaikin(result);
    } else {
        // Straighten hard first: what survives is the section's real shape, and
        // a section that genuinely doglegs keeps its bend instead of being
        // flattened into one wrong diagonal.
        const kept = simplifyIndices(geometry, SCHEMATIC_TOLERANCE, sx);
        result = [geometry[kept[0]]];
        for (let i = 0; i < kept.length - 1; i++) {
            // Each leg is judged only against the stretch of track it replaces.
            const reference = geometry.slice(kept[i], kept[i + 1] + 1);
            const leg = octilinear(geometry[kept[i]], geometry[kept[i + 1]], reference, sx);
            for (let k = 1; k < leg.length; k++) result.push(leg[k]);
        }
    }

    cache.set(geometry, result);
    return result;
}
