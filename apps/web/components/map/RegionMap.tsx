"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import type { MapMouseEvent, MapLayerMouseEvent } from "react-map-gl/maplibre";
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

  // Score lookup used for fill-color paint
  const scoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of regions) {
      map[r.id] = getFullScore(r.id, regions).totalScore;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, visits]);

  // Enrich GeoJSON with score for fill-color expression
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

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const shapeId = feature.properties?.shapeID as string | undefined;
      if (!shapeId) return;
      quickIncrement(shapeId);
    },
    [quickIncrement],
  );

  const handleMouseDown = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const shapeId = feature.properties?.shapeID as string | undefined;
      if (!shapeId) return;
      longPressTimer.current = setTimeout(() => {
        setSelectedId(shapeId);
      }, LONG_PRESS_MS);
    },
    [],
  );

  const handleMouseUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleDrillDown = useCallback((regionId: string) => {
    const r = regions.find((x) => x.id === regionId);
    if (!r) return;
    setActiveAdmLevel(r.admLevel as 1 | 2);
    setSelectedId(regionId);
  }, [regions]);

  const handleVisitChange = useCallback(
    (category: string, delta: number) => {
      if (!selectedId) return;
      const { visits: allVisits } = useVisitStore.getState();
      const current = allVisits.find(
        (v) => v.regionId === selectedId && v.category === category,
      );
      const newCount = Math.max(0, (current?.count ?? 0) + delta);
      upsertVisit(selectedId, category as never, newCount);
    },
    [selectedId, upsertVisit],
  );

  const interactiveLayerIds = activeAdmLevel === 1 ? ["adm1-fill"] : ["adm2-fill"];

  return (
    <div className="relative w-full h-full">
      <Map
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
        {/* ADM1 layer */}
        <Source id="adm1" type="geojson" data={enrichedAdm1}>
          <Layer
            id="adm1-fill"
            type="fill"
            paint={{
              "fill-color": fillColorExpression,
              "fill-opacity": activeAdmLevel === 1 ? 0.55 : 0.2,
            }}
            layout={{ visibility: "visible" }}
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

        {/* ADM2 layer — visible when drilled down */}
        {activeAdmLevel === 2 && (
          <Source id="adm2" type="geojson" data={enrichedAdm2}>
            <Layer
              id="adm2-fill"
              type="fill"
              paint={{
                "fill-color": fillColorExpression,
                "fill-opacity": 0.6,
              }}
            />
            <Layer
              id="adm2-border"
              type="line"
              paint={{ "line-color": "#1d4ed8", "line-width": 1, "line-opacity": 0.8 }}
            />
          </Source>
        )}
      </Map>

      {/* Level toggle */}
      <div className="absolute top-3 right-3 flex gap-1 bg-white rounded-lg shadow border border-gray-200 p-1 z-10">
        <button
          onClick={() => setActiveAdmLevel(1)}
          className={`px-3 py-1 text-xs font-medium rounded ${
            activeAdmLevel === 1
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          광역
        </button>
        <button
          onClick={() => setActiveAdmLevel(2)}
          className={`px-3 py-1 text-xs font-medium rounded ${
            activeAdmLevel === 2
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          기초
        </button>
      </div>

      {/* Tooltip */}
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

      {/* Score legend */}
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

// MapLibre fill-color expression: reads "score" property from GeoJSON feature
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
