"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { RegionHierarchySidebar } from "@/components/map/RegionHierarchySidebar";
import { MyVisitsPane } from "@/components/map/MyVisitsPane";
import { RegionMapHeader } from "@/components/map/RegionMapHeader";
import { MapAppLayout } from "@ppotal/ui";
import { useMapStore } from "@/store/mapStore";
import { useVisitStore } from "@/store/visitStore";
import { useIsPhone } from "@/lib/useIsPhone";
import { fetchAllRegions } from "@/lib/regions";

const RegionMap = dynamic(
  () => import("@/components/map/RegionMap").then((mod) => mod.RegionMap),
  { ssr: false }
);

export function MapView() {
  const {
    leftSidebarOpen,
    rightDrawerOpen,
    currentId,
    level,
  } = useMapStore();

  const {
    allRegions,
    visits,
    _hasHydrated,
    setRegions,
  } = useVisitStore();

  const [error] = useState<string | null>(null);
  const isMobile = useIsPhone();

  useEffect(() => {
    if (!_hasHydrated) return;

    let active = true;

    const loadInitialData = async () => {
      try {
        const fullList = await fetchAllRegions();
        if (!active) return;
        if (fullList.length > 0) {
          setRegions(fullList);
        }
      } catch (e) {
        console.error("Failed to load map metadata", e);
      }
    };

    const hasFullMetadata = allRegions.length > 50 && allRegions.some((r) => !!r.nameKo);
    if (!hasFullMetadata) {
      loadInitialData();
    }
    return () => { active = false; };
  }, [visits, _hasHydrated, setRegions, allRegions, currentId, level]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {error}
      </div>
    );
  }

  return (
    <MapAppLayout
      isMobile={isMobile}
      map={<RegionMap />}
      subHeader={<RegionMapHeader />}
      leftSidebar={<RegionHierarchySidebar />}
      rightPanel={<MyVisitsPane />}
      isLeftOpen={leftSidebarOpen}
      isRightOpen={rightDrawerOpen}
      leftWidth={350}
      rightWidth={350}
    />
  );
}
