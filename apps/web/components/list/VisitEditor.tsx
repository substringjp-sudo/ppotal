"use client";

import { VISIT_CATEGORY_ORDER, VISIT_CONFIG } from "@regionevel/types";
import type { RegionScore } from "@regionevel/types";
import { useVisitStore } from "@/store/visitStore";

interface VisitEditorProps {
  regionId: string;
  regionName: string;
  score: RegionScore;
  onClose?: () => void;
}

export function VisitEditor({ regionId, regionName, score, onClose }: VisitEditorProps) {
  const { upsertVisit } = useVisitStore();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div>
          <p className="font-semibold text-gray-800">{regionName}</p>
          <p className="text-xs text-gray-500">
            Total Score <span className="font-bold text-blue-600">{score.totalScore}</span>
            {score.aggregatedChildScore > 0 && (
              <span className="ml-1 text-gray-400">
                (Direct {score.directScore} + Sub {score.aggregatedChildScore})
              </span>
            )}
            / 100
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">
            ✕
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {VISIT_CATEGORY_ORDER.map((cat) => {
          const cfg = VISIT_CONFIG[cat];
          const b = score.breakdown[cat];
          const pct = Math.round((b.effectiveCount / cfg.maxCount) * 100);
          const directPct = Math.round((b.directCount / cfg.maxCount) * 100);

          return (
            <div key={cat} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">{cfg.label}</span>
                    {b.effectiveCount > b.directCount && (
                      <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded">
                        +{b.effectiveCount - b.directCount} from sub-regions
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium leading-tight">
                    {cfg.description}
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  {b.directCount}/{cfg.maxCount} times · {b.points}/{cfg.maxPoints} pts
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-gray-100 rounded-full mb-3 relative overflow-hidden">
                {/* Effective progress (lighter) */}
                <div
                  className="absolute inset-0 h-full bg-blue-200 transition-all"
                  style={{ width: `${pct}%` }}
                />
                {/* Direct progress (solid) */}
                <div
                  className="absolute inset-0 h-full bg-blue-600 transition-all z-10"
                  style={{ width: `${directPct}%` }}
                />
              </div>

              {/* Stepper */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => upsertVisit(regionId, cat, b.directCount - 1)}
                  disabled={b.directCount <= 0}
                  className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center font-bold transition-colors"
                >
                  −
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: cfg.maxCount }, (_, i) => {
                    const isDirect = i < b.directCount;
                    const isEffective = i < b.effectiveCount;
                    return (
                      <button
                        key={i}
                        onClick={() =>
                          upsertVisit(regionId, cat, i < b.directCount ? i : i + 1)
                        }
                        className={`w-6 h-6 rounded text-[10px] font-bold transition-all ${
                          isDirect
                            ? "bg-blue-600 text-white shadow-sm"
                            : isEffective
                              ? "bg-blue-100 text-blue-600 border border-blue-200"
                              : "bg-gray-50 text-gray-400 border border-gray-100 hover:bg-blue-50"
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => upsertVisit(regionId, cat, b.directCount + 1)}
                  disabled={b.directCount >= cfg.maxCount}
                  className="w-7 h-7 rounded-full border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-30 flex items-center justify-center font-bold transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
