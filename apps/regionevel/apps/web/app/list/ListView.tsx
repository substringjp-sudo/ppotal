"use client";

import { useEffect, useState } from "react";
import type { Region } from "@regionevel/types";
import { RegionList } from "@/components/list/RegionList";

export function ListView() {
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // We no longer fetch ALL regions here to prevent freezing.
    // RegionList component handles on-demand loading.
    setLoading(false);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-red-500">
        Failed to load data: {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-gray-400">
        Loading metadata...
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] overflow-hidden">
      <RegionList regions={allRegions} />
    </div>
  );
}
