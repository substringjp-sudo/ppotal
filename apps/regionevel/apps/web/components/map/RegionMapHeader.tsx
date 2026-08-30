"use client";

import React, { memo, useMemo, useCallback } from "react";
import { MapSubHeader, SubHeaderStatsGroup, SubHeaderBreadcrumb } from "@ppotal/ui";
import type { SubHeaderStatItem, BreadcrumbSegment } from "@ppotal/ui";
import { Layers, History, Globe, MapPin, Building, Flame } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { useVisitStore } from "@/store/visitStore";
import { padId } from "@regionevel/utils";
import type { Region, VisitCategory } from "@regionevel/types";
import { VISIT_CATEGORY_ORDER } from "@regionevel/types";
import { getAncestors } from "@/lib/regions";

export interface RegionMapHeaderProps {
  className?: string;
}

export const RegionMapHeader: React.FC<RegionMapHeaderProps> = memo(({ className = "" }) => {
  const {
    level,
    currentId,
    history,
    drillUp,
    reset,
    viewLevel,
    setViewLevel,
    leftSidebarOpen,
    rightDrawerOpen,
    toggleLeftSidebar,
    toggleRightDrawer,
  } = useMapStore();

  const {
    visits,
    scores: allScores,
    allRegions,
  } = useVisitStore();

  const regionsByIdMap = useMemo(() => {
    const map = new Map<string, Region>();
    for (const r of allRegions) {
      map.set(padId(r.id), r);
    }
    return map;
  }, [allRegions]);

  const currentRegion = currentId ? regionsByIdMap.get(currentId) : null;

  // Standard breadcrumb segments
  const breadcrumbSegments = useMemo<BreadcrumbSegment[]>(() => {
    if (!currentId) {
      return [{ label: "World", isActive: true }];
    }
    const ancestors = getAncestors(allRegions, currentId);
    const self = regionsByIdMap.get(currentId);

    const segments: BreadcrumbSegment[] = [
      {
        label: "World",
        onClick: () => reset(),
        isActive: false,
      }
    ];

    ancestors.forEach((anc) => {
      segments.push({
        label: anc.name,
        onClick: () => {
          const currentHistory = useMapStore.getState().history;
          const targetIndex = currentHistory.findIndex((h) => h.currentId === anc.id);
          if (targetIndex !== -1) {
            const pops = currentHistory.length - targetIndex;
            for (let j = 0; j < pops; j++) {
              useMapStore.getState().drillUp();
            }
          }
        },
        isActive: false,
      });
    });

    if (self) {
      segments.push({
        label: self.name,
        isActive: true,
      });
    }

    return segments;
  }, [allRegions, currentId, regionsByIdMap, reset]);

  const handleBack = useCallback(() => {
    drillUp();
  }, [drillUp]);

  const contextStats = useMemo(() => {
    const stats = {
      visitedCountries: 0,
      visitedPrefectures: 0,
      visitedCities: 0,
      currentTotalScore: 0,
      currentRateScore: 0,
    };

    const isWithinScope = (regionId: string) => {
      if (!currentId) return true;
      const id = padId(regionId);
      const targetId = padId(currentId);
      if (id === targetId) return true;

      const r = regionsByIdMap.get(id);
      if (!r) return false;

      if (padId(r.parentId) === targetId) return true;

      if (r.parentId) {
        const p = regionsByIdMap.get(padId(r.parentId));
        if (p && padId(p.parentId) === targetId) return true;
      }

      return false;
    };

    if (currentId) {
      const score = allScores[padId(currentId)];
      if (score) {
        stats.currentTotalScore = score.totalScore;
        stats.currentRateScore = score.rateScore;
      }
    } else {
      const countries = allRegions.filter((r) => r.parentId === null);
      let worldSum = 0;
      let worldMax = 0;
      for (const country of countries) {
        const s = allScores[padId(country.id)];
        if (s) {
          worldSum += s.totalScore;
          worldMax += 50;
        }
      }
      stats.currentRateScore = Math.ceil(worldMax > 0 ? Math.min(100, (worldSum / worldMax) * 100) : 0);
      stats.currentTotalScore = stats.currentRateScore;
    }

    for (const r of allRegions) {
      if (!isWithinScope(r.id)) continue;
      const s = allScores[padId(r.id)];
      if (s && s.hasVisit) {
        if (r.admLevel === 0) stats.visitedCountries++;
        else if (r.admLevel === 1) stats.visitedPrefectures++;
        else if (r.admLevel === 2) stats.visitedCities++;
      }
    }

    return stats;
  }, [currentId, allScores, allRegions, regionsByIdMap]);

  // Unified stats items
  const statItems = useMemo<SubHeaderStatItem[]>(() => [
    {
      key: "countries",
      icon: <Globe className="w-3.5 h-3.5" />,
      label: "Countries",
      value: contextStats.visitedCountries,
    },
    {
      key: "regions",
      icon: <MapPin className="w-3.5 h-3.5" />,
      label: "Regions",
      value: contextStats.visitedPrefectures,
    },
    {
      key: "cities",
      icon: <Building className="w-3.5 h-3.5" />,
      label: "Cities",
      value: contextStats.visitedCities,
    },
    {
      key: "rate",
      icon: <Flame className="w-3.5 h-3.5" />,
      label: "Rate",
      value: `${Math.ceil(contextStats.currentRateScore)}%`,
      highlight: true,
    },
  ], [contextStats]);

  return (
    <MapSubHeader
      className={className}
      isLeftOpen={leftSidebarOpen}
      onToggleLeft={toggleLeftSidebar}
      leftTooltip={leftSidebarOpen ? "지역 계층 접기" : "지역 계층 펼치기"}
      leftIcon={<Layers className="w-4 h-4" />}
      isRightOpen={rightDrawerOpen}
      onToggleRight={toggleRightDrawer}
      rightTooltip={rightDrawerOpen ? "방문 내역 접기" : "방문 내역 펼치기"}
      rightIcon={<History className="w-4 h-4" />}
      breadcrumb={
        <SubHeaderBreadcrumb
          segments={breadcrumbSegments}
          onBack={history.length > 0 ? handleBack : undefined}
          backTooltip="상위 지역으로 이동"
        />
      }
      centerContent={
        <div className="flex items-center gap-4 min-w-0">
          <div className="shrink-0 flex flex-col justify-center">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
              {currentRegion ? "Selected Region" : "Global Overview"}
            </span>
            <h3 className="text-xs font-black text-slate-800 dark:text-white leading-none truncate max-w-[220px]">
              {currentRegion ? currentRegion.name : "전 세계 지도"}
            </h3>
          </div>

          {level === "country" && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 no-export">
              <button
                onClick={() => setViewLevel(1)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewLevel === 1
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-600"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                PREFECTURE
              </button>
              <button
                onClick={() => setViewLevel(2)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewLevel === 2
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-600"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                CITY
              </button>
            </div>
          )}
        </div>
      }
      statsContent={<SubHeaderStatsGroup items={statItems} />}
    />
  );
});

RegionMapHeader.displayName = "RegionMapHeader";
