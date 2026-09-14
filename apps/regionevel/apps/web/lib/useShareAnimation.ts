"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Region, RegionVisit } from "@regionevel/types";
import {
  createFrameBuilder,
  syntheticShare,
  type TimelineFrame,
  type VisitTimelineEvent,
} from "./visitTimeline";

export type AnimationStatus = "idle" | "building" | "ready" | "empty";

/** Frames per second of playback. Slow enough to read the date on each one. */
const FPS = 8;
/** Frames built per tick while yielding to the page in between. */
const BUILD_CHUNK = 4;

export interface ShareAnimation {
  status: AnimationStatus;
  /** 0–1 while building. */
  buildProgress: number;
  frames: TimelineFrame[];
  events: VisitTimelineEvent[];
  /** How much of the sequence had its date filled in rather than recorded. */
  syntheticShare: number;
  index: number;
  setIndex: (i: number) => void;
  playing: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Restarts from the first frame. */
  restart: () => void;
  frame: TimelineFrame | null;
  fps: number;
}

/**
 * Builds the replay for the current scope and plays it.
 *
 * The build is chunked across animation frames rather than run in one go: a
 * country at city level is thousands of regions per frame, and doing all of it
 * inside one task freezes the modal for as long as it takes.
 */
export function useShareAnimation(params: {
  enabled: boolean;
  visits: RegionVisit[];
  regions: Region[];
  targetIds: string[];
  maxFrames?: number;
}): ShareAnimation {
  const { enabled, visits, regions, targetIds, maxFrames = 90 } = params;

  const [frames, setFrames] = useState<TimelineFrame[]>([]);
  const [events, setEvents] = useState<VisitTimelineEvent[]>([]);
  const [status, setStatus] = useState<AnimationStatus>("idle");
  const [buildProgress, setBuildProgress] = useState(0);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  // A stable description of the inputs, so playback is not restarted by a new
  // array identity carrying the same visits.
  const visitKey = useMemo(
    () => visits.map((v) => `${v.regionId}:${v.category}:${v.count}:${(v.dates ?? []).join(",")}`).sort().join("|"),
    [visits],
  );
  const targetKey = useMemo(() => [...targetIds].sort().join("|"), [targetIds]);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      setFrames([]);
      setPlaying(false);
      return;
    }

    let cancelled = false;
    setStatus("building");
    setBuildProgress(0);
    setIndex(0);

    const builder = createFrameBuilder(visits, regions, { targetIds, maxFrames });
    setEvents(builder.events);

    if (builder.dates.length === 0 || targetIds.length === 0) {
      setFrames([]);
      setStatus("empty");
      return;
    }

    const built: TimelineFrame[] = [];
    let i = 0;

    const step = () => {
      if (cancelled) return;
      const end = Math.min(i + BUILD_CHUNK, builder.dates.length);
      for (; i < end; i++) built.push(builder.buildFrame(i));
      setBuildProgress(i / builder.dates.length);

      if (i < builder.dates.length) {
        requestAnimationFrame(step);
        return;
      }
      setFrames(built);
      setStatus(built.length > 1 ? "ready" : "empty");
      setPlaying(built.length > 1);
    };

    requestAnimationFrame(step);
    return () => { cancelled = true; };
    // `visitKey` and `targetKey` stand in for the arrays they summarise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, visitKey, targetKey, regions, maxFrames]);

  // Playback
  const lastTickRef = useRef(0);
  useEffect(() => {
    if (!playing || status !== "ready" || frames.length === 0) return;

    let raf = 0;
    const tick = (now: number) => {
      if (now - lastTickRef.current >= 1000 / FPS) {
        lastTickRef.current = now;
        setIndex((prev) => (prev + 1) % frames.length);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, status, frames.length]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const restart = useCallback(() => {
    setIndex(0);
    setPlaying(true);
  }, []);

  const setIndexManually = useCallback((i: number) => {
    setPlaying(false);
    setIndex(i);
  }, []);

  return {
    status,
    buildProgress,
    frames,
    events,
    syntheticShare: syntheticShare(events),
    index: Math.min(index, Math.max(0, frames.length - 1)),
    setIndex: setIndexManually,
    playing,
    play,
    pause,
    toggle,
    restart,
    frame: frames[Math.min(index, frames.length - 1)] ?? null,
    fps: FPS,
  };
}
