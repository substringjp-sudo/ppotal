"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { FeatureCollection } from "geojson";
import type { Region } from "@regionevel/types";

// Leaflet accesses `window` at import time — load only on the client
const RegionMap = dynamic(
  () => import("@/components/map/RegionMap").then((m) => ({ default: m.RegionMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading map...
      </div>
    ),
  },
);

export function MapView() {
  const [tree, setTree] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/meta/tree.json")
      .then((r) => r.json())
      .then((data) => setTree(data))
      .catch((e: unknown) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-red-500">
        Failed to load data: {error}
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-gray-400">
        Loading metadata...
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)]">
      <RegionMap tree={tree} />
    </div>
  );
}
