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

export interface ParsedTimeline {
  stays: StayEvent[];
  /** One array of ordered points per movement segment. */
  moves: TracePoint[][];
  /** Counts by reason, so an import that finds nothing can say why. */
  skipped: Record<string, number>;
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
}
