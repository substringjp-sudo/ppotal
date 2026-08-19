import type { VisitCategory } from "@regionevel/types";

/** Time spent stationary in one place, as reported by a `visit` segment. */
export interface StayEvent {
  lat: number;
  lon: number;
  startTime: number; // epoch ms
  endTime: number; // epoch ms
}

/** One fix along a movement (activity) segment. */
export interface TracePoint {
  lat: number;
  lon: number;
  t: number; // epoch ms
}

/** Which export shape a file turned out to be. */
export type TimelineFormat =
  | "semanticSegments"
  | "segmentArray"
  | "timelineObjects"
  | "records"
  | "unrecognised";

/**
 * What the parser saw, so a file that yields nothing can say why.
 *
 * Without this, "no movement found" is a dead end: it cannot distinguish a
 * genuinely empty export from one whose coordinates are in a spelling the
 * parser does not read, and the user has no way to tell us which.
 */
export interface ParseDiagnostics {
  formats: TimelineFormat[];
  /** Top-level keys of each root, for a file in a shape we do not know. */
  topLevelKeys: string[];
  /** Segments seen, before any were skipped. */
  segmentsSeen: number;
  /** Segments that looked like a visit, and how many produced a usable point. */
  visitsSeen: number;
  visitsParsed: number;
  /** Same for movement segments. */
  activitiesSeen: number;
  activitiesParsed: number;
  /** A coordinate we could not read, kept verbatim to identify the spelling. */
  sampleUnparsedCoordinate?: string;
}

export interface ParsedTimeline {
  stays: StayEvent[];
  /** One array of ordered points per movement segment. */
  moves: TracePoint[][];
  /** Counts by reason, so an import that finds nothing can say why. */
  skipped: Record<string, number>;
  diagnostics: ParseDiagnostics;
}

/** A stay (or several merged stays) resolved to one region, ready to classify. */
export interface RegionOccasion {
  regionId: string;
  admLevel: 0 | 1 | 2;
  startTime: number;
  endTime: number;
  category: Extract<VisitCategory, "transit" | "visit" | "stay">;
}

export interface RegionImportSummary {
  regionId: string;
  admLevel: 0 | 1 | 2;
  name: string;
  ancestorNames: string[];
  /** How many new occasions of each category this import would add. */
  counts: Partial<Record<VisitCategory, number>>;
}

export interface TimelineImportPreview {
  regions: RegionImportSummary[];
  skipped: Record<string, number>;
  /** Occasions actually applied when the user confirms, one entry per upsert. */
  applyList: Array<{ regionId: string; category: VisitCategory }>;
  /**
   * How many parsed points landed on a region. A file can parse perfectly and
   * still match nothing — no boundary data for that country, or the fetch
   * failed — and the two need telling apart.
   */
  resolution: { pointsTried: number; pointsResolved: number };
}
