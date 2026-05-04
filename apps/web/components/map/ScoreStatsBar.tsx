import { memo } from "react";
import { VISIT_CONFIG, VISIT_CATEGORY_ORDER, type VisitCategory } from "@regionevel/types";

interface ScoreStats {
  visitedCountries: number;
  visitedPrefectures: number;
  visitedCities: number;
  transit: number;
  visit: number;
  stay: number;
  live: number;
  currentTotalScore: number;
  currentRankScore: number;
  currentDirectScore: number;
  currentChildSum: number;
  currentChildMax: number;
}

interface ScoreStatsBarProps {
  stats: ScoreStats;
  isMobile: boolean;
}

export const ScoreStatsBar = memo(function ScoreStatsBar({ 
  stats, 
  isMobile,
}: ScoreStatsBarProps) {
  const categories: Array<{ key: VisitCategory; color: string }> = [
    { key: "transit", color: "bg-cyan-400" },
    { key: "visit", color: "bg-blue-500" },
    { key: "stay", color: "bg-indigo-500" },
    { key: "live", color: "bg-violet-600" },
  ];

  return (
    <div className={`
      ${isMobile ? "" : "bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl rounded-full px-6 py-3"}
      flex items-center gap-4 transition-all duration-500 animate-in fade-in slide-in-from-top-4
    `}>
      {/* Region Count Section */}
      <div className="flex items-center gap-3 border-r border-slate-200/60 pr-4 shrink-0">
        <div className="flex flex-col items-center">
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Countries</span>
          <span className="text-sm font-black text-slate-800 tabular-nums leading-none">{stats.visitedCountries}</span>
        </div>
        <div className="w-[1px] h-4 bg-slate-100" />
        <div className="flex flex-col items-center">
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Regions</span>
          <span className="text-sm font-black text-slate-800 tabular-nums leading-none">{stats.visitedPrefectures}</span>
        </div>
        <div className="w-[1px] h-4 bg-slate-100" />
        <div className="flex flex-col items-center">
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Cities</span>
          <span className="text-sm font-black text-slate-800 tabular-nums leading-none">{stats.visitedCities}</span>
        </div>
      </div>

      {/* Categories Grid */}
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 flex-1 py-0.5`}>
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-center gap-1.5 group shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${cat.color} group-hover:scale-125 transition-transform shadow-sm`} />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-700 tabular-nums leading-none mb-0.5">{(stats as any)[cat.key]}</span>
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter leading-none">
                {VISIT_CONFIG[cat.key].label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

