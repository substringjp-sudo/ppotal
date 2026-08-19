"use client";

import { useCallback, useMemo, useState } from "react";
import type { Region } from "@regionevel/types";
import { padId } from "@regionevel/utils";
import { useVisitStore } from "@/store/visitStore";
import { useMapStore } from "@/store/mapStore";
import { useRouter, usePathname } from "next/navigation";

const MAX_RESULTS = 10;

/**
 * Region search, shared by the desktop field and the phone's full-screen
 * sheet. Both need the same matching and the same "jump there" behaviour, and
 * a phone that searched differently from the desktop would be a bug nobody
 * would think to look for.
 */
export function useRegionSearch() {
  const allRegions = useVisitStore((s) => s.allRegions);
  const jumpToRegion = useMapStore((s) => s.jumpToRegion);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  const regionsById = useMemo(() => {
    const m = new Map<string, Region>();
    for (const r of allRegions) m.set(padId(r.id), r);
    return m;
  }, [allRegions]);

  const results = useMemo(() => {
    const term = query.toLowerCase().trim();
    if (!term) return [];
    const matches: Region[] = [];
    for (const r of allRegions) {
      if (
        (r.name || "").toLowerCase().includes(term) ||
        (r.nameEn || "").toLowerCase().includes(term) ||
        (r.nameKo || "").toLowerCase().includes(term)
      ) {
        matches.push(r);
        if (matches.length >= MAX_RESULTS) break;
      }
    }
    return matches;
  }, [query, allRegions]);

  const select = useCallback(
    (id: string) => {
      jumpToRegion(id, allRegions);
      if (pathname !== "/map" && pathname !== "/") router.push("/");
      setQuery("");
    },
    [jumpToRegion, allRegions, pathname, router],
  );

  /** "City · Tokyo, Japan" — the ancestry, so two same-named places are tellable apart. */
  const describe = useCallback(
    (region: Region) => {
      const typeLabel =
        region.admLevel === 0 ? "Country" : region.admLevel === 1 ? "Prefecture" : "City";
      const ancestors: string[] = [];
      let current: Region | undefined = region;
      const seen = new Set<string>();
      while (current?.parentId) {
        const pid = padId(current.parentId);
        if (seen.has(pid)) break;
        seen.add(pid);
        const parent = regionsById.get(pid);
        if (!parent) break;
        ancestors.push(parent.name);
        current = parent;
      }
      return ancestors.length > 0 ? `${typeLabel} · ${ancestors.join(", ")}` : typeLabel;
    },
    [regionsById],
  );

  return { query, setQuery, results, select, describe };
}
