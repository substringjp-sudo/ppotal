import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import { RailData, Section } from '../types/railData';
import { MapTheme } from '../lib/mapThemes';
import { MapShapeMode, shapeGeometry } from './lineShapes';
import { ShareBlockId, ShareScope, ShareStats } from './shareCard';

/**
 * Draws a share card.
 *
 * Deliberately independent of Leaflet: the card is framed to whatever the card
 * is *about*, not to wherever the map was left, so it needs its own projection
 * anyway. It does honour the theme and line shape the user is looking at, so
 * the picture they share is the picture they were looking at.
 */

export interface ShareCardInput {
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
        prefecturesOf: (visited: number, total: number) => string;
        period: (from: string, to: string) => string;
        footer: string;
    };
}

export const CARD_SIZE = 1080;
const PAD = 64;
const MERCATOR_LIMIT = 85.05112878;

// Web Mercator wants *both* axes in radians. Mixing degrees of longitude with
// radians of latitude squashes the map by a factor of about 57.
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
        // Mercator y grows northward; the canvas grows downward.
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

/** How tall each optional block wants to be. */
const BLOCK_HEIGHT: Record<Exclude<ShareBlockId, 'map'>, number> = {
    totals: 132,
    lines: 150,
    prefectures: 150,
    badges: 92,
    period: 54
};

export function drawShareCard(canvas: HTMLCanvasElement, input: ShareCardInput, scale = 2): void {
    const { stats, blocks, theme, shapeMode, railData, sections, riddenSectionIds, prefectures, badges, labels, isoToPrefecture } = input;

    canvas.width = CARD_SIZE * scale;
    canvas.height = CARD_SIZE * scale;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(scale, 0, 0, scale, 0, 0);

    // Ground.
    context.fillStyle = theme.sea;
    context.fillRect(0, 0, CARD_SIZE, CARD_SIZE);

    const ink = theme.labelInk;
    const faint = theme.dark ? 'rgba(255,255,255,0.42)' : 'rgba(15,23,42,0.45)';
    const hairline = theme.dark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.09)';

    // --- Header ---------------------------------------------------------
    let y = PAD;
    context.fillStyle = ink;
    context.font = font(900, 34);
    context.textBaseline = 'alphabetic';
    context.fillText(labels.title, PAD, y + 30);

    context.font = font(700, 22);
    context.fillStyle = faint;
    const scopeWidth = context.measureText(labels.scopeLabel).width;
    context.fillText(labels.scopeLabel, CARD_SIZE - PAD - scopeWidth, y + 29);
    y += 58;

    // --- Work out how much room the map gets ----------------------------
    const optional = (['totals', 'lines', 'prefectures', 'badges', 'period'] as const)
        .filter(id => blocks.has(id));
    const stackHeight = optional.reduce((sum, id) => sum + BLOCK_HEIGHT[id], 0);
    const mapHeight = blocks.has('map')
        ? Math.max(180, CARD_SIZE - PAD - y - stackHeight - 46)
        : 0;

    // --- Map ------------------------------------------------------------
    if (blocks.has('map') && stats.bounds) {
        const rect = { x: PAD, y, w: CARD_SIZE - PAD * 2, h: mapHeight };

        // Give the frame a little air around the extremes of the route.
        const padLon = Math.max(0.02, (stats.bounds.maxLon - stats.bounds.minLon) * 0.12);
        const padLat = Math.max(0.02, (stats.bounds.maxLat - stats.bounds.minLat) * 0.12);
        const project = fitProjector({
            minLon: stats.bounds.minLon - padLon,
            maxLon: stats.bounds.maxLon + padLon,
            minLat: stats.bounds.minLat - padLat,
            maxLat: stats.bounds.maxLat + padLat
        }, rect, 8);

        context.save();
        roundRect(context, rect.x, rect.y, rect.w, rect.h, 28);
        context.clip();
        context.fillStyle = theme.sea;
        context.fillRect(rect.x, rect.y, rect.w, rect.h);

        // Land under everything.
        if (prefectures) {
            context.fillStyle = theme.land;
            for (const feature of prefectures.features as Feature[]) {
                const geometry = feature.geometry as Polygon | MultiPolygon | undefined;
                if (!geometry) continue;
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
                    context.fill('evenodd');
                }
            }
        }

        // Context lines first, then what was actually ridden on top of them.
        const bounds = stats.bounds;
        const inFrame = (section: Section) => {
            const g = section.geometry;
            if (!g || g.length === 0) return false;
            for (const [lon, lat] of g) {
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
        const lineColours = railData.lines as Record<string, { color?: string }>;
        const colourOf = (section: Section) => {
            const raw = lineColours[String(section.line_id)]?.color;
            return raw ? (String(raw).startsWith('#') ? String(raw) : `#${raw}`) : '#94a3b8';
        };

        for (const section of visible) {
            if (riddenSectionIds.has(section.id)) continue;
            strokeSection(section, 1.6, theme.dark ? '#3b4a6b' : '#c9d3e0', 0.75);
        }
        for (const section of visible) {
            if (!riddenSectionIds.has(section.id)) continue;
            // A soft halo, then the line's own colour, so ridden track reads first.
            strokeSection(section, 9, colourOf(section), 0.22);
            strokeSection(section, 3.6, colourOf(section), 1);
        }

        context.globalAlpha = 1;
        context.restore();

        context.strokeStyle = hairline;
        context.lineWidth = 1;
        roundRect(context, rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1, 28);
        context.stroke();

        y += mapHeight + 30;
    }

    const rule = () => {
        context.strokeStyle = hairline;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(PAD, y + 0.5);
        context.lineTo(CARD_SIZE - PAD, y + 0.5);
        context.stroke();
    };

    // --- Totals ---------------------------------------------------------
    if (blocks.has('totals')) {
        rule();
        const cells: [string, string][] = [
            [stats.distance.toLocaleString(undefined, { maximumFractionDigits: 1 }), labels.km],
            [String(stats.stations), labels.stations],
            [String(stats.lines), labels.lines],
            [String(stats.companies), labels.companies]
        ];
        const cellWidth = (CARD_SIZE - PAD * 2) / cells.length;
        cells.forEach(([value, caption], i) => {
            const cx = PAD + cellWidth * i + cellWidth / 2;
            context.textAlign = 'center';
            context.fillStyle = ink;
            context.font = font(900, 52);
            context.fillText(value, cx, y + 82);
            context.fillStyle = faint;
            context.font = font(800, 19);
            context.fillText(caption.toUpperCase(), cx, y + 112);
        });
        context.textAlign = 'left';
        y += BLOCK_HEIGHT.totals;
    }

    // --- Line completion ------------------------------------------------
    if (blocks.has('lines')) {
        rule();
        const rows = stats.lineProgress.slice(0, 3);
        rows.forEach((line, i) => {
            const rowY = y + 30 + i * 40;
            context.fillStyle = ink;
            context.font = font(800, 23);
            context.fillText(line.name, PAD, rowY + 8);

            const barX = PAD + 280;
            const barW = CARD_SIZE - PAD - barX - 92;
            context.fillStyle = hairline;
            roundRect(context, barX, rowY - 8, barW, 16, 8);
            context.fill();
            context.fillStyle = line.color;
            roundRect(context, barX, rowY - 8, Math.max(16, (barW * line.percent) / 100), 16, 8);
            context.fill();

            context.fillStyle = ink;
            context.font = font(900, 23);
            context.textAlign = 'right';
            context.fillText(`${line.percent}%`, CARD_SIZE - PAD, rowY + 8);
            context.textAlign = 'left';
        });
        y += BLOCK_HEIGHT.lines;
    }

    // --- Prefecture coverage --------------------------------------------
    if (blocks.has('prefectures')) {
        rule();
        const boxW = 190, boxH = 118;
        const boxX = PAD, boxY = y + 18;

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
                const polygons = geometry.type === 'Polygon'
                    ? [geometry.coordinates as number[][][]]
                    : geometry.type === 'MultiPolygon' ? (geometry.coordinates as number[][][][]) : [];
                context.fillStyle = visited ? '#2ecc71' : (theme.dark ? '#233149' : '#dfe6ee');
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

        const textX = boxX + boxW + 34;
        context.fillStyle = ink;
        context.font = font(900, 54);
        context.fillText(`${stats.prefectures.size}`, textX, boxY + 62);
        const countWidth = context.measureText(`${stats.prefectures.size}`).width;
        context.fillStyle = faint;
        context.font = font(800, 26);
        context.fillText(' / 47', textX + countWidth, boxY + 62);
        context.font = font(800, 19);
        context.fillText(labels.prefecturesOf(stats.prefectures.size, 47).toUpperCase(), textX, boxY + 94);

        y += BLOCK_HEIGHT.prefectures;
    }

    // --- Badges ---------------------------------------------------------
    if (blocks.has('badges') && badges.length > 0) {
        rule();
        let chipX = PAD;
        const chipY = y + 22;
        context.font = font(800, 20);
        for (const badge of badges.slice(0, 4)) {
            const width = context.measureText(badge).width + 40;
            if (chipX + width > CARD_SIZE - PAD) break;
            context.fillStyle = theme.dark ? 'rgba(46,204,113,0.18)' : 'rgba(46,204,113,0.16)';
            roundRect(context, chipX, chipY, width, 44, 22);
            context.fill();
            context.strokeStyle = 'rgba(46,204,113,0.55)';
            context.lineWidth = 1.5;
            roundRect(context, chipX, chipY, width, 44, 22);
            context.stroke();
            context.fillStyle = theme.dark ? '#7ee2a8' : '#1e8449';
            context.fillText(badge, chipX + 20, chipY + 29);
            chipX += width + 12;
        }
        y += BLOCK_HEIGHT.badges;
    } else if (blocks.has('badges')) {
        y += 0;
    }

    // --- Period ---------------------------------------------------------
    if (blocks.has('period') && stats.firstTrip && stats.lastTrip) {
        const asDate = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
        context.fillStyle = faint;
        context.font = font(700, 20);
        context.fillText(labels.period(asDate(stats.firstTrip), asDate(stats.lastTrip)), PAD, y + 30);
        y += BLOCK_HEIGHT.period;
    }

    // --- Footer ---------------------------------------------------------
    context.fillStyle = faint;
    context.font = font(800, 19);
    const footerWidth = context.measureText(labels.footer).width;
    context.fillText(labels.footer, CARD_SIZE - PAD - footerWidth, CARD_SIZE - PAD + 6);
}
