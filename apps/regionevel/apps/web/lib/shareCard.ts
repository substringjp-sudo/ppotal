import type { Feature } from "geojson";
import type { Region, RegionScore, RegionVisit, VisitCategory } from "@regionevel/types";
import { VISIT_CATEGORY_ORDER, VISIT_CONFIG } from "@regionevel/types";
import { padId } from "@regionevel/utils";

/**
 * What a share card is about, and what it can say.
 *
 * The model is kept apart from the drawing so the numbers on the card can be
 * checked without a canvas, and so the same stats could feed something other
 * than an image later.
 */

export type ShareScopeKind = "world" | "country" | "prefecture";

export interface ShareScope {
  kind: ShareScopeKind;
  /** Region id. Unused for 'world'. */
  id?: string;
  label?: string;
}

/** Blocks the user can put on the card. */
export type ShareBlockId = "map" | "totals" | "categories" | "regions";

export const SHARE_BLOCKS: ShareBlockId[] = ["map", "totals", "categories", "regions"];

export interface RegionRank {
  id: string;
  name: string;
  score: number;
  color: string;
}

export interface ShareStats {
  /** Direct EXP of the scoped region, 0–100. */
  exp: number;
  /** Share of the scoped region's children that have been reached, 0–100. */
  rate: number;
  visitedCountries: number;
  visitedPrefectures: number;
  visitedCities: number;
  /** Sub-regions reached out of the total that exist. */
  visitedSubRegions: number;
  totalSubRegions: number;
  /** How many regions carry each category, in scope. */
  categories: Record<VisitCategory, number>;
  /** Highest-scoring regions in scope, best first. */
  topRegions: RegionRank[];
}

export const emptyStats = (): ShareStats => ({
  exp: 0,
  rate: 0,
  visitedCountries: 0,
  visitedPrefectures: 0,
  visitedCities: 0,
  visitedSubRegions: 0,
  totalSubRegions: 0,
  categories: Object.fromEntries(
    VISIT_CATEGORY_ORDER.map((c) => [c, 0]),
  ) as Record<VisitCategory, number>,
  topRegions: [],
});

/** How many regions the card lists before it stops. */
export const MAX_REGION_ROWS = 6;

/** Colour ramp shared with the map, so a card reads like the thing it came from. */
export function scoreFill(score: number): string {
  if (score <= 0) return "#e2e8f0";
  if (score < 8) return "#93c5fd";
  if (score < 18) return "#60a5fa";
  if (score < 31) return "#3b82f6";
  if (score < 51) return "#2563eb";
  return "#1e3a8a";
}

/** Every descendant of `rootId`, or every region when it is null. */
function descendantsOf(
  rootId: string | null,
  regions: Region[],
): { inScope: Region[]; children: Region[] } {
  if (!rootId) {
    return { inScope: regions, children: regions.filter((r) => r.admLevel === 0) };
  }
  const target = padId(rootId);
  const byParent = new Map<string, Region[]>();
  for (const r of regions) {
    const pid = padId(r.parentId);
    const list = byParent.get(pid) || [];
    list.push(r);
    byParent.set(pid, list);
  }

  const children = byParent.get(target) || [];
  const inScope: Region[] = [];
  const queue = [...children];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const r = queue.pop()!;
    const id = padId(r.id);
    if (seen.has(id)) continue;
    seen.add(id);
    inScope.push(r);
    for (const child of byParent.get(id) || []) queue.push(child);
  }
  return { inScope, children };
}

export function computeShareStats(
  scope: ShareScope,
  regions: Region[],
  visits: RegionVisit[],
  scores: Record<string, RegionScore>,
): ShareStats {
  const stats = emptyStats();
  const rootId = scope.kind === "world" ? null : scope.id ?? null;
  const { inScope, children } = descendantsOf(rootId, regions);

  const inScopeIds = new Set(inScope.map((r) => padId(r.id)));

  for (const r of inScope) {
    const score = scores[padId(r.id)];
    if (!score?.hasVisit) continue;
    if (r.admLevel === 0) stats.visitedCountries++;
    else if (r.admLevel === 1) stats.visitedPrefectures++;
    else if (r.admLevel === 2) stats.visitedCities++;
  }

  // A category counts once per region, not once per recorded occasion — the
  // card is about coverage, and "5 stays" reads as five places, not one place
  // five times.
  const perCategory = new Map<VisitCategory, Set<string>>();
  for (const cat of VISIT_CATEGORY_ORDER) perCategory.set(cat, new Set());
  for (const v of visits) {
    if (v.count <= 0) continue;
    const id = padId(v.regionId);
    if (!inScopeIds.has(id)) continue;
    perCategory.get(v.category)?.add(id);
  }
  for (const cat of VISIT_CATEGORY_ORDER) {
    stats.categories[cat] = perCategory.get(cat)!.size;
  }

  const rootScore = rootId ? scores[padId(rootId)] : null;
  if (rootScore) {
    stats.exp = Math.round(rootScore.directScore);
    stats.rate = Math.ceil(rootScore.rateScore);
  } else {
    // The world has no score record of its own; derive it from the countries.
    const countries = regions.filter((r) => !r.parentId);
    let sum = 0;
    let max = 0;
    for (const c of countries) {
      const s = scores[padId(c.id)];
      if (s) {
        sum += s.totalScore;
        max += 50;
      }
    }
    stats.rate = max > 0 ? Math.ceil(Math.min(100, (sum / max) * 100)) : 0;
    stats.exp = stats.rate;
  }

  stats.totalSubRegions = children.length;
  stats.visitedSubRegions = children.filter((c) => scores[padId(c.id)]?.hasVisit).length;

  stats.topRegions = children
    .map((r) => {
      const s = scores[padId(r.id)];
      const score = s ? s.totalScore : 0;
      return {
        id: padId(r.id),
        name: r.nameKo || r.name,
        score,
        color: scoreFill(s?.scoreType === "orange" ? s.rateScore : score),
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_REGION_ROWS);

  return stats;
}

/**
 * What the card should be about when it opens.
 *
 * A tapped region wins over the drilled-into one: tapping is the more
 * deliberate act, and while a tap is open it is what "this region" means on
 * screen. A city cannot be a scope of its own — the card is about a country or
 * a first-level region — so a tapped city resolves to the region containing
 * it rather than dropping all the way back to the world.
 *
 * Returns null when neither candidate leads anywhere, which the caller reads
 * as "the whole world".
 */
export function resolveShareSubject(
  selectedId: string | null,
  currentId: string | null,
  regionsById: Map<string, Region>,
): Region | null {
  const climb = (id: string | null): Region | null => {
    let region = id ? regionsById.get(padId(id)) ?? null : null;
    const seen = new Set<string>();
    while (region && region.admLevel > 1) {
      const parentId = padId(region.parentId);
      if (!parentId || seen.has(parentId)) return null;
      seen.add(parentId);
      region = regionsById.get(parentId) ?? null;
    }
    return region;
  };
  return climb(selectedId) ?? climb(currentId);
}

/** Which scopes the user can pick, given what has been loaded and visited. */
export function availableScopes(
  regions: Region[],
  scores: Record<string, RegionScore>,
): { countries: Region[]; prefectures: Region[] } {
  const visited = (r: Region) => scores[padId(r.id)]?.hasVisit;
  return {
    countries: regions.filter((r) => r.admLevel === 0 && visited(r)),
    prefectures: regions.filter((r) => r.admLevel === 1 && visited(r)),
  };
}

/** A one-line summary for the share text, kept short enough to post. */
export function shareMessage(scopeLabel: string, stats: ShareStats): string {
  const parts = [
    `📍 ${scopeLabel}`,
    `Rate ${stats.rate}% · EXP ${stats.exp}`,
    `방문 ${stats.visitedSubRegions}/${stats.totalSubRegions}`,
  ];
  return `${parts.join("\n")}\nhttps://rgnevel.pplaner.com`;
}

/** Category rows for the card, dropping the ones with nothing to say. */
export function categoryRows(stats: ShareStats) {
  return VISIT_CATEGORY_ORDER.map((cat) => ({
    cat,
    count: stats.categories[cat],
    label: VISIT_CONFIG[cat].label,
    color: VISIT_CONFIG[cat].color,
    emoji: VISIT_CONFIG[cat].emoji,
  })).filter((r) => r.count > 0);
}

/** Bounding box of the features that will be drawn, for framing the map. */
export function featureBounds(features: Feature[]) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;

  const ring = (coords: any) => {
    for (const p of coords) {
      const lon = p?.[0];
      const lat = p?.[1];
      if (typeof lon !== "number" || typeof lat !== "number") continue;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  };

  for (const f of features) {
    const geom = f.geometry as any;
    if (geom?.type === "Polygon") {
      if (geom.coordinates?.[0]) ring(geom.coordinates[0]);
    } else if (geom?.type === "MultiPolygon") {
      for (const poly of geom.coordinates ?? []) if (poly?.[0]) ring(poly[0]);
    }
  }

  if (!Number.isFinite(minLon)) return null;
  return { minLon, minLat, maxLon, maxLat };
}
