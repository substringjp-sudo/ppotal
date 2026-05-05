"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Region } from "@regionevel/types";
import { fetchChildren, fetchRegionsByIds } from "@/lib/regions";
import { useVisitStore } from "@/store/visitStore";
import { padId } from "@regionevel/utils";

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
  const [regions, setRegions] = useState<Region[] | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const visits = useVisitStore((state) => state.visits);

  const [countries, setCountries] = useState<Region[]>([]);
  const [hasLoadedCountries, setHasLoadedCountries] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      // Only show loading if we haven't loaded anything yet
      if (regions === null) setInitialLoading(true);
      
      try {
        let currentRegions = regions || [];
        let updated = false;

        // 1. Initial load of countries
        if (!hasLoadedCountries) {
          const initialCountries = await fetchChildren(null);
          currentRegions = initialCountries;
          setCountries(initialCountries);
          setHasLoadedCountries(true);
          updated = true;
        }
        
        // 2. Load missing metadata for visited regions
        if (visits.length > 0) {
          const existingIds = new Set(currentRegions.map(c => padId(c.id)));
          const visitedIds = Array.from(new Set(visits.map(v => padId(v.regionId))));
          const missingIds = visitedIds.filter(id => !existingIds.has(id));

          if (missingIds.length > 0) {
            const visitedMeta = await fetchRegionsByIds(missingIds);
            const newRegions = [...currentRegions];
            
            for (const vm of visitedMeta) {
              if (!existingIds.has(padId(vm.id))) {
                newRegions.push(vm);
                existingIds.add(padId(vm.id));
              }
            }
            
            // Also fetch parents of level 2 visited regions (which are level 1)
            const level2ParentIds = Array.from(new Set(
              visitedMeta.filter(m => m.admLevel === 2).map(m => padId(m.parentId))
            )).filter(id => id && !existingIds.has(id));
            
            if (level2ParentIds.length > 0) {
              const level1Parents = await fetchRegionsByIds(level2ParentIds);
              for (const p of level1Parents) {
                if (!existingIds.has(padId(p.id))) {
                  newRegions.push(p);
                  existingIds.add(padId(p.id));
                }
              }
            }

            currentRegions = newRegions;
            updated = true;
          }
        }
        
        if (updated) {
          setRegions(currentRegions);
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
        setError("데이터를 불러오는데 실패했습니다.");
      } finally {
        setInitialLoading(false);
      }
    };
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits.length, hasLoadedCountries]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-red-500">
        {error}
      </div>
    );
  }

  if (initialLoading || !regions) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-gray-400">
        지도를 준비하고 있습니다...
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)]">
      <RegionMap regions={regions} />
    </div>
  );
}
