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

/** 본토 일본(혼슈, 홋카이도, 규슈, 시코쿠) 중심 경계 - 북방영토 및 아마미열도 제외 */
export const MAINLAND_BOUNDS: GeoBounds = {
    minLon: 129.2,
    maxLon: 145.8,
    minLat: 30.8,
    maxLat: 45.6
};

/** 오키나와 본섬 & 유이레일 모노레일 경계 */
export const OKINAWA_BOUNDS: GeoBounds = {
    minLon: 127.60,
    maxLon: 128.05,
    minLat: 26.10,
    maxLat: 26.75
};

/** 기본 전국 경계 (본토 중심) */
export const JAPAN_BOUNDS: GeoBounds = MAINLAND_BOUNDS;

// ---------------------------------------------------------------- 테마 및 색상

export interface ReplayTheme {
    id: string;
    labelKo: string;
    labelEn: string;
    labelJa: string;
    sea: string;
    landFill: string;
    landEdge: string;
    rail: string;
    distance: string;
    overlayText: string;
    insetBorder: string;
    dark: boolean;
}

export const REPLAY_THEMES: Record<string, ReplayTheme> = {
    dark: {
        id: 'dark',
        labelKo: '미드나잇 다크',
        labelEn: 'Midnight Dark',
        labelJa: 'ミッドナイト',
        sea: '#080D16',
        landFill: '#141C28',
        landEdge: '#1F2A3A',
        rail: '#2B3949',
        distance: '#60A5FA',
        overlayText: '#FFFFFF',
        insetBorder: 'rgba(255, 255, 255, 0.15)',
        dark: true,
    },
    black: {
        id: 'black',
        labelKo: '딥 블랙',
        labelEn: 'Deep Black',
        labelJa: 'ディープブラック',
        sea: '#000000',
        landFill: '#111111',
        landEdge: '#222222',
        rail: '#333333',
        distance: '#38BDF8',
        overlayText: '#FFFFFF',
        insetBorder: 'rgba(255, 255, 255, 0.2)',
        dark: true,
    },
    navy: {
        id: 'navy',
        labelKo: '오션 네이비',
        labelEn: 'Ocean Navy',
        labelJa: 'オーシャンネイビー',
        sea: '#0A192F',
        landFill: '#172A45',
        landEdge: '#203A63',
        rail: '#304E7C',
        distance: '#64FFDA',
        overlayText: '#E6F1FF',
        insetBorder: 'rgba(100, 255, 218, 0.25)',
        dark: true,
    },
    light: {
        id: 'light',
        labelKo: '모던 화이트',
        labelEn: 'Modern White',
        labelJa: 'モダンホワイト',
        sea: '#E2E8F0',
        landFill: '#FFFFFF',
        landEdge: '#CBD5E1',
        rail: '#94A3B8',
        distance: '#2563EB',
        overlayText: '#0F172A',
        insetBorder: 'rgba(15, 23, 42, 0.18)',
        dark: false,
    },
    cream: {
        id: 'cream',
        labelKo: '클래식 크림',
        labelEn: 'Classic Cream',
        labelJa: 'クラシッククリーム',
        sea: '#F3EFE6',
        landFill: '#FAF8F5',
        landEdge: '#DDD6C8',
        rail: '#B8AF9E',
        distance: '#D97706',
        overlayText: '#292524',
        insetBorder: 'rgba(41, 37, 36, 0.18)',
        dark: false,
    },
};

/** 기존 REPLAY_COLORS 하위 호환 */
export const REPLAY_COLORS = REPLAY_THEMES.dark;

/** 사용자가 지정한 임의의 HEX 바다색으로 테마를 보정하여 생성 */
export function resolveReplayTheme(themeId: string, customSeaColor?: string): ReplayTheme {
    if (themeId !== 'custom' || !customSeaColor) {
        return REPLAY_THEMES[themeId] || REPLAY_THEMES.dark;
    }

    // HEX to RGB
    const hex = customSeaColor.replace(/^#/, '');
    const num = parseInt(hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex, 16) || 0;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const isDark = lum < 135;

    if (isDark) {
        return {
            id: 'custom',
            labelKo: '사용자 지정',
            labelEn: 'Custom Color',
            labelJa: 'カスタム',
            sea: customSeaColor,
            landFill: adjustBrightness(customSeaColor, 20),
            landEdge: adjustBrightness(customSeaColor, 40),
            rail: adjustBrightness(customSeaColor, 60),
            distance: '#38BDF8',
            overlayText: '#FFFFFF',
            insetBorder: 'rgba(255, 255, 255, 0.2)',
            dark: true,
        };
    } else {
        return {
            id: 'custom',
            labelKo: '사용자 지정',
            labelEn: 'Custom Color',
            labelJa: 'カスタム',
            sea: customSeaColor,
            landFill: '#FFFFFF',
            landEdge: adjustBrightness(customSeaColor, -25),
            rail: adjustBrightness(customSeaColor, -45),
            distance: '#2563EB',
            overlayText: '#0F172A',
            insetBorder: 'rgba(15, 23, 42, 0.2)',
            dark: false,
        };
    }
}

function adjustBrightness(hexColor: string, delta: number): string {
    const hex = hexColor.replace(/^#/, '');
    const num = parseInt(hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex, 16) || 0;
    const r = Math.min(255, Math.max(0, ((num >> 16) & 255) + delta));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + delta));
    const b = Math.min(255, Math.max(0, (num & 255) + delta));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ---------------------------------------------------------------- 지리 및 투영

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

/** 카메라를 고정해 두고 쓰는 좌표 변환기. */
export class Projector {
    readonly pxPerDeg: number;
    private readonly centerLon: number;
    private readonly centerY: number;
    private readonly halfW: number;
    private readonly halfH: number;
    private readonly offsetX: number;
    private readonly offsetY: number;

    constructor(
        bounds: GeoBounds,
        width: number,
        height: number,
        paddingPx = 24,
        rect?: { x: number; y: number; w: number; h: number }
    ) {
        const targetW = rect ? rect.w : width;
        const targetH = rect ? rect.h : height;
        const usableW = Math.max(1, targetW - paddingPx * 2);
        const usableH = Math.max(1, targetH - paddingPx * 2);
        const lonSpan = Math.max(1e-6, bounds.maxLon - bounds.minLon);
        const ySpan = Math.max(1e-6, mercatorY(bounds.maxLat) - mercatorY(bounds.minLat));

        this.pxPerDeg = Math.min(usableW / lonSpan, usableH / ySpan);
        this.centerLon = (bounds.minLon + bounds.maxLon) / 2;
        this.centerY = (mercatorY(bounds.maxLat) + mercatorY(bounds.minLat)) / 2;
        this.offsetX = rect ? rect.x : 0;
        this.offsetY = rect ? rect.y : 0;
        this.halfW = targetW / 2;
        this.halfH = targetH / 2;
    }

    x(lon: number): number {
        return (lon - this.centerLon) * this.pxPerDeg + this.halfW + this.offsetX;
    }

    y(mercY: number): number {
        return -(mercY - this.centerY) * this.pxPerDeg + this.halfH + this.offsetY;
    }

    yOfLat(lat: number): number {
        return this.y(mercatorY(lat));
    }
}

/** 칠해진 선의 굵기. */
export function paintWidthFor(projector: Projector, frameWidth: number): number {
    const floor = Math.max(1.6, frameWidth / 260);
    return Math.min(floor * 3.2, Math.max(floor, projector.pxPerDeg / 26));
}

/** `[경도, 위도]` 점들을 경로에 잇는다. */
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

/** 자라는 중인 획의 끝점. */
export function tipOf(geometries: [number, number][][], view: Projector): [number, number] | null {
    const lastLine = geometries[geometries.length - 1];
    if (!lastLine || lastLine.length === 0) return null;
    const point = lastLine[lastLine.length - 1];
    return [view.x(point[0]), view.yOfLat(point[1])];
}

// ---------------------------------------------------------------- 지리 필터링 (북방영토/아마미 제외, 오키나와 분리)

/**
 * 북방영토(쿠릴 4도: lon > 145.8) 및 아마미/토카라 열도(lat < 30.8)를 제외한
 * 본토(혼슈·홋카이도·규슈·시코쿠 및 주변 부속도서) 폴리곤만 유지.
 */
export function filterMainlandRings(rings: [number, number][][]): [number, number][][] {
    return rings.filter((ring) => {
        if (ring.length === 0) return false;
        // 링의 첫 번째 점 및 샘플 점 기준
        const p = ring[0];
        const lon = p[0];
        const lat = p[1];
        // 북방영토(쿠릴 4도: 에토로후, 쿠나시리, 시코탄, 하보마이) 제외
        if (lon > 145.85) return false;
        if (lat > 43.4 && lon > 145.65) return false;
        // 아마미 군도, 토카라 열도, 오키나와, 오가사와라 등 제외
        if (lat < 30.8) return false;
        return true;
    });
}

/** 오키나와 본섬 부근 폴리곤만 추출 */
export function filterOkinawaRings(rings: [number, number][][]): [number, number][][] {
    return rings.filter((ring) => {
        if (ring.length === 0) return false;
        const p = ring[0];
        const lon = p[0];
        const lat = p[1];
        return lat >= 26.0 && lat <= 26.9 && lon >= 127.5 && lon <= 128.3;
    });
}

/** 본토 철도망 */
export function filterMainlandLines(lines: [number, number][][]): [number, number][][] {
    return lines.filter((line) => line.some(([lon, lat]) => lat >= 30.8 && lon <= 145.85));
}

/** 오키나와 철도망 (유이레일 등) */
export function filterOkinawaLines(lines: [number, number][][]): [number, number][][] {
    return lines.filter((line) => line.some(([lon, lat]) => lat >= 26.0 && lat <= 26.8 && lon >= 127.5 && lon <= 128.2));
}

// ---------------------------------------------------------------- 오키나와 인셋 윈도우

export interface InsetRect {
    x: number;
    y: number;
    w: number;
    h: number;
    radius: number;
}

/** 우측 하단 오키나와 인셋 박스 크기 및 위치 계산 */
export function computeOkinawaInsetRect(width: number, height: number): InsetRect {
    const margin = Math.round(width * 0.035);
    const w = Math.min(Math.round(width * 0.32), Math.round(height * 0.30));
    const h = Math.round(w * 0.95);
    return {
        x: width - w - margin,
        y: height - h - margin,
        w,
        h,
        radius: Math.round(w * 0.09)
    };
}

function pathRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// ---------------------------------------------------------------- 캔버스 렌더링 함수들

/** 바다·땅·아직 안 간 철도망. 카메라가 그대로면 한 번만 그리면 된다. */
export function drawReplayBase(
    ctx: CanvasRenderingContext2D,
    land: Path2D,
    rail: Path2D,
    width: number,
    height: number,
    theme: ReplayTheme = REPLAY_THEMES.dark,
    okinawa?: {
        rect: InsetRect;
        land: Path2D;
        rail: Path2D;
    } | null
): void {
    const hairline = Math.min(2, Math.max(0.8, width / 560));

    // 메인 바다
    ctx.fillStyle = theme.sea;
    ctx.fillRect(0, 0, width, height);

    // 메인 땅
    ctx.fillStyle = theme.landFill;
    ctx.fill(land, 'evenodd');
    ctx.strokeStyle = theme.landEdge;
    ctx.lineWidth = hairline;
    ctx.stroke(land);

    // 메인 철도망
    ctx.strokeStyle = theme.rail;
    ctx.lineWidth = hairline;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(rail);

    // 우측 하단 오키나와 인셋 서브윈도우
    if (okinawa) {
        const { rect, land: okiLand, rail: okiRail } = okinawa;

        ctx.save();
        pathRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.radius);
        ctx.clip();

        // 인셋 바다
        ctx.fillStyle = theme.sea;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

        // 인셋 육지
        ctx.fillStyle = theme.landFill;
        ctx.fill(okiLand, 'evenodd');
        ctx.strokeStyle = theme.landEdge;
        ctx.lineWidth = hairline;
        ctx.stroke(okiLand);

        // 인셋 철도망(유이레일)
        ctx.strokeStyle = theme.rail;
        ctx.lineWidth = hairline;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(okiRail);

        ctx.restore();

        // 인셋 테두리선
        ctx.save();
        pathRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.radius);
        ctx.strokeStyle = theme.insetBorder;
        ctx.lineWidth = hairline * 1.5;
        ctx.stroke();

        // OKINAWA 라벨
        const labelSize = Math.max(9, Math.round(rect.w * 0.08));
        ctx.font = `800 ${labelSize}px system-ui, sans-serif`;
        ctx.fillStyle = theme.dark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(15, 23, 42, 0.45)';
        ctx.fillText('OKINAWA', rect.x + Math.round(rect.w * 0.08), rect.y + Math.round(rect.h * 0.16));
        ctx.restore();
    }
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

/** 날짜·누적 거리를 픽셀에 구워 넣는다. */
export function drawReplayOverlay(
    ctx: CanvasRenderingContext2D,
    date: string,
    paintedKm: number,
    width: number,
    height: number,
    theme: ReplayTheme = REPLAY_THEMES.dark
): void {
    const margin = width * 0.06;
    const font = 'system-ui, -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';

    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = theme.dark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = width * 0.012;
    ctx.shadowOffsetY = width * 0.004;

    const dateSize = width * 0.085;
    let baseline = margin + dateSize;
    if (date) {
        ctx.font = `900 ${dateSize}px ${font}`;
        ctx.fillStyle = theme.overlayText;
        ctx.fillText(date.replace(/-/g, '.'), margin, baseline);
    }

    const kmSize = width * 0.04;
    ctx.font = `700 ${kmSize}px ${font}`;
    ctx.fillStyle = theme.distance;
    baseline += kmSize * 1.45;
    ctx.fillText(`${Math.round(paintedKm).toLocaleString()} km`, margin, baseline);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.font = `700 ${width * 0.03}px ${font}`;
    ctx.fillStyle = theme.dark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(15, 23, 42, 0.4)';
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
