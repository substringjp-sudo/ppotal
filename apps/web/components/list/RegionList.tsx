"use client";

import { useMemo, useState } from "react";
import type { Region } from "@regionevel/types";
import { getScoreColor } from "@regionevel/utils";
import { useVisitStore } from "@/store/visitStore";
import { VisitEditor } from "./VisitEditor";

interface RegionListProps {
  regions: Region[];
}

export function RegionList({ regions }: RegionListProps) {
  const { getFullScore } = useVisitStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [admFilter, setAdmFilter] = useState<1 | 2>(1);

  const adm1Regions = useMemo(
    () => regions.filter((r) => r.admLevel === 1),
    [regions],
  );

  const filtered = useMemo(() => {
    const base = regions.filter((r) => r.admLevel === admFilter);
    if (!search.trim()) return base;
    return base.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [regions, admFilter, search]);

  const selectedRegion = selectedId
    ? regions.find((r) => r.id === selectedId) ?? null
    : null;
  const selectedScore = selectedId ? getFullScore(selectedId, regions) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Search + filter bar */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10 space-y-2">
        <input
          type="search"
          placeholder="지역 검색…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex gap-2">
          {([1, 2] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setAdmFilter(lvl)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                admFilter === lvl
                  ? "bg-blue-600 text-white border-blue-600"
                  : "text-gray-600 border-gray-300 hover:border-blue-400"
              }`}
            >
              {lvl === 1 ? "광역시도" : "시군구"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Region list */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filtered.map((region) => {
            const score = getFullScore(region.id, regions);
            const parentName =
              region.parentId
                ? adm1Regions.find((r) => r.id === region.parentId)?.name
                : undefined;

            return (
              <button
                key={region.id}
                onClick={() =>
                  setSelectedId(selectedId === region.id ? null : region.id)
                }
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors ${
                  selectedId === region.id ? "bg-blue-50" : ""
                }`}
              >
                {/* Score color dot */}
                <span
                  className="w-3 h-3 rounded-full border border-gray-300 shrink-0"
                  style={{ background: getScoreColor(score.totalScore) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {region.name}
                  </p>
                  {parentName && (
                    <p className="text-xs text-gray-400">{parentName}</p>
                  )}
                </div>
                <ScoreBadge score={score.totalScore} />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-12 text-sm">
              검색 결과가 없습니다
            </p>
          )}
        </div>

        {/* Visit editor panel (desktop side panel) */}
        {selectedRegion && selectedScore && (
          <div className="w-80 border-l border-gray-200 overflow-y-auto shrink-0">
            <VisitEditor
              regionId={selectedRegion.id}
              regionName={selectedRegion.name}
              score={selectedScore}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score === 0
      ? "bg-gray-100 text-gray-400"
      : score >= 70
        ? "bg-blue-900 text-white"
        : score >= 40
          ? "bg-blue-600 text-white"
          : score >= 20
            ? "bg-blue-400 text-white"
            : "bg-blue-100 text-blue-700";

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${color}`}>
      {score}
    </span>
  );
}
