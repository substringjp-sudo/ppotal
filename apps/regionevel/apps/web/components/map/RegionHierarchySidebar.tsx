"use client";

import React, { useMemo, useState, useCallback } from "react";
import type { Region, RegionScore } from "@regionevel/types";
import { getScoreColor, padId } from "@regionevel/utils";
import { useVisitStore } from "@/store/visitStore";
import { useMapStore } from "@/store/mapStore";
import { SidebarFrame, SidebarSegmentTabs } from "@ppotal/ui";
import { 
  Layers, ChevronDown, ChevronRight, Check, MapPin
} from "lucide-react";

type SortType = "score" | "name" | "visits";

export function RegionHierarchySidebar() {
  const { allRegions, scores: allScores, getRegionScoreById } = useVisitStore();
  const { 
    disabledRegionIds, 
    setRegionDisabled, 
    setAllRegionsDisabled, 
    clearAllRegionsDisabled,
    jumpToRegion,
    toggleLeftSidebar,
  } = useMapStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState<SortType>("score");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Toggle node expansion
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Quick lookup maps
  const { rootRegions, childrenMap } = useMemo(() => {
    const roots: Region[] = [];
    const children = new Map<string, Region[]>();

    for (const r of allRegions) {
      if (!r.parentId) {
        roots.push(r);
      } else {
        const pid = padId(r.parentId);
        const list = children.get(pid) || [];
        list.push(r);
        children.set(pid, list);
      }
    }

    return { rootRegions: roots, childrenMap: children };
  }, [allRegions]);

  // Sort helper
  const sortRegions = useCallback((list: Region[]): Region[] => {
    const sorted = [...list];
    sorted.sort((a, b) => {
      const aId = padId(a.id);
      const bId = padId(b.id);
      const aScore = allScores[aId] || getRegionScoreById(aId);
      const bScore = allScores[bId] || getRegionScoreById(bId);

      const aName = a.nameKo || a.name || a.iso3 || a.id || "";
      const bName = b.nameKo || b.name || b.iso3 || b.id || "";

      if (sortType === "name") {
        return aName.localeCompare(bName);
      } else if (sortType === "visits") {
        const aVis = aScore?.hasVisit ? 1 : 0;
        const bVis = bScore?.hasVisit ? 1 : 0;
        if (aVis !== bVis) return bVis - aVis;
        return (bScore?.directScore ?? 0) - (aScore?.directScore ?? 0);
      } else {
        const aTot = aScore?.totalScore ?? 0;
        const bTot = bScore?.totalScore ?? 0;
        if (bTot !== aTot) return bTot - aTot;
        return aName.localeCompare(bName);
      }
    });
    return sorted;
  }, [allScores, getRegionScoreById, sortType]);

  // Sorted roots
  const sortedRoots = useMemo(() => {
    let list = rootRegions;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = rootRegions.filter(r => {
        const name = (r.name || "").toLowerCase();
        const nameKo = (r.nameKo || "").toLowerCase();
        if (name.includes(q) || nameKo.includes(q)) return true;
        const cList = childrenMap.get(padId(r.id)) || [];
        return cList.some(c => {
          const cName = (c.name || "").toLowerCase();
          const cNameKo = (c.nameKo || "").toLowerCase();
          return cName.includes(q) || cNameKo.includes(q);
        });
      });
    }
    return sortRegions(list);
  }, [rootRegions, searchQuery, childrenMap, sortRegions]);

  const getAllDescendants = useCallback((regionId: string): string[] => {
    const pId = padId(regionId);
    const ids = [pId];
    const queue = [pId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = childrenMap.get(current) || [];
      for (const c of children) {
        const cId = padId(c.id);
        ids.push(cId);
        queue.push(cId);
      }
    }
    return ids;
  }, [childrenMap]);

  const handleToggleActive = useCallback((e: React.MouseEvent, regionId: string, isCurrentlyDisabled: boolean) => {
    e.stopPropagation();
    const ids = getAllDescendants(regionId);
    if (isCurrentlyDisabled) {
      for (const id of ids) setRegionDisabled(id, false);
    } else {
      for (const id of ids) setRegionDisabled(id, true);
    }
  }, [getAllDescendants, setRegionDisabled]);

  const disabledSet = useMemo(() => new Set(disabledRegionIds.map(padId)), [disabledRegionIds]);
  const allNodeIds = useMemo(() => allRegions.map(r => padId(r.id)), [allRegions]);

  return (
    <SidebarFrame
      icon={<Layers className="w-5 h-5 text-primary" />}
      title="지역 선택"
      subtitle="Region Selection"
      onClose={toggleLeftSidebar}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={clearAllRegionsDisabled}
            className="text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            전체 선택
          </button>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <button
            onClick={() => setAllRegionsDisabled(allNodeIds)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:underline cursor-pointer"
          >
            전체 해제
          </button>
        </div>
      }
      tabs={
        <SidebarSegmentTabs<SortType>
          options={[
            { id: "score", label: "점수순" },
            { id: "name", label: "가나다순" },
            { id: "visits", label: "방문순" },
          ]}
          activeId={sortType}
          onChange={setSortType}
        />
      }
    >
      {sortedRoots.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-center p-4">
          <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2 animate-bounce" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">일치하는 지역이 없습니다</p>
          <p className="text-[11px] text-slate-400 mt-1">다른 검색어로 찾아보세요.</p>
        </div>
      ) : (
        sortedRoots.map((country) => {
          const countryId = padId(country.id);
          const isCountryDisabled = disabledSet.has(countryId);
          const isCountryExpanded = expandedIds.has(countryId) || searchQuery.trim().length > 0;
          const score = allScores[countryId] || getRegionScoreById(countryId);
          const displayName = country.nameKo || country.name || country.iso3 || country.id;
          const percent = score ? Math.min(100, Math.max(0, score.rateScore || 0)) : 0;
          const prefChildren = isCountryExpanded ? sortRegions(childrenMap.get(countryId) || []) : [];

          return (
            <div
              key={countryId}
              className={`shrink-0 rounded-2xl border transition-all duration-200 overflow-hidden ${
                isCountryDisabled
                  ? "border-slate-100 dark:border-slate-800/40 bg-slate-50/40 dark:bg-slate-900/30 opacity-60"
                  : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md"
              }`}
            >
              {/* Country Group Header */}
              <div
                className="p-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                onClick={() => toggleExpand(countryId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      role="checkbox"
                      aria-checked={!isCountryDisabled}
                      onClick={(e) => handleToggleActive(e, countryId, isCountryDisabled)}
                      className="relative flex items-center justify-center shrink-0 cursor-pointer rounded-lg size-4"
                    >
                      <input
                        type="checkbox"
                        checked={!isCountryDisabled}
                        readOnly
                        tabIndex={-1}
                        className="peer appearance-none size-4 rounded border border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary shrink-0 transition-all pointer-events-none cursor-pointer"
                      />
                      <Check className="absolute pointer-events-none text-[10px] text-white scale-0 peer-checked:scale-100 transition-transform font-black w-3 h-3 stroke-[3]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            jumpToRegion(country.id, allRegions);
                          }}
                          className={`text-xs font-bold truncate hover:text-primary transition-colors ${
                            isCountryDisabled
                              ? "text-slate-400 dark:text-slate-500 line-through"
                              : "text-slate-800 dark:text-white"
                          }`}
                        >
                          {displayName}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                          {country.iso3 || "Country"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {score && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-primary tabular-nums">
                          {score.totalScore}p
                        </span>
                        {score.rateScore > 0 && (
                          <span className="text-xs font-black text-orange-500 dark:text-orange-400 tabular-nums">
                            {Math.round(score.rateScore)}%
                          </span>
                        )}
                      </div>
                    )}
                    <div className="p-0.5 text-slate-400">
                      {isCountryExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {score && (
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full transition-all duration-300 bg-orange-500 dark:bg-orange-400"
                      style={{
                        width: `${percent}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Level 2: Prefectures */}
              {isCountryExpanded && prefChildren.length > 0 && (
                <div className="pl-6 pr-3 pb-3 pt-1 space-y-1 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/40">
                  {prefChildren.map((pref) => {
                    const prefId = padId(pref.id);
                    const isPrefDisabled = isCountryDisabled || disabledSet.has(prefId);
                    const isPrefExpanded = expandedIds.has(prefId) || searchQuery.trim().length > 0;
                    const prefScore = allScores[prefId] || getRegionScoreById(prefId);
                    const prefName = pref.nameKo || pref.name || pref.id;
                    const cityChildren = isPrefExpanded ? sortRegions(childrenMap.get(prefId) || []) : [];
                    const hasSubChildren = (childrenMap.get(prefId) || []).length > 0;

                    return (
                      <div key={prefId} className="flex flex-col">
                        <div
                          className="flex items-center justify-between p-1.5 hover:bg-white dark:hover:bg-slate-800/80 rounded-xl cursor-pointer transition-all"
                          onClick={() => toggleExpand(prefId)}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {hasSubChildren ? (
                              <div className="p-0.5 text-slate-400">
                                {isPrefExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </div>
                            ) : (
                              <span className="w-4" />
                            )}

                            <div
                              role="checkbox"
                              aria-checked={!isPrefDisabled}
                              onClick={(e) => handleToggleActive(e, prefId, isPrefDisabled)}
                              className="relative flex items-center justify-center shrink-0 cursor-pointer rounded size-3.5"
                            >
                              <input
                                type="checkbox"
                                checked={!isPrefDisabled}
                                readOnly
                                tabIndex={-1}
                                className="peer appearance-none size-3.5 rounded border border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary shrink-0 transition-all pointer-events-none cursor-pointer"
                              />
                              <Check className="absolute pointer-events-none text-[8px] text-white scale-0 peer-checked:scale-100 transition-transform font-black w-2.5 h-2.5 stroke-[3]" />
                            </div>

                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                jumpToRegion(pref.id, allRegions);
                              }}
                              className={`text-xs font-semibold truncate hover:text-primary ${
                                isPrefDisabled
                                  ? "text-slate-400 line-through"
                                  : "text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              {prefName}
                            </span>
                          </div>

                          {prefScore && (
                            <div className="flex items-center gap-1.5 shrink-0 ml-1">
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                                {prefScore.totalScore}p
                              </span>
                              {prefScore.rateScore > 0 && (
                                <span className="text-[10px] font-bold text-orange-500 dark:text-orange-400 tabular-nums">
                                  {Math.round(prefScore.rateScore)}%
                                </span>
                              )}
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: getScoreColor(prefScore.totalScore) }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Level 3: Cities */}
                        {isPrefExpanded && cityChildren.length > 0 && (
                          <div className="pl-7 pr-1 py-1 space-y-1">
                            {cityChildren.map((city) => {
                              const cityId = padId(city.id);
                              const isCityDisabled = isPrefDisabled || disabledSet.has(cityId);
                              const cityScore = allScores[cityId] || getRegionScoreById(cityId);
                              const cityName = city.nameKo || city.name || city.id;

                              return (
                                <div
                                  key={cityId}
                                  className="flex items-center justify-between py-1 px-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div
                                      role="checkbox"
                                      aria-checked={!isCityDisabled}
                                      onClick={(e) => handleToggleActive(e, cityId, isCityDisabled)}
                                      className="relative flex items-center justify-center shrink-0 cursor-pointer rounded size-3"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={!isCityDisabled}
                                        readOnly
                                        tabIndex={-1}
                                        className="peer appearance-none size-3 rounded border border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary shrink-0 transition-all pointer-events-none cursor-pointer"
                                      />
                                      <Check className="absolute pointer-events-none text-[7px] text-white scale-0 peer-checked:scale-100 transition-transform font-black w-2 h-2 stroke-[3]" />
                                    </div>

                                    <span
                                      onClick={() => jumpToRegion(city.id, allRegions)}
                                      className={`truncate cursor-pointer hover:text-primary ${
                                        isCityDisabled
                                          ? "text-slate-400 line-through"
                                          : "text-slate-600 dark:text-slate-300"
                                      }`}
                                    >
                                      {cityName}
                                    </span>
                                  </div>

                                  {cityScore && cityScore.hasVisit && (
                                    <div
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: getScoreColor(cityScore.totalScore) }}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </SidebarFrame>
  );
}
