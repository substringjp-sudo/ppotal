"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { MapContainer, GeoJSON, useMap, useMapEvents } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { GeoJSON as LeafletGeoJSON, Layer, PathOptions } from "leaflet";
import L from "leaflet";
import type { Region, RegionScore, RegionVisit } from "@regionevel/types";
import { getScoreColor } from "@regionevel/utils";
import { useVisitStore } from "@/store/visitStore";
import { fetchChildren, fetchAncestors, fetchRegion, fetchGeometries, flattenTree, getChildren, getAncestors } from "@/lib/regions";
import { RegionTooltip } from "./RegionTooltip";
import "leaflet/dist/leaflet.css";

// Helper component to auto-fit bounds when GeoJSON changes
function FitBounds({ data }: { data: FeatureCollection }) {
  const map = useMap();
  useEffect(() => {
    if (!data || data.features.length === 0) return;
    const geoJsonLayer = L.geoJSON(data);
    map.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20], animate: true });
  }, [data, map]);
  return null;
}

// Map events component to handle background clicks
function MapEvents({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => {
      onMapClick();
    },
  });
  return null;
}

interface RegionMapProps {
  tree: any[];
}

export function RegionMap({ tree }: RegionMapProps) {
  const regions = useMemo(() => flattenTree(tree), [tree]);
  
  // O(1) lookup map for regions
  const regionsByIdMap = useMemo(() => {
    const map = new Map<string, Region>();
    for (const r of regions) {
      map.set(r.id, r);
    }
    return map;
  }, [regions]);

  const { visits, quickIncrement, upsertVisit, getFullScore } = useVisitStore();

  const [level, setLevel] = useState<"world" | "country" | "prefecture">("world");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<{ level: "world" | "country" | "prefecture"; id: string | null }[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const geoJsonRef = useRef<LeafletGeoJSON | null>(null);
  const hoverLabelRef = useRef<HTMLDivElement>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch GeoJSON data
  useEffect(() => {
    let active = true;
    setLoading(true);
    setGeoData(null);

    fetchGeometries(currentId)
      .then((features) => {
        if (!active) return;
        setGeoData({
          type: "FeatureCollection",
          features,
        } as FeatureCollection);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [level, currentId]);

  const parentMap = useMemo(() => {
    const map = new Map<string | null, Region[]>();
    for (const r of regions) {
      const list = map.get(r.parentId) || [];
      list.push(r);
      map.set(r.parentId, list);
    }
    return map;
  }, [regions]);

  const scoreMap = useMemo(() => {
    if (!geoData) return {};
    const map: Record<string, RegionScore> = {};
    const memo = new Map<string, any>();
    
    const visitsMap = new Map<string, RegionVisit[]>();
    for (const v of visits) {
      const list = visitsMap.get(v.regionId) || [];
      list.push(v);
      visitsMap.set(v.regionId, list);
    }

    for (const feature of geoData.features) {
      const id = feature.properties?.id as string;
      if (id) {
        map[id] = getFullScore(id, regions, parentMap, memo, visitsMap);
      }
    }
    return map;
  }, [geoData, regions, getFullScore, visits, parentMap]);

  const getStyle = useCallback(
    (feature?: Feature): PathOptions => {
      const id = feature?.properties?.id as string;
      const score = scoreMap[id]?.totalScore ?? 0;
      return {
        fillColor: getScoreColor(score),
        fillOpacity: 0.65,
        color: "#94a3b8",
        weight: 0.8,
        opacity: 0.8,
      };
    },
    [scoreMap],
  );

  useEffect(() => {
    geoJsonRef.current?.setStyle(getStyle);
  }, [getStyle]);

  const handleDrillDown = useCallback(
    (id: string) => {
      const region = regionsByIdMap.get(id);
      if (!region) return;

      if (region.admLevel === 0) {
        setHistory((prev) => [...prev, { level, id: currentId }]);
        setLevel("country");
        setCurrentId(id);
        setSelectedId(null);
      } else if (region.admLevel === 1) {
        setHistory((prev) => [...prev, { level, id: currentId }]);
        setLevel("prefecture");
        setCurrentId(id);
        setSelectedId(null);
      } else {
        quickIncrement(id);
      }
    },
    [regionsByIdMap, level, currentId, quickIncrement],
  );

  const handleBack = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((prev) => prev.slice(0, -1));
    setLevel(last.level);
    setCurrentId(last.id);
    setSelectedId(null);
  }, [history]);

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const id = feature.properties?.id as string;
      if (!id) return;

      layer.on({
        mouseover: (e) => {
          if (isMobile) return;
          setHoveredId(id);
          if (hoverLabelRef.current) {
            hoverLabelRef.current.style.transform = `translate(${e.originalEvent.clientX + 15}px, ${e.originalEvent.clientY + 15}px)`;
            hoverLabelRef.current.style.opacity = "1";
          }
        },
        mousemove: (e) => {
          if (isMobile) return;
          if (hoverLabelRef.current) {
            hoverLabelRef.current.style.transform = `translate(${e.originalEvent.clientX + 15}px, ${e.originalEvent.clientY + 15}px)`;
          }
        },
        mouseout: () => {
          if (isMobile) return;
          setHoveredId(null);
          if (hoverLabelRef.current) {
            hoverLabelRef.current.style.opacity = "0";
          }
        },
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          if (!isMobile) {
            setMousePos({ x: e.originalEvent.clientX, y: e.originalEvent.clientY });
          } else {
            setMousePos(null);
          }
          setSelectedId(id);
        },
        contextmenu: (e) => {
          L.DomEvent.stopPropagation(e);
          if (!isMobile) {
            setMousePos({ x: e.originalEvent.clientX, y: e.originalEvent.clientY });
          }
          setSelectedId(id);
        },
      });

      // Long press for mobile context
      let pressTimer: ReturnType<typeof setTimeout>;
      layer.on("touchstart", (e) => {
        if (!isMobile) return;
        pressTimer = setTimeout(() => {
          L.DomEvent.stopPropagation(e);
          setSelectedId(id);
        }, 500);
      });
      layer.on("touchend", () => clearTimeout(pressTimer));
      layer.on("touchcancel", () => clearTimeout(pressTimer));
    },
    [isMobile],
  );

  const selectedRegion = selectedId ? regionsByIdMap.get(selectedId) ?? null : null;
  const selectedScore = selectedId ? scoreMap[selectedId] ?? null : null;
  const selectedChildren = selectedId ? (parentMap.get(selectedId) || []) : [];

  const currentPath = useMemo(() => {
    if (!currentId) return ["World"];
    const ancestors = getAncestors(regions, currentId);
    const self = regionsByIdMap.get(currentId);
    return ["World", ...ancestors.map((a) => a.name), self?.name].filter(Boolean) as string[];
  }, [regions, currentId, regionsByIdMap]);

  const hoveredRegion = hoveredId ? regionsByIdMap.get(hoveredId) ?? null : null;
  const hoveredScore = hoveredId ? scoreMap[hoveredId] ?? null : null;

  return (
    <div className="relative w-full h-full bg-sky-50 overflow-hidden">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxBounds={[
          [-90, -180],
          [90, 180],
        ]}
        maxBoundsViscosity={1.0}
        style={{ width: "100%", height: "100%", background: "#e0f2fe" }}
        attributionControl={false}
      >
        {geoData && (
          <>
            <GeoJSON
              key={`${level}-${currentId}`}
              ref={geoJsonRef}
              data={geoData}
              style={getStyle}
              onEachFeature={onEachFeature}
            />
            <FitBounds data={geoData} />
            <MapEvents onMapClick={() => setSelectedId(null)} />
          </>
        )}
      </MapContainer>

      {/* Hover Label */}
      {!isMobile && (
        <div
          ref={hoverLabelRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 3000,
            pointerEvents: "none",
            opacity: 0,
            transition: "opacity 0.15s ease-out",
            willChange: "transform",
          }}
          className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-2 rounded-xl shadow-xl border border-white/10 flex items-center gap-3"
        >
          {hoveredRegion && hoveredScore && (
            <>
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-tight">{hoveredRegion.name}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{hoveredRegion.iso3}</span>
              </div>
              <div className="h-6 w-[1px] bg-white/20 mx-1" />
              <div className="flex flex-col items-center">
                <span className="text-sm font-black leading-none text-blue-400">{hoveredScore.totalScore}</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Pts</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Breadcrumbs & Navigation */}
      <div className="absolute top-4 left-4 right-4 flex flex-col gap-2 z-[1001] pointer-events-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 p-1 pointer-events-auto overflow-hidden max-w-full">
            {history.length > 0 && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                title="Back"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="flex items-center px-2 py-1 gap-1 overflow-x-auto no-scrollbar whitespace-nowrap">
              {currentPath.map((name, i) => (
                <div key={i} className="flex items-center gap-1 shrink-0">
                  {i > 0 && <span className="text-gray-300 text-xs">/</span>}
                  <span
                    className={`text-sm font-medium ${
                      i === currentPath.length - 1 ? "text-blue-600" : "text-gray-500"
                    }`}
                  >
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {loading && (
            <div className="bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 px-4 py-2 pointer-events-auto flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-gray-600">Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Score Legend - Vertical on mobile, bottom-right on desktop */}
      <div className={`absolute z-[1001] pointer-events-auto ${isMobile ? "top-4 right-4" : "bottom-6 right-4"}`}>
        <ScoreLegend isMobile={isMobile} />
      </div>

      {/* Optimized RegionTooltip */}
      {selectedRegion && selectedScore && (
        <RegionTooltip
          region={selectedRegion}
          score={selectedScore}
          children={selectedChildren}
          mousePos={mousePos}
          isMobile={isMobile}
          onClose={() => {
            setSelectedId(null);
            setMousePos(null);
          }}
          onDrillDown={(id) => {
            handleDrillDown(id);
            setSelectedId(null);
            setMousePos(null);
          }}
          onVisitSet={(cat, count) => {
            upsertVisit(selectedId!, cat, count);
          }}
        />
      )}

      {!isMobile && (
        <div className="absolute bottom-6 left-4 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 px-4 py-3 z-[1001] text-xs text-gray-500 space-y-1 hidden sm:block">
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{" "}
            <span className="font-semibold text-gray-700">Click</span>: View Region Info
          </p>
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />{" "}
            <span className="font-semibold text-gray-700">Inside Tooltip</span>: Travel log & Drill down
          </p>
        </div>
      )}
    </div>
  );
}

function ScoreLegend({ isMobile }: { isMobile: boolean }) {
  const steps = [0, 20, 40, 70, 100];
  
  return (
    <div className={`bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 ${isMobile ? "px-2 py-3" : "px-4 py-3"}`}>
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 text-center">
        Exp.
      </p>
      <div className="flex flex-col gap-2.5">
        {steps.map((s) => (
          <div key={s} className="flex items-center gap-2.5">
            <span 
              className={`rounded-sm shadow-sm shrink-0 ${isMobile ? "w-3 h-3 rounded-full" : "w-5 h-3"}`} 
              style={{ background: getScoreColor(s) }} 
            />
            <span className={`font-bold text-gray-600 tracking-tighter ${isMobile ? "text-[10px]" : "text-xs"}`}>
              {s === 0 ? (isMobile ? "0" : "Unvisited") : `${s}+`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
