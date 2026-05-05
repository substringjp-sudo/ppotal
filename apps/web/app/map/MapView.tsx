"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Region } from "@regionevel/types";
import { fetchChildren, fetchRegionsByIds, fetchAncestors } from "@/lib/regions";
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { visits, allRegions, _hasHydrated, setRegions } = useVisitStore();
  
  const [hasLoadedCountries, setHasLoadedCountries] = useState(false);

  useEffect(() => {
    // 1. Wait for hydration
    if (!_hasHydrated) return;

    // 2. Prevent multiple concurrent loads
    let active = true;

    const loadInitialData = async () => {
      // If we already have regions and this was triggered by a minor visit update,
      // we might just need to recalculate, but for the FIRST load, we need to fetch everything.
      if (!hasLoadedCountries) {
        try {
          const initialCountries = await fetchChildren(null);
          if (!active) return;
          setRegions(initialCountries);
          setHasLoadedCountries(true);
          
          // Initial calculation with just countries if no visits
          if (visits.length === 0) {
            setInitialLoading(false);
            return;
          }
        } catch (e) {
          console.error("Failed to load countries", e);
          if (active) setError("Failed to load countries");
          return;
        }
      }

      // 3. Load metadata for visited regions and their ancestors
      try {
        const visitedIds = Array.from(new Set(visits.map(v => padId(v.regionId))));
        if (visitedIds.length === 0) {
          if (active) {
            setInitialLoading(false);
          }
          return;
        }

        // Only fetch if we don't have them in allRegions yet
        const existingIds = new Set(allRegions.map(r => padId(r.id)));
        const missingIds = visitedIds.filter(id => !existingIds.has(id));

        if (missingIds.length === 0) {
          if (active) setInitialLoading(false);
          return;
        }

        // Fetch missing metadata in parallel
        const [visitedRegions, ...ancestorResults] = await Promise.all([
          fetchRegionsByIds(missingIds),
          ...missingIds.map(id => fetchAncestors(id))
        ]);

        if (!active) return;

        const allNewRegions = [...visitedRegions, ...ancestorResults.flat()];
        setRegions(allNewRegions);
        setInitialLoading(false);
      } catch (e) {
        console.error("Failed to load visited metadata", e);
        if (active) {
          setInitialLoading(false);
        }
      }
    };

    loadInitialData();
    return () => { active = false; };
  }, [_hasHydrated, hasLoadedCountries, visits.length]); // Re-run when visits count changes

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
