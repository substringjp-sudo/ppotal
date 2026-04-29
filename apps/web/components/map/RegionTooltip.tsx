"use client";

import { VISIT_CATEGORY_ORDER, VISIT_CONFIG } from "@regionevel/types";
import type { Region, RegionScore } from "@regionevel/types";

interface RegionTooltipProps {
  region: Region;
  score: RegionScore;
  children: Region[];
  onClose: () => void;
  onDrillDown: (regionId: string) => void;
  onVisitChange: (category: string, delta: number) => void;
}

export function RegionTooltip({
  region,
  score,
  children,
  onClose,
  onDrillDown,
  onVisitChange,
}: RegionTooltipProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
        <div>
          <p className="font-bold text-base">{region.name}</p>
          <p className="text-xs text-blue-200">
            ADM{region.admLevel} · {region.iso3}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{score.totalScore}</p>
          <p className="text-xs text-blue-200">/ 100점</p>
        </div>
        <button
          onClick={onClose}
          className="ml-3 text-blue-200 hover:text-white text-xl leading-none"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      {/* Score breakdown */}
      <div className="px-4 py-3 space-y-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">방문 현황</p>
        {VISIT_CATEGORY_ORDER.map((cat) => {
          const cfg = VISIT_CONFIG[cat];
          const b = score.breakdown[cat];
          return (
            <div key={cat} className="flex items-center gap-2">
              <span className="w-24 text-xs text-gray-600">{cfg.label}</span>
              <div className="flex gap-1">
                {Array.from({ length: cfg.maxCount }, (_, i) => (
                  <span
                    key={i}
                    className={`w-4 h-4 rounded-sm text-[10px] flex items-center justify-center border ${
                      i < b.count
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-gray-100 border-gray-300 text-gray-400"
                    }`}
                  >
                    {i < b.count ? "✓" : ""}
                  </span>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => onVisitChange(cat, -1)}
                  disabled={b.count <= 0}
                  className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-xs font-bold flex items-center justify-center"
                >
                  −
                </button>
                <button
                  onClick={() => onVisitChange(cat, 1)}
                  disabled={b.count >= cfg.maxCount}
                  className="w-5 h-5 rounded bg-blue-100 hover:bg-blue-200 disabled:opacity-30 text-xs font-bold text-blue-700 flex items-center justify-center"
                >
                  +
                </button>
              </div>
              <span className="w-10 text-right text-xs font-medium text-gray-700">
                {b.points}점
              </span>
            </div>
          );
        })}
        {score.aggregatedChildScore > 0 && (
          <div className="flex justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
            <span>하위 지역 합산</span>
            <span className="font-medium">+{score.aggregatedChildScore}점</span>
          </div>
        )}
      </div>

      {/* Child regions */}
      {children.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            하위 지역
          </p>
          <div className="flex flex-wrap gap-1">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => onDrillDown(child.id)}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-blue-100 hover:text-blue-700 rounded transition-colors"
              >
                {child.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
