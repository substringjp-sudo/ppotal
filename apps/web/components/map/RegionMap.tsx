"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { MapContainer, GeoJSON, useMap, useMapEvents } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { GeoJSON as LeafletGeoJSON, Layer, PathOptions } from "leaflet";
import L from "leaflet";
import type { Region, RegionScore, RegionVisit } from "@regionevel/types";
import { getScoreColor, getCumulativeColor } from "@regionevel/utils";
import { useVisitStore } from "@/store/visitStore";
import { fetchChildren, fetchAncestors, fetchRegion, fetchGeometries, flattenTree, getChildren, getAncestors } from "@/lib/regions";
import { RegionTooltip } from "./RegionTooltip";
import { ScoreStatsBar } from "./ScoreStatsBar";
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
  regions: Region[];
}

export function RegionMap({ regions }: RegionMapProps) {
  
  // O(1) lookup map for regions
  const regionsByIdMap = useMemo(() => {
    const map = new Map<string, Region>();
    for (const r of regions) {
      map.set(r.id, r);
    }
    return map;
  }, [regions]);

  const { visits, quickIncrement, upsertVisit, getFullScore, scoringMode, setScoringMode } = useVisitStore();

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

  const { scoreMap, allScores } = useMemo(() => {
    if (!geoData) return { scoreMap: {}, allScores: [] };
    const map: Record<string, RegionScore & { cumulativeScore: number }> = {};
    const memo = new Map<string, any>();
    const scores: number[] = [];
    
    const visitsMap = new Map<string, RegionVisit[]>();
    for (const v of visits) {
      const list = visitsMap.get(v.regionId) || [];
      list.push(v);
      visitsMap.set(v.regionId, list);
    }

    for (const feature of geoData.features) {
      const id = feature.properties?.id as string;
      if (id) {
        const individualScore = getFullScore(id, regions, parentMap, memo, visitsMap);
        
        // Cumulative score: Region's own direct score + Sum of children's total scores
        const children = parentMap.get(id) || [];
        let cumulativeScore = individualScore.directScore;
        for (const child of children) {
          const childScore = getFullScore(child.id, regions, parentMap, memo, visitsMap);
          cumulativeScore += childScore.totalScore;
        }
        
        map[id] = { ...individualScore, cumulativeScore };
        scores.push(scoringMode === "cumulative" ? cumulativeScore : individualScore.totalScore);
      }
    }
    return { scoreMap: map, allScores: scores };
  }, [geoData, regions, getFullScore, visits, parentMap, scoringMode]);

  const contextStats = useMemo(() => {
    const stats = {
      totalVisited: 0,
      passing: 0,
      transit: 0,
      visit: 0,
      accommodation: 0,
      residence: 0,
      currentTotalScore: 0,
      currentCumulativeScore: 0,
    };

    // 1. Current region scores
    if (currentId) {
      const memo = new Map();
      const vMap = new Map<string, RegionVisit[]>();
      for (const v of visits) {
        const list = vMap.get(v.regionId) || [];
        list.push(v);
        vMap.set(v.regionId, list);
      }
      const score = getFullScore(currentId, regions, parentMap, memo, vMap);
      stats.currentTotalScore = score.totalScore;
      
      const children = parentMap.get(currentId) || [];
      let cum = score.directScore;
      for (const child of children) {
        cum += getFullScore(child.id, regions, parentMap, memo, vMap).totalScore;
      }
      stats.currentCumulativeScore = cum;
    } else {
      // Global cumulative
      const countries = regions.filter(r => r.parentId === null);
      const memo = new Map();
      const vMap = new Map<string, RegionVisit[]>();
      for (const v of visits) {
        const list = vMap.get(v.regionId) || [];
        list.push(v);
        vMap.set(v.regionId, list);
      }
      let worldCum = 0;
      let maxIndiv = 0;
      for (const country of countries) {
        const s = getFullScore(country.id, regions, parentMap, memo, vMap).totalScore;
        worldCum += s;
        maxIndiv = Math.max(maxIndiv, s);
      }
      stats.currentCumulativeScore = worldCum;
      stats.currentTotalScore = maxIndiv;
    }

    // 2. Aggregate stats for ALL visits in the current hierarchy
    let targetVisits = visits;
    if (currentId) {
      const descendantIds = new Set<string>();
      const collect = (id: string) => {
        descendantIds.add(id);
        const children = parentMap.get(id) || [];
        for (const child of children) collect(child.id);
      };
      collect(currentId);
      targetVisits = visits.filter(v => descendantIds.has(v.regionId));
    }

    const visitedRegionIds = new Set(targetVisits.map(v => v.regionId));
    stats.totalVisited = visitedRegionIds.size;
    
    // Count unique regions per category
    const catMap = new Map<string, Set<string>>();
    for (const v of targetVisits) {
      if (!catMap.has(v.category)) catMap.set(v.category, new Set());
      catMap.get(v.category)!.add(v.regionId);
    }
    
    stats.passing = catMap.get("passing")?.size ?? 0;
    stats.transit = catMap.get("transit")?.size ?? 0;
    stats.visit = catMap.get("visit")?.size ?? 0;
    stats.accommodation = catMap.get("accommodation")?.size ?? 0;
    stats.residence = catMap.get("residence")?.size ?? 0;

    return stats;
  }, [currentId, visits, regions, parentMap, getFullScore]);

  const getStyle = useCallback(
    (feature?: Feature): PathOptions => {
      const id = feature?.properties?.id as string;
      const scoreData = scoreMap[id];
      const score = scoringMode === "cumulative" ? scoreData?.cumulativeScore : scoreData?.totalScore;
      
      const fillColor = scoringMode === "cumulative" 
        ? getCumulativeColor(score ?? 0, allScores)
        : getScoreColor(score ?? 0);

      return {
        fillColor,
        fillOpacity: 0.65,
        color: "#94a3b8",
        weight: 0.8,
        opacity: 0.8,
      };
    },
    [scoreMap, scoringMode, allScores],
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
        zoomControl={false}
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
                <span className={`text-sm font-black leading-none ${scoringMode === "cumulative" ? "text-orange-400" : "text-blue-400"}`}>
                  {scoringMode === "cumulative" ? hoveredScore.cumulativeScore : hoveredScore.totalScore}
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                  {scoringMode === "cumulative" ? "Sum" : "Pts"}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Breadcrumbs & Navigation */}
      <div className={`absolute top-4 left-4 z-[1001] pointer-events-none flex flex-col gap-2 ${isMobile ? "max-w-[calc(100%-80px)]" : "right-4"}`}>
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
 
          <ScoreStatsBar 
            stats={contextStats} 
            isMobile={isMobile} 
            scoringMode={scoringMode} 
          />

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
        <ScoreLegend 
          isMobile={isMobile} 
          scoringMode={scoringMode} 
          setScoringMode={setScoringMode}
        />
      </div>
 
      {/* Optimized RegionTooltip */}
      {selectedRegion && selectedScore && (
        <RegionTooltip
          region={selectedRegion}
          score={selectedScore}
          childRegions={selectedChildren}
          mousePos={mousePos}
          isMobile={isMobile}
          scoringMode={scoringMode}
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

function ScoreLegend({ 
  isMobile, 
  scoringMode, 
  setScoringMode 
}: { 
  isMobile: boolean;
  scoringMode: "individual" | "cumulative";
  setScoringMode: (mode: "individual" | "cumulative") => void;
}) {
  const individualSteps = [0, 5, 10, 30, 50];
  const cumulativeSteps = [
    { label: "Top 1%", color: "#c2410c" },
    { label: "Top 10%", color: "#f97316" },
    { label: "Top 30%", color: "#fdba74" },
    { label: "Top 50%", color: "#ffedd5" },
    { label: "Others", color: "#fff7ed" },
  ];
  
  return (
    <div className={`bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden ${isMobile ? "w-12 p-2" : "w-32 p-3"} transition-all duration-300`}>
      <div className="flex flex-col gap-2 mb-4">
        <button
          onClick={() => setScoringMode("individual")}
          className={`px-2 py-1.5 rounded-xl text-[10px] font-black transition-all duration-200 ${
            scoringMode === "individual" 
              ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          }`}
        >
          {isMobile ? "EXP" : "EXPERIENCE"}
        </button>
        <button
          onClick={() => setScoringMode("cumulative")}
          className={`px-2 py-1.5 rounded-xl text-[10px] font-black transition-all duration-200 ${
            scoringMode === "cumulative" 
              ? "bg-orange-600 text-white shadow-md shadow-orange-200" 
              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          }`}
        >
          {isMobile ? "SUM" : "SUB-SUM"}
        </button>
      </div>

      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-3 text-center border-t border-gray-100 pt-3">
        {scoringMode === "individual" ? "Points" : "Ranking"}
      </p>

      <div className="flex flex-col gap-2.5">
        {scoringMode === "individual" ? (
          individualSteps.map((s) => (
            <div key={s} className="flex items-center gap-2.5 group">
              <span 
                className={`rounded-sm shadow-sm shrink-0 transition-transform group-hover:scale-110 ${isMobile ? "w-3 h-3 rounded-full" : "w-5 h-3"}`} 
                style={{ background: getScoreColor(s) }} 
              />
              {!isMobile && (
                <span className="font-bold text-gray-600 tracking-tighter text-xs">
                  {s === 0 ? "Unvisited" : `${s}+`}
                </span>
              )}
            </div>
          ))
        ) : (
          cumulativeSteps.map((step) => (
            <div key={step.label} className="flex items-center gap-2.5 group">
              <span 
                className={`rounded-sm shadow-sm shrink-0 transition-transform group-hover:scale-110 ${isMobile ? "w-3 h-3 rounded-full" : "w-5 h-3"}`} 
                style={{ background: step.color }} 
              />
              {!isMobile && (
                <span className="font-bold text-gray-600 tracking-tighter text-xs">
                  {step.label}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
