"use client";

import React, { useState, useMemo } from "react";
import { useVisitStore } from "@/store/visitStore";
import { useMapStore } from "@/store/mapStore";
import { SidebarFrame, TimelineIcon, ProgressCard } from "@ppotal/ui";
import { 
  History, MapPin, Globe, Landmark, Sparkles, Footprints, 
  Car, Eye, Home as HomeIcon, Building2, ChevronRight, Trash2
} from "lucide-react";
import { VISIT_CONFIG, VISIT_CATEGORY_ORDER } from "@regionevel/types";
import type { VisitCategory, Region, RegionVisit } from "@regionevel/types";
import { padId } from "@regionevel/utils";
import { TimelineImportModal } from "@/components/common/TimelineImportModal";

const CATEGORY_ICONS: Record<VisitCategory, React.ElementType> = {
  residence: HomeIcon,
  stay: Building2,
  visit: Footprints,
  transit: Car,
  pass: Eye,
};

export function MyVisitsPane() {
  const { visits, allRegions, scores: allScores, stats: storeStats, clearRegionVisits, clearAllVisits } = useVisitStore();
  const { toggleRightDrawer, jumpToRegion } = useMapStore();

  const [selectedCategory, setSelectedCategory] = useState<VisitCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTimelineImportOpen, setIsTimelineImportOpen] = useState(false);
  const [isResetConfirming, setIsResetConfirming] = useState(false);

  React.useEffect(() => {
    if (visits.length === 0) {
      setIsResetConfirming(false);
    }
  }, [visits.length]);

  const regionsById = useMemo(() => {
    const map = new Map<string, Region>();
    for (const r of allRegions) {
      map.set(padId(r.id), r);
    }
    return map;
  }, [allRegions]);

  const visitedRegionsList = useMemo(() => {
    const map = new Map<string, { region: Region; visits: RegionVisit[]; totalExp: number }>();
    
    for (const v of visits) {
      if (v.count > 0) {
        const id = padId(v.regionId);
        const region = regionsById.get(id);
        if (!region) continue;

        if (!map.has(id)) {
          const s = allScores[id];
          map.set(id, {
            region,
            visits: [],
            totalExp: s ? s.totalScore : 0
          });
        }
        map.get(id)!.visits.push(v);
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.totalExp !== a.totalExp) return b.totalExp - a.totalExp;
      const aName = a.region.nameKo || a.region.name || "";
      const bName = b.region.nameKo || b.region.name || "";
      return aName.localeCompare(bName);
    });
  }, [visits, regionsById, allScores]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const cat of VISIT_CATEGORY_ORDER) {
      stats[cat] = 0;
    }
    const counted = new Set<string>();

    for (const v of visits) {
      if (v.count > 0 && VISIT_CATEGORY_ORDER.includes(v.category)) {
        const key = `${v.category}_${padId(v.regionId)}`;
        if (!counted.has(key)) {
          counted.add(key);
          stats[v.category] = (stats[v.category] || 0) + 1;
        }
      }
    }
    return stats;
  }, [visits]);

  const filteredItems = useMemo(() => {
    return visitedRegionsList.filter((item) => {
      if (selectedCategory !== "ALL") {
        const hasCategory = item.visits.some((v) => v.category === selectedCategory && v.count > 0);
        if (!hasCategory) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const name = (item.region.name || "").toLowerCase();
        const nameKo = (item.region.nameKo || "").toLowerCase();
        if (!name.includes(q) && !nameKo.includes(q)) return false;
      }
      return true;
    });
  }, [visitedRegionsList, selectedCategory, searchQuery]);

  const totalExp = useMemo(() => {
    let sum = 0;
    for (const s of Object.values(allScores)) {
      sum += s.totalScore || 0;
    }
    return sum;
  }, [allScores]);

  const totalProgressPercent = useMemo(() => {
    const maxWorldExp = 50 * (allRegions.filter(r => !r.parentId).length || 1);
    return Math.min(100, (totalExp / maxWorldExp) * 100);
  }, [totalExp, allRegions]);

  return (
    <>
      <SidebarFrame
        icon={<History className="w-5 h-5 text-primary" />}
        title="나의 여행 기록"
        subtitle="My Travels"
        onClose={toggleRightDrawer}
        headerExtra={
          <div className="space-y-3">
            {/* Timeline Import Action */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTimelineImportOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-95 cursor-pointer"
              >
                <TimelineIcon className="w-4 h-4" />
                <span>Google 타임라인 가져오기</span>
              </button>
            </div>

            {/* Progress Card */}
            <ProgressCard
              label="전체 진척도 (Total Progress)"
              percent={totalProgressPercent}
            >
              {/* 4 Grid Stats */}
              <div className="grid grid-cols-4 gap-1.5 w-full mt-1">
                <div className="flex flex-col items-center justify-center py-2 px-1 bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-xl border border-white/40 dark:border-white/5 overflow-hidden">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mb-0.5" />
                  <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{visitedRegionsList.length}</span>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">방문지</span>
                </div>
                <div className="flex flex-col items-center justify-center py-2 px-1 bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-xl border border-white/40 dark:border-white/5 overflow-hidden">
                  <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mb-0.5" />
                  <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{storeStats.visitedCountries}</span>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">국가</span>
                </div>
                <div className="flex flex-col items-center justify-center py-2 px-1 bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-xl border border-white/40 dark:border-white/5 overflow-hidden">
                  <Landmark className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mb-0.5" />
                  <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{storeStats.visitedPrefectures}</span>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">도/주</span>
                </div>
                <div className="flex flex-col items-center justify-center py-2 px-1 bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-xl border border-white/40 dark:border-white/5 overflow-hidden">
                  <Sparkles className="w-3.5 h-3.5 text-primary mb-0.5" />
                  <span className="text-xs font-black text-primary tabular-nums">{totalExp}</span>
                  <span className="text-[8px] font-bold text-primary uppercase">EXP</span>
                </div>
              </div>
            </ProgressCard>

            {/* Clear All Visits button & Confirmation dialog */}
            {visits.length > 0 && (
              <div>
                {!isResetConfirming ? (
                  <button
                    onClick={() => setIsResetConfirming(true)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-98 cursor-pointer py-2 text-xs font-bold transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>모든 방문 기록 초기화</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/30 flex flex-col gap-2 animate-in fade-in duration-200">
                    <p className="text-xs font-bold text-red-700 dark:text-red-300 text-center">
                      모든 방문 기록을 정말 삭제하시겠습니까?
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={() => {
                          clearAllVisits();
                          setIsResetConfirming(false);
                        }}
                        className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow py-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        예, 초기화
                      </button>
                      <button
                        onClick={() => setIsResetConfirming(false)}
                        className="rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold py-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
              <button
                onClick={() => setSelectedCategory("ALL")}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === "ALL"
                    ? "bg-primary text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50"
                }`}
              >
                전체 ({visitedRegionsList.length})
              </button>
              {VISIT_CATEGORY_ORDER.map((cat) => {
                const config = VISIT_CONFIG[cat];
                const count = categoryStats[cat] || 0;
                const Icon = CATEGORY_ICONS[cat];
                const isSelected = selectedCategory === cat;

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    <span>{config.label}</span>
                    <span className="text-[9px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        }
      >
        {filteredItems.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <Footprints className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2 animate-bounce" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">방문 기록이 없습니다</p>
            <p className="text-[11px] text-slate-400 mt-1">지도를 클릭하여 첫 방문을 기록해보세요!</p>
          </div>
        ) : (
          filteredItems.map(({ region, visits: regVisits, totalExp: regExp }) => {
            const displayName = region.nameKo || region.name;
            const primaryVisit = regVisits[0];
            const primaryCat = primaryVisit?.category as VisitCategory;
            const config = (primaryCat && VISIT_CONFIG[primaryCat]) ? VISIT_CONFIG[primaryCat] : VISIT_CONFIG.visit;
            const Icon = (primaryCat && CATEGORY_ICONS[primaryCat]) ? CATEGORY_ICONS[primaryCat] : Footprints;

            return (
              <div
                key={region.id}
                onClick={() => jumpToRegion(region.id, allRegions)}
                className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="size-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: config.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-primary transition-colors">
                        {displayName}
                      </h4>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase shrink-0">
                        {region.admLevel === 0 ? "Country" : region.admLevel === 1 ? "Pref" : "City"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[10px] font-semibold flex items-center gap-1"
                        style={{ color: config.color }}
                      >
                        {config.label} {primaryVisit && primaryVisit.count > 1 ? `(${primaryVisit.count}회)` : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-xs font-black text-primary tabular-nums">
                    {regExp}p
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`'${displayName}'의 방문 기록을 삭제하시겠습니까?`)) {
                        clearRegionVisits(region.id);
                      }
                    }}
                    title="기록 삭제"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer opacity-70 hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })
        )}
      </SidebarFrame>

      <TimelineImportModal
        isOpen={isTimelineImportOpen}
        onClose={() => setIsTimelineImportOpen(false)}
      />
    </>
  );
}
