"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { MapContainer, GeoJSON, useMap, useMapEvents, Polyline } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { GeoJSON as LeafletGeoJSON, Layer, LatLngBounds, PathOptions } from "leaflet";
import L from "leaflet";
import { VISIT_CATEGORY_ORDER, type Region, type RegionScore, type RegionVisit, type VisitCategory } from "@regionevel/types";
import { getRegionScore, getMapColor, padId } from "@regionevel/utils";
import { useVisitStore } from "@/store/visitStore";
import { fetchChildren, fetchGeometries, fetchCountryGeometries, getAncestors } from "@/lib/regions";
import { findRegionForPoint } from "@/lib/geo";
import { useViewportFeatures } from "@/lib/viewportFeatures";
import { useIsPhone } from "@/lib/useIsPhone";
import { useMapStore } from "@/store/mapStore";
import { Z } from "@/lib/layers";
import { RegionTooltip } from "./RegionTooltip";
import { ScoreStatsBar } from "./ScoreStatsBar";
import { ShareCardModal } from "./ShareCardModal";
import { Pencil, CheckCircle2, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Prevent React 18/19 StrictMode / HMR container reuse cleanup crashes in Leaflet
if (typeof window !== "undefined" && L && L.Map) {
  const originalRemove = L.Map.prototype.remove;
  L.Map.prototype.remove = function () {
    try {
      return originalRemove.call(this);
    } catch (e: any) {
      if (e?.message?.includes("Map container is being reused by another instance")) {
        return this;
      }
      throw e;
    }
  };
}

interface MapDrawControllerProps {
  isDrawMode: boolean;
  geoData: FeatureCollection | null;
  onDrawComplete: (
    startRegion: { id: string; name: string } | null,
    endRegion: { id: string; name: string } | null,
    pathRegions: Array<{ id: string; name: string }>
  ) => void;
}

function MapDrawController({ isDrawMode, geoData, onDrawComplete }: MapDrawControllerProps) {
  const map = useMap();
  const [drawnPath, setDrawnPath] = useState<[number, number][]>([]);

  useEffect(() => {
    if (isDrawMode) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      setDrawnPath([]);
    }
  }, [isDrawMode, map]);

  useEffect(() => {
    if (!isDrawMode) return;

    const container = map.getContainer();
    let drawing = false;
    let path: [number, number][] = [];

    const getLatLng = (e: MouseEvent | TouchEvent) => {
      const touch = "touches" in e ? (e.touches[0] || e.changedTouches[0]) : e;
      if (!touch) return null;
      const rect = container.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      return map.containerPointToLatLng([x, y]);
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      e.stopPropagation();
      drawing = true;
      const latLng = getLatLng(e);
      if (latLng) {
        path = [[latLng.lat, latLng.lng]];
        setDrawnPath(path);
      }
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!drawing) return;
      e.stopPropagation();
      const latLng = getLatLng(e);
      if (latLng) {
        path.push([latLng.lat, latLng.lng]);
        setDrawnPath([...path]);
      }
    };

    const handlePointerUp = () => {
      if (!drawing) return;
      drawing = false;

      if (path.length > 0 && geoData?.features) {
        const startPt = path[0];
        const endPt = path[path.length - 1];
        if (!startPt || !endPt) return;

        const startRegion = findRegionForPoint(startPt[0], startPt[1], geoData.features);
        const endRegion = findRegionForPoint(endPt[0], endPt[1], geoData.features);

        const sampleStep = Math.max(1, Math.floor(path.length / 40));
        const sampledPoints: [number, number][] = [];
        for (let i = 0; i < path.length; i += sampleStep) {
          const pt = path[i];
          if (pt) sampledPoints.push(pt);
        }
        if (path.length > 1) {
          sampledPoints.push(endPt);
        }

        const encounteredRegions: Array<{ id: string; name: string }> = [];
        const seenIds = new Set<string>();

        sampledPoints.forEach(([lat, lng]) => {
          const reg = findRegionForPoint(lat, lng, geoData.features);
          if (reg && !seenIds.has(reg.id)) {
            seenIds.add(reg.id);
            encounteredRegions.push(reg);
          }
        });

        onDrawComplete(startRegion, endRegion, encounteredRegions);
      }

      setTimeout(() => setDrawnPath([]), 1500);
    };

    container.addEventListener("mousedown", handlePointerDown);
    container.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    container.addEventListener("touchstart", handlePointerDown, { passive: false });
    container.addEventListener("touchmove", handlePointerMove, { passive: false });
    window.addEventListener("touchend", handlePointerUp);

    return () => {
      container.removeEventListener("mousedown", handlePointerDown);
      container.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);

      container.removeEventListener("touchstart", handlePointerDown);
      container.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [isDrawMode, map, geoData, onDrawComplete]);

  return (
    <>
      {drawnPath.length > 1 && (
        <Polyline
          positions={drawnPath}
          pathOptions={{
            color: "#f59e0b",
            weight: 6,
            opacity: 0.9,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      )}
    </>
  );
}

function shiftGeometry(geometry: any, offsetLng: number): any {
  if (!geometry || !geometry.coordinates) return geometry;

  const shiftCoords = (coords: any, depth: number): any => {
    if (depth === 1) {
      return [coords[0] + offsetLng, coords[1]];
    }
    return coords.map((c: any) => shiftCoords(c, depth - 1));
  };

  let depth = 1;
  if (geometry.type === "Point") depth = 1;
  else if (geometry.type === "LineString" || geometry.type === "MultiPoint") depth = 2;
  else if (geometry.type === "Polygon" || geometry.type === "MultiLineString") depth = 3;
  else if (geometry.type === "MultiPolygon") depth = 4;

  return {
    ...geometry,
    coordinates: shiftCoords(geometry.coordinates, depth),
  };
}

function getWrappedFeatures(features: Feature[] | null, isWorldLevel: boolean): Feature[] {
  if (!features || features.length === 0) return [];
  if (!isWorldLevel) return features;

  const offsets = [-360, 0, 360];
  const wrapped: Feature[] = [];

  offsets.forEach((offset) => {
    features.forEach((f, idx) => {
      if (offset === 0) {
        wrapped.push(f);
      } else {
        wrapped.push({
          ...f,
          id: f.id ? `${f.id}_wrap_${offset}` : `wrap_${offset}_${idx}`,
          properties: {
            ...f.properties,
          },
          geometry: shiftGeometry(f.geometry, offset),
        } as Feature);
      }
    });
  });

  return wrapped;
}

function FitBounds({
  data,
  level,
  disabledRegionIds,
}: {
  data: FeatureCollection | null;
  level: string;
  disabledRegionIds?: string[];
}) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;

    const safeSetWorldView = () => {
      try {
        const center = map.getCenter();
        const zoom = map.getZoom();
        if (zoom !== 2 || Math.round(center.lat) !== 20 || Math.round(center.lng) !== 0) {
          map.setView([20, 0], 2, { animate: false });
        }
      } catch (err) {
        console.warn("[FitBounds] setView failed:", err);
      }
    };

    // 1. World level: Reset to global view safely with unbounded horizontal scrolling
    if (level === "world") {
      map.whenReady(() => {
        try {
          map.setMaxBounds([
            [-85, -Infinity],
            [85, Infinity],
          ] as any);
        } catch {}
        safeSetWorldView();
      });
      return;
    } else {
      try {
        map.setMaxBounds([
          [-90, -180],
          [90, 180],
        ]);
      } catch {}
    }
    
    // 2. Other levels: Fit bounds to active data if available
    if (data && data.features && data.features.length > 0) {
      try {
        const disabledSet = new Set((disabledRegionIds || []).map(padId));
        // Filter out disabled regions so they are excluded from the zoom bounding box calculation!
        const activeFeatures = data.features.filter((f) => {
          const rawId = f.properties?.id || f.properties?.shapeID;
          const id = padId(rawId);
          return !disabledSet.has(id);
        });

        const targetFeatures = activeFeatures.length > 0 ? activeFeatures : data.features;
        const geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: targetFeatures } as any);
        const bounds = geoJsonLayer.getBounds();
        
        if (bounds.isValid()) {
          const timer = setTimeout(() => {
            map.whenReady(() => {
              try {
                map.fitBounds(bounds, { padding: [40, 40], animate: true });
                map.invalidateSize();
              } catch (err) {
                console.warn("[FitBounds] fitBounds failed:", err);
              }
            });
          }, 100);
          return () => clearTimeout(timer);
        } else {
          console.warn("[FitBounds] Invalid bounds for data", data);
        }
      } catch (e) {
        console.error("[FitBounds] Error fitting bounds:", e);
      }
    }
  }, [data, map, level, disabledRegionIds]);
  
  return null;
}

// Map events component to handle background clicks and report the viewport
function MapEvents({
  onMapClick,
  onBoundsChange,
}: {
  onMapClick: () => void;
  onBoundsChange: (bounds: LatLngBounds) => void;
}) {
  const map = useMapEvents({
    click: () => {
      onMapClick();
    },
    moveend: () => {
      try {
        onBoundsChange(map.getBounds());
      } catch (e) {
        // ignore
      }
    },
    zoomend: () => {
      try {
        onBoundsChange(map.getBounds());
      } catch (e) {
        // ignore
      }
    },
  });

  // Report the initial viewport safely when map is ready
  useEffect(() => {
    map.whenReady(() => {
      try {
        onBoundsChange(map.getBounds());
      } catch (e) {
        // ignore
      }
    });
  }, [map, onBoundsChange]);

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
    getRegionScoreById,
    addDrawPathVisits,
  } = useVisitStore();

  // O(1) lookup map for regions
  const regionsByIdMap = useMemo(() => {
    const map = new Map<string, Region>();
    for (const r of allRegions) {
      map.set(padId(r.id), r);
    }
    return map;
  }, [allRegions]);

  const {
    level,
    currentId,
    history,
    drillDown,
    drillUp,
    reset,
    viewLevel,
    setViewLevel,
    selectedId,
    setSelectedId,
    isDrawMode,
    setIsDrawMode,
    shareRequested,
    disabledRegionIds,
    leftSidebarOpen,
    rightDrawerOpen,
    toggleLeftSidebar,
    toggleRightDrawer,
  } = useMapStore();
  const currentRegion = currentId ? regionsByIdMap.get(currentId) : null;
  const disabledSet = useMemo(() => new Set(disabledRegionIds.map(padId)), [disabledRegionIds]);

  const isMobile = useIsPhone();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<Feature | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
  const [loading, setLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [drawResult, setDrawResult] = useState<{
    startName: string;
    endName: string;
    pathCount: number;
    pathNames: string[];
  } | null>(null);

  const geoJsonRef = useRef<LeafletGeoJSON | null>(null);
  const hoverLabelRef = useRef<HTMLDivElement>(null);


  const handleDrawComplete = useCallback(
    (
      startRegion: { id: string; name: string } | null,
      endRegion: { id: string; name: string } | null,
      pathRegions: Array<{ id: string; name: string }>
    ) => {
      if (!startRegion && !endRegion && pathRegions.length === 0) return;

      const startId = startRegion?.id || endRegion?.id || pathRegions[0]?.id;
      const endId = endRegion?.id || startRegion?.id || pathRegions[pathRegions.length - 1]?.id;

      if (!startId) return;

      const pathIds = pathRegions.map(r => r.id);
      addDrawPathVisits(startId, endId || startId, pathIds);

      setDrawResult({
        startName: startRegion?.name || pathRegions[0]?.name || "Unknown",
        endName: endRegion?.name || pathRegions[pathRegions.length - 1]?.name || "Unknown",
        pathCount: pathRegions.length,
        pathNames: pathRegions.map(r => r.name),
      });

      setTimeout(() => setDrawResult(null), 5000);
    },
    [addDrawPathVisits]
  );


  // Fetch GeoJSON data
  useEffect(() => {
    let active = true;
    setLoading(true);

    const loadData = async () => {
      try {
        setLoading(true);
        setGeoData(null); // Clear previous data to avoid ghosting or wrong bounds
        
        let features: any[] = [];
        
        // 1. Determine which geometries to fetch
        if (level === "world") {
          features = await fetchGeometries(null);
        } else if (level === "country" && currentId) {
          const iso3 = currentRegion?.iso3;
          if (iso3) {
            features = await fetchCountryGeometries(iso3, viewLevel);
          } else {
            features = await fetchGeometries(currentId);
          }
        } else if (currentId) {
          features = await fetchGeometries(currentId);
        }

        if (!active) return;

        if (features.length === 0 && level === "world") {
          console.error("[RegionMap] Critical: World map features are empty!");
        }

        if (features && features.length > 0) {
          // Convert features to Region objects and update store for newly loaded sub-regions (e.g. cities)
          if (level !== "world") {
            const newRegions: Region[] = features.map(f => ({
              id: String(f.properties?.id || f.properties?.shapeID),
              name: String(f.properties?.name || f.properties?.shapeName || "Unknown"),
              parentId: currentId || null,
              admLevel: level === "country" ? viewLevel : 2,
              iso3: f.properties?.iso3 || null
            }));
            setRegions(newRegions);
          }
          
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
      const isDisabled = disabledSet.has(id);

      if (isDisabled) {
        return {
          fillColor: "#e2e8f0",
          fillOpacity: 0.08,
          color: "#cbd5e1",
          weight: 0.5,
          opacity: 0.20,
        };
      }

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
    [scoreMap, disabledSet],
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

  // Open the share card. It lives here because this is where the loaded
  // boundaries are, and the card draws from them rather than fetching again.
  useEffect(() => {
    if (shareRequested > 0) setIsShareModalOpen(true);
  }, [shareRequested]);

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const rawId = feature.properties?.id || feature.properties?.shapeID;
      const id = padId(rawId);
      if (!id) return;

      // If region is disabled in hierarchy filter, completely disable interaction!
      if (disabledSet.has(id)) {
        return;
      }

      let pressTimer: ReturnType<typeof setTimeout>;
      const startPress = () => {
        pressTimer = setTimeout(() => {
          setIsDrawMode(true);
        }, 500);
      };
      const cancelPress = () => clearTimeout(pressTimer);

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
        mousedown: startPress,
        mouseup: () => {
          cancelPress();
        },
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          if (useMapStore.getState().isDrawMode) return;
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

      (layer as any).on("touchstart", startPress);
      (layer as any).on("touchend", cancelPress);
      (layer as any).on("touchcancel", cancelPress);
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

  // Hand Leaflet only the polygons that can be on screen. `revision` changes
  // exactly when the window's contents change, so it — not the feature count —
  // is what the layer remounts on.
  const { features: visibleFeatures, revision: featureRevision } = useViewportFeatures(
    geoData?.features ?? null,
    mapBounds,
  );

  const wrappedFeatures = useMemo(() => {
    return getWrappedFeatures(visibleFeatures, level === "world");
  }, [visibleFeatures, level]);

  const visibleData = useMemo<FeatureCollection | null>(
    () => (geoData ? { type: "FeatureCollection", features: wrappedFeatures } : null),
    [geoData, wrappedFeatures],
  );

  const handleBoundsChange = useCallback((b: LatLngBounds) => setMapBounds(b), []);
  const handleMapClick = useCallback(() => setSelectedId(null), [setSelectedId]);

  return (
    <div className={`relative w-full h-full bg-sky-50 overflow-hidden ${isDrawMode ? "cursor-pen" : ""}`}>
      <MapContainer
        preferCanvas={true}
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        worldCopyJump={true}
        maxBounds={
          level === "world"
            ? undefined
            : [
                [-90, -180],
                [90, 180],
              ]
        }
        className="isolate z-0"
        style={{ width: "100%", height: "100%", background: "#e0f2fe", isolation: "isolate", zIndex: 0 }}
        attributionControl={false}
        zoomControl={false}
      >
        {/* Background Layer (Ocean) */}
        <div className="absolute inset-0 bg-sky-50/30" />

        <FitBounds data={geoData} level={level} disabledRegionIds={disabledRegionIds} />

        <MapDrawController
          isDrawMode={isDrawMode}
          geoData={geoData}
          onDrawComplete={handleDrawComplete}
        />

        {visibleData && (
          <GeoJSON
            key={`geojson-${level}-${currentId || "root"}-${viewLevel}-r${featureRevision}`}
            ref={geoJsonRef}
            data={visibleData}
            style={getStyle}
            onEachFeature={onEachFeature}
          />
        )}
        <MapEvents onMapClick={handleMapClick} onBoundsChange={handleBoundsChange} />
      </MapContainer>

      {/* Hover Label */}
      {!isMobile && (
        <div
          ref={hoverLabelRef}
          className={`fixed top-0 left-0 pointer-events-none transition-opacity duration-200 no-export ${
            hoveredFeature || hoveredRegion ? "opacity-100" : "opacity-0"
          }`}
          style={{
            zIndex: Z.tooltip,
            pointerEvents: "none",
            transition: "opacity 0.15s ease-out",
            willChange: "transform",
          }}
        >
          {(hoveredFeature || hoveredRegion) && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-white px-3.5 py-2.5 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-4 min-w-fit animate-in fade-in zoom-in-95 duration-150">
              <div className="flex flex-col pr-3 border-r border-slate-200/80 dark:border-slate-800">
                <span className="text-[12px] font-black leading-tight truncate max-w-[140px] tracking-tight text-slate-900 dark:text-white">
                  {hoveredRegion?.name || hoveredFeature?.properties?.name || hoveredFeature?.properties?.shapeName || "Unknown"}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-400 font-bold mt-0.5 tracking-widest uppercase">
                  {hoveredRegion?.iso3 || hoveredFeature?.properties?.iso_a3 || hoveredFeature?.properties?.iso3 || hoveredFeature?.properties?.adm0_a3 || "REGION"}
                </span>
              </div>
              
              {hoveredScore ? (
                <div className="flex gap-4 items-center shrink-0">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter mb-0.5 opacity-80">EXP</span>
                    <span className="text-base font-black leading-none text-blue-600 dark:text-blue-400 tabular-nums">
                      {Math.round(hoveredScore.directScore)}
                    </span>
                  </div>
                  {hoveredRegion && hoveredRegion.admLevel < 2 && (
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-tighter mb-0.5 opacity-80">Rate</span>
                      <span className="text-base font-black leading-none text-orange-600 dark:text-orange-400 tabular-nums">
                        {Math.ceil(hoveredScore.rateScore)}%
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">Ready</span>
                  <div className="w-3 h-3 border-2 border-slate-300 dark:border-white/20 border-t-blue-600 dark:border-t-white/80 rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      )}



      {/* Mobile Header */}
      {isMobile && (
        <div style={{ zIndex: Z.mapOverlay }} className="absolute top-0 left-0 right-0 flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 no-export">
          <div className="flex items-center gap-2 p-2 pointer-events-auto">
            {history.length > 0 && (
              <button onClick={handleBack} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 no-export">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="flex items-center px-2.5 py-1.5 gap-2 overflow-x-auto no-scrollbar whitespace-nowrap bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex-1">
              {currentPath.map((name, i) => (
                <div key={i} className="flex items-center gap-1 shrink-0">
                  {i > 0 && <span className="text-slate-300 dark:text-slate-600 text-xs">/</span>}
                  <span className={`text-[10px] font-black uppercase ${i === currentPath.length - 1 ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`}>
                    {name}
                  </span>
                </div>
              ))}
            </div>

            {level === "country" && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 no-export">
                <button
                  onClick={() => setViewLevel(1)}
                  className={`px-2 py-1 text-[8px] font-black rounded-lg transition-all ${
                    viewLevel === 1 
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-600" 
                      : "text-slate-400"
                  }`}
                >
                  PREF
                </button>
                <button
                  onClick={() => setViewLevel(2)}
                  className={`px-2 py-1 text-[8px] font-black rounded-lg transition-all ${
                    viewLevel === 2 
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-600" 
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
      <div style={{ zIndex: Z.mapOverlay }} className={`absolute flex flex-col items-end gap-2 pointer-events-none transition-all duration-500 bottom-4 right-4 no-export`}>
        {loading && (
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-lg px-3 py-1.5 flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Loading</span>
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

      {/* Draw Mode Active Banner */}
      {isDrawMode && (
        <div style={{ zIndex: Z.toast }} className="absolute top-16 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-2 rounded-2xl shadow-xl border border-amber-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200 no-export">
          <Pencil className="w-4 h-4 animate-bounce" />
          <div className="flex flex-col">
            <span className="text-xs font-black">드로잉 모드 활성화</span>
            <span className="text-[10px] text-amber-100 font-bold">마우스/터치로 지도를 드래그하여 이동 경로를 그리세요</span>
          </div>
          <button
            onClick={() => setIsDrawMode(false)}
            className="ml-2 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            그리기 종료
          </button>
        </div>
      )}

      {/* Draw Result Toast */}
      {drawResult && (
        <div style={{ zIndex: Z.toast }} className="absolute top-28 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/50 flex items-center gap-4 max-w-md animate-in zoom-in-95 duration-200 no-export">
          <div className="size-8 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span className="text-xs font-extrabold text-amber-400">경로 점수 추가 완료!</span>
            <span className="text-[11px] font-bold text-slate-200 truncate">
              📍 {drawResult.startName} ➔ {drawResult.endName} (+1 Visit, Transit, Pass)
            </span>
            <span className="text-[10px] text-slate-400 font-medium truncate">
              통과 지역 ({drawResult.pathCount}개 +1 Pass): {drawResult.pathNames.join(", ")}
            </span>
          </div>
          <button
            onClick={() => setDrawResult(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* RegionTooltip */}
      {selectedRegion && selectedScore && (
        <div className="no-export">
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
        </div>
      )}
      {/* Watermark/Credits overlay visible in exported images */}
      <div style={{ zIndex: Z.mapOverlay }} className="absolute bottom-2 left-2 pointer-events-none bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-md border border-slate-200/60 text-[10px] font-black text-slate-500 flex items-center gap-1.5 shadow-sm tracking-tight">
        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
        <span>rgnevel.pplaner.com</span>
      </div>

      <ShareCardModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        regions={allRegions}
        visits={visits}
        scores={allScores}
        features={geoData?.features ?? []}
        selectedRegionId={selectedId}
        currentRegionId={currentId}
      />
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
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xl border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-2xl flex gap-3.5">
        {!hideRate && (
          <>
            <div className="flex gap-1.5 items-center">
              <span className="text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-tight">Rate</span>
              {rateSteps.map(s => (
                <div key={s.label} className="w-2.5 h-2.5 rounded-sm shadow-xs" style={{ background: s.color }} />
              ))}
            </div>
            {!hideExp && <div className="w-[1px] bg-slate-200 dark:bg-slate-700" />}
          </>
        )}
        {!hideExp && (
          <div className="flex gap-1.5 items-center">
            <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">Exp</span>
            {individualSteps.map(s => (
              <div key={s.label} className="w-2.5 h-2.5 rounded-sm shadow-xs" style={{ background: s.color }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl w-32 flex flex-col gap-3">
      {!hideRate && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Rate</span>
            <div className="flex flex-col gap-1.5">
              {rateSteps.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md shadow-xs shrink-0" style={{ background: s.color }} />
                  <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          {!hideExp && <div className="h-[1px] bg-slate-100 dark:bg-slate-800" /> }
        </>
      )}
      {!hideExp && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Exp</span>
          <div className="flex flex-col gap-1.5">
            {individualSteps.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-md shadow-xs shrink-0" style={{ background: s.color }} />
                <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
