"use client";

import React, { useState, useEffect, useRef } from "react";
import { HeaderSearchBar } from "@ppotal/ui";
import { useVisitStore } from "@/store/visitStore";
import { useMapStore } from "@/store/mapStore";
import { padId } from "@regionevel/utils";
import { useRouter, usePathname } from "next/navigation";

export function RegionSearch() {
  const { allRegions } = useVisitStore();
  const { jumpToRegion } = useMapStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Close results list on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter regions based on query
  useEffect(() => {
    if (!query.trim() || allRegions.length === 0) {
      setResults([]);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Filter countries, prefectures, and cities
    const filtered = allRegions
      .filter((r) => {
        const name = r.name || "";
        const nameEn = r.nameEn || "";
        const nameKo = r.nameKo || "";
        
        return (
          name.toLowerCase().includes(searchTerm) ||
          (nameEn && nameEn.toLowerCase().includes(searchTerm)) ||
          (nameKo && nameKo.toLowerCase().includes(searchTerm))
        );
      })
      .slice(0, 10); // Limit to top 10 results for better UX

    setResults(filtered);
  }, [query, allRegions]);

  const handleSelect = (id: string) => {
    jumpToRegion(id, allRegions);
    if (pathname !== "/map" && pathname !== "/") {
      router.push("/");
    }
    setQuery("");
    setIsOpen(false);
  };

  const getRegionPathLabel = (region: any) => {
    const paths: string[] = [];
    let current = region;
    
    while (current && current.parentId) {
      const parent = allRegions.find(r => padId(r.id) === padId(current.parentId));
      if (parent) {
        paths.push(parent.name);
        current = parent;
      } else {
        break;
      }
    }
    
    const typeLabel = region.admLevel === 0 ? "Country" : region.admLevel === 1 ? "Prefecture" : "City";
    
    if (paths.length > 0) {
      return `${typeLabel} · ${paths.join(", ")}`;
    }
    return typeLabel;
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <HeaderSearchBar
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onClear={() => {
          setQuery("");
          setResults([]);
        }}
        placeholder="국가, 도도부현, 도시 검색..."
      />

      {/* Auto-complete dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-10 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden z-[2005] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-1 max-h-[300px] overflow-y-auto custom-scrollbar">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r.id)}
                className="w-full px-4 py-2.5 text-left hover:bg-blue-50/60 dark:hover:bg-blue-950/40 transition-colors flex flex-col gap-0.5 border-b border-slate-50 dark:border-slate-800/60 last:border-0 cursor-pointer"
              >
                <span className="text-xs font-black text-slate-800 dark:text-white">{r.name}</span>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight">
                  {getRegionPathLabel(r)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && query.trim() && results.length === 0 && (
        <div className="absolute top-10 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-2xl p-4 text-center z-[2005]">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">"{query}"에 대한 검색 결과가 없습니다</p>
        </div>
      )}
    </div>
  );
}
