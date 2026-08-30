import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import { RailData, Section } from '../types/railData';
import { MapTheme } from '../lib/mapThemes';
import { MapShapeMode, shapeGeometry } from './lineShapes';
import { ShareBlockId, ShareScope, ShareStats } from './shareCard';
import { getLineColor } from './lineColors';

export type CardAspectRatio = '1:1' | '16:9' | '9:16';

export interface ShareCardStyle {
    followMap: boolean;
    /** Draw track that has not been ridden, as context under the route. */
    showContext: boolean;
    /**
     * Draw lines the map's own filter has switched off.
     */
    showUnselected: boolean;
    /** Prefecture outlines on the card's map. */
    showBorders: boolean;
    /** Multipliers, 0.4 to 3. Ignored while followMap is on. */
    riddenWeight: number;
    contextWeight: number;
}

export const DEFAULT_CARD_STYLE: ShareCardStyle = {
    followMap: true,
    showContext: true,
    showUnselected: true,
    showBorders: false,
    riddenWeight: 1,
    contextWeight: 1
};

/** How many lines the card lists before it summarises the rest. */
export const MAX_LINE_ROWS = 5;

export interface ShareCardInput {
    aspectRatio?: CardAspectRatio;
    style: ShareCardStyle;
    /** The map's own weights, used when style.followMap is on. */
    mapWeights: { visited: number; unvisited: number; unselected: number; unselectedOpacity: number };
    selectedLineIds: Set<string>;
    stats: ShareStats;
    scope: ShareScope;
    blocks: Set<ShareBlockId>;
    theme: MapTheme;
    shapeMode: MapShapeMode;
    railData: RailData;
    /** Every section, so the card can draw context around what was ridden. */
    sections: Section[];
    riddenSectionIds: Set<number>;
    prefectures: FeatureCollection | null;
    /** Unlocked achievement titles, already localised. */
    badges: string[];
    /** Boundary ISO code to internal prefecture id — see lib/prefectures.ts. */
    isoToPrefecture: Map<string, string>;
    labels: {
        title: string;
        scopeLabel: string;
        km: string; stations: string; lines: string; companies: string;
        distTitle?: string; stationTitle?: string; lineTitle?: string; companyTitle?: string;
        prefecturesOf: (visited: number, total: number) => string;
        period: (from: string, to: string) => string;
        footer: string;
        moreLines: (count: number, averagePercent: number) => string;
    };
}

export const CARD_SIZE = 1080;
const PAD = 64;
const MERCATOR_LIMIT = 85.05112878;

const mercatorX = (lon: number) => (lon * Math.PI) / 180;
const mercatorY = (lat: number) => {
    const clamped = Math.max(-MERCATOR_LIMIT, Math.min(MERCATOR_LIMIT, lat));
    return Math.log(Math.tan(Math.PI / 4 + (clamped * Math.PI) / 360));
};

interface Projector { (lon: number, lat: number): { x: number; y: number }; }

/** Fits a lon/lat box into a rect, preserving shape. */
function fitProjector(
    box: { minLon: number; minLat: number; maxLon: number; maxLat: number },
    rect: { x: number; y: number; w: number; h: number },
    padding = 0
): Projector {
    const x0 = mercatorX(box.minLon), x1 = mercatorX(box.maxLon);
    const y0 = mercatorY(box.minLat), y1 = mercatorY(box.maxLat);
    const spanX = Math.max(1e-9, x1 - x0);
    const spanY = Math.max(1e-9, y1 - y0);
    const innerW = rect.w - padding * 2;
    const innerH = rect.h - padding * 2;
    const scale = Math.min(innerW / spanX, innerH / spanY);
    const offsetX = rect.x + padding + (innerW - spanX * scale) / 2;
    const offsetY = rect.y + padding + (innerH - spanY * scale) / 2;
    return (lon, lat) => ({
        x: offsetX + (mercatorX(lon) - x0) * scale,
        y: offsetY + (y1 - mercatorY(lat)) * scale
    });
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const radius = Math.min(r, w / 2, h / 2);
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + w, y, x + w, y + h, radius);
    context.arcTo(x + w, y + h, x, y + h, radius);
    context.arcTo(x, y + h, x, y, radius);
    context.arcTo(x, y, x + w, y, radius);
    context.closePath();
}

const FONT = "'Pretendard', 'Noto Sans JP', system-ui, -apple-system, sans-serif";
const font = (weight: number, size: number) => `${weight} ${size}px ${FONT}`;

const LINE_ROW = 54;

function blockHeight(id: Exclude<ShareBlockId, 'map'>, stats: ShareStats): number {
    switch (id) {
        case 'totals': return 155;
        case 'prefectures': return 150;
        case 'badges': return 92;
        case 'lines': {
            const rows = Math.min(MAX_LINE_ROWS, stats.lineProgress.length);
            const overflow = stats.lineProgress.length > MAX_LINE_ROWS ? 34 : 0;
            return rows === 0 ? 0 : 45 + rows * LINE_ROW + overflow + 10;
        }
    }
}

// Bounds for Mainland Japan (Honshu, Hokkaido, Kyushu, Shikoku) excluding outlying islands
const MAINLAND_BOUNDS = { minLon: 129.2, maxLon: 145.8, minLat: 31.0, maxLat: 45.6 };
// Bounds for Okinawa Main Island & Monorail
const OKINAWA_BOUNDS = { minLon: 127.60, maxLon: 128.05, minLat: 26.10, maxLat: 26.75 };

/** Draws Okinawa Inset Sub-Window at bottom-right corner */
function drawOkinawaInset(
    context: CanvasRenderingContext2D,
    mainRect: { x: number; y: number; w: number; h: number },
    input: ShareCardInput
): void {
    const { theme, shapeMode, railData, sections, riddenSectionIds, prefectures, isoToPrefecture, style, mapWeights, selectedLineIds, scope } = input;
    
    // Inset dimension & position (bottom-right of mainRect)
    const insetW = Math.min(230, Math.round(mainRect.w * 0.28));
    const insetH = Math.min(210, Math.round(mainRect.h * 0.26));
    const insetX = mainRect.x + mainRect.w - insetW - 14;
    const insetY = mainRect.y + mainRect.h - insetH - 14;
    const insetRect = { x: insetX, y: insetY, w: insetW, h: insetH };

    const riddenScale = style.followMap ? Math.max(0.4, mapWeights.visited / 3.5) : style.riddenWeight;
    const contextScale = style.followMap ? Math.max(0.4, mapWeights.unvisited) : style.contextWeight;

    const projectInset = fitProjector(OKINAWA_BOUNDS, insetRect, 10);

    context.save();
    roundRect(context, insetX, insetY, insetW, insetH, 18);
    context.clip();

    // Background (Sea)
    context.fillStyle = theme.sea;
    context.fillRect(insetX, insetY, insetW, insetH);

    // 1. Draw Okinawa Land polygons
    if (prefectures) {
        for (const feature of prefectures.features as Feature[]) {
            const geometry = feature.geometry as Polygon | MultiPolygon | undefined;
            if (!geometry) continue;
            const iso = String((feature.properties as { shapeISO?: string } | null)?.shapeISO || '');
            const internalId = isoToPrefecture.get(iso);
            // Only draw prefecture 47 (Okinawa)
            const isOkinawa = internalId === 'p47' || iso.includes('47');
            if (!isOkinawa) continue;

            const isSelectedPrefecture = scope.kind === 'prefecture' && (
                internalId === scope.id ||
                (scope.id && String(scope.id).replace(/^p/, '') === String(internalId).replace(/^p/, ''))
            );

            const polygons = geometry.type === 'Polygon'
                ? [geometry.coordinates as number[][][]]
                : geometry.type === 'MultiPolygon' ? (geometry.coordinates as number[][][][]) : [];

            for (const rings of polygons) {
                context.beginPath();
                for (const ring of rings) {
                    for (let i = 0; i < ring.length; i++) {
                        const p = projectInset(ring[i][0], ring[i][1]);
                        if (i === 0) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y);
                    }
                    context.closePath();
                }

                if (isSelectedPrefecture) {
                    context.fillStyle = theme.dark ? 'rgba(59, 130, 246, 0.14)' : 'rgba(59, 130, 246, 0.08)';
                    context.fill('evenodd');
                    context.strokeStyle = theme.dark ? '#60a5fa' : '#2563eb';
                    context.lineWidth = 2.5;
                    context.stroke();
                } else {
                    context.fillStyle = theme.land;
                    context.fill('evenodd');
                    if (style.showBorders) {
                        context.strokeStyle = theme.landEdge;
                        context.lineWidth = 1;
                        context.stroke();
                    }
                }
            }
        }
    }

    // 2. Draw Okinawa rail sections (Yui Rail etc)
    const okinawaSections = sections.filter(s => {
        if (!s.geometry || s.geometry.length === 0) return false;
        const [lon, lat] = s.geometry[0];
        return lat >= OKINAWA_BOUNDS.minLat - 0.2 && lat <= OKINAWA_BOUNDS.maxLat + 0.2
            && lon >= OKINAWA_BOUNDS.minLon - 0.2 && lon <= OKINAWA_BOUNDS.maxLon + 0.2;
    });

    const strokeInsetSection = (section: Section, width: number, colour: string, alpha: number) => {
        const geometry = shapeGeometry(section.geometry, shapeMode);
        if (!geometry || geometry.length < 2) return;
        context.globalAlpha = alpha;
        context.strokeStyle = colour;
        context.lineWidth = width;
        context.beginPath();
        for (let i = 0; i < geometry.length; i++) {
            const p = projectInset(geometry[i][0], geometry[i][1]);
            if (i === 0) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y);
        }
        context.stroke();
    };

    const colourOf = (section: Section) => {
        const key = `${section.company_id}::${section.line_id}`;
        const color = getLineColor(key, railData);
        if (color) return color.startsWith('#') ? color : `#${color}`;

        const lineColours = railData.lines as Record<string, { color?: string }>;
        const raw = lineColours[String(section.line_id)]?.color;
        if (raw) return String(raw).startsWith('#') ? String(raw) : `#${raw}`;

        const companies = railData.companies as Record<string, { color?: string }>;
        const compRaw = companies[String(section.company_id)]?.color;
        if (compRaw) return String(compRaw).startsWith('#') ? String(compRaw) : `#${compRaw}`;

        return '#2563eb';
    };

    const filterActive = selectedLineIds.size > 0;
    const isSelected = (section: Section) =>
        !filterActive || selectedLineIds.has(`${section.company_id}::${section.line_id}`);

    if (style.showUnselected && filterActive) {
        const unselectedScale = style.followMap ? Math.max(0.4, mapWeights.unselected) : style.contextWeight * 0.7;
        const unselectedAlpha = style.followMap ? mapWeights.unselectedOpacity : 0.3;
        for (const section of okinawaSections) {
            if (riddenSectionIds.has(section.id) || isSelected(section)) continue;
            strokeInsetSection(section, 2.0 * unselectedScale, theme.dark ? '#2b3852' : '#dde3ea', unselectedAlpha);
        }
    }

    if (style.showContext) {
        for (const section of okinawaSections) {
            if (riddenSectionIds.has(section.id) || !isSelected(section)) continue;
            strokeInsetSection(section, 2.2 * contextScale, theme.dark ? '#475569' : '#cbd5e1', 0.85);
        }
    }

    // Ridden lines in Okinawa
    const okinawaRidden = okinawaSections.filter(s => riddenSectionIds.has(s.id));
    if (okinawaRidden.length > 0) {
        const core = 2.2 * riddenScale;
        for (const section of okinawaRidden) {
            strokeInsetSection(section, core + 2.0 * riddenScale, theme.land, 1);
        }
        for (const section of okinawaRidden) {
            strokeInsetSection(section, core, colourOf(section), 1);
        }

        // Stations
        const stationsById = railData.stations as Record<string, { lat: number; lon: number }>;
        const placed: { x: number; y: number }[] = [];
        for (const section of okinawaRidden) {
            for (const id of [section.start, section.end]) {
                const station = stationsById[id];
                if (!station) continue;
                const p = projectInset(station.lon, station.lat);
                if (placed.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 8)) continue;
                placed.push(p);
                context.beginPath();
                context.arc(p.x, p.y, 3, 0, Math.PI * 2);
                context.fillStyle = theme.land;
                context.fill();
                context.lineWidth = 1.5;
                context.strokeStyle = colourOf(section);
                context.stroke();
            }
        }
    }

    context.restore();

    // 3. Inset Frame Border & Label Badge
    context.save();
    context.strokeStyle = theme.dark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.22)';
    context.lineWidth = 1.5;
    roundRect(context, insetX + 0.5, insetY + 0.5, insetW - 1, insetH - 1, 18);
    context.stroke();

    // Label Badge
    context.fillStyle = theme.dark ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.92)';
    roundRect(context, insetX + 10, insetY + 10, 72, 22, 7);
    context.fill();
    context.strokeStyle = theme.dark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.12)';
    context.lineWidth = 1;
    roundRect(context, insetX + 10, insetY + 10, 72, 22, 7);
    context.stroke();

    context.fillStyle = theme.dark ? '#94a3b8' : '#334155';
    context.font = font(900, 11);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('OKINAWA', insetX + 10 + 36, insetY + 10 + 11);
    context.restore();
}

/** Draws the map box onto canvas inside rect */
function drawMapRect(
    context: CanvasRenderingContext2D,
    rect: { x: number; y: number; w: number; h: number },
    input: ShareCardInput
): void {
    const { stats, theme, shapeMode, railData, sections, riddenSectionIds, prefectures, isoToPrefecture, style, mapWeights, selectedLineIds, scope } = input;

    const riddenScale = style.followMap ? Math.max(0.4, mapWeights.visited / 3.5) : style.riddenWeight;
    const contextScale = style.followMap ? Math.max(0.4, mapWeights.unvisited) : style.contextWeight;
    const hairline = 'rgba(15,23,42,0.12)';

    // Check if we are viewing nationwide map or a specific small scope
    const isNationwide = scope.kind === 'all' || !stats.bounds || (stats.bounds.maxLat - stats.bounds.minLat > 6.0);

    // Frame the mainland specifically when nationwide to maximize resolution and readability
    const bounds = isNationwide
        ? MAINLAND_BOUNDS
        : (stats.bounds || MAINLAND_BOUNDS);

    const padLon = Math.max(0.02, (bounds.maxLon - bounds.minLon) * 0.08);
    const padLat = Math.max(0.02, (bounds.maxLat - bounds.minLat) * 0.08);
    const project = fitProjector({
        minLon: bounds.minLon - padLon,
        maxLon: bounds.maxLon + padLon,
        minLat: bounds.minLat - padLat,
        maxLat: bounds.maxLat + padLat
    }, rect, 8);

    context.save();
    roundRect(context, rect.x, rect.y, rect.w, rect.h, 28);
    context.clip();
    context.fillStyle = theme.sea;
    context.fillRect(rect.x, rect.y, rect.w, rect.h);

    // Land under everything & Prefecture Highlight Fill
    if (prefectures) {
        for (const feature of prefectures.features as Feature[]) {
            const geometry = feature.geometry as Polygon | MultiPolygon | undefined;
            if (!geometry) continue;
            const iso = String((feature.properties as { shapeISO?: string } | null)?.shapeISO || '');
            const internalId = isoToPrefecture.get(iso);

            // In nationwide mode, filter out Okinawa and distant islands from mainland projection
            if (isNationwide && (internalId === 'p47' || iso.includes('47'))) {
                continue;
            }

            const isSelectedPrefecture = scope.kind === 'prefecture' && (
                internalId === scope.id ||
                (scope.id && String(scope.id).replace(/^p/, '') === String(internalId).replace(/^p/, ''))
            );

            const polygons = geometry.type === 'Polygon'
                ? [geometry.coordinates as number[][][]]
                : geometry.type === 'MultiPolygon' ? (geometry.coordinates as number[][][][]) : [];

            for (const rings of polygons) {
                context.beginPath();
                for (const ring of rings) {
                    for (let i = 0; i < ring.length; i++) {
                        const p = project(ring[i][0], ring[i][1]);
                        if (i === 0) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y);
                    }
                    context.closePath();
                }

                if (isSelectedPrefecture) {
                    context.fillStyle = theme.dark ? 'rgba(59, 130, 246, 0.14)' : 'rgba(59, 130, 246, 0.08)';
                    context.fill('evenodd');

                    context.strokeStyle = theme.dark ? '#60a5fa' : '#2563eb';
                    context.lineWidth = 2.5;
                    context.stroke();
                } else {
                    context.fillStyle = theme.land;
                    context.fill('evenodd');
                    if (style.showBorders) {
                        context.strokeStyle = theme.landEdge;
                        context.lineWidth = 1;
                        context.stroke();
                    }
                }
            }
        }
    }

    // Rail lines inside frame
    const inFrame = (section: Section) => {
        const g = section.geometry;
        if (!g || g.length === 0) return false;
        for (const [lon, lat] of g) {
            if (isNationwide && lat < 30.5) return false; // Skip Okinawa sections in mainland frame
            if (lon >= bounds.minLon - padLon * 3 && lon <= bounds.maxLon + padLon * 3
                && lat >= bounds.minLat - padLat * 3 && lat <= bounds.maxLat + padLat * 3) return true;
        }
        return false;
    };

    const strokeSection = (section: Section, width: number, colour: string, alpha: number) => {
        const geometry = shapeGeometry(section.geometry, shapeMode);
        if (!geometry || geometry.length < 2) return;
        context.globalAlpha = alpha;
        context.strokeStyle = colour;
        context.lineWidth = width;
        context.beginPath();
        for (let i = 0; i < geometry.length; i++) {
            const p = project(geometry[i][0], geometry[i][1]);
            if (i === 0) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y);
        }
        context.stroke();
    };

    context.lineCap = 'round';
    context.lineJoin = 'round';

    const visible = sections.filter(inFrame);
    const colourOf = (section: Section) => {
        const key = `${section.company_id}::${section.line_id}`;
        const color = getLineColor(key, railData);
        if (color) return color.startsWith('#') ? color : `#${color}`;

        const lineColours = railData.lines as Record<string, { color?: string }>;
        const raw = lineColours[String(section.line_id)]?.color;
        if (raw) return String(raw).startsWith('#') ? String(raw) : `#${raw}`;

        const companies = railData.companies as Record<string, { color?: string }>;
        const compRaw = companies[String(section.company_id)]?.color;
        if (compRaw) return String(compRaw).startsWith('#') ? String(compRaw) : `#${compRaw}`;

        return '#2563eb';
    };

    const filterActive = selectedLineIds.size > 0;
    const isSelected = (section: Section) =>
        !filterActive || selectedLineIds.has(`${section.company_id}::${section.line_id}`);

    if (style.showUnselected && filterActive) {
        const unselectedScale = style.followMap ? Math.max(0.4, mapWeights.unselected) : style.contextWeight * 0.7;
        const unselectedAlpha = style.followMap ? mapWeights.unselectedOpacity : 0.3;
        for (const section of visible) {
            if (riddenSectionIds.has(section.id) || isSelected(section)) continue;
            strokeSection(section, 1.4 * unselectedScale, theme.dark ? '#2b3852' : '#dde3ea', unselectedAlpha);
        }
    }

    if (style.showContext) {
        for (const section of visible) {
            if (riddenSectionIds.has(section.id) || !isSelected(section)) continue;
            strokeSection(section, 1.6 * contextScale, theme.dark ? '#475569' : '#cbd5e1', 0.85);
        }
    }
    context.globalAlpha = 1;

    // Ridden routes
    const ridden = visible.filter(section => riddenSectionIds.has(section.id));
    if (ridden.length > 0) {
        const layer = document.createElement('canvas');
        layer.width = Math.ceil(rect.w);
        layer.height = Math.ceil(rect.h);
        const layerContext = layer.getContext('2d');

        if (layerContext) {
            layerContext.translate(-rect.x, -rect.y);
            layerContext.lineCap = 'round';
            layerContext.lineJoin = 'round';

            const traceOn = (target: CanvasRenderingContext2D, section: Section, width: number, colour: string) => {
                const geometry = shapeGeometry(section.geometry, shapeMode);
                if (!geometry || geometry.length < 2) return;
                target.strokeStyle = colour;
                target.lineWidth = width;
                target.beginPath();
                for (let i = 0; i < geometry.length; i++) {
                    const p = project(geometry[i][0], geometry[i][1]);
                    if (i === 0) target.moveTo(p.x, p.y); else target.lineTo(p.x, p.y);
                }
                target.stroke();
            };

            const core = 1.6 * riddenScale;

            for (const section of ridden) {
                traceOn(layerContext, section, core + 1.4 * riddenScale, theme.dark ? '#0f172a' : '#ffffff');
            }
            for (const section of ridden) {
                traceOn(layerContext, section, core, colourOf(section));
            }

            const dotRadius = Math.min(2.8, Math.max(1.0, 0.6 + core * 0.34));
            const spacing = Math.max(15, dotRadius * 5.2);
            const placed: { x: number; y: number }[] = [];
            const stationsById = railData.stations as Record<string, { lat: number; lon: number }>;
            for (const section of ridden) {
                for (const id of [section.start, section.end]) {
                    const station = stationsById[id];
                    if (!station) continue;
                    const p = project(station.lon, station.lat);
                    if (p.x < rect.x || p.x > rect.x + rect.w || p.y < rect.y || p.y > rect.y + rect.h) continue;
                    if (placed.some(q => Math.hypot(q.x - p.x, q.y - p.y) < spacing)) continue;
                    placed.push(p);
                    layerContext.beginPath();
                    layerContext.arc(p.x, p.y, dotRadius, 0, Math.PI * 2);
                    layerContext.fillStyle = theme.land;
                    layerContext.fill();
                    layerContext.lineWidth = Math.max(1, dotRadius * 0.5);
                    layerContext.strokeStyle = colourOf(section);
                    layerContext.stroke();
                }
            }

            const canBlur = typeof layerContext.filter === 'string';
            context.save();
            if (canBlur) {
                context.globalAlpha = theme.dark ? 0.5 : 0.22;
                context.filter = `blur(${Math.max(4, core * 1.8)}px)`;
                context.drawImage(layer, rect.x, rect.y);
                context.filter = 'none';
            }
            context.globalAlpha = 1;
            context.drawImage(layer, rect.x, rect.y);
            context.restore();
        }
    }

    // 4. Draw Okinawa Inset Sub-window if in nationwide mode
    if (isNationwide) {
        drawOkinawaInset(context, rect, input);
    }

    context.globalAlpha = 1;
    context.restore();

    context.strokeStyle = hairline;
    context.lineWidth = 1;
    roundRect(context, rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1, 28);
    context.stroke();
}

/** Totals Block Component with Nationwide Comparison & Clean Arc Gauges */
function drawTotals(
    context: CanvasRenderingContext2D,
    x: number, y: number, w: number,
    stats: ShareStats, labels: ShareCardInput['labels'],
    ink: string, faint: string, hairline: string
): void {
    context.strokeStyle = hairline;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, y + 0.5);
    context.lineTo(x + w, y + 0.5);
    context.stroke();

    const distRatio = stats.totalDistance > 0 ? stats.distance / stats.totalDistance : 0;
    const stRatio = stats.totalStations > 0 ? stats.stations / stats.totalStations : 0;
    const lineRatio = stats.totalLines > 0 ? stats.lines / stats.totalLines : 0;
    const compRatio = stats.totalCompanies > 0 ? stats.companies / stats.totalCompanies : 0;

    const cells = [
        {
            title: labels.distTitle || '거리',
            value: stats.distance.toLocaleString(undefined, { maximumFractionDigits: 1 }),
            total: stats.totalDistance > 0 ? `${stats.totalDistance.toLocaleString()} km` : 'km',
            ratio: distRatio,
            color: '#2563eb' // Royal Blue
        },
        {
            title: labels.stationTitle || '역',
            value: String(stats.stations),
            total: stats.totalStations > 0 ? `${stats.totalStations.toLocaleString()} ${labels.stations}` : labels.stations,
            ratio: stRatio,
            color: '#10b981' // Emerald
        },
        {
            title: labels.lineTitle || '노선',
            value: String(stats.lines),
            total: stats.totalLines > 0 ? `${stats.totalLines} ${labels.lines}` : labels.lines,
            ratio: lineRatio,
            color: '#8b5cf6' // Purple
        },
        {
            title: labels.companyTitle || '회사',
            value: String(stats.companies),
            total: stats.totalCompanies > 0 ? `/ ${stats.totalCompanies} ${labels.companies}` : labels.companies,
            ratio: compRatio,
            color: '#f59e0b' // Amber
        }
    ];

    const cellWidth = w / cells.length;
    cells.forEach((cell, i) => {
        const cx = x + cellWidth * i + cellWidth / 2;
        const cy = y + 104;
        const r = 44;
        const innerMaxWidth = r * 1.55; // max width for text inside arc

        context.textAlign = 'center';

        // 1. Bold Title ABOVE
        context.fillStyle = ink;
        context.font = font(900, 22);
        context.fillText(cell.title, cx, y + 28);

        // 2. Arc Gauge Background Track (Clean smooth arc without feet ticks)
        const startAngle = Math.PI * 0.75;
        const totalSweep = Math.PI * 1.5;
        const endAngle = Math.PI * 2.25;

        context.strokeStyle = 'rgba(15,23,42,0.08)';
        context.lineWidth = 7;
        context.lineCap = 'round';
        context.beginPath();
        context.arc(cx, cy, r, startAngle, endAngle);
        context.stroke();

        // 3. Arc Gauge Progress Fill
        if (cell.ratio > 0) {
            const fillRatio = Math.min(1, Math.max(0.015, cell.ratio));
            const fillAngle = startAngle + totalSweep * fillRatio;
            context.strokeStyle = cell.color;
            context.lineWidth = 7;
            context.lineCap = 'round';
            context.beginPath();
            context.arc(cx, cy, r, startAngle, fillAngle);
            context.stroke();
        }

        // 4. Value inside Arc Gauge (Auto-scaled so text never touches arc line)
        let valFontSize = 26;
        context.font = font(900, valFontSize);
        const valWidth = context.measureText(cell.value).width;
        if (valWidth > innerMaxWidth) {
            valFontSize = Math.max(16, Math.floor(valFontSize * (innerMaxWidth / valWidth)));
            context.font = font(900, valFontSize);
        }
        context.fillStyle = ink;
        context.fillText(cell.value, cx, cy - 2);

        // 5. Total count inside Arc Gauge (Auto-scaled so text never touches arc line)
        let totFontSize = 13;
        context.font = font(700, totFontSize);
        const totWidth = context.measureText(cell.total).width;
        if (totWidth > innerMaxWidth) {
            totFontSize = Math.max(10, Math.floor(totFontSize * (innerMaxWidth / totWidth)));
            context.font = font(700, totFontSize);
        }
        context.fillStyle = faint;
        context.fillText(cell.total, cx, cy + 18);

        // 6. Percentage text below Arc Gauge
        context.fillStyle = cell.color;
        context.font = font(900, 15);
        const pctText = (cell.ratio * 100).toFixed(1) + '%';
        context.fillText(pctText, cx, cy + 62);
    });

    context.textAlign = 'left';
}

/** Line Progress TOP 5 Table Component */
function drawLineProgress(
    context: CanvasRenderingContext2D,
    x: number, y: number, w: number,
    stats: ShareStats, labels: ShareCardInput['labels'],
    ink: string, faint: string, hairline: string
): number {
    context.strokeStyle = hairline;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, y + 0.5);
    context.lineTo(x + w, y + 0.5);
    context.stroke();

    // Table Header Title
    context.fillStyle = ink;
    context.font = font(900, 22);
    context.fillText("TOP 5 LINES (노선 순위 TOP 5)", x, y + 32);
    y += 42;

    const rows = stats.lineProgress.slice(0, MAX_LINE_ROWS);
    rows.forEach((line, i) => {
        const rowY = y + i * LINE_ROW;

        // Rank Badge (#1, #2...)
        context.fillStyle = '#2563eb';
        context.font = font(900, 20);
        context.fillText(`#${i + 1}`, x, rowY + 20);

        // Line Name
        context.fillStyle = ink;
        context.font = font(800, 21);
        context.fillText(line.name, x + 42, rowY + 20);

        // Subtitle: Distance Ridden / Total & Station counts
        const details = `${line.ridden.toLocaleString()}km / ${line.total.toLocaleString()}km  ·  ${line.stationsRidden}/${line.stationsTotal} ${labels.stations}`;
        context.fillStyle = faint;
        context.font = font(700, 15);
        context.fillText(details, x + 42, rowY + 42);

        // Progress Bar & % on the right
        const barW = Math.min(220, w * 0.32);
        const barX = x + w - barW - 75;

        context.fillStyle = 'rgba(15,23,42,0.08)';
        roundRect(context, barX, rowY + 8, barW, 16, 8);
        context.fill();

        context.fillStyle = line.color;
        roundRect(context, barX, rowY + 8, Math.max(12, (barW * line.percent) / 100), 16, 8);
        context.fill();

        context.fillStyle = ink;
        context.font = font(900, 21);
        context.textAlign = 'right';
        context.fillText(`${line.percent}%`, x + w, rowY + 22);
        context.textAlign = 'left';
    });

    const remaining = stats.lineProgress.length - rows.length;
    if (remaining > 0) {
        const rest = stats.lineProgress.slice(MAX_LINE_ROWS);
        const average = Math.round(rest.reduce((sum, l) => sum + l.percent, 0) / rest.length);
        context.fillStyle = faint;
        context.font = font(700, 18);
        context.fillText(labels.moreLines(remaining, average), x, y + rows.length * LINE_ROW + 12);
    }
    return y + blockHeight('lines', stats);
}

/** Prefecture Coverage Block Component */
function drawPrefectures(
    context: CanvasRenderingContext2D,
    x: number, y: number, w: number,
    stats: ShareStats, labels: ShareCardInput['labels'],
    prefectures: FeatureCollection | null, isoToPrefecture: Map<string, string>,
    scope: ShareScope, theme: MapTheme,
    ink: string, faint: string, hairline: string
): number {
    context.strokeStyle = hairline;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, y + 0.5);
    context.lineTo(x + w, y + 0.5);
    context.stroke();

    const boxW = 180, boxH = 114;
    const boxX = x, boxY = y + 18;

    if (prefectures) {
        const project = fitProjector(
            { minLon: 128.5, maxLon: 146.2, minLat: 30.5, maxLat: 45.6 },
            { x: boxX, y: boxY, w: boxW, h: boxH }, 4
        );
        for (const feature of prefectures.features as Feature[]) {
            const geometry = feature.geometry as Polygon | MultiPolygon | undefined;
            if (!geometry) continue;
            const iso = String((feature.properties as { shapeISO?: string } | null)?.shapeISO || '');
            const internalId = isoToPrefecture.get(iso);
            const visited = !!internalId && stats.prefectures.has(internalId);
            const isSelectedPrefecture = scope.kind === 'prefecture' && internalId === scope.id;

            const polygons = geometry.type === 'Polygon'
                ? [geometry.coordinates as number[][][]]
                : geometry.type === 'MultiPolygon' ? (geometry.coordinates as number[][][][]) : [];
            context.fillStyle = isSelectedPrefecture
                ? '#3b82f6'
                : visited
                    ? '#2ecc71'
                    : '#dfe6ee';
            for (const rings of polygons) {
                context.beginPath();
                for (const ring of rings) {
                    for (let i = 0; i < ring.length; i++) {
                        const p = project(ring[i][0], ring[i][1]);
                        if (i === 0) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y);
                    }
                    context.closePath();
                }
                context.fill('evenodd');
            }
        }
    }

    const textX = boxX + boxW + 30;
    context.fillStyle = ink;
    context.font = font(900, 50);
    context.fillText(`${stats.prefectures.size}`, textX, boxY + 60);
    const countWidth = context.measureText(`${stats.prefectures.size}`).width;
    context.fillStyle = faint;
    context.font = font(800, 24);
    context.fillText(' / 47', textX + countWidth, boxY + 60);
    context.font = font(800, 18);
    context.fillText(labels.prefecturesOf(stats.prefectures.size, 47).toUpperCase(), textX, boxY + 92);

    return y + blockHeight('prefectures', stats);
}

/** Badges Block Component */
function drawBadges(
    context: CanvasRenderingContext2D,
    x: number, y: number, w: number,
    badges: string[], _theme?: MapTheme
): number {
    context.font = font(800, 19);
    let chipX = x;
    const chipY = y + 20;
    for (const badge of badges.slice(0, 4)) {
        const width = context.measureText(badge).width + 36;
        if (chipX + width > x + w) break;
        context.fillStyle = 'rgba(46,204,113,0.16)';
        roundRect(context, chipX, chipY, width, 40, 20);
        context.fill();
        context.strokeStyle = 'rgba(46,204,113,0.55)';
        context.lineWidth = 1.5;
        roundRect(context, chipX, chipY, width, 40, 20);
        context.stroke();
        context.fillStyle = '#1e8449';
        context.fillText(badge, chipX + 18, chipY + 26);
        chipX += width + 10;
    }
    return y + 92;
}

export function drawShareCard(canvas: HTMLCanvasElement, input: ShareCardInput, scale = 2): void {
    const { aspectRatio = '1:1', stats, blocks, theme, prefectures, badges, labels, isoToPrefecture, scope } = input;

    const cardW = aspectRatio === '16:9' ? 1920 : 1080;
    const cardH = aspectRatio === '9:16' ? 1920 : 1080;

    canvas.width = cardW * scale;
    canvas.height = cardH * scale;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(scale, 0, 0, scale, 0, 0);

    // Ground: Clean White background outside map box as requested!
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, cardW, cardH);

    const ink = '#0f172a';
    const faint = 'rgba(15,23,42,0.55)';
    const hairline = 'rgba(15,23,42,0.12)';

    // Header
    let y = PAD;
    context.fillStyle = ink;
    context.font = font(900, 36);
    context.textBaseline = 'alphabetic';
    context.fillText(labels.title, PAD, y + 30);

    context.font = font(700, 22);
    context.fillStyle = faint;
    const scopeText = (scope.label ?? labels.scopeLabel).toUpperCase();
    const scopeWidth = context.measureText(scopeText).width;
    context.fillText(scopeText, cardW - PAD - scopeWidth, y + 29);
    y += 58;

    // --- 1:1 MAP ONLY MODE ---
    if (aspectRatio === '1:1') {
        const mapRect = {
            x: PAD,
            y,
            w: cardW - PAD * 2,
            h: cardH - y - PAD - 24
        };
        drawMapRect(context, mapRect, input);

        // Footer
        context.fillStyle = faint;
        context.font = font(800, 18);
        const footerW = context.measureText(labels.footer).width;
        context.fillText(labels.footer, cardW - PAD - footerW, cardH - PAD + 6);
        return;
    }

    // --- 16:9 LANDSCAPE MODE (Map Left, Stats Right) ---
    if (aspectRatio === '16:9') {
        const leftW = 1040;
        const rightX = leftW + 40;
        const rightW = cardW - rightX - PAD;

        const mapRect = {
            x: PAD,
            y,
            w: leftW - PAD,
            h: cardH - y - PAD - 24
        };
        drawMapRect(context, mapRect, input);

        let rightY = y;
        if (blocks.has('totals')) {
            drawTotals(context, rightX, rightY, rightW, stats, labels, ink, faint, hairline);
            rightY += 200;
        }

        if (blocks.has('lines') && stats.lineProgress.length > 0) {
            rightY = drawLineProgress(context, rightX, rightY, rightW, stats, labels, ink, faint, hairline);
        }

        if (blocks.has('prefectures')) {
            rightY = drawPrefectures(context, rightX, rightY, rightW, stats, labels, prefectures, isoToPrefecture, scope, theme, ink, faint, hairline);
        }

        if (blocks.has('badges') && badges.length > 0) {
            rightY = drawBadges(context, rightX, rightY, rightW, badges, theme);
        }

        // Footer
        context.fillStyle = faint;
        context.font = font(800, 18);
        const footerW = context.measureText(labels.footer).width;
        context.fillText(labels.footer, cardW - PAD - footerW, cardH - PAD + 6);
        return;
    }

    // --- 9:16 PORTRAIT MODE (Map Top, Stats Bottom) ---
    if (aspectRatio === '9:16') {
        const mapH = 900;
        const mapRect = {
            x: PAD,
            y,
            w: cardW - PAD * 2,
            h: mapH
        };
        drawMapRect(context, mapRect, input);

        y += mapH + 30;

        if (blocks.has('totals')) {
            drawTotals(context, PAD, y, cardW - PAD * 2, stats, labels, ink, faint, hairline);
            y += 200;
        }

        if (blocks.has('lines') && stats.lineProgress.length > 0) {
            y = drawLineProgress(context, PAD, y, cardW - PAD * 2, stats, labels, ink, faint, hairline);
        }

        if (blocks.has('prefectures')) {
            y = drawPrefectures(context, PAD, y, cardW - PAD * 2, stats, labels, prefectures, isoToPrefecture, scope, theme, ink, faint, hairline);
        }

        if (blocks.has('badges') && badges.length > 0) {
            y = drawBadges(context, PAD, y, cardW - PAD * 2, badges, theme);
        }

        // Footer
        context.fillStyle = faint;
        context.font = font(800, 18);
        const footerW = context.measureText(labels.footer).width;
        context.fillText(labels.footer, cardW - PAD - footerW, cardH - PAD + 6);
        return;
    }
}
