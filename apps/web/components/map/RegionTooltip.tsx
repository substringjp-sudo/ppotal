import { memo } from "react";
import { VISIT_CATEGORY_ORDER, VISIT_CONFIG } from "@regionevel/types";
import type { Region, RegionScore, VisitCategory } from "@regionevel/types";

interface RegionTooltipProps {
  region: Region;
  score: RegionScore;
  childRegions: Region[];
  mousePos: { x: number; y: number } | null;
  isMobile: boolean;
  scoringMode: "individual" | "cumulative";
  onClose: () => void;
  onDrillDown: (regionId: string) => void;
  onVisitSet: (category: VisitCategory, count: number) => void;
}
 
export const RegionTooltip = memo(function RegionTooltip({
  region,
  score,
  childRegions,
  mousePos,
  isMobile,
  scoringMode,
  onClose,
  onDrillDown,
  onVisitSet,
}: RegionTooltipProps) {
  // Calculate position to stay within viewport (Desktop)
  const tooltipWidth = 320;
  const tooltipHeight = 450; 
  
  const desktopStyle: React.CSSProperties = mousePos
    ? (() => {
        const winW = typeof window !== "undefined" ? window.innerWidth : 0;
        const winH = typeof window !== "undefined" ? window.innerHeight : 0;
        
        // Dynamic height based on content
        const idealHeight = 580;
        const actualHeight = Math.min(idealHeight, winH - 60);
        
        let left = mousePos.x + 20;
        if (left + tooltipWidth > winW - 20) {
          left = mousePos.x - tooltipWidth - 20;
        }
        left = Math.max(20, Math.min(left, winW - tooltipWidth - 20));

        let top = mousePos.y + 20;
        if (top + actualHeight > winH - 20) {
          top = mousePos.y - actualHeight - 20;
        }
        top = Math.max(20, Math.min(top, winH - actualHeight - 20));

        return {
          position: "fixed",
          left,
          top,
          height: actualHeight,
          zIndex: 2000,
        };
      })()
    : {
        position: "fixed",
        bottom: "1.5rem",
        left: "50%",
        transform: "translateX(-50%)",
        height: 580,
        zIndex: 2000,
      };

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
          bg-white shadow-2xl overflow-hidden flex flex-col border border-slate-200
          ${isMobile 
            ? "rounded-t-2xl animate-in slide-in-from-bottom duration-400 ease-out w-full max-h-[90vh]" 
            : "w-80 rounded-lg animate-in fade-in zoom-in duration-200"
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
          <div>
            <p className="font-black text-lg leading-tight text-slate-800">{region.name}</p>
            <p className="text-[9px] mt-1 font-black uppercase tracking-widest text-slate-400">
              {region.iso3} · {region.admLevel === 0 ? "National" : region.admLevel === 1 ? "Regional" : "Local"}
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

        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Experience</span>
            <p className={`text-xl font-black tabular-nums ${scoringMode === 'individual' ? 'text-blue-600' : 'text-slate-400'}`}>
              {score.totalScore}
            </p>
          </div>
          <div className="h-6 w-[1px] bg-slate-100" />
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Cumulative</span>
            <p className={`text-xl font-black tabular-nums ${scoringMode === 'cumulative' ? 'text-orange-600' : 'text-slate-400'}`}>
              {score.cumulativeScore ?? 0}
            </p>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto ${isMobile ? "px-6 pb-8" : "px-4 pb-4"}`}>
          {/* Score breakdown */}
          <div className="space-y-3.5 pt-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Visit History</p>
            {VISIT_CATEGORY_ORDER.map((cat) => {
              const cfg = VISIT_CONFIG[cat];
              const b = score.breakdown[cat];
              return (
                <div key={cat} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-baseline gap-2 overflow-hidden mr-2">
                      <span className="text-sm font-bold text-slate-700 whitespace-nowrap shrink-0">{cfg.label}</span>
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap truncate">
                        {cfg.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.effectiveCount > b.directCount && (
                        <span className={`text-[9px] font-black ${scoringMode === "cumulative" ? "text-orange-400 bg-orange-50" : "text-slate-400 bg-slate-100"} px-1.5 py-0.5 rounded-full`}>
                          +{b.effectiveCount - b.directCount} sub
                        </span>
                      )}
                      <span className={`text-[10px] font-black ${scoringMode === "cumulative" ? "text-orange-600 bg-orange-50" : "text-blue-600 bg-blue-50"} px-2 py-0.5 rounded-full`}>
                        {b.points} pts
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex gap-1.5 h-4 items-center cursor-pointer">
                      {Array.from({ length: cfg.maxCount }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => onVisitSet(cat, i + 1 === b.directCount ? i : i + 1)}
                          className={`flex-1 h-2 rounded-full transition-all duration-300 hover:scale-y-125 ${
                            i < b.directCount 
                              ? (scoringMode === "cumulative" ? "bg-orange-600 shadow-sm shadow-orange-200" : "bg-blue-600 shadow-sm shadow-blue-200")
                              : i < b.effectiveCount
                                ? (scoringMode === "cumulative" ? "bg-orange-200" : "bg-blue-200")
                                : "bg-slate-100"
                          }`}
                          title={`${i + 1} visits`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onVisitSet(cat, Math.max(0, b.directCount - 1))}
                        disabled={b.directCount <= 0}
                        className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-20 text-slate-600 font-black text-base flex items-center justify-center transition-all border border-slate-100 active:scale-95"
                      >
                        −
                      </button>
                      <button
                        onClick={() => onVisitSet(cat, Math.min(cfg.maxCount, b.directCount + 1))}
                        disabled={b.directCount >= cfg.maxCount}
                        className={`w-7 h-7 rounded-lg ${scoringMode === "cumulative" ? "bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-100" : "bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-100"} disabled:opacity-20 font-black text-base flex items-center justify-center transition-all border active:scale-95`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {score.aggregatedChildScore > 0 && (
              <div className="flex justify-between items-center bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100 mt-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sub-region Weight</span>
                <span className="text-sm font-black text-slate-800">+{score.aggregatedChildScore} pts</span>
              </div>
            )}
          </div>
        </div>

        {/* Drill down action - Always visible at bottom */}
        {childRegions.length > 0 && (
          <div className={`shrink-0 ${isMobile ? "px-6 pb-8 pt-2 bg-white border-t border-gray-50" : "px-4 pb-4 pt-2"}`}>
            <button
              onClick={() => onDrillDown(region.id)}
              className={`w-full py-4 ${scoringMode === "cumulative" ? "bg-orange-600 hover:bg-orange-700 shadow-orange-200" : "bg-slate-900 hover:bg-slate-800 shadow-slate-200"} text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Explore {region.name}
            </button>
          </div>
        )}
      </div>
    </>
  );
});
