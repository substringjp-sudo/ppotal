"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import type { MapMouseEvent, MapLayerMouseEvent, MapRef } from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";
import type { Region } from "@regionevel/types";
import { getScoreColor } from "@regionevel/utils";
import { useVisitStore } from "@/store/visitStore";
import { getChildren } from "@/lib/regions";
import { RegionTooltip } from "./RegionTooltip";
import "maplibre-gl/dist/maplibre-gl.css";

const LONG_PRESS_MS = 500;

interface RegionMapProps {
  regions: Region[];
  geojsonAdm1: FeatureCollection;
  geojsonAdm2: FeatureCollection;
}

export function RegionMap({ regions, geojsonAdm1, geojsonAdm2 }: RegionMapProps) {
  const { visits, quickIncrement, upsertVisit, getFullScore } = useVisitStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeAdmLevel, setActiveAdmLevel] = useState<1 | 2>(1);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevent click from firing after a long-press completes
  const longPressTriggered = useRef(false);
  const mapRef = useRef<MapRef | null>(null);

  const scoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of regions) {
      map[r.id] = getFullScore(r.id, regions).totalScore;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, visits]);

  const enrichedAdm1 = useMemo(
    () => enrichGeoJSON(geojsonAdm1, scoreMap),
    [geojsonAdm1, scoreMap],
  );
  const enrichedAdm2 = useMemo(
    () => enrichGeoJSON(geojsonAdm2, scoreMap),
    [geojsonAdm2, scoreMap],
  );

  const selectedRegion = selectedId ? regions.find((r) => r.id === selectedId) ?? null : null;
  const selectedScore = selectedId ? getFullScore(selectedId, regions) : null;
  const selectedChildren = selectedId ? getChildren(regions, selectedId) : [];

  // ─── Long press start (mouse + touch) ──────────────────────────────────────

  const startLongPress = useCallback((shapeId: string) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setSelectedId(shapeId);
    }, LONG_PRESS_MS);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // ─── Mouse events ───────────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: MapLayerMouseEvent) => {
      const shapeId = e.features?.[0]?.properties?.shapeID as string | undefined;
      if (shapeId) startLongPress(shapeId);
    },
    [startLongPress],
  );

  const handleMouseUp = useCallback(() => cancelLongPress(), [cancelLongPress]);

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (longPressTriggered.current) return; // swallow click after long-press
      const shapeId = e.features?.[0]?.properties?.shapeID as string | undefined;
      if (shapeId) quickIncrement(shapeId);
    },
    [quickIncrement],
  );

  // ─── Touch events (mobile long-press) ──────────────────────────────────────
  // We query features at touch position since MapLibre doesn't expose onTouchStart
  // with feature data in react-map-gl.

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const touch = e.touches[0];
      if (!touch) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const point = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      const layers = activeAdmLevel === 1 ? ["adm1-fill"] : ["adm2-fill"];
      const features = map.queryRenderedFeatures(
        [point.x, point.y],
        { layers },
      );
      const shapeId = features[0]?.properties?.shapeID as string | undefined;
      if (shapeId) startLongPress(shapeId);
    },
    [activeAdmLevel, startLongPress],
  );

  const handleTouchEnd = useCallback(() => cancelLongPress(), [cancelLongPress]);

  // ─── Tooltip actions ────────────────────────────────────────────────────────

  const handleDrillDown = useCallback(
    (regionId: string) => {
      const r = regions.find((x) => x.id === regionId);
      if (!r) return;
      setActiveAdmLevel(r.admLevel as 1 | 2);
      setSelectedId(regionId);
    },
    [regions],
  );

  const handleVisitChange = useCallback(
    (category: string, delta: number) => {
      if (!selectedId) return;
      const current = visits.find(
        (v) => v.regionId === selectedId && v.category === category,
      );
      const newCount = Math.max(0, (current?.count ?? 0) + delta);
      upsertVisit(selectedId, category as never, newCount);
    },
    [selectedId, visits, upsertVisit],
  );

  const interactiveLayerIds = activeAdmLevel === 1 ? ["adm1-fill"] : ["adm2-fill"];

  return (
    <div
      className="relative w-full h-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 127.5, latitude: 36.5, zoom: 6 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={{
          version: 8,
          sources: {
            "osm-tiles": {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm-tiles" }],
        }}
        interactiveLayerIds={interactiveLayerIds}
        onClick={handleClick}
        onMouseDown={handleMouseDown as unknown as (e: MapMouseEvent) => void}
        onMouseUp={handleMouseUp}
        cursor="pointer"
      >
        <Source id="adm1" type="geojson" data={enrichedAdm1}>
          <Layer
            id="adm1-fill"
            type="fill"
            paint={{
              "fill-color": fillColorExpression,
              "fill-opacity": activeAdmLevel === 1 ? 0.55 : 0.2,
            }}
          />
          <Layer
            id="adm1-border"
            type="line"
            paint={{
              "line-color": "#1e40af",
              "line-width": activeAdmLevel === 1 ? 1.5 : 0.5,
              "line-opacity": 0.7,
            }}
          />
        </Source>

        {activeAdmLevel === 2 && (
          <Source id="adm2" type="geojson" data={enrichedAdm2}>
            <Layer
              id="adm2-fill"
              type="fill"
              paint={{ "fill-color": fillColorExpression, "fill-opacity": 0.6 }}
            />
            <Layer
              id="adm2-border"
              type="line"
              paint={{ "line-color": "#1d4ed8", "line-width": 1, "line-opacity": 0.8 }}
            />
          </Source>
        )}
      </Map>

      {/* ADM level toggle */}
      <div className="absolute top-3 right-3 flex gap-1 bg-white rounded-lg shadow border border-gray-200 p-1 z-10">
        {([1, 2] as const).map((lvl) => (
          <button
            key={lvl}
            onClick={() => setActiveAdmLevel(lvl)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeAdmLevel === lvl
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {lvl === 1 ? "광역" : "기초"}
          </button>
        ))}
      </div>

      {/* Quick-action hint */}
      <div className="absolute bottom-6 left-3 bg-white/90 rounded-lg shadow border border-gray-200 px-3 py-2 z-10 text-xs text-gray-500 space-y-0.5">
        <p><span className="font-medium">클릭</span> — 방문 단계 +1</p>
        <p><span className="font-medium">길게 누르기</span> — 상세 편집</p>
      </div>

      {selectedRegion && selectedScore && (
        <RegionTooltip
          region={selectedRegion}
          score={selectedScore}
          children={selectedChildren}
          onClose={() => setSelectedId(null)}
          onDrillDown={handleDrillDown}
          onVisitChange={handleVisitChange}
        />
      )}

      <ScoreLegend />
    </div>
  );
}

function ScoreLegend() {
  const steps = [0, 20, 40, 70, 100];
  return (
    <div className="absolute bottom-6 right-3 bg-white rounded-lg shadow border border-gray-200 px-3 py-2 z-10">
      <p className="text-xs font-semibold text-gray-500 mb-1">점수</p>
      <div className="flex flex-col gap-1">
        {steps.map((s) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className="w-4 h-3 rounded-sm border border-gray-300"
              style={{ background: getScoreColor(s) }}
            />
            <span className="text-xs text-gray-600">{s === 0 ? "0" : `~${s}`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const fillColorExpression = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "score"], 0],
  0, "#f8fafc",
  20, "#bfdbfe",
  40, "#60a5fa",
  70, "#2563eb",
  100, "#1e3a8a",
] as unknown as maplibregl.ExpressionSpecification;

function enrichGeoJSON(
  geojson: FeatureCollection,
  scoreMap: Record<string, number>,
): FeatureCollection {
  return {
    ...geojson,
    features: geojson.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        score: scoreMap[f.properties?.shapeID as string] ?? 0,
      },
    })),
  };
}
