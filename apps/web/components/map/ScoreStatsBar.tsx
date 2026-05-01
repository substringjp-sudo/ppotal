import { memo } from "react";
import { VISIT_CONFIG, VISIT_CATEGORY_ORDER } from "@regionevel/types";

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
  const categories = [
    { key: "passing", color: "bg-slate-400", label: "Pass" },
    { key: "transit", color: "bg-cyan-400", label: "Tran" },
    { key: "visit", color: "bg-blue-500", label: "Visit" },
    { key: "accommodation", color: "bg-indigo-500", label: "Stay" },
    { key: "residence", color: "bg-violet-600", label: "Live" },
  ];

  return (
    <div className={`
      bg-white/85 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)]
      flex items-center gap-4 transition-all duration-500 animate-in fade-in slide-in-from-top-4
      ${isMobile ? "px-4 py-2.5 rounded-2xl w-full" : "px-6 py-3 rounded-full"}
    `}>
      {/* Region Count Section */}
      <div className="flex flex-col items-center justify-center border-r border-gray-200/50 pr-4 shrink-0">
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-0.5">Visited</span>
        <span className="text-lg font-black text-slate-800 tabular-nums leading-none">{stats.totalVisited}</span>
      </div>

      {/* Categories Grid */}
      <div className={`flex items-center gap-3 md:gap-5 flex-1 overflow-x-auto no-scrollbar py-0.5`}>
        {categories.map((cat) => (
          <div key={cat.key} className="flex flex-col items-center group shrink-0">
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`w-1.5 h-1.5 rounded-full ${cat.color} group-hover:scale-125 transition-transform shadow-sm`} />
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter whitespace-nowrap">
                {isMobile ? cat.label : VISIT_CONFIG[cat.key as any].label}
              </span>
            </div>
            <span className="text-xs font-black text-slate-700 tabular-nums">{(stats as any)[cat.key]}</span>
          </div>
        ))}
      </div>

      {/* Main Scores Section */}
      <div className="flex items-center gap-3 md:gap-6 border-l border-gray-200/50 pl-4 shrink-0">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 mb-1">
            <div className={`w-1.5 h-1.5 rounded-full ${scoringMode === 'individual' ? 'bg-blue-600 animate-pulse' : 'bg-blue-300'}`} />
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Experience</span>
          </div>
          <span className={`text-sm font-black tabular-nums transition-all duration-300 ${scoringMode === 'individual' ? 'text-blue-600 drop-shadow-[0_0_8px_rgba(37,99,235,0.4)] scale-110' : 'text-slate-600'}`}>
            {stats.currentTotalScore} <span className="text-[10px]">pts</span>
          </span>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 mb-1">
            <div className={`w-1.5 h-1.5 rounded-full ${scoringMode === 'cumulative' ? 'bg-orange-600 animate-pulse' : 'bg-orange-300'}`} />
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cumulative</span>
          </div>
          <span className={`text-sm font-black tabular-nums transition-all duration-300 ${scoringMode === 'cumulative' ? 'text-orange-600 drop-shadow-[0_0_8px_rgba(234,88,12,0.4)] scale-110' : 'text-slate-600'}`}>
            {stats.currentCumulativeScore} <span className="text-[10px]">pts</span>
          </span>
        </div>
      </div>
    </div>
  );
});
