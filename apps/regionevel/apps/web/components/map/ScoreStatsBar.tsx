import { memo } from "react";
import { VISIT_CONFIG, VISIT_CATEGORY_ORDER, type VisitCategory } from "@regionevel/types";

interface ScoreStats {
  visitedCountries: number;
  visitedPrefectures: number;
  visitedCities: number;
  pass: number;
  transit: number;
  visit: number;
  stay: number;
  residence: number;
  currentTotalScore: number;
  currentRateScore: number;
  currentDirectScore: number;
  currentChildSum: number;
  currentChildMax: number;
}

interface ScoreStatsBarProps {
  stats: ScoreStats;
  isMobile: boolean;
  hideRate?: boolean;
  totalChildren?: number;
  admLevel?: number;
  hideExp?: boolean;
}

export const ScoreStatsBar = memo(function ScoreStatsBar({ 
  stats, 
  isMobile,
  hideRate = false,
  totalChildren,
  admLevel,
  hideExp = false,
}: ScoreStatsBarProps) {
  const categories: Array<{ key: VisitCategory; color: string }> = [
    { key: "pass", color: "bg-slate-300" },
    { key: "transit", color: "bg-cyan-400" },
    { key: "visit", color: "bg-blue-500" },
    { key: "stay", color: "bg-indigo-500" },
    { key: "residence", color: "bg-violet-600" },
  ];

  return (
    <div className={`
      ${isMobile ? "" : "bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl rounded-full px-6 py-3"}
      flex items-center gap-4 transition-all duration-500 animate-in fade-in slide-in-from-top-4
    `}>
      {/* Experience & Rate Section */}
      {admLevel !== -1 && (
        <div className="flex items-center gap-3 border-r border-slate-200/60 pr-4 shrink-0">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-orange-500 uppercase tracking-tighter leading-none mb-0.5">Rate</span>
            {!hideRate && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-black text-orange-600 tabular-nums leading-none">
                  {Math.ceil(stats.currentRateScore)}%
                </span>
              </div>
            )}
          </div>
          {!hideExp && admLevel !== 0 && (
            <>
              <div className="w-[1px] h-3 bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">EXP</span>
                <span className="text-sm font-black text-blue-600 tabular-nums leading-none">
                  {Math.round(stats.currentDirectScore)}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Region Count Section */}
      <div className="flex items-center gap-3 border-r border-slate-200/60 pr-4 shrink-0">
        {(admLevel === undefined || admLevel === -1) && (
          <>
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Countries</span>
              <span className="text-sm font-black text-slate-800 tabular-nums leading-none">
                {stats.visitedCountries}
                {admLevel === -1 && totalChildren && totalChildren > 0 && (
                  <span className="text-[10px] text-slate-400 ml-1">/ {totalChildren}</span>
                )}
              </span>
            </div>
            <div className="w-[1px] h-4 bg-slate-100" />
          </>
        )}
        
        {(admLevel === undefined || admLevel === -1 || admLevel === 0) && (
          <>
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Regions</span>
              <span className="text-sm font-black text-slate-800 tabular-nums leading-none">
                {stats.visitedPrefectures}
                {admLevel === 0 && totalChildren && totalChildren > 0 && (
                  <span className="text-[10px] text-slate-400 ml-1">/ {totalChildren}</span>
                )}
              </span>
            </div>
            <div className="w-[1px] h-4 bg-slate-100" />
          </>
        )}

        <div className="flex flex-col items-center">
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Cities</span>
          <span className="text-sm font-black text-slate-800 tabular-nums leading-none">
            {stats.visitedCities}
            {admLevel === 1 && totalChildren && totalChildren > 0 && (
              <span className="text-[10px] text-slate-400 ml-1">/ {totalChildren}</span>
            )}
          </span>
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

