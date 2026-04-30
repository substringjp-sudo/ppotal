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
        지도 로딩 중…
      </div>
    ),
  },
);

export function MapView() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [geojsonAdm1, setGeojsonAdm1] = useState<FeatureCollection | null>(null);
  const [geojsonAdm2, setGeojsonAdm2] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/meta/KOR.json").then((r) => r.json() as Promise<Region[]>),
      fetch("/data/KOR_ADM1.geojson").then((r) => r.json() as Promise<FeatureCollection>),
      fetch("/data/KOR_ADM2.geojson").then((r) => r.json() as Promise<FeatureCollection>),
    ])
      .then(([meta, adm1, adm2]) => {
        setRegions(meta);
        setGeojsonAdm1(adm1);
        setGeojsonAdm2(adm2);
      })
      .catch((e: unknown) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-red-500">
        데이터 로드 실패: {error}
      </div>
    );
  }

  if (!geojsonAdm1 || !geojsonAdm2) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-gray-400">
        지도 데이터 로딩 중…
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)]">
      <RegionMap regions={regions} geojsonAdm1={geojsonAdm1} geojsonAdm2={geojsonAdm2} />
    </div>
  );
}
