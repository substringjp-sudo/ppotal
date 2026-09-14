/**
 * 되짚기 애니메이션의 그리기.
 *
 * Leaflet 위가 아니라 **독립 캔버스**에 그린다. 이유가 둘이다.
 *  1. 캔버스 하나만 녹화하면 되므로 `captureStream()` 이 그대로 통한다.
 *  2. 사용자가 지도를 옮기거나 확대해도 영상 프레임이 흔들리지 않는다.
 *
 * 안드로이드 앱(jpApp)의 `ReplayRenderer` 와 같은 규칙(색·굵기·투영)을 쓴다.
 */

import type { FeatureCollection, Geometry } from 'geojson';
import type { GeoBounds } from './tripAnimation';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const MAX_LAT = 85.05112878;

/** 2px 보다 촘촘한 점은 건너뛴다. 전국을 한 화면에 놓아도 그릴 양이 폭발하지 않는다. */
const MIN_SEGMENT_PX = 2;

/** 꺼진 지도. 아직 안 간 곳은 여기까지만 보인다. */
export const REPLAY_COLORS = {
    sea: '#080D16',
    landFill: '#141C28',
    landEdge: '#1F2A3A',
    rail: '#2B3949',
    distance: '#60A5FA'
};

/** 일본 철도망이 들어있는 대략적인 경계. */
export const JAPAN_BOUNDS: GeoBounds = { minLat: 25.8, minLon: 127.4, maxLat: 45.8, maxLon: 146.2 };

export function mercatorY(latDeg: number): number {
    const lat = Math.min(MAX_LAT, Math.max(-MAX_LAT, latDeg));
    return Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) * DEG;
}

/** 경계에 여유를 주고, 너무 좁으면 최소 크기까지 벌린다. */
export function padBounds(bounds: GeoBounds, minSpanDeg: number, marginDeg: number): GeoBounds {
    const latPad = Math.max(0, (minSpanDeg - (bounds.maxLat - bounds.minLat)) / 2);
    const lonPad = Math.max(0, (minSpanDeg - (bounds.maxLon - bounds.minLon)) / 2);
    return {
        minLat: bounds.minLat - latPad - marginDeg,
        minLon: bounds.minLon - lonPad - marginDeg,
        maxLat: bounds.maxLat + latPad + marginDeg,
        maxLon: bounds.maxLon + lonPad + marginDeg
    };
}

/** 카메라를 고정해 두고 쓰는 좌표 변환기. 매 프레임 같은 값을 다시 세지 않는다. */
export class Projector {
    readonly pxPerDeg: number;
    private readonly centerLon: number;
    private readonly centerY: number;
    private readonly halfW: number;
    private readonly halfH: number;

    constructor(bounds: GeoBounds, width: number, height: number, paddingPx = 24) {
        const usableW = Math.max(1, width - paddingPx * 2);
        const usableH = Math.max(1, height - paddingPx * 2);
        const lonSpan = Math.max(1e-6, bounds.maxLon - bounds.minLon);
        const ySpan = Math.max(1e-6, mercatorY(bounds.maxLat) - mercatorY(bounds.minLat));

        this.pxPerDeg = Math.min(usableW / lonSpan, usableH / ySpan);
        this.centerLon = (bounds.minLon + bounds.maxLon) / 2;
        this.centerY = (mercatorY(bounds.maxLat) + mercatorY(bounds.minLat)) / 2;
        this.halfW = width / 2;
        this.halfH = height / 2;
    }

    x(lon: number): number {
        return (lon - this.centerLon) * this.pxPerDeg + this.halfW;
    }

    y(mercY: number): number {
        return -(mercY - this.centerY) * this.pxPerDeg + this.halfH;
    }

    yOfLat(lat: number): number {
        return this.y(mercatorY(lat));
    }
}

/**
 * 칠해진 선의 굵기.
 *
 * 축척을 따라가되 전국에서도 보일 만큼은 남긴다. 하한과 상한을 **프레임 너비에**
 * 맞추는 이유는, 작은 미리보기와 큰 영상에서 화면 대비 굵기가 같아야 미리 본
 * 그대로의 영상이 나오기 때문이다.
 */
export function paintWidthFor(projector: Projector, frameWidth: number): number {
    const floor = Math.max(1.6, frameWidth / 260);
    return Math.min(floor * 3.2, Math.max(floor, projector.pxPerDeg / 26));
}

/** `[경도, 위도]` 점들을 경로에 잇는다. 마지막 점은 반드시 남긴다 — 그 점이 획의 끝이다. */
function appendLine(path: Path2D, points: [number, number][], view: Projector, close: boolean): void {
    if (points.length < 2) return;
    let lastX = view.x(points[0][0]);
    let lastY = view.yOfLat(points[0][1]);
    path.moveTo(lastX, lastY);
    const last = points.length - 1;
    for (let i = 1; i <= last; i += 1) {
        const px = view.x(points[i][0]);
        const py = view.yOfLat(points[i][1]);
        if (i !== last && Math.abs(px - lastX) < MIN_SEGMENT_PX && Math.abs(py - lastY) < MIN_SEGMENT_PX) continue;
        path.lineTo(px, py);
        lastX = px;
        lastY = py;
    }
    if (close) path.closePath();
}

export function buildLandPath(rings: [number, number][][], view: Projector): Path2D {
    const path = new Path2D();
    for (const ring of rings) appendLine(path, ring, view, true);
    return path;
}

export function buildRailPath(lines: [number, number][][], view: Projector): Path2D {
    const path = new Path2D();
    for (const one of lines) appendLine(path, one, view, false);
    return path;
}

export function buildStrokePath(geometries: [number, number][][], view: Projector): Path2D {
    const path = new Path2D();
    for (const one of geometries) appendLine(path, one, view, false);
    return path;
}

/** 자라는 중인 획의 끝점. 지금 어디를 지나는지 찍어 주는 데 쓴다. */
export function tipOf(geometries: [number, number][][], view: Projector): [number, number] | null {
    const lastLine = geometries[geometries.length - 1];
    if (!lastLine || lastLine.length === 0) return null;
    const point = lastLine[lastLine.length - 1];
    return [view.x(point[0]), view.yOfLat(point[1])];
}

/** 바다·땅·아직 안 간 철도망. 카메라가 그대로면 한 번만 그리면 된다. */
export function drawReplayBase(
    ctx: CanvasRenderingContext2D,
    land: Path2D,
    rail: Path2D,
    width: number,
    height: number
): void {
    // 가는 선도 프레임 크기를 따라간다. 큰 영상에서 1px 로 그으면 미리보기보다 가늘게 보인다.
    const hairline = Math.min(2, Math.max(0.8, width / 560));

    ctx.fillStyle = REPLAY_COLORS.sea;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = REPLAY_COLORS.landFill;
    ctx.fill(land, 'evenodd');
    ctx.strokeStyle = REPLAY_COLORS.landEdge;
    ctx.lineWidth = hairline;
    ctx.stroke(land);

    ctx.strokeStyle = REPLAY_COLORS.rail;
    ctx.lineWidth = hairline;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(rail);
}

/** 칠해진 획 하나. 번짐을 먼저 깔아야 어두운 바탕에서 선이 떠 보인다. */
export function drawReplayStroke(
    ctx: CanvasRenderingContext2D,
    path: Path2D,
    color: string,
    width: number,
    glowAlpha = 0.28,
    glowScale = 1.5
): void {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.save();
    ctx.globalAlpha = glowAlpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width * (1 + glowScale);
    ctx.stroke(path);
    ctx.restore();

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke(path);
}

export function drawReplayTip(
    ctx: CanvasRenderingContext2D,
    center: [number, number],
    color: string,
    width: number
): void {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(center[0], center[1], width * 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(center[0], center[1], width * 0.55, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * 날짜·누적 거리를 **픽셀에 구워 넣는다.**
 *
 * DOM 으로 겹쳐 놓으면 화면에서는 보이지만 녹화된 영상에는 안 들어간다.
 */
export function drawReplayOverlay(
    ctx: CanvasRenderingContext2D,
    date: string,
    paintedKm: number,
    width: number,
    height: number
): void {
    const margin = width * 0.06;
    const font = 'system-ui, -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';

    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = width * 0.012;
    ctx.shadowOffsetY = width * 0.004;

    // 탄 날을 모르는 여정은 날짜만 비운다. **누적 거리까지 같이 사라지면 안 된다** —
    // 지도가 채워지는 동안 숫자가 없어지면 화면이 멈춘 것처럼 보인다.
    const dateSize = width * 0.085;
    let baseline = margin + dateSize;
    if (date) {
        ctx.font = `900 ${dateSize}px ${font}`;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(date.replace(/-/g, '.'), margin, baseline);
    }

    const kmSize = width * 0.04;
    ctx.font = `700 ${kmSize}px ${font}`;
    ctx.fillStyle = REPLAY_COLORS.distance;
    baseline += kmSize * 1.45;
    ctx.fillText(`${Math.round(paintedKm).toLocaleString()} km`, margin, baseline);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.font = `700 ${width * 0.03}px ${font}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('JapanRailNote', margin, height - margin);
    ctx.restore();
}

/** GeoJSON 경계에서 그릴 수 있는 고리만 뽑아낸다. */
export function extractRings(collection: FeatureCollection | null): [number, number][][] {
    if (!collection?.features) return [];
    const rings: [number, number][][] = [];

    const pushPolygon = (polygon: number[][][]) => {
        for (const ring of polygon) {
            if (ring.length >= 3) rings.push(ring as [number, number][]);
        }
    };

    const walk = (geometry: Geometry | null) => {
        if (!geometry) return;
        if (geometry.type === 'Polygon') pushPolygon(geometry.coordinates);
        else if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach(pushPolygon);
        else if (geometry.type === 'GeometryCollection') geometry.geometries.forEach(walk);
    };

    for (const feature of collection.features) walk(feature.geometry);
    return rings;
}
