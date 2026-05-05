import React, { useMemo, useState, useCallback, useEffect, memo, useRef } from "react";
import type { Region, VisitCategory, RegionScore } from "@regionevel/types";
import { VISIT_CATEGORY_ORDER, VISIT_CONFIG } from "@regionevel/types";
import { getScoreColor, getRegionScore, padId } from "@regionevel/utils";
import { useVisitStore } from "@/store/visitStore";
import { fetchChildren, fetchAncestors, fetchRegion } from "@/lib/regions";

interface RegionListProps {
  regions?: Region[]; // Optional now
}

type SortOrder = "NAME_ASC" | "NAME_DESC" | "SCORE_DESC" | "SCORE_ASC";

// Memoized List Item to prevent unnecessary re-renders
const RegionListItem = memo(({
  region,
  score,
  onDrillDown,
  onUpdateVisit,
  hasChildren,
}: {
  region: Region;
  score: RegionScore;
  onDrillDown: (id: string) => void;
  onUpdateVisit: (cat: VisitCategory, count: number) => void;
  hasChildren: boolean;
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`flex items-start justify-between ${region.admLevel >= 2 ? "mb-4" : "mb-2"}`}>
        <div className="flex items-center gap-3">
          <div
            className="w-5 h-5 rounded-full border-2 border-white shadow-sm shrink-0"
            style={{ backgroundColor: getScoreColor(score.totalScore) }}
          />
          <div>
            <h3 className="font-bold text-gray-800 leading-tight">{region.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-blue-600 font-bold">{score.totalScore} pts</span>
              {(score.rateScore > 0 || score.directScore > 0) && (
                <span className="text-[10px] text-gray-400 font-medium">
                  ({[
                    region.admLevel !== 0 && `Exp ${score.directScore}`,
                    region.admLevel !== 2 && `Rate ${score.rateScore}%`
                  ].filter(Boolean).join(" + ")})
                </span>
              )}
            </div>
          </div>
        </div>

        {hasChildren && (
          <button
            onClick={() => onDrillDown(region.id)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
          >
            Details
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Progress Stats for Higher Levels */}
      {region.admLevel < 2 && (
        <div className="flex items-center gap-6 py-1">
          {score.subRegionStats && score.subRegionStats.totalCount > 0 && (
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Regions</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-black text-gray-700">{score.subRegionStats.visitedCount}</span>
                <span className="text-[10px] text-gray-400 font-medium">/ {score.subRegionStats.totalCount}</span>
              </div>
            </div>
          )}
          {score.cityStats && score.cityStats.totalCount > 0 && (
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Cities</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-black text-gray-700">{score.cityStats.visitedCount}</span>
                <span className="text-[10px] text-gray-400 font-medium">/ {score.cityStats.totalCount}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Scoring Buttons for Leaf Regions (Cities) */}
      {region.admLevel >= 2 && (
        <div className="grid grid-cols-5 gap-1.5">
          {VISIT_CATEGORY_ORDER.map((cat) => {
            const config = VISIT_CONFIG[cat];
            const b = score.breakdown?.[cat];
            const isActive = (b?.directCount ?? 0) > 0;
            
            if (!config) return null;
            const hasSubWeight = (b?.effectiveCount ?? 0) > (b?.directCount ?? 0);

            return (
              <button
                key={cat}
                onClick={() => onUpdateVisit(cat, ((b?.directCount ?? 0) + 1) % ((config?.maxCount ?? 0) + 1))}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all relative overflow-hidden ${
                  isActive
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : hasSubWeight
                      ? "bg-blue-50 border-blue-200 text-blue-600"
                      : "bg-white border-gray-100 text-gray-400 hover:border-blue-200 hover:bg-blue-50/30"
                }`}
              >
                <div 
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${((b?.effectiveCount ?? 0) / (config?.maxCount || 1)) * 100}%` }}
                />
                {isActive && (
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {b?.points ?? 0} pts
                  </span>
                )}
                {hasSubWeight && !isActive && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-bl-md" />
                )}
                <span className="text-[10px] font-bold tracking-tighter whitespace-nowrap z-10">
                  {config?.label}
                </span>
                <span className={`text-xs font-black z-10 ${isActive ? "text-blue-100" : hasSubWeight ? "text-blue-400" : "text-gray-300"}`}>
                  {isActive ? b?.directCount : hasSubWeight ? `+${b?.effectiveCount}` : 0}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

RegionListItem.displayName = "RegionListItem";

export function RegionList({ regions: initialRegions = [] }: RegionListProps) {
  const { visits, upsertVisit, scores, recalculateScores } = useVisitStore();
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [currentRegions, setCurrentRegions] = useState<Region[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "World" },
  ]);
  const [search, setSearch] = useState("");
  const [lazyAllRegions, setLazyAllRegions] = useState<Region[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("NAME_ASC");
  const [loading, setLoading] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounced search to prevent heavy re-calculation on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load children when parent changes
  useEffect(() => {
    if (initialRegions.length > 0) {
      // If we have the full tree, just filter locally
      const children = initialRegions.filter(r => (r.parentId || null) === (currentParentId || null));
      setCurrentRegions(children);
      
      const bc: { id: string | null; name: string }[] = [{ id: null, name: "World" }];
      let tid = currentParentId;
      const ancestors: {id: string, name: string}[] = [];
      while (tid) {
        const p = initialRegions.find(r => r.id === tid);
        if (p) {
          ancestors.unshift({ id: p.id, name: p.name });
          tid = p.parentId;
        } else break;
      }
      setBreadcrumbs([...bc, ...ancestors]);
      return;
    }

    async function load() {
      setLoading(true);
      const [children, ancestors] = await Promise.all([
        fetchChildren(currentParentId),
        currentParentId ? fetchAncestors(currentParentId) : Promise.resolve([]),
      ]);

      setCurrentRegions(children);

      const bc: { id: string | null; name: string }[] = [{ id: null, name: "World" }];
      bc.push(...ancestors.map((a) => ({ id: a.id, name: a.name })));

      if (currentParentId) {
        const self = await fetchRegion(currentParentId);
        if (self) {
          bc.push({ id: self.id, name: self.name });
        }
      }
      setBreadcrumbs(bc);
      setLoading(false);
    }
    load();
  }, [currentParentId, initialRegions]);

  const backgroundLoadStarted = useRef(false);

  // Background load all regions to ensure accurate scoring even when not searching
  useEffect(() => {
    if (initialRegions.length === 0 && lazyAllRegions.length === 0 && !backgroundLoadStarted.current) {
      backgroundLoadStarted.current = true;
      setLoadingSearch(true);
      import("@/lib/regions").then(m => m.fetchAllRegions())
        .then(data => {
          setLazyAllRegions(data);
          setLoadingSearch(false);
        })
        .catch(e => {
          console.error("Failed to background load regions", e);
          backgroundLoadStarted.current = false;
          setLoadingSearch(false);
        });
    }
  }, [initialRegions.length, lazyAllRegions.length]);

  // Pre-calculate maps (O(N)) - Memoize to avoid rebuilding on every visit change
  // Trigger global recalculation when all regions are loaded in background
  useEffect(() => {
    if (lazyAllRegions.length > 0) {
      recalculateScores(lazyAllRegions);
    }
  }, [lazyAllRegions, recalculateScores]);

  const sortedAndFiltered = useMemo(() => {
    const isSearching = debouncedSearch.trim().length > 0;
    
    // 1. Identify which regions to display
    let displayRegions: Region[] = [];
    if (isSearching) {
      displayRegions = lazyAllRegions.length > 0 ? lazyAllRegions : (initialRegions.length > 0 ? initialRegions : currentRegions);
    } else {
      displayRegions = currentRegions;
    }

    if (displayRegions.length === 0) return [];

    // 2. Filter if searching
    let filtered = displayRegions;
    if (isSearching) {
      const q = debouncedSearch.toLowerCase().trim();
      filtered = displayRegions.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.id.toLowerCase().includes(q) ||
        r.iso3?.toLowerCase().includes(q) ||
        r.code?.toLowerCase().includes(q)
      );
    }

    // 3. Attach scores from store
    const withScores = filtered.map(r => {
      const rid = padId(r.id);
      const storeScore = scores[rid];
      
      return {
        region: r,
        score: storeScore || {
          regionId: rid,
          directScore: 0,
          rateScore: 0,
          childSum: 0,
          childMax: 0,
          totalScore: 0,
          scoreType: (r.admLevel ?? 2) < 2 ? "orange" : "blue",
          hasVisit: false,
          breakdown: VISIT_CATEGORY_ORDER.reduce((acc, cat) => {
            acc[cat] = { directCount: 0, effectiveCount: 0, points: 0 };
            return acc;
          }, {} as any),
        }
      };
    });

    // 4. Sort
    withScores.sort((a, b) => {
      switch (sortOrder) {
        case "NAME_ASC":
          return a.region.name.localeCompare(b.region.name);
        case "NAME_DESC":
          return b.region.name.localeCompare(a.region.name);
        case "SCORE_DESC":
          return b.score.totalScore - a.score.totalScore || a.region.name.localeCompare(b.region.name);
        case "SCORE_ASC":
          return a.score.totalScore - b.score.totalScore || a.region.name.localeCompare(b.region.name);
        default:
          return 0;
      }
    });

    return withScores;
  }, [debouncedSearch, initialRegions, lazyAllRegions, currentRegions, scores, sortOrder]);

  // Final visible list with pagination
  const visibleItems = useMemo(() => {
    return sortedAndFiltered.slice(0, displayCount);
  }, [sortedAndFiltered, displayCount]);

  const handleDrillDown = useCallback((id: string) => {
    setSearch("");
    setCurrentParentId(id);
  }, []);

  const handleBack = useCallback(() => {
    if (!currentParentId) return;
    const region = currentRegions.find((r) => r.id === currentParentId) || 
                   initialRegions.find(r => r.id === currentParentId);
    setCurrentParentId(region?.parentId ?? null);
  }, [currentRegions, initialRegions, currentParentId]);

  const sortOptions: { value: SortOrder; label: string }[] = [
    { value: "NAME_ASC", label: "Name (A-Z)" },
    { value: "NAME_DESC", label: "Name (Z-A)" },
    { value: "SCORE_DESC", label: "Highest Score" },
    { value: "SCORE_ASC", label: "Lowest Score" },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header with Search and Breadcrumbs */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-20 shadow-sm">
        {/* Loading Bar */}
        {(loading || loadingSearch) && (
          <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden z-30">
            <div className="h-full bg-blue-600 animate-loading-bar" />
          </div>
        )}
        <div className="px-4 py-3 space-y-3">
          <div className="relative">
            <input
              type="search"
              placeholder="Search for a country or region..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <svg
              className="absolute left-3 top-3 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {(loading || loadingSearch) && (
              <div className="absolute right-3 top-3 flex items-center gap-2">
                {loadingSearch && <span className="text-[10px] text-blue-500 font-bold animate-pulse">Loading Global Data...</span>}
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Sort</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortOrder(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  sortOrder === opt.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {!search && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
              {breadcrumbs.map((bc, i) => (
                <div key={bc.id || "root"} className="flex items-center shrink-0">
                  {i > 0 && (
                    <svg
                      className="w-4 h-4 text-gray-300 mx-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                  <button
                    onClick={() => setCurrentParentId(bc.id)}
                    className={`text-sm font-medium px-2 py-1 rounded-lg transition-colors ${
                      i === breadcrumbs.length - 1
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {bc.name}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Region List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {visibleItems.map(({ region, score }) => (
          <RegionListItem
            key={region.id}
            region={region}
            score={score}
            onDrillDown={handleDrillDown}
            onUpdateVisit={(cat, count) => upsertVisit(region.id, cat, count)}
            hasChildren={region.childrenCount !== undefined ? region.childrenCount > 0 : region.admLevel < 2}
          />
        ))}

        {sortedAndFiltered.length > visibleItems.length && (
          <button
            onClick={() => setDisplayCount(prev => prev + 50)}
            className="w-full py-4 text-sm font-bold text-blue-600 bg-white rounded-2xl border border-dashed border-blue-200 hover:bg-blue-50 transition-colors"
          >
            Load More ({sortedAndFiltered.length - visibleItems.length} remaining)
          </button>
        )}

        {sortedAndFiltered.length === 0 && !loading && !loadingSearch && (

          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg
              className="w-12 h-12 mb-3 opacity-20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-sm">No results found</p>
          </div>
        )}
      </div>
    </div>
  );
}


