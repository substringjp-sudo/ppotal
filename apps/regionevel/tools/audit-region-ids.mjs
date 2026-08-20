#!/usr/bin/env node
/**
 * Audit the region id/hierarchy table.
 *
 * The geometry audit answers "do we have the right shapes". This answers the
 * question underneath it: "do the ids and the parent links hold together at
 * all". They are separate failures — a region can have perfect geometry and
 * still be unreachable because its parentId points at the wrong level.
 *
 * What it looks for, and why each one bites:
 *
 *   dangling parent   parentId names a region that does not exist, so the
 *                     region is invisible to any tree walk
 *   level skip        a city whose parent is a country rather than a
 *                     prefecture. Its visits roll up to the country but the
 *                     prefecture in between never sees them, so that
 *                     prefecture's completion rate is silently short.
 *   id/level mismatch the id's shape says one level, admLevel says another.
 *                     padId infers level from length, so these disagree at
 *                     runtime depending on which one a call site trusts.
 *   key collision     two regions normalising to the same padId. padId is the
 *                     join key between visits, regions and scores, so a
 *                     collision merges two places' visit history.
 *   sentinel id       all-zero or empty ids — a null that got written as data.
 *   bad iso3          not an ISO 3166-1 alpha-3 code.
 *   count drift       childrenCount disagrees with the children actually
 *                     present. It is the denominator of every "visited N of M",
 *                     so drift here shows up as a wrong percentage on screen.
 *
 * Usage:
 *   node tools/audit-region-ids.mjs --regions regions.json [--full]
 *
 * `regions.json` is an array of the Region records ({id, parentId, name,
 * iso3, admLevel, childrenCount}). Pass --full when the file is the complete
 * table; without it, checks that need the whole table (dangling parents,
 * count drift) are reported as "cannot judge from a partial file" rather than
 * as findings, so a slice of the data cannot produce false alarms.
 */
import fs from "node:fs";

const argv = process.argv.slice(2);
const arg = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const FULL = argv.includes("--full");
const path = arg("regions");
if (!path) {
  console.error("need --regions <file.json>");
  process.exit(1);
}

/** The canonical key, copied from @regionevel/utils so this runs standalone. */
const padId = (id) => {
  if (id === undefined || id === null) return "";
  const s = String(id);
  if (s.length === 3 || s.length === 7 || s.length === 12) return s;
  const t = s.trim();
  if (!t) return "";
  if (!/^\d+$/.test(t)) return t;
  if (t.length <= 3) return t.padStart(3, "0");
  if (t.length <= 7) return t.padStart(7, "0");
  return t.padStart(12, "0");
};

/** What the id's own shape claims the level is — the assumption padId encodes. */
const levelFromId = (id) => {
  const p = padId(id);
  if (!/^\d+$/.test(p)) return null; // not a numeric id; shape says nothing
  if (p.length <= 3) return 0;
  if (p.length <= 7) return 1;
  return 2;
};

const regions = JSON.parse(fs.readFileSync(path, "utf8"));
console.log(`records: ${regions.length}${FULL ? "" : "   (partial file — whole-table checks are skipped)"}\n`);

const byKey = new Map();
for (const r of regions) {
  const k = padId(r.id);
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k).push(r);
}

// ------------------------------------------------------------- id shapes
const shape = (id) => {
  const s = String(id ?? "");
  if (!s) return "(empty)";
  if (/^\d+$/.test(s)) return `${s.length} digits`;
  if (/^osm_\d+$/.test(s)) return "osm_<id>";
  if (/^[A-Z]{3}-ADM\d/.test(s)) return "ISO-ADMn-xx";
  if (/^\d+[A-Z]\d+$/.test(s)) return "geoBoundaries shapeID";
  return `other (${s.length} chars)`;
};
const shapes = new Map();
for (const r of regions) {
  const s = shape(r.id);
  shapes.set(s, (shapes.get(s) ?? 0) + 1);
}
console.log("[id shapes] more than one numeric width at the same level means padId");
console.log("            will file them at different levels:");
[...shapes.entries()].sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`              ${String(n).padStart(6)}  ${s}`));

// -------------------------------------------------------------- findings
const findings = { sentinel: [], badIso3: [], levelMismatch: [], collision: [], dangling: [], levelSkip: [], countDrift: [] };

for (const [k, list] of byKey) if (list.length > 1) findings.collision.push({ key: k, list });

for (const r of regions) {
  const id = String(r.id ?? "");
  if (!id || /^0+$/.test(id)) findings.sentinel.push(r);
  if (r.iso3 != null && !/^[A-Z]{3}$/.test(String(r.iso3))) findings.badIso3.push(r);

  const shapeLevel = levelFromId(r.id);
  if (shapeLevel !== null && r.admLevel != null && shapeLevel !== r.admLevel) {
    findings.levelMismatch.push({ r, shapeLevel });
  }
}

if (FULL) {
  const index = new Map(regions.map((r) => [padId(r.id), r]));
  for (const r of regions) {
    if (r.parentId == null || r.parentId === "") continue; // a root
    const parent = index.get(padId(r.parentId));
    if (!parent) { findings.dangling.push(r); continue; }
    if (r.admLevel != null && parent.admLevel != null && parent.admLevel !== r.admLevel - 1) {
      findings.levelSkip.push({ r, parentLevel: parent.admLevel });
    }
  }
  const actual = new Map();
  for (const r of regions) {
    const p = padId(r.parentId);
    if (p) actual.set(p, (actual.get(p) ?? 0) + 1);
  }
  for (const r of regions) {
    if (r.childrenCount == null) continue;
    const have = actual.get(padId(r.id)) ?? 0;
    if (have !== r.childrenCount) findings.countDrift.push({ r, have });
  }
} else {
  // Without the whole table we can still spot the shape of a level skip: a
  // child's parentId whose own width puts it more than one level above.
  for (const r of regions) {
    if (r.parentId == null || r.admLevel == null) continue;
    const pl = levelFromId(r.parentId);
    if (pl !== null && pl !== r.admLevel - 1) findings.levelSkip.push({ r, parentLevel: pl });
  }
}

const report = (label, list, fmt, note) => {
  console.log(`\n[${label}] ${list.length}`);
  if (note && list.length) console.log(`          ${note}`);
  list.slice(0, 8).forEach((x) => console.log(`            ${fmt(x)}`));
  if (list.length > 8) console.log(`            … and ${list.length - 8} more`);
};

report("sentinel ids", findings.sentinel, (r) => `id=${r.id} parent=${r.parentId} name=${r.name} iso3=${r.iso3}`,
  "a null that reached the database as a record");
report("bad iso3", findings.badIso3, (r) => `id=${r.id} iso3=${JSON.stringify(r.iso3)} name=${r.name}`,
  "not an ISO 3166-1 alpha-3 code");
report("id shape disagrees with admLevel", findings.levelMismatch,
  ({ r, shapeLevel }) => `id=${r.id} admLevel=${r.admLevel} but the id's width says level ${shapeLevel} (${r.name})`,
  "padId infers the level from width, so these resolve differently per call site");
report("padId key collisions", findings.collision,
  ({ key, list }) => `${key} <- ${list.map((r) => `${r.id}(${r.name})`).join(" | ")}`,
  "visits, regions and scores all join on this key");
if (FULL) report("dangling parents", findings.dangling, (r) => `id=${r.id} parent=${r.parentId} (${r.name})`,
  "unreachable by any walk down the tree");
report("level skips", findings.levelSkip,
  ({ r, parentLevel }) => `id=${r.id} admLevel=${r.admLevel} parent=${r.parentId} at level ${parentLevel} (${r.name}, ${r.iso3})`,
  "the level in between never sees these visits, so its rate reads low");
if (FULL) report("childrenCount drift", findings.countDrift,
  ({ r, have }) => `id=${r.id} says ${r.childrenCount}, actually ${have} (${r.name})`,
  "this is the denominator of every 'visited N of M' on screen");
else console.log(`\n[dangling parents / childrenCount drift] need the whole table — rerun with --full`);

const total = Object.values(findings).reduce((n, l) => n + l.length, 0);
console.log(`\n${total === 0 ? "clean" : `${total} findings`}`);
