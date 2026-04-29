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
            총점 <span className="font-bold text-blue-600">{score.totalScore}</span>
            {score.aggregatedChildScore > 0 && (
              <span className="ml-1 text-gray-400">
                (직접 {score.directScore} + 하위 {score.aggregatedChildScore})
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
          const pct = Math.round((b.count / cfg.maxCount) * 100);

          return (
            <div key={cat} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{cfg.label}</span>
                <span className="text-xs text-gray-500">
                  {b.count}/{cfg.maxCount}회 · {b.points}/{cfg.maxPoints}점
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-gray-100 rounded-full mb-2">
                <div
                  className="h-1.5 bg-blue-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Stepper */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => upsertVisit(regionId, cat, b.count - 1)}
                  disabled={b.count <= 0}
                  className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center font-bold"
                >
                  −
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: cfg.maxCount }, (_, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        upsertVisit(regionId, cat, i < b.count ? i : i + 1)
                      }
                      className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
                        i < b.count
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-400 hover:bg-blue-100"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => upsertVisit(regionId, cat, b.count + 1)}
                  disabled={b.count >= cfg.maxCount}
                  className="w-7 h-7 rounded-full border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-30 flex items-center justify-center font-bold"
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
