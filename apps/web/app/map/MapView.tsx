"use client";

import { useEffect, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { Region } from "@regionevel/types";
import { RegionMap } from "@/components/map/RegionMap";

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
