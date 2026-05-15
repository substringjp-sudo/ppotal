"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Region } from "@regionevel/types";
import { fetchChildren, fetchRegionsByIds, fetchAncestors, fetchAncestorsBulk, fetchAllRegions } from "@/lib/regions";
import { useVisitStore } from "@/store/visitStore";
import { useMapStore } from "@/store/mapStore";
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { visits, allRegions, _hasHydrated, setRegions } = useVisitStore();
  const { level, currentId } = useMapStore();
  const [hasLoadedCountries, setHasLoadedCountries] = useState(false);

  useEffect(() => {
    // 1. Wait for hydration
    if (!_hasHydrated) return;

    // 2. Prevent multiple concurrent loads
    let active = true;

    const loadInitialData = async () => {
      // 3. Get current state
      const { currentId } = useMapStore.getState();
      
      // 4. Load metadata for visited regions, current region, and their ancestors
      try {
        const visitedIds = Array.from(new Set(visits.map(v => padId(v.regionId))));
        const targetIds = [...visitedIds];
        if (currentId) targetIds.push(padId(currentId));

        if (targetIds.length === 0) {
          // If we don't have visits or currentId, just load countries if not done
          if (!hasLoadedCountries) {
            const initialCountries = await fetchChildren(null);
            if (active) {
              setRegions(initialCountries);
              setHasLoadedCountries(true);
              setInitialLoading(false);
            }
          } else {
            if (active) setInitialLoading(false);
          }
          return;
        }

        // Only fetch if we don't have them in allRegions yet
        // Access current allRegions from state to avoid dependency loop
        const currentAllRegions = useVisitStore.getState().allRegions;
        const existingIds = new Set(currentAllRegions.map(r => padId(r.id)));
        const missingIds = targetIds.filter(id => !existingIds.has(id));

        // Even if no missing IDs, we might still need initial countries for the base map
        if (!hasLoadedCountries) {
          const initialCountries = await fetchChildren(null);
          if (active) {
            setRegions(initialCountries);
            setHasLoadedCountries(true);
          }
        }

        if (missingIds.length === 0) {
          if (active) setInitialLoading(false);
          return;
        }

        // If we have a lot of visited regions, it's actually much faster to just fetch EVERYTHING once
        if (missingIds.length > 50) {
          const all = await fetchAllRegions();
          if (active) {
            setRegions(all);
            setInitialLoading(false);
          }
          return;
        }

        // Otherwise fetch missing metadata and ancestors in bulk
        const [visitedRegions, ancestorResults] = await Promise.all([
          fetchRegionsByIds(missingIds),
          fetchAncestorsBulk(missingIds)
        ]);

        if (!active) return;

        const allNewRegions = [...visitedRegions, ...ancestorResults];
        setRegions(allNewRegions);
        setInitialLoading(false);
      } catch (e) {
        console.error("Failed to load map metadata", e);
        if (active) {
          setInitialLoading(false);
        }
      }
    };

    loadInitialData();
    return () => { active = false; };
  }, [visits, _hasHydrated, setRegions, hasLoadedCountries, currentId, level]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-red-500">
        {error}
      </div>
    );
  }

  if (initialLoading && allRegions.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-gray-400">
        Preparing the map...
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)]">
      <RegionMap />
    </div>
  );
}
