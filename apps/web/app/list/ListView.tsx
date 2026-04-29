"use client";

import { useEffect, useState } from "react";
import type { Region } from "@regionevel/types";
import { RegionList } from "@/components/list/RegionList";

export function ListView() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/meta/KOR.json")
      .then((r) => r.json() as Promise<Region[]>)
      .then(setRegions)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-red-500">
        데이터 로드 실패: {error}
      </div>
    );
  }

  if (regions.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-gray-400">
        로딩 중…
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] overflow-hidden">
      <RegionList regions={regions} />
    </div>
  );
}
