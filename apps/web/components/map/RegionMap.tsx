"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { MapContainer, GeoJSON, useMap, useMapEvents } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { GeoJSON as LeafletGeoJSON, Layer, PathOptions } from "leaflet";
import L from "leaflet";
import { VISIT_CATEGORY_ORDER, type Region, type RegionScore, type RegionVisit, type VisitCategory } from "@regionevel/types";
import { getRegionScore, getMapColor, padId } from "@regionevel/utils";
import { useVisitStore } from "@/store/visitStore";
import { fetchChildren, fetchAncestors, fetchRegion, fetchGeometries, flattenTree, getChildren, getAncestors } from "@/lib/regions";
import { useMapStore } from "@/store/mapStore";
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

export function RegionMap({ regions: initialRegions }: RegionMapProps) {
  const [accumulatedRegions, setAccumulatedRegions] = useState<Region[]>(initialRegions);

  // Sync accumulatedRegions when initialRegions prop changes (e.g. MapView loads more metadata)
  useEffect(() => {
    setAccumulatedRegions((prev) => {
      const existingIds = new Set(prev.map((r) => padId(r.id)));
      const newRegions = initialRegions.filter((r) => !existingIds.has(padId(r.id)));
      if (newRegions.length === 0) return prev;
      return [...prev, ...newRegions];
    });
  }, [initialRegions]);

  // O(1) lookup map for regions
  const regionsByIdMap = useMemo(() => {
    const map = new Map<string, Region>();
    for (const r of accumulatedRegions) {
      map.set(padId(r.id), r);
    }
    return map;
  }, [accumulatedRegions]);

  const { visits, scores: storeScores, quickIncrement, upsertVisit, recalculateScores } = useVisitStore();

  useEffect(() => {
    recalculateScores(accumulatedRegions);
  }, [accumulatedRegions, visits, recalculateScores]);

  const { level, currentId, history, setLevel, setCurrentId, setHistory, drillDown, drillUp } = useMapStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
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
    for (const r of accumulatedRegions) {
      const pid = padId(r.parentId);
      const list = map.get(pid) || [];
      list.push(r);
      map.set(pid, list);
    }
    return map;
  }, [accumulatedRegions]);

  // Use scores from store instead of calculating locally
  const allScores = storeScores;

  // Compatibility mapping for current view
  const scoreMap = useMemo(() => {
    if (!geoData) return {};
    const map: Record<string, RegionScore> = {};
    for (const feature of geoData.features) {
      const rawId = feature.properties?.id || feature.properties?.shapeID;
      const id = padId(rawId);
      if (id && allScores[id]) {
        map[id] = allScores[id];
      }
    }
    return map;
  }, [geoData, allScores]);


  const contextStats = useMemo(() => {
    const stats = {
      visitedCountries: 0,
      visitedPrefectures: 0,
      visitedCities: 0,
      pass: 0,
      transit: 0,
      visit: 0,
      stay: 0,
      residence: 0,
      currentTotalScore: 0,
      currentRateScore: 0,
      currentDirectScore: 0,
      currentChildSum: 0,
      currentChildMax: 0,
      totalChildrenCount: 0,
    };

    // 1. Current region scores from pre-calculated allScores
    if (currentId) {
      const score = allScores[padId(currentId)];
      if (score) {
        stats.currentTotalScore = score.totalScore;
        stats.currentDirectScore = score.directScore;
        stats.currentRateScore = score.rateScore;
        stats.currentChildMax = score.childMax;
        stats.totalChildrenCount = Math.round(score.childMax / 50);
      }
    } else {
      // Global stats (World Rate)
      const countries = accumulatedRegions.filter(r => r.parentId === null);
      let worldSum = 0;
      let worldMax = 0;
      for (const country of countries) {
        const s = allScores[padId(country.id)];
        if (s) {
          worldSum += s.totalScore;
          worldMax += 50; // Traveler's max is 50 points per country
        }
      }
      stats.currentChildSum = worldSum;
      stats.currentChildMax = worldMax;
      stats.totalChildrenCount = countries.length;
      stats.currentRateScore = Math.round(worldMax > 0 ? Math.min(100, (worldSum / worldMax) * 100) : 0);
      stats.currentTotalScore = stats.currentRateScore;
    }

    // 2. Count visited regions
    for (const r of accumulatedRegions) {
      const s = allScores[padId(r.id)];
      if (s && s.hasVisit) {
        if (r.admLevel === 0) stats.visitedCountries++;
        else if (r.admLevel === 1) stats.visitedPrefectures++;
        else if (r.admLevel === 2) stats.visitedCities++;
      }
    }

    // 3. Category counts (Number of regions visited with this category)
    const categoryVisitedRegions = new Map<VisitCategory, Set<string>>();
    for (const cat of VISIT_CATEGORY_ORDER) {
      categoryVisitedRegions.set(cat, new Set());
    }

    for (const v of visits) {
      if (v.count > 0 && categoryVisitedRegions.has(v.category)) {
        categoryVisitedRegions.get(v.category)!.add(padId(v.regionId));
      }
    }

    for (const cat of VISIT_CATEGORY_ORDER) {
      (stats as any)[cat] = categoryVisitedRegions.get(cat)!.size;
    }

    return stats;
  }, [currentId, allScores, visits, accumulatedRegions]);

  const currentRegion = currentId ? regionsByIdMap.get(currentId) : null;

  const getStyle = useCallback(
    (feature?: Feature): PathOptions => {
      const rawId = feature?.properties?.id || feature?.properties?.shapeID;
      const id = padId(rawId);
      const scoreData = scoreMap[id];

      const fillColor = scoreData ? getMapColor(scoreData) : "#f8fafc";

      return {
        fillColor,
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
    async (id: string) => {
      const region = regionsByIdMap.get(id);
      if (!region) return;

      if (region.admLevel < 2) {
        setLoading(true);
        try {
          // Fetch sub-region metadata
          const childMeta = await fetchChildren(id);
          const newAccumulated = [...accumulatedRegions];

          // Only add regions we don't have yet
          let addedCount = 0;
          for (const cm of childMeta) {
            if (!regionsByIdMap.has(padId(cm.id))) {
              newAccumulated.push(cm);
              addedCount++;
            }
          }

          if (addedCount > 0) {
            setAccumulatedRegions(newAccumulated);
            // Trigger store to recalculate with new regions
            recalculateScores(newAccumulated);
          }

          const nextLevel = region.admLevel === 0 ? "country" : "prefecture";
          drillDown(nextLevel as any, id);
          setSelectedId(null);
        } catch (err) {
          console.error("Failed to drill down:", err);
        } finally {
          setLoading(false);
        }
      } else {
        quickIncrement(id);
      }
    },
    [regionsByIdMap, accumulatedRegions, quickIncrement, recalculateScores, drillDown],
  );

  const handleBack = useCallback(() => {
    drillUp();
    setSelectedId(null);
  }, [drillUp]);

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const rawId = feature.properties?.id || feature.properties?.shapeID;
      const id = padId(rawId);
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
    const ancestors = getAncestors(accumulatedRegions, currentId);
    const self = regionsByIdMap.get(currentId);
    return ["World", ...ancestors.map((a) => a.name), self?.name].filter(Boolean) as string[];
  }, [accumulatedRegions, currentId, regionsByIdMap]);

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
          className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 min-w-fit"
        >
          {hoveredRegion && hoveredScore && (
            <>
              <div className="flex flex-col pr-3 border-r border-white/10">
                <span className="text-[12px] font-black leading-tight truncate max-w-[140px] tracking-tight">{hoveredRegion.name}</span>
                <span className="text-[9px] text-slate-400 font-bold mt-0.5 tracking-widest uppercase">{hoveredRegion.iso3 || "REGION"}</span>
              </div>
              <div className="flex gap-4 items-center shrink-0">
                {hoveredRegion.admLevel < 2 && (
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-orange-400 uppercase tracking-tighter mb-0.5 opacity-80">점령률</span>
                    <span className="text-base font-black leading-none text-orange-400 tabular-nums">
                      {Math.round(hoveredScore.rateScore)}%
                    </span>
                  </div>
                )}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter mb-0.5 opacity-80">경험치</span>
                  <span className="text-base font-black leading-none text-blue-400 tabular-nums">
                    {Math.round(hoveredScore.directScore)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Professional Top Header (Desktop) */}
      {!isMobile && (
        <div className="absolute top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 z-[1001] flex items-center px-4 gap-0 animate-in fade-in slide-in-from-top-2 duration-500">
          {/* Breadcrumbs Section */}
          <div className="flex items-center gap-2 h-full border-r border-slate-100 pr-4 shrink-0">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md p-1">
              {history.length > 0 && (
                <button
                  onClick={handleBack}
                  className="p-1 hover:bg-white rounded transition-all text-slate-500 border border-transparent hover:border-slate-200"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="flex items-center gap-1 px-1">
                {currentPath.map((name, i) => (
                  <div key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-slate-300 text-[10px]">/</span>}
                    <span className={`text-[10px] font-black tracking-tight whitespace-nowrap ${i === currentPath.length - 1 ? "text-blue-600" : "text-slate-400 uppercase"}`}>
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Region Info */}
          <div className="flex items-center px-6 gap-6 h-full flex-1 min-w-0 overflow-hidden bg-slate-50/30">
            <div className="flex items-center gap-6">
              <div className="shrink-0 flex flex-col justify-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                  {currentRegion ? "선택 지역" : "전체 개요"}
                </span>
                <h3 className="text-sm font-black text-slate-800 leading-none truncate max-w-[200px]">
                  {currentRegion ? currentRegion.name : "전체 (World)"}
                </h3>
              </div>
              <div className="flex gap-6 border-l border-slate-200 pl-6 h-8 items-center flex-1">
                <div className="flex flex-col justify-center min-w-[120px]">
                  <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-tighter leading-none mb-1">
                    {currentRegion ? "하위 지역 진척도" : "국가별 진척도"}
                  </span>
                  <div className="flex items-baseline gap-1 whitespace-nowrap">
                    <p className="text-sm font-black text-slate-800 tabular-nums leading-none">{Math.round(contextStats.currentChildSum)}</p>
                    <span className="text-[10px] font-bold text-slate-400">/ {contextStats.currentChildMax}</span>
                    {contextStats.currentChildMax > 0 && (
                      <span className="text-[9px] font-black text-slate-400 ml-1">
                        ({Math.round((contextStats.currentChildSum / contextStats.currentChildMax) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Global Stats Summary */}
          <div className="px-4 border-l border-slate-200 h-full flex items-center shrink-0">
            <ScoreStatsBar
              stats={contextStats}
              isMobile={true}
              hideRate={currentRegion?.admLevel === 2}
              totalChildren={contextStats.totalChildrenCount}
              admLevel={currentRegion?.admLevel ?? -1}
            />
          </div>
        </div>
      )}

      {/* Mobile Header (Sharper Style) */}
      {isMobile && (
        <div className="absolute top-0 left-0 right-0 z-[1001] flex flex-col bg-white border-b border-slate-200">
          <div className="flex items-center gap-2 p-2 pointer-events-auto">
            {history.length > 0 && (
              <button onClick={handleBack} className="p-2 bg-slate-50 border border-slate-200 rounded-md text-slate-600">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="flex items-center px-2 py-1 gap-2 overflow-x-auto no-scrollbar whitespace-nowrap bg-slate-50 border border-slate-200 rounded-md flex-1">
              {currentPath.map((name, i) => (
                <div key={i} className="flex items-center gap-1 shrink-0">
                  {i > 0 && <span className="text-slate-300 text-xs">/</span>}
                  <span className={`text-[10px] font-black uppercase ${i === currentPath.length - 1 ? "text-blue-600" : "text-slate-400"}`}>
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-2 pb-2">
            <ScoreStatsBar 
              stats={contextStats} 
              isMobile={true} 
              hideRate={currentRegion?.admLevel === 2}
              totalChildren={contextStats.totalChildrenCount}
              admLevel={currentRegion?.admLevel ?? -1}
            />
          </div>
        </div>
      )}

      {/* Map Controls (Sharper Style) */}
      <div className={`absolute z-[1001] flex flex-col items-end gap-2 pointer-events-none transition-all duration-500 ${isMobile ? "bottom-4 right-4" : "bottom-4 right-4"}`}>
        {loading && (
          <div className="bg-white border border-slate-200 rounded-md shadow-lg px-3 py-1.5 flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">로딩 중</span>
          </div>
        )}

        <div className="pointer-events-auto">
          <ScoreLegend isMobile={isMobile} hideRate={currentRegion?.admLevel === 2} />
        </div>
      </div>

      {/* RegionTooltip & Hover Label */}
      {selectedRegion && selectedScore && (
        <RegionTooltip
          region={selectedRegion}
          score={selectedScore}
          childRegions={selectedChildren}
          scoreMap={allScores}
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
    </div>
  );
}

function ScoreLegend({
  isMobile,
  hideRate = false,
}: {
  isMobile: boolean;
  hideRate?: boolean;
}) {
  const individualSteps = [
    { label: "< 10", color: "#eff6ff" },
    { label: "10 - 30", color: "#bfdbfe" },
    { label: "30 - 50", color: "#60a5fa" },
    { label: "50 - 70", color: "#2563eb" },
    { label: "70+", color: "#1e3a8a" },
  ];
  const rateSteps = [
    { label: "< 10", color: "#ffedd5" },
    { label: "10 - 30", color: "#fdba74" },
    { label: "30 - 50", color: "#f97316" },
    { label: "50 - 70", color: "#ea580c" },
    { label: "70+", color: "#c2410c" },
  ];

  if (isMobile) {
    return (
      <div className="bg-white/90 backdrop-blur shadow-lg border border-slate-200 p-2 rounded-xl flex gap-3">
        {!hideRate && (
          <>
            <div className="flex gap-1 items-center">
              <span className="text-[7px] font-black text-slate-400 uppercase">점령률</span>
              {rateSteps.map(s => (
                <div key={s.label} className="w-2.5 h-2.5 rounded-[2px]" style={{ background: s.color }} />
              ))}
            </div>
            <div className="w-[1px] bg-slate-100" />
          </>
        )}
        <div className="flex gap-1 items-center">
          <span className="text-[7px] font-black text-slate-400 uppercase">경험치</span>
          {individualSteps.map(s => (
            <div key={s.label} className="w-2.5 h-2.5 rounded-[2px]" style={{ background: s.color }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-md shadow-2xl border border-slate-200 p-3 rounded-2xl w-32 flex flex-col gap-3">
      {!hideRate && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">점령률 (Rate)</span>
            <div className="flex flex-col gap-1">
              {rateSteps.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm shadow-sm" style={{ background: s.color }} />
                  <span className="text-[9px] font-bold text-slate-500 tabular-nums">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[1px] bg-slate-100" />
        </>
      )}
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">경험치 (Exp)</span>
        <div className="flex flex-col gap-1">
          {individualSteps.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm shadow-sm" style={{ background: s.color }} />
              <span className="text-[9px] font-bold text-slate-500 tabular-nums">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
