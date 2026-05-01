import { memo } from "react";
import { VISIT_CATEGORY_ORDER, VISIT_CONFIG } from "@regionevel/types";
import type { Region, RegionScore, VisitCategory } from "@regionevel/types";

interface RegionTooltipProps {
  region: Region;
  score: RegionScore;
  children: Region[];
  mousePos: { x: number; y: number } | null;
  isMobile: boolean;
  onClose: () => void;
  onDrillDown: (regionId: string) => void;
  onVisitSet: (category: VisitCategory, count: number) => void;
}

export const RegionTooltip = memo(function RegionTooltip({
  region,
  score,
  children,
  mousePos,
  isMobile,
  onClose,
  onDrillDown,
  onVisitSet,
}: RegionTooltipProps) {
  // Calculate position to stay within viewport (Desktop)
  const tooltipWidth = 320;
  const tooltipHeight = 450; 
  
  const desktopStyle: React.CSSProperties = mousePos
    ? {
        position: "fixed",
        left: mousePos.x + tooltipWidth + 20 > (typeof window !== "undefined" ? window.innerWidth : 0)
          ? mousePos.x - tooltipWidth - 20
          : mousePos.x + 20,
        top: mousePos.y + tooltipHeight + 20 > (typeof window !== "undefined" ? window.innerHeight : 0)
          ? Math.max(20, mousePos.y - tooltipHeight - 20)
          : Math.min(mousePos.y + 20, (typeof window !== "undefined" ? window.innerHeight : 0) - 100),
        zIndex: 2000,
      }
    : {
        position: "fixed",
        bottom: "1.5rem",
        left: "50%",
        transform: "translateX(-50%)",
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
          bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-gray-100 overflow-hidden flex flex-col
          ${isMobile 
            ? "rounded-t-[2.5rem] animate-in slide-in-from-bottom duration-300 ease-out w-full max-h-[90vh]" 
            : "w-80 rounded-2xl border border-gray-200 animate-in fade-in zoom-in duration-200"
          }
        `}
      >
        {/* Mobile Handle */}
        {isMobile && (
          <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </div>
        )}

        <div className={`flex items-center justify-between px-6 py-4 ${isMobile ? "bg-white" : "bg-blue-600 text-white"} shrink-0`}>
          <div>
            <p className={`font-black text-lg leading-tight ${isMobile ? "text-slate-900" : "text-white"}`}>{region.name}</p>
            <p className={`text-xs mt-0.5 font-bold uppercase tracking-wider ${isMobile ? "text-slate-400" : "text-blue-200"}`}>
              {region.iso3} · {region.admLevel === 0 ? "National" : region.admLevel === 1 ? "Regional" : "Local"}
            </p>
          </div>
          <div className="text-right flex items-center gap-3">
            <div className="flex flex-col items-end">
              <p className={`text-3xl font-black leading-none ${isMobile ? "text-blue-600" : "text-white"}`}>{score.totalScore}</p>
              <p className={`text-[10px] mt-1 uppercase font-black tracking-[0.2em] ${isMobile ? "text-slate-400" : "text-blue-200"}`}>Points</p>
            </div>
            {!isMobile && (
              <button
                onClick={onClose}
                className="ml-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className={`overflow-y-auto no-scrollbar ${isMobile ? "max-h-[60vh] px-6 pb-8" : "max-h-[400px] px-4 pb-4"}`}>
          {/* Score breakdown */}
          <div className="space-y-5 pt-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Visit History</p>
            {VISIT_CATEGORY_ORDER.map((cat) => {
              const cfg = VISIT_CONFIG[cat];
              const b = score.breakdown[cat];
              return (
                <div key={cat} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{cfg.label}</span>
                      <span className="text-[10px] text-slate-400 font-medium leading-tight">
                        {cfg.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.effectiveCount > b.directCount && (
                        <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                          +{b.effectiveCount - b.directCount} sub
                        </span>
                      )}
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
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
                              ? "bg-blue-600 shadow-sm shadow-blue-200" 
                              : i < b.effectiveCount
                                ? "bg-blue-200"
                                : "bg-slate-100"
                          }`}
                          title={`${i + 1} visits`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onVisitSet(cat, Math.max(0, b.directCount - 1))}
                        disabled={b.directCount <= 0}
                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-20 text-slate-600 font-black text-lg flex items-center justify-center transition-all border border-slate-100 active:scale-95"
                      >
                        −
                      </button>
                      <button
                        onClick={() => onVisitSet(cat, Math.min(cfg.maxCount, b.directCount + 1))}
                        disabled={b.directCount >= cfg.maxCount}
                        className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 disabled:opacity-20 text-blue-600 font-black text-lg flex items-center justify-center transition-all border border-blue-100 active:scale-95"
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
        {children.length > 0 && (
          <div className={`shrink-0 ${isMobile ? "px-6 pb-8 pt-2 bg-white border-t border-gray-50" : "px-4 pb-4 pt-2"}`}>
            <button
              onClick={() => onDrillDown(region.id)}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 active:scale-[0.98]"
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
