"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { MapContainer, GeoJSON } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { GeoJSON as LeafletGeoJSON, Layer, PathOptions } from "leaflet";
import type { Region } from "@regionevel/types";
import { getScoreColor } from "@regionevel/utils";
import { useVisitStore } from "@/store/visitStore";
import { getChildren } from "@/lib/regions";
import { RegionTooltip } from "./RegionTooltip";
import "leaflet/dist/leaflet.css";

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
  const longPressTriggered = useRef(false);
  const geoJsonRef = useRef<LeafletGeoJSON | null>(null);

  // Keep latest store callbacks in refs so we don't need to re-bind layer events
  const quickIncrementRef = useRef(quickIncrement);
  const upsertVisitRef = useRef(upsertVisit);
  const visitsRef = useRef(visits);
  useEffect(() => { quickIncrementRef.current = quickIncrement; }, [quickIncrement]);
  useEffect(() => { upsertVisitRef.current = upsertVisit; }, [upsertVisit]);
  useEffect(() => { visitsRef.current = visits; }, [visits]);

  const scoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of regions) {
      map[r.id] = getFullScore(r.id, regions).totalScore;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, visits]);

  const getStyle = useCallback(
    (feature?: Feature): PathOptions => {
      const shapeId = feature?.properties?.shapeID as string;
      return {
        fillColor: getScoreColor(scoreMap[shapeId] ?? 0),
        fillOpacity: 0.65,
        color: "#1e40af",
        weight: 1.5,
        opacity: 0.8,
      };
    },
    [scoreMap],
  );

  // Update polygon fill colors in-place when scores change — no re-mount needed
  useEffect(() => {
    geoJsonRef.current?.setStyle(getStyle);
  }, [getStyle]);

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

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const shapeId = feature.properties?.shapeID as string;
      if (!shapeId) return;

      layer.on({
        click: () => {
          if (longPressTriggered.current) return;
          quickIncrementRef.current(shapeId);
        },
        mousedown: () => startLongPress(shapeId),
        mouseup: cancelLongPress,
        mouseout: cancelLongPress,
      });
      // touch events are not in LeafletEventHandlerFnMap — use string overload
      layer.on("touchstart", () => startLongPress(shapeId));
      layer.on("touchend", cancelLongPress);
      layer.on("touchcancel", cancelLongPress);
    },
    [startLongPress, cancelLongPress],
  );

  const selectedRegion = selectedId ? regions.find((r) => r.id === selectedId) ?? null : null;
  const selectedScore = selectedId ? getFullScore(selectedId, regions) : null;
  const selectedChildren = selectedId ? getChildren(regions, selectedId) : [];

  const handleVisitChange = useCallback(
    (category: string, delta: number) => {
      if (!selectedId) return;
      const current = visitsRef.current.find(
        (v) => v.regionId === selectedId && v.category === category,
      );
      upsertVisitRef.current(selectedId, category as never, Math.max(0, (current?.count ?? 0) + delta));
    },
    [selectedId],
  );

  const handleDrillDown = useCallback(
    (regionId: string) => {
      const r = regions.find((x) => x.id === regionId);
      if (!r) return;
      setActiveAdmLevel(r.admLevel as 1 | 2);
      setSelectedId(regionId);
    },
    [regions],
  );

  const activeGeoJSON = activeAdmLevel === 1 ? geojsonAdm1 : geojsonAdm2;

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[36.5, 127.5]}
        zoom={6}
        style={{ width: "100%", height: "100%", background: "#f8fafc" }}
        attributionControl={false}
      >
        {/* key on activeAdmLevel forces GeoJSON layer swap; setStyle handles score updates */}
        <GeoJSON
          key={activeAdmLevel}
          ref={geoJsonRef}
          data={activeGeoJSON}
          style={getStyle}
          onEachFeature={onEachFeature}
        />
      </MapContainer>

      {/* ADM level toggle */}
      <div className="absolute top-3 right-3 flex gap-1 bg-white rounded-lg shadow border border-gray-200 p-1 z-[1001]">
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
      <div className="absolute bottom-6 left-3 bg-white/90 rounded-lg shadow border border-gray-200 px-3 py-2 z-[1001] text-xs text-gray-500 space-y-0.5">
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
    <div className="absolute bottom-6 right-3 bg-white rounded-lg shadow border border-gray-200 px-3 py-2 z-[1001]">
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
