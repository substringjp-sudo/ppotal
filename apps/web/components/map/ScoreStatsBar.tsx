import { memo } from "react";
import { VISIT_CONFIG, VISIT_CATEGORY_ORDER, type VisitCategory } from "@regionevel/types";

interface ScoreStats {
  totalVisited: number;
  passing: number;
  transit: number;
  visit: number;
  accommodation: number;
  residence: number;
  currentTotalScore: number;
  currentCumulativeScore: number;
}

interface ScoreStatsBarProps {
  stats: ScoreStats;
  isMobile: boolean;
  scoringMode: "individual" | "cumulative";
}

export const ScoreStatsBar = memo(function ScoreStatsBar({ 
  stats, 
  isMobile,
  scoringMode 
}: ScoreStatsBarProps) {
  const categories: Array<{ key: VisitCategory; color: string; label: string }> = [
    { key: "passing", color: "bg-slate-400", label: "Pass" },
    { key: "transit", color: "bg-cyan-400", label: "Tran" },
    { key: "visit", color: "bg-blue-500", label: "Visit" },
    { key: "accommodation", color: "bg-indigo-500", label: "Stay" },
    { key: "residence", color: "bg-violet-600", label: "Live" },
  ];

  return (
    <div className={`
      ${isMobile ? "" : "bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl rounded-full px-6 py-3"}
      flex items-center gap-4 transition-all duration-500 animate-in fade-in slide-in-from-top-4
    `}>
      {/* Region Count Section */}
      <div className="flex flex-col items-center justify-center border-r border-slate-200/60 pr-4 shrink-0">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Visited</span>
        <span className="text-xl font-black text-slate-800 tabular-nums leading-none">{stats.totalVisited}</span>
      </div>

      {/* Categories Grid - Better wrapping for side panel */}
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 flex-1 py-0.5`}>
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-center gap-1.5 group shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${cat.color} group-hover:scale-125 transition-transform shadow-sm`} />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-700 tabular-nums leading-none mb-0.5">{stats[cat.key]}</span>
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter leading-none">
                {isMobile ? cat.label : VISIT_CONFIG[cat.key].label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
