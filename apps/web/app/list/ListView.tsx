"use client";

import { useEffect, useState } from "react";
import type { Region } from "@regionevel/types";
import { RegionList } from "@/components/list/RegionList";
import { flattenTree } from "@/lib/regions";

export function ListView() {
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import("@/lib/regions").then(m => m.fetchAllRegions())
      .then((data) => {
        setAllRegions(data);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(String(e));
        setLoading(false);
      });
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
