import type { Feature } from "geojson";
import { padId } from "@regionevel/utils";
import type { RegionScore } from "@regionevel/types";
import {
  categoryRows, featureBounds, scoreFill,
  type ShareBlockId, type ShareScope, type ShareStats,
} from "./shareCard";

/**
 * The share card, drawn to a canvas.
 *
 * The old export screenshotted the live map with html-to-image, which meant
 * the picture depended on whatever the DOM happened to look like: the Leaflet
 * tiles mid-load, the hover label if the pointer had not moved away, the
 * user's scroll position. Drawing it here instead means the same inputs always
 * produce the same image, at whatever resolution the target platform wants,
 * without waiting on layout.
 */

export type CardAspectRatio = "1:1" | "16:9" | "9:16";

export const CARD_SIZE: Record<CardAspectRatio, { w: number; h: number }> = {
  "1:1": { w: 1080, h: 1080 },
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
};

export interface ShareCardTheme {
  background: string;
  panel: string;
  ink: string;
  inkSoft: string;
  accent: string;
  ocean: string;
  unvisited: string;
  border: string;
}

export const LIGHT_THEME: ShareCardTheme = {
  background: "#f8fafc",
  panel: "#ffffff",
  ink: "#0f172a",
  inkSoft: "#64748b",
  accent: "#2563eb",
  ocean: "#e0f2fe",
  unvisited: "#e2e8f0",
  border: "#e2e8f0",
};

export const DARK_THEME: ShareCardTheme = {
  background: "#0f172a",
  panel: "#1e293b",
  ink: "#f8fafc",
  inkSoft: "#94a3b8",
  accent: "#60a5fa",
  ocean: "#0c2036",
  unvisited: "#1e293b",
  border: "#334155",
};

export interface ShareCardInput {
  aspectRatio: CardAspectRatio;
  theme: ShareCardTheme;
  blocks: Set<ShareBlockId>;
  scope: ShareScope;
  scopeLabel: string;
  stats: ShareStats;
  /** Boundaries to draw. Already the right level for the scope. */
  features: Feature[];
  scores: Record<string, RegionScore>;
  /** Drawn under the region fills so a country reads in its surroundings. */
  contextFeatures?: Feature[];
  showBorders: boolean;
  footer: string;
}

const MERCATOR_LIMIT = 85.05112878;
const mercatorX = (lon: number) => (lon * Math.PI) / 180;
const mercatorY = (lat: number) => {
  const clamped = Math.max(-MERCATOR_LIMIT, Math.min(MERCATOR_LIMIT, lat));
  return Math.log(Math.tan(Math.PI / 4 + (clamped * Math.PI) / 360));
};

interface Projector {
  (lon: number, lat: number): { x: number; y: number };
}

/** Fits a lon/lat box into a rect, preserving shape. */
function fitProjector(
  box: { minLon: number; minLat: number; maxLon: number; maxLat: number },
  rect: { x: number; y: number; w: number; h: number },
  padding = 0,
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
    y: offsetY + (y1 - mercatorY(lat)) * scale,
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

const FONT = `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`;
const font = (size: number, weight = 700) => `${weight} ${size}px ${FONT}`;

/** Draws text clipped to a width, ending in an ellipsis rather than overflowing. */
function fillClipped(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }
  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  ctx.fillText(`${clipped}…`, x, y);
}

function drawFeature(ctx: CanvasRenderingContext2D, feature: Feature, project: Projector) {
  const geom = feature.geometry as any;
  const rings: any[] =
    geom?.type === "Polygon" ? [geom.coordinates?.[0]]
      : geom?.type === "MultiPolygon" ? (geom.coordinates ?? []).map((p: any) => p?.[0])
        : [];

  ctx.beginPath();
  for (const ring of rings) {
    if (!ring || ring.length < 3) continue;
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i];
      if (typeof p?.[0] !== "number" || typeof p?.[1] !== "number") continue;
      const { x, y } = project(p[0], p[1]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
}

function featureScore(feature: Feature, scores: Record<string, RegionScore>) {
  const raw = feature.properties?.id || feature.properties?.shapeID;
  const id = padId(raw);
  return id ? scores[id] : undefined;
}

function drawMap(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  input: ShareCardInput,
) {
  const { features, contextFeatures, scores, theme, showBorders } = input;

  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 32);
  ctx.clip();

  ctx.fillStyle = theme.ocean;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  const box = featureBounds(features.length > 0 ? features : (contextFeatures ?? []));
  if (!box) {
    ctx.restore();
    return;
  }

  // A single small region would otherwise fill the frame edge to edge.
  const lonPad = Math.max((box.maxLon - box.minLon) * 0.08, 0.4);
  const latPad = Math.max((box.maxLat - box.minLat) * 0.08, 0.4);
  const project = fitProjector(
    {
      minLon: box.minLon - lonPad, maxLon: box.maxLon + lonPad,
      minLat: box.minLat - latPad, maxLat: box.maxLat + latPad,
    },
    rect,
    24,
  );

  for (const f of contextFeatures ?? []) {
    drawFeature(ctx, f, project);
    ctx.fillStyle = theme.unvisited;
    ctx.fill();
  }

  for (const f of features) {
    const score = featureScore(f, scores);
    const value = score
      ? (score.scoreType === "orange" ? score.rateScore : score.directScore)
      : 0;
    drawFeature(ctx, f, project);
    ctx.fillStyle = score?.hasVisit ? scoreFill(value) : theme.unvisited;
    ctx.fill();
    if (showBorders) {
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawTotals(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number },
  input: ShareCardInput,
): number {
  const { stats, theme } = input;
  const tiles = [
    { label: "RATE", value: `${stats.rate}%`, tone: theme.accent },
    { label: "EXP", value: `${stats.exp}`, tone: theme.ink },
    { label: "방문", value: `${stats.visitedSubRegions}/${stats.totalSubRegions}`, tone: theme.ink },
  ];

  const gap = 16;
  const tileW = (rect.w - gap * (tiles.length - 1)) / tiles.length;
  const tileH = 132;

  tiles.forEach((tile, i) => {
    const x = rect.x + i * (tileW + gap);
    roundRect(ctx, x, rect.y, tileW, tileH, 24);
    ctx.fillStyle = theme.panel;
    ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = theme.inkSoft;
    ctx.font = font(20, 800);
    ctx.fillText(tile.label, x + tileW / 2, rect.y + 42);

    ctx.fillStyle = tile.tone;
    ctx.font = font(50, 900);
    fillClipped(ctx, tile.value, x + tileW / 2, rect.y + 100, tileW - 24);
  });
  ctx.textAlign = "left";

  return tileH;
}

function drawCategories(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number },
  input: ShareCardInput,
): number {
  const rows = categoryRows(input.stats);
  if (rows.length === 0) return 0;

  const { theme } = input;
  const gap = 12;
  const chipH = 76;
  const chipW = (rect.w - gap * (rows.length - 1)) / rows.length;

  rows.forEach((row, i) => {
    const x = rect.x + i * (chipW + gap);
    roundRect(ctx, x, rect.y, chipW, chipH, 20);
    ctx.fillStyle = theme.panel;
    ctx.fill();

    // A colour bar rather than a filled chip: the count has to stay readable
    // against the category's own colour, and several of them are pale.
    roundRect(ctx, x, rect.y, 6, chipH, 3);
    ctx.fillStyle = row.color;
    ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = theme.ink;
    ctx.font = font(30, 900);
    ctx.fillText(String(row.count), x + chipW / 2, rect.y + 38);
    ctx.fillStyle = theme.inkSoft;
    ctx.font = font(17, 700);
    fillClipped(ctx, row.label, x + chipW / 2, rect.y + 62, chipW - 16);
  });
  ctx.textAlign = "left";

  return chipH;
}

function drawRegions(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number },
  input: ShareCardInput,
  maxRows: number,
): number {
  const rows = input.stats.topRegions.slice(0, maxRows);
  if (rows.length === 0) return 0;

  const { theme } = input;
  const rowH = 56;
  const best = Math.max(...rows.map((r) => r.score), 1);

  rows.forEach((row, i) => {
    const y = rect.y + i * rowH;

    ctx.fillStyle = theme.ink;
    ctx.font = font(24, 800);
    fillClipped(ctx, row.name, rect.x, y + 30, rect.w * 0.42);

    // The bar is proportional to the best in view, so the ranking reads even
    // when every score is low.
    const barX = rect.x + rect.w * 0.46;
    const barW = rect.w * 0.42;
    roundRect(ctx, barX, y + 14, barW, 18, 9);
    ctx.fillStyle = theme.unvisited;
    ctx.fill();
    roundRect(ctx, barX, y + 14, Math.max(12, (row.score / best) * barW), 18, 9);
    ctx.fillStyle = row.color;
    ctx.fill();

    ctx.textAlign = "right";
    ctx.fillStyle = theme.inkSoft;
    ctx.font = font(22, 800);
    ctx.fillText(String(row.score), rect.x + rect.w, y + 32);
    ctx.textAlign = "left";
  });

  return rows.length * rowH;
}

/**
 * Draws the card into `canvas`, sizing it for the chosen ratio.
 *
 * 1:1 is the map alone, edge to edge — the ratio people post when they want
 * the picture to speak. The other two carry the stats beside or below it.
 */
export function drawShareCard(canvas: HTMLCanvasElement, input: ShareCardInput) {
  const { w, h } = CARD_SIZE[input.aspectRatio];
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { theme, blocks } = input;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = "alphabetic";

  const pad = Math.round(w * 0.05);

  // ---- 1:1 — the map, full bleed, with a title strip over it ----
  if (input.aspectRatio === "1:1") {
    drawMap(ctx, { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 }, input);

    const stripH = 150;
    const stripY = h - pad - stripH;
    ctx.save();
    roundRect(ctx, pad + 24, stripY, w - pad * 2 - 48, stripH, 28);
    ctx.fillStyle = theme.panel;
    ctx.globalAlpha = 0.94;
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = theme.ink;
    ctx.font = font(46, 900);
    fillClipped(ctx, input.scopeLabel, pad + 56, stripY + 62, w - pad * 2 - 112);

    ctx.fillStyle = theme.inkSoft;
    ctx.font = font(26, 700);
    const summary = `Rate ${input.stats.rate}%  ·  EXP ${input.stats.exp}  ·  방문 ${input.stats.visitedSubRegions}/${input.stats.totalSubRegions}`;
    fillClipped(ctx, summary, pad + 56, stripY + 108, w - pad * 2 - 112);

    ctx.fillStyle = theme.inkSoft;
    ctx.font = font(20, 700);
    ctx.textAlign = "right";
    ctx.fillText(input.footer, w - pad - 24, stripY - 20);
    ctx.textAlign = "left";
    return;
  }

  // ---- Header, shared by 16:9 and 9:16 ----
  ctx.fillStyle = theme.ink;
  ctx.font = font(input.aspectRatio === "16:9" ? 60 : 56, 900);
  fillClipped(ctx, input.scopeLabel, pad, pad + 58, w - pad * 2 - 200);

  ctx.fillStyle = theme.accent;
  ctx.font = font(24, 800);
  ctx.fillText("REGIONEVEL", pad, pad + 96);

  if (input.aspectRatio === "16:9") {
    // Map on the left, everything else stacked on the right.
    const top = pad + 130;
    const colGap = 40;
    const mapW = Math.round((w - pad * 2 - colGap) * 0.56);
    const sideX = pad + mapW + colGap;
    const sideW = w - pad - sideX;

    if (blocks.has("map")) {
      drawMap(ctx, { x: pad, y: top, w: mapW, h: h - top - pad }, input);
    }

    let y = top;
    if (blocks.has("totals")) {
      y += drawTotals(ctx, { x: sideX, y, w: sideW }, input) + 24;
    }
    if (blocks.has("categories")) {
      const used = drawCategories(ctx, { x: sideX, y, w: sideW }, input);
      if (used > 0) y += used + 24;
    }
    if (blocks.has("regions")) {
      const room = Math.floor((h - pad - 40 - y) / 56);
      if (room > 0) y += drawRegions(ctx, { x: sideX, y, w: sideW }, input, room);
    }

    ctx.fillStyle = theme.inkSoft;
    ctx.font = font(20, 700);
    ctx.textAlign = "right";
    ctx.fillText(input.footer, w - pad, h - pad + 4);
    ctx.textAlign = "left";
    return;
  }

  // ---- 9:16 — one column ----
  let y = pad + 130;
  const colW = w - pad * 2;

  if (blocks.has("map")) {
    const mapH = Math.round(h * 0.42);
    drawMap(ctx, { x: pad, y, w: colW, h: mapH }, input);
    y += mapH + 32;
  }
  if (blocks.has("totals")) {
    y += drawTotals(ctx, { x: pad, y, w: colW }, input) + 28;
  }
  if (blocks.has("categories")) {
    const used = drawCategories(ctx, { x: pad, y, w: colW }, input);
    if (used > 0) y += used + 28;
  }
  if (blocks.has("regions")) {
    const room = Math.floor((h - pad - 60 - y) / 56);
    if (room > 0) y += drawRegions(ctx, { x: pad, y, w: colW }, input, room);
  }

  ctx.fillStyle = theme.inkSoft;
  ctx.font = font(22, 700);
  ctx.textAlign = "center";
  ctx.fillText(input.footer, w / 2, h - pad);
  ctx.textAlign = "left";
}
