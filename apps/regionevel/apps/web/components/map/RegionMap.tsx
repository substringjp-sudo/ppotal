"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { MapContainer, GeoJSON, useMap, useMapEvents } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { GeoJSON as LeafletGeoJSON, Layer, PathOptions } from "leaflet";
import L from "leaflet";
import { VISIT_CATEGORY_ORDER, type Region, type RegionScore, type RegionVisit, type VisitCategory } from "@regionevel/types";
import { getRegionScore, getMapColor, padId } from "@regionevel/utils";
import { useVisitStore } from "@/store/visitStore";
import { fetchChildren, fetchGeometries, fetchCountryGeometries, getAncestors } from "@/lib/regions";
import { useMapStore } from "@/store/mapStore";
import { RegionTooltip } from "./RegionTooltip";
import { ScoreStatsBar } from "./ScoreStatsBar";
import { toPng } from "html-to-image";
import "leaflet/dist/leaflet.css";


function FitBounds({ data, level }: { data: FeatureCollection | null; level: string }) {
  const map = useMap();
  
  useEffect(() => {
    // 1. World level: Always reset to global view immediately
    if (level === "world") {
      console.log("[FitBounds] Level is world, resetting view to [20, 0]");
      map.setView([20, 0], 2, { animate: true });
      
      // Delay-based fallback for problematic renders
      const timer = setTimeout(() => {
        if (map.getZoom() < 2 || map.getCenter().lat !== 20) {
          map.setView([20, 0], 2, { animate: true });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
    
    // 2. Other levels: Fit bounds to data if available
    if (data && data.features && data.features.length > 0) {
      try {
        const geoJsonLayer = L.geoJSON(data);
        const bounds = geoJsonLayer.getBounds();
        
        if (bounds.isValid()) {
          console.log(`[FitBounds] Level: ${level}, Features: ${data.features.length}, Bounds:`, bounds.toBBoxString());
          // Use a small timeout to ensure map container is ready
          const timer = setTimeout(() => {
            console.log(`[FitBounds] Executing fitBounds for ${level}`);
            map.fitBounds(bounds, { padding: [40, 40], animate: true });
            map.invalidateSize();
          }, 300);
          return () => clearTimeout(timer);
        } else {
          console.warn("[FitBounds] Invalid bounds for data", data);
        }
      } catch (e) {
        console.error("[FitBounds] Error fitting bounds:", e);
      }
    }
  }, [data, map, level]);
  
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

export function RegionMap() {
  const { 
    visits, 
    scores: allScores, 
    allRegions,
    quickIncrement, 
    upsertVisit, 
    recalculateScores,
    setRegions,
    getRegionScoreById
  } = useVisitStore();

  // O(1) lookup map for regions
  const regionsByIdMap = useMemo(() => {
    const map = new Map<string, Region>();
    for (const r of allRegions) {
      map.set(padId(r.id), r);
    }
    return map;
  }, [allRegions]);

  const { level, currentId, history, drillDown, drillUp, reset, viewLevel, setViewLevel, selectedId, setSelectedId } = useMapStore();
  const currentRegion = currentId ? regionsByIdMap.get(currentId) : null;


  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<Feature | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRequested = useMapStore(state => state.exportRequested);
  const geoJsonRef = useRef<LeafletGeoJSON | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
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

    const loadData = async () => {
      try {
        setLoading(true);
        setGeoData(null); // Clear previous data to avoid ghosting or wrong bounds
        
        let features: any[] = [];
        
        console.log(`[RegionMap] loadData started for level: ${level}, id: ${currentId}, viewLevel: ${viewLevel}`);
        // 1. Determine which geometries to fetch
        if (level === "world") {
          console.log("[RegionMap] Loading world map (level=world, currentId=null)");
          features = await fetchGeometries(null);
          console.log(`[RegionMap] World map loaded with ${features.length} features`);
        } else if (level === "country" && currentId) {
          const iso3 = currentRegion?.iso3;
          if (iso3) {
            console.log(`[RegionMap] Fetching country geometries for iso3=${iso3} (id=${currentId}) at viewLevel ${viewLevel}`);
            features = await fetchCountryGeometries(iso3, viewLevel);
          } else {
            console.log(`[RegionMap] No iso3 for country ${currentId}, falling back to fetchGeometries`);
            features = await fetchGeometries(currentId);
          }
        } else if (currentId) {
          console.log(`[RegionMap] Fetching sub-region geometries for id=${currentId}`);
          features = await fetchGeometries(currentId);
        }

        if (!active) return;

        if (features.length === 0 && level === "world") {
          console.error("[RegionMap] Critical: World map features are empty!");
        }

        if (features && features.length > 0) {
          console.log(`[RegionMap] Successfully loaded ${features.length} features`);
          
          // Convert features to Region objects and update store
          // This is critical so the store can calculate scores for these newly loaded regions (especially cities)
          const newRegions: Region[] = features.map(f => ({
            id: String(f.properties?.id || f.properties?.shapeID),
            name: String(f.properties?.name || f.properties?.shapeName || "Unknown"),
            parentId: currentId || null,
            admLevel: level === "world" ? 0 : (level === "country" ? viewLevel : 2),
            iso3: f.properties?.iso3 || null
          }));
          setRegions(newRegions);
          
          const newGeoData = {
            type: "FeatureCollection" as const,
            features: features
          };
          
          setGeoData(newGeoData);
        } else {
          console.warn(`[RegionMap] No geometries found for ${level}/${currentId || "root"}`);
          setGeoData(null);
        }
      } catch (err) {
        if (!active) return;
        console.error("[RegionMap] Failed to fetch geometries:", err);
        setGeoData(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [level, currentId, currentRegion, viewLevel, setRegions]);

  const parentMap = useMemo(() => {
    const map = new Map<string | null, Region[]>();
    for (const r of allRegions) {
      const pid = padId(r.parentId);
      const list = map.get(pid) || [];
      list.push(r);
      map.set(pid, list);
    }
    return map;
  }, [allRegions]);

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

    // Helper to check if a region is within the current scope
    const isWithinScope = (regionId: string) => {
      if (!currentId) return true;
      const id = padId(regionId);
      const targetId = padId(currentId);
      if (id === targetId) return true;

      const r = regionsByIdMap.get(id);
      if (!r) return false;

      // Check immediate parent
      if (padId(r.parentId) === targetId) return true;

      // Check grandparent (for cities under prefectures under current country)
      if (r.parentId) {
        const p = regionsByIdMap.get(padId(r.parentId));
        if (p && padId(p.parentId) === targetId) return true;
      }

      return false;
    };

    // 1. Current region scores from pre-calculated allScores
    if (currentId) {
      const score = allScores[padId(currentId)];
      if (score) {
        stats.currentTotalScore = score.totalScore;
        stats.currentDirectScore = score.directScore;
        stats.currentRateScore = score.rateScore;
        stats.currentChildSum = score.childSum;
        stats.currentChildMax = score.childMax;
        stats.totalChildrenCount = Math.round(score.childMax / 50);
      }
    } else {
      // Global stats (World Rate)
      const countries = allRegions.filter(r => r.parentId === null);
      let worldSum = 0;
      let worldMax = 0;
      for (const country of countries) {
        const s = allScores[padId(country.id)];
        if (s) {
          worldSum += s.totalScore;
          worldMax += 50;
        }
      }
      stats.currentChildSum = worldSum;
      stats.currentChildMax = worldMax;
      stats.totalChildrenCount = countries.length;
      stats.currentRateScore = Math.ceil(worldMax > 0 ? Math.min(100, (worldSum / worldMax) * 100) : 0);
      stats.currentTotalScore = stats.currentRateScore;
    }

    // 2. Count visited regions in scope
    for (const r of allRegions) {
      if (!isWithinScope(r.id)) continue;

      const s = allScores[padId(r.id)];
      if (s && s.hasVisit) {
        if (r.admLevel === 0) stats.visitedCountries++;
        else if (r.admLevel === 1) stats.visitedPrefectures++;
        else if (r.admLevel === 2) stats.visitedCities++;
      }
    }

    // 3. Category counts in scope
    const categoryVisitedRegions = new Map<VisitCategory, Set<string>>();
    for (const cat of VISIT_CATEGORY_ORDER) {
      categoryVisitedRegions.set(cat, new Set());
    }

    for (const v of visits) {
      if (v.count > 0 && categoryVisitedRegions.has(v.category) && isWithinScope(v.regionId)) {
        categoryVisitedRegions.get(v.category)!.add(padId(v.regionId));
      }
    }

    for (const cat of VISIT_CATEGORY_ORDER) {
      (stats as any)[cat] = categoryVisitedRegions.get(cat)!.size;
    }

    return stats;
  }, [currentId, allScores, visits, allRegions, regionsByIdMap]);


  const getStyle = useCallback(
    (feature?: Feature): PathOptions => {
      const rawId = feature?.properties?.id || feature?.properties?.shapeID;
      const id = padId(rawId);
      const scoreData = scoreMap[id];

      const fillColor = scoreData ? getMapColor(scoreData) : "#e2e8f0";

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
          if (region.admLevel === 0) {
            drillDown("country", id);
          } else {
            drillDown("prefecture", id);
          }
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
    [regionsByIdMap, quickIncrement, drillDown],
  );

  const handleBack = useCallback(() => {
    drillUp();
    setSelectedId(null);
  }, [drillUp]);

  const handleExport = useCallback(async () => {
    if (!exportRef.current) return;
    
    setExporting(true);
    try {
      // Small delay to ensure any pending UI updates are rendered
      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor: "#f0f9ff", // bg-sky-50 equivalent
        filter: (node: HTMLElement) => {
          // Exclude elements with 'no-export' class or specific Leaflet controls
          const isExcluded = 
            node.classList?.contains("no-export") || 
            node.classList?.contains("leaflet-control-zoom") || 
            node.classList?.contains("leaflet-control-attribution");
          return !isExcluded;
        },
      });

      const link = document.createElement("a");
      const regionName = currentRegion ? currentRegion.name : "World";
      link.download = `Regionevel-${regionName}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export map:", err);
      alert("지도 이미지를 생성하는 중 오류가 발생했습니다.");
    } finally {
      setExporting(false);
    }
  }, [currentRegion]);

  // Listen for export requests from the global navigation
  useEffect(() => {
    if (exportRequested > 0) {
      handleExport();
    }
  }, [exportRequested, handleExport]);

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const rawId = feature.properties?.id || feature.properties?.shapeID;
      const id = padId(rawId);
      if (!id) return;

      layer.on({
        mouseover: (e) => {
          if (isMobile) return;
          setHoveredId(id);
          setHoveredFeature(feature);
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
          setHoveredFeature(null);
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

      // Long press for mobile
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
  // Use getRegionScoreById for instant score even if global scoreMap isn't ready
  const selectedScore = useMemo(() => {
    if (!selectedId) return null;
    return allScores[selectedId] || getRegionScoreById(selectedId);
  }, [selectedId, allScores, getRegionScoreById]);

  const selectedChildren = selectedId ? (parentMap.get(selectedId) || []) : [];

  const hoveredScore = useMemo(() => {
    if (!hoveredId) return null;
    return allScores[hoveredId] || getRegionScoreById(hoveredId);
  }, [hoveredId, allScores, getRegionScoreById]);

  const { currentPath, currentPathIds } = useMemo(() => {
    if (!currentId) return { currentPath: ["World"], currentPathIds: [null] };
    const ancestors = getAncestors(allRegions, currentId);
    const self = regionsByIdMap.get(currentId);
    
    const names = ["World", ...ancestors.map((a) => a.name), self?.name].filter(Boolean) as string[];
    const ids = [null, ...ancestors.map((a) => a.id), currentId].filter((_, i) => i === 0 || names[i] !== undefined) as (string | null)[];
    
    return { currentPath: names, currentPathIds: ids };
  }, [allRegions, currentId, regionsByIdMap]);

  const hoveredRegion = hoveredId ? regionsByIdMap.get(hoveredId) ?? null : null;

  return (
    <div ref={exportRef} className="relative w-full h-full bg-sky-50 overflow-hidden">
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
        {/* Background Layer (Ocean) */}
        <div className="absolute inset-0 bg-sky-50/30" />

        <FitBounds data={geoData} level={level} />

        {geoData && (
          <GeoJSON
            key={`geojson-${level}-${currentId || "root"}-${viewLevel}-${geoData.features?.length || 0}`}
            ref={geoJsonRef}
            data={geoData}
            style={getStyle}
            onEachFeature={onEachFeature}
          />
        )}
        <MapEvents onMapClick={() => setSelectedId(null)} />
      </MapContainer>

      {/* Hover Label */}
      {!isMobile && (
        <div
          ref={hoverLabelRef}
          className={`fixed top-0 left-0 z-[5000] pointer-events-none transition-opacity duration-200 ${
            hoveredFeature || hoveredRegion ? "opacity-100" : "opacity-0"
          }`}
          style={{
            pointerEvents: "none",
            transition: "opacity 0.15s ease-out",
            willChange: "transform",
          }}
        >
          {(hoveredFeature || hoveredRegion) && (
            <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 min-w-fit">
              <div className="flex flex-col pr-3 border-r border-white/10">
                <span className="text-[12px] font-black leading-tight truncate max-w-[140px] tracking-tight">
                  {hoveredRegion?.name || hoveredFeature?.properties?.name || hoveredFeature?.properties?.shapeName || "Unknown"}
                </span>
                <span className="text-[9px] text-slate-400 font-bold mt-0.5 tracking-widest uppercase">
                  {hoveredRegion?.iso3 || hoveredFeature?.properties?.iso_a3 || hoveredFeature?.properties?.iso3 || hoveredFeature?.properties?.adm0_a3 || "REGION"}
                </span>
              </div>
              
              {hoveredScore ? (
                <div className="flex gap-4 items-center shrink-0">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter mb-0.5 opacity-80">EXP</span>
                    <span className="text-base font-black leading-none text-blue-400 tabular-nums">
                      {Math.round(hoveredScore.directScore)}
                    </span>
                  </div>
                  {hoveredRegion && hoveredRegion.admLevel < 2 && (
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-black text-orange-400 uppercase tracking-tighter mb-0.5 opacity-80">Rate</span>
                      <span className="text-base font-black leading-none text-orange-400 tabular-nums">
                        {Math.ceil(hoveredScore.rateScore)}%
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Ready</span>
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                </div>
              )}
            </div>
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
                  className="p-1 hover:bg-white rounded transition-all text-slate-500 border border-transparent hover:border-slate-200 no-export"
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
                    <button 
                      onClick={() => {
                        if (i === 0) {
                          reset();
                        } else {
                          // Go back until we reach the desired ancestor
                          const targetId = i === 1 ? currentPathIds[1] : currentPathIds[i];
                          // This is a simple way to go back to a specific level in history
                          const currentHistory = useMapStore.getState().history;
                          const targetIndex = currentHistory.findIndex(h => h.currentId === targetId);
                          if (targetIndex !== -1) {
                            const pops = currentHistory.length - targetIndex;
                            for (let j = 0; j < pops; j++) {
                              useMapStore.getState().drillUp();
                            }
                          }
                        }
                      }}
                      disabled={i === currentPath.length - 1}
                      className={`text-[10px] font-black tracking-tight whitespace-nowrap transition-colors ${
                        i === currentPath.length - 1 
                          ? "text-blue-600 cursor-default" 
                          : "text-slate-400 hover:text-blue-500 uppercase cursor-pointer"
                      }`}
                    >
                      {name}
                    </button>
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
                  {currentRegion ? "Selected Region" : "Global Overview"}
                </span>
                <h3 className="text-sm font-black text-slate-800 leading-none truncate max-w-[200px]">
                  {currentRegion ? currentRegion.name : "World Map"}
                </h3>
              </div>
              
              {/* View Toggle (Only for Country level) */}
              {level === "country" && (
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 no-export">
                  <button
                    onClick={() => setViewLevel(1)}
                    className={`text-xs font-medium px-2 py-0.5 rounded-md transition-all ${
                      viewLevel === 1 
                        ? "bg-white text-blue-600 shadow-sm border border-slate-200" 
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    PREFECTURE
                  </button>
                  <button
                    onClick={() => setViewLevel(2)}
                    className={`text-xs font-medium px-2 py-0.5 rounded-md transition-all ${
                      viewLevel === 2 
                        ? "bg-white text-blue-600 shadow-sm border border-slate-200" 
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    CITY
                  </button>
                </div>
              )}

              {currentRegion && currentRegion.admLevel !== 2 && (
                <div className="flex gap-6 border-l border-slate-200 pl-6 h-8 items-center flex-1">
                  <div className="flex flex-col justify-center min-w-[120px]">
                    <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-tighter leading-none mb-1">
                      Rate
                    </span>
                    <div className="flex items-baseline gap-1 whitespace-nowrap">
                      <p className="text-sm font-black text-slate-800 tabular-nums leading-none">{Math.ceil(contextStats.currentRateScore)}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Global Stats Summary */}
          <div className="px-4 border-l border-slate-200 h-full flex items-center shrink-0">
            <ScoreStatsBar
              stats={contextStats}
              isMobile={true}
              hideRate={!currentRegion || currentRegion?.admLevel === 2}
              totalChildren={currentRegion ? contextStats.totalChildrenCount : allRegions.filter(r => r.admLevel === 0).length}
              admLevel={currentRegion?.admLevel ?? -1}
            />
          </div>
        </div>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <div className="absolute top-0 left-0 right-0 z-[1001] flex flex-col bg-white border-b border-slate-200">
          <div className="flex items-center gap-2 p-2 pointer-events-auto">
            {history.length > 0 && (
              <button onClick={handleBack} className="p-2 bg-slate-50 border border-slate-200 rounded-md text-slate-600 no-export">
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

            {level === "country" && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 no-export">
                <button
                  onClick={() => setViewLevel(1)}
                  className={`px-2 py-1 text-[8px] font-black rounded-md transition-all ${
                    viewLevel === 1 
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200" 
                      : "text-slate-400"
                  }`}
                >
                  PREF
                </button>
                <button
                  onClick={() => setViewLevel(2)}
                  className={`px-2 py-1 text-[8px] font-black rounded-md transition-all ${
                    viewLevel === 2 
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200" 
                      : "text-slate-400"
                  }`}
                >
                  CITY
                </button>
              </div>
            )}
          </div>
          {currentRegion && (
            <div className="px-2 pb-2">
              <ScoreStatsBar 
                stats={contextStats} 
                isMobile={true} 
                hideRate={currentRegion?.admLevel === 2}
                hideExp={currentRegion?.admLevel === 0}
                totalChildren={contextStats.totalChildrenCount}
                admLevel={currentRegion?.admLevel ?? -1}
              />
            </div>
          )}
        </div>
      )}

      {/* Map Controls */}
      <div className={`absolute z-[1001] flex flex-col items-end gap-2 pointer-events-none transition-all duration-500 bottom-4 right-4`}>
        {loading && (
          <div className="bg-white border border-slate-200 rounded-md shadow-lg px-3 py-1.5 flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Loading</span>
          </div>
        )}

        <div className="pointer-events-auto">
          <ScoreLegend 
            isMobile={isMobile} 
            hideExp={false}
            hideRate={currentRegion?.admLevel === 1}
          />
        </div>
      </div>

      {/* RegionTooltip */}
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
  hideExp = false,
}: {
  isMobile: boolean;
  hideRate?: boolean;
  hideExp?: boolean;
}) {
  const numericLabels = ["1~7", "8~17", "18~30", "31~50", "51~100"];
  
  const individualSteps = [
    { label: numericLabels[0], color: "#eff6ff" },
    { label: numericLabels[1], color: "#bfdbfe" },
    { label: numericLabels[2], color: "#60a5fa" },
    { label: numericLabels[3], color: "#2563eb" },
    { label: numericLabels[4], color: "#1e3a8a" },
  ];
  const rateSteps = [
    { label: numericLabels[0], color: "#ffedd5" },
    { label: numericLabels[1], color: "#fdba74" },
    { label: numericLabels[2], color: "#f97316" },
    { label: numericLabels[3], color: "#ea580c" },
    { label: numericLabels[4], color: "#c2410c" },
  ];

  if (isMobile) {
    return (
      <div className="bg-white/90 backdrop-blur shadow-lg border border-slate-200 p-2 rounded-none flex gap-3">
        {!hideRate && (
          <>
            <div className="flex gap-1 items-center">
              <span className="text-[7px] font-black text-slate-400 uppercase">Rate</span>
              {rateSteps.map(s => (
                <div key={s.label} className="w-2.5 h-2.5" style={{ background: s.color }} />
              ))}
            </div>
            {!hideExp && <div className="w-[1px] bg-slate-100" />}
          </>
        )}
        {!hideExp && (
          <div className="flex gap-1 items-center">
            <span className="text-[7px] font-black text-slate-400 uppercase">Exp</span>
            {individualSteps.map(s => (
              <div key={s.label} className="w-2.5 h-2.5" style={{ background: s.color }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-md shadow-2xl border border-slate-200 p-3 rounded-none w-32 flex flex-col gap-3">
      {!hideRate && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Rate</span>
            <div className="flex flex-col gap-1">
              {rateSteps.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 shadow-sm" style={{ background: s.color }} />
                  <span className="text-[9px] font-bold text-slate-500 tabular-nums">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          {!hideExp && <div className="h-[1px] bg-slate-100" /> }
        </>
      )}
      {!hideExp && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Exp</span>
          <div className="flex flex-col gap-1">
            {individualSteps.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 shadow-sm" style={{ background: s.color }} />
                <span className="text-[9px] font-bold text-slate-500 tabular-nums">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
