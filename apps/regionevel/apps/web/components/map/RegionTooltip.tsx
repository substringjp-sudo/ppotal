import { memo, useMemo, useState, useEffect } from "react";
import { VISIT_CATEGORY_ORDER, VISIT_CONFIG } from "@regionevel/types";
import type { Region, RegionScore, VisitCategory } from "@regionevel/types";
import { padId } from "@regionevel/utils";

interface RegionTooltipProps {
  region: Region;
  score: RegionScore;
  childRegions: Region[];
  scoreMap: Record<string, RegionScore>;
  mousePos: { x: number; y: number } | null;
  isMobile: boolean;
  onClose: () => void;
  onDrillDown: (regionId: string) => void;
  onVisitSet: (category: VisitCategory, count: number) => void;
}
 
export const RegionTooltip = memo(function RegionTooltip({
  region,
  score,
  childRegions,
  scoreMap,
  mousePos,
  isMobile,
  onClose,
  onDrillDown,
  onVisitSet,
}: RegionTooltipProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "manual">("summary");

  const subRegionStats = useMemo(() => {
    let visitedCount = 0;
    const categoryCounts: Record<VisitCategory, number> = {
      pass: 0,
      transit: 0,
      visit: 0,
      stay: 0,
      residence: 0,
    };
    
    if (childRegions.length > 0) {
      childRegions.forEach(child => {
        const s = scoreMap[padId(child.id)];
        if (s && s.totalScore > 0) {
          visitedCount++;
          VISIT_CATEGORY_ORDER.forEach(cat => {
            categoryCounts[cat] += s.breakdown?.[cat]?.effectiveCount || 0;
          });
        }
      });
    }
    
    return {
      visitedCount,
      totalCount: childRegions.length,
      categoryCounts,
    };
  }, [childRegions, scoreMap]);

  useEffect(() => {
    if (region.admLevel === 0) {
      setActiveTab("summary");
    } else {
      setActiveTab(childRegions.length > 0 ? "summary" : "manual");
    }
  }, [region.id, region.admLevel, childRegions.length]);

  const isReadOnly = (region.admLevel === 0 || region.admLevel === 1) && childRegions.length > 0;


  // Position fixed at the top-right corner (Desktop)
  const tooltipWidth = 320;
  
  const desktopStyle: React.CSSProperties = (() => {
    const winH = typeof window !== "undefined" ? window.innerHeight : 0;
    // Calculate appropriate max height to prevent overflow (margin 72px top + 32px bottom)
    const maxCardHeight = winH > 0 ? Math.max(300, winH - 104) : 580;
    
    return {
      position: "absolute",
      right: "1rem",
      top: "4.5rem",
      width: `${tooltipWidth}px`,
      maxHeight: `${maxCardHeight}px`,
      zIndex: 2000,
    };
  })();

  const mobileStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 3000,
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[2999] animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}
      
      <div
        style={isMobile ? mobileStyle : desktopStyle}
        className={`
          bg-white/95 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col border border-slate-200/80
          ${isMobile 
            ? "animate-in slide-in-from-bottom duration-400 ease-out w-full max-h-[90vh] rounded-t-[32px]" 
            : "w-80 animate-in fade-in zoom-in duration-200 rounded-2xl"
          }
        `}
      >
        {/* Mobile Handle */}
        {isMobile && (
          <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>
        )}

        <div className={`flex items-center justify-between px-5 py-4 shrink-0 border-b border-slate-100 bg-slate-50/50`}>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="font-black text-lg leading-tight text-slate-800">{region.name}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 shrink-0 shadow-sm">
                  EXP {Math.round(score.directScore)}
                </span>
                {region.admLevel !== 2 && (
                  <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 shrink-0 shadow-sm">
                    Rate {Math.ceil(score.rateScore)}%
                  </span>
                )}
              </div>
            </div>
            <p className="text-[9px] mt-1 font-black uppercase tracking-widest text-slate-400">
              {region.iso3} · {region.admLevel === 0 ? "Country" : region.admLevel === 1 ? "Region" : "City"}
            </p>
          </div>
          {!isMobile && (
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded bg-white border border-slate-200 hover:bg-slate-50 transition-all text-slate-400"
              aria-label="Close"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {region.admLevel === 1 && (
          <div className="flex items-center justify-between px-5 py-2 border-b border-slate-50 bg-white shrink-0">
            <button 
              onClick={() => setActiveTab(activeTab === "summary" ? "manual" : "summary")}
              className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {activeTab === "summary" ? "Summary" : "Visit History"}
            </span>
            <button 
              onClick={() => setActiveTab(activeTab === "summary" ? "manual" : "summary")}
              className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto ${isMobile ? "px-6" : "px-5"} ${region.admLevel === 2 ? "pb-2" : "pb-4"}`}>
          {activeTab === "summary" && subRegionStats && (
            <div className="pt-4 pb-2">
               <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-100 mb-5">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Rate</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-2xl font-black tabular-nums text-orange-600">
                          {Math.ceil(score.rateScore)}<span className="text-sm ml-0.5">%</span>
                        </p>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-orange-300 ml-2 bg-white px-2 py-0.5 rounded-full border border-orange-100">
                          <span className="text-orange-500">{Math.round(score.childSum)}</span>
                          <span>/</span>
                          <div className="flex items-center">
                            <span className="text-orange-400/80">{Math.round(score.childMax / 50)}</span>
                            <span className="mx-0.5 text-[8px] text-orange-300">×</span>
                            <span>50</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {region.admLevel === 0 ? "Regions" : "Cities"}
                        </p>
                        <p className="text-[11px] font-bold tabular-nums text-slate-600">
                          {subRegionStats.visitedCount}<span className="text-[9px] text-slate-400 mx-0.5">/</span>{subRegionStats.totalCount}
                        </p>
                      </div>
                      {region.admLevel === 0 && score.cityStats && (
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Cities
                          </p>
                          <p className="text-[11px] font-bold tabular-nums text-slate-600">
                            {score.cityStats.visitedCount}<span className="text-[9px] text-slate-400 mx-0.5">/</span>{score.cityStats.totalCount}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-orange-100/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(251,146,60,0.3)]"
                      style={{ width: `${score.rateScore}%` }}
                    />
                  </div>
               </div>

                <div className="grid grid-cols-5 gap-1.5 mb-5">

                 {VISIT_CATEGORY_ORDER.map(cat => {
                   const count = subRegionStats.categoryCounts[cat];
                   const cfg = VISIT_CONFIG[cat];
                   return (
                     <div key={cat} className="flex flex-col items-center">
                        <div className={`w-full py-1.5 border ${count > 0 ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/50 border-slate-100 opacity-40'} flex flex-col items-center transition-all`}>
                         <span className="text-xs font-black text-slate-800 tabular-nums">{count}</span>
                         <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">{cfg.label.slice(0, 4)}</span>
                       </div>
                     </div>
                   );
                 })}
               </div>

               <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between mb-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
                    {region.admLevel === 0 ? "Status by Region" : "Status by City"}
                  </p>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {childRegions
                    .map(child => {
                      const childId = padId(child.id);
                      return {
                        ...child,
                        score: scoreMap[childId]
                      };
                    })
                    .filter(c => c.score && c.score.totalScore > 0)
                    .sort((a, b) => (b.score?.totalScore || 0) - (a.score?.totalScore || 0))
                    .map(child => (
                      <div 
                        key={child.id} 
                        className="flex flex-col gap-1.5 group/item p-2 rounded-lg hover:bg-slate-50 transition-all cursor-pointer border border-transparent hover:border-slate-100"
                        onClick={() => onDrillDown(child.id)}
                      >
                        <div className="flex justify-between items-end px-1">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-700 truncate max-w-[180px] leading-tight group-hover/item:text-blue-600 transition-colors">{child.name}</span>
                            <span className="text-[9px] font-bold text-slate-400">
                              {child.admLevel < 2 ? `Rate ${child.score!.rateScore}% · ` : ""}Base {child.score!.directScore}
                            </span>
                          </div>
                          <span className={`text-xs font-black tabular-nums ${child.score!.scoreType === 'orange' ? 'text-orange-500' : 'text-blue-500'}`}>
                            {Math.round(child.score!.totalScore)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
                          <div 
                            className={`absolute inset-y-0 left-0 transition-all duration-500 rounded-full ${child.score!.scoreType === 'orange' ? 'bg-orange-500' : 'bg-blue-500'}`}
                            style={{ width: `${child.score!.totalScore}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  {childRegions.filter(child => {
                    const childId = padId(child.id);
                    return !scoreMap[childId] || scoreMap[childId].totalScore === 0;
                  }).length > 0 && (
                    <div className="text-[10px] text-slate-400 font-bold pt-1.5 px-2.5">
                      + {childRegions.filter(child => {
                        const childId = padId(child.id);
                        return !scoreMap[childId] || scoreMap[childId].totalScore === 0;
                      }).length} unvisited areas
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "manual" && (
            <div className="space-y-3.5 pt-2">
              {region.admLevel > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Visit History</p>
                    {isReadOnly && (
                      <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-tighter animate-pulse">
                        Summed from sub-regions
                      </span>
                    )}
                  </div>
                  {VISIT_CATEGORY_ORDER.map((cat) => {
                    const cfg = VISIT_CONFIG[cat];
                    const b = score?.breakdown?.[cat] || { directCount: 0, effectiveCount: 0, points: 0 };
                    const isMaxed = b.directCount >= cfg.maxCount;
                    const displayCount = isReadOnly ? b.effectiveCount : b.directCount;
                    
                    return (
                      <div key={cat} className={`group ${isReadOnly ? 'opacity-90' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-baseline gap-2 overflow-hidden mr-2">
                            <span className="text-sm font-bold text-slate-700 whitespace-nowrap shrink-0">{cfg.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full`}>
                              {b?.points || 0} pts
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`flex-1 flex gap-1.5 h-4 items-center ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                            {Array.from({ length: cfg.maxCount }, (_, i) => (
                              <div
                                key={i}
                                onClick={() => !isReadOnly && onVisitSet(cat, i + 1 === displayCount ? i : i + 1)}
                                className={`flex-1 h-2 rounded-full transition-all duration-300 ${!isReadOnly ? 'hover:scale-y-125' : ''} ${
                                  i < displayCount 
                                    ? "bg-blue-600 shadow-sm shadow-blue-200"
                                    : "bg-slate-100"
                                }`}
                              />
                            ))}
                          </div>
                          {!isReadOnly && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => onVisitSet(cat, Math.max(0, (b?.directCount || 0) - 1))}
                                disabled={(b?.directCount || 0) <= 0}
                                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-20 text-slate-600 font-black text-base flex items-center justify-center transition-all border border-slate-100 active:scale-95"
                              >
                                −
                              </button>
                              <button
                                onClick={() => onVisitSet(cat, Math.min(cfg.maxCount, (b?.directCount || 0) + 1))}
                                disabled={(b?.directCount || 0) >= cfg.maxCount}
                                className={`w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-100 disabled:opacity-20 font-black text-base flex items-center justify-center transition-all border active:scale-95`}
                              >
                                +
                              </button>
                            </div>
                          )}
                          {isReadOnly && (
                            <div className="w-15 h-7 flex items-center justify-center">
                              <span className="text-xs font-black text-slate-400 tabular-nums">
                                {displayCount} / {cfg.maxCount}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {region.admLevel < 2 && (
          <div className={`shrink-0 ${isMobile ? "px-6 pb-8 pt-2 bg-white border-t border-gray-50" : "px-4 pb-4 pt-2"}`}>
            <button
              onClick={() => onDrillDown(padId(region.id))}
              className={`w-full py-3.5 ${score.scoreType === "orange" ? "bg-orange-600 hover:bg-orange-700 shadow-orange-200" : "bg-slate-900 hover:bg-slate-800 shadow-slate-200"} text-white text-sm font-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Explore
            </button>
          </div>
        )}
      </div>
    </>
  );
});
