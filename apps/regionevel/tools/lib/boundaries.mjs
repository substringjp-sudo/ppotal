/**
 * Shared boundary helpers for the region tools.
 *
 * Kept in one place deliberately. This repository has already paid for the
 * alternative once: padId existed in three copies that each padded to a
 * different width, so the same region produced a different key depending on
 * which call site you asked. Point-in-polygon and "what does this shape call
 * itself" are exactly the kind of thing that drifts the same way.
 */

export function* rings(geometry) {
  if (!geometry) return;
  if (geometry.type === "Polygon") {
    if (geometry.coordinates?.[0]) yield geometry.coordinates[0];
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates ?? []) if (poly?.[0]) yield poly[0];
  }
}

export function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2);
}

export function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > pt[1]) !== (yj > pt[1]))
      && (pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

export function pointInGeometry(pt, geometry) {
  for (const ring of rings(geometry)) if (pointInRing(pt, ring)) return true;
  return false;
}

/** Planar ring area. Only ever compared against another area nearby, so degrees are fine. */
export function geometryArea(geometry) {
  let total = 0;
  for (const ring of rings(geometry)) total += ringArea(ring);
  return total;
}

/** The coordinates of a Point or MultiPoint source, or none for an area source. */
export function pointsOf(geometry) {
  if (geometry?.type === "Point") return [geometry.coordinates];
  if (geometry?.type === "MultiPoint") return geometry.coordinates ?? [];
  return [];
}

export function bbox(geometry) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const ring of rings(geometry)) {
    for (const p of ring) {
      if (p[0] < b[0]) b[0] = p[0];
      if (p[1] < b[1]) b[1] = p[1];
      if (p[0] > b[2]) b[2] = p[0];
      if (p[1] > b[3]) b[3] = p[1];
    }
  }
  return Number.isFinite(b[0]) ? b : null;
}

/**
 * A point that actually lies inside the shape.
 *
 * The plain centroid escapes concave shapes — a C-shaped municipality, or one
 * wrapped around a bay — and a point outside its own polygon would then match
 * whatever neighbour happens to contain it, which is a silently wrong name.
 */
export function interiorPoint(geometry) {
  let best = null;
  let bestArea = -1;
  for (const ring of rings(geometry)) {
    const a = ringArea(ring);
    if (a > bestArea) { bestArea = a; best = ring; }
  }
  if (!best || best.length === 0) return null;

  let x = 0, y = 0;
  for (const p of best) { x += p[0]; y += p[1]; }
  const centre = [x / best.length, y / best.length];
  if (pointInRing(centre, best)) return centre;

  // Walk in from each vertex towards the centre until a point lands inside.
  for (const p of best) {
    for (const t of [0.5, 0.25, 0.1]) {
      const cand = [p[0] + (centre[0] - p[0]) * t, p[1] + (centre[1] - p[1]) * t];
      if (pointInRing(cand, best)) return cand;
    }
  }
  return null;
}

// ----------------------------------------------------------------- naming --

export const NAME_KEYS = ["name", "shapeName", "nameEn", "nameJa", "NAME"];

/**
 * A name nothing can be labelled with, and that name-based matching cannot
 * match on.
 *
 * The literal string "Null" belongs here: El Salvador has ten municipalities
 * carrying it, written out by a seed that stringified a missing name instead
 * of noticing it was missing.
 */
export function isUnusableName(n) {
  return n == null
    || typeof n !== "string"
    || !n.trim()
    || /^\?+$/.test(n.trim())
    || /^(unknown|n\/?a|null|undefined|none)$/i.test(n.trim());
}

export function readName(props) {
  for (const k of NAME_KEYS) {
    const v = props?.[k];
    if (typeof v === "string" && !isUnusableName(v)) return v.trim();
  }
  return null;
}

/** Han, kana and hangul — the scripts a local name is written in here. */
export const LOCAL_SCRIPT = /[぀-ヿ㐀-鿿가-힯]/;

/**
 * A romanised name and its local spelling, told apart by script rather than by
 * which key they arrived under.
 *
 * Sources disagree on that: geoBoundaries puts the romanised form in
 * `shapeName`, the OSM patch puts it there too while `name` holds the local
 * one, and the region table is the other way round. Trusting key order is how
 * 富士吉田市 lands in a table of "Ine" and "Chichibu", and how a duplicate
 * check against romanised names silently never matches.
 */
export function readNamePair(props) {
  const values = NAME_KEYS
    .map((k) => props?.[k])
    .filter((v) => typeof v === "string" && !isUnusableName(v))
    .map((v) => v.trim());
  if (values.length === 0) return null;
  const local = values.find((v) => LOCAL_SCRIPT.test(v)) ?? null;
  const roman = values.find((v) => !LOCAL_SCRIPT.test(v)) ?? null;
  return { name: roman ?? local, local: local && local !== roman ? local : null };
}

/**
 * Designations that occupy a polygon without being a municipality. Seeding one
 * creates a region nobody can ever visit.
 */
export const NOT_A_MUNICIPALITY = [/^所属未定地$/, /^境界未定地/];

export function isNotAMunicipality(...names) {
  return names.some((n) => n && NOT_A_MUNICIPALITY.some((re) => re.test(n)));
}

/** The shapeID a boundary is identified by, whatever the file calls that field. */
export function readShapeId(feature) {
  const p = feature?.properties ?? feature ?? {};
  for (const k of ["shapeID", "shapeId", "shape_id", "id", "ID"]) {
    const v = p[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

// -------------------------------------------------------------------- io --

export function readJson(p, fs) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function featuresOf(doc) {
  if (Array.isArray(doc)) return doc;
  if (Array.isArray(doc?.features)) return doc.features;
  return Object.values(doc);
}
