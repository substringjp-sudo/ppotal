"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RailData, Station, Line, Company } from '../types/railData';

interface RailSearchProps {
    railData: RailData | null;
    onSelectStation: (id: string) => void;
    onSelectLine: (id: string, fullId: string) => void;
    isMobile?: boolean;
}

interface RegionNames {
    adm1: Record<string, { shapeName: string; shapeName_en?: string }>;
    adm2: Record<string, { shapeName: string; shapeName_en?: string }>;
}

const RailSearch: React.FC<RailSearchProps> = ({ railData, onSelectStation, onSelectLine, isMobile }) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [regionNames, setRegionNames] = useState<RegionNames | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch('/data/region_names.json')
            .then(res => res.json())
            .then(data => setRegionNames(data))
            .catch(err => console.error("Failed to load region names:", err));
    }, []);

    // Close results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const results = useMemo(() => {
        if (!railData || query.length < 1) return { stations: [], lines: [] };

        const q = query.toLowerCase().trim();

        // Search Stations
        const matchedStations = Object.values(railData.stations)
            .filter(s =>
                s.name.toLowerCase().includes(q) ||
                (s.name_en && s.name_en.toLowerCase().includes(q))
            )
            .slice(0, 15);

        // Search Lines
        const matchedLines = Object.values(railData.lines)
            .filter(l =>
                l.name.toLowerCase().includes(q) ||
                (l.name_en && l.name_en.toLowerCase().includes(q))
            )
            .slice(0, 10);

        return { stations: matchedStations, lines: matchedLines };
    }, [railData, query]);

    const hasResults = results.stations.length > 0 || results.lines.length > 0;

    const getStationLines = (station: Station) => {
        if (!railData) return [];
        const lines = new Set<{ name: string, color: string }>();
        station.platform_ids?.forEach(pid => {
            const platform = railData.platforms[pid];
            if (platform) {
                const line = railData.lines[platform.line];
                if (line) {
                    lines.add({ name: line.name, color: line.color || '#3b82f6' });
                }
            }
        });
        return Array.from(lines);
    };

    const getStationAddress = (station: Station): { ja: string, en: string } => {
        if (!regionNames) return { ja: '', en: '' };
        const pref = station.prefecture_id ? regionNames.adm1[station.prefecture_id] : null;
        const city = station.city_id ? regionNames.adm2[station.city_id] : null;

        const ja = [pref?.shapeName, city?.shapeName].filter(Boolean).join(' ');
        const en = [pref?.shapeName_en, city?.shapeName_en].filter(Boolean).join(', ');

        return { ja, en };
    };

    const getLineCompany = (line: Line) => {
        if (!railData) return null;
        return railData.companies[line.corp_id];
    };

    return (
        <div ref={containerRef} className="relative w-full max-w-sm lg:max-w-md group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors z-20">
                <span className="material-symbols-outlined text-xl">search</span>
            </div>
            <input
                className="block w-full pl-10 pr-3 py-2 border border-transparent bg-slate-100 dark:bg-slate-800 rounded-xl text-sm placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary/20 outline-none transition-all z-10"
                placeholder="Search stations or lines..."
                type="text"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
            />

            {/* Results Popover */}
            {isOpen && query.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-[2000] max-h-[70vh] flex flex-col">
                    {!hasResults ? (
                        <div className="p-8 text-center">
                            <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-4xl mb-2">sentiment_dissatisfied</span>
                            <p className="text-sm font-bold text-slate-400">No results found for "{query}"</p>
                        </div>
                    ) : (
                        <div className="overflow-y-auto custom-scrollbar">
                            {/* Stations Section */}
                            {results.stations.length > 0 && (
                                <div className="p-2">
                                    <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">train</span>
                                        Stations ({results.stations.length})
                                    </div>
                                    <div className="space-y-1">
                                        {results.stations.map(station => {
                                            const lines = getStationLines(station);
                                            const address = getStationAddress(station);
                                            const hasAddress = typeof address === 'object' && address !== null;
                                            return (
                                                <button
                                                    key={station.id}
                                                    onClick={() => {
                                                        onSelectStation(station.id);
                                                        setIsOpen(false);
                                                        setQuery('');
                                                    }}
                                                    className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group/item"
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-black text-slate-800 dark:text-slate-100 group-hover/item:text-primary transition-colors">
                                                            {station.name}
                                                        </span>
                                                        {hasAddress && address.ja && (
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight text-right shrink-0 ml-4">
                                                                {address.ja}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-medium mb-2">
                                                        {station.name_en}
                                                        {hasAddress && address.en && <span className="text-slate-400"> · {address.en}</span>}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {lines.map((l, idx) => (
                                                            <div key={idx} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700/50">
                                                                <div className="size-1.5 rounded-full" style={{ backgroundColor: l.color }}></div>
                                                                <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">{l.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Divider if both */}
                            {results.stations.length > 0 && results.lines.length > 0 && (
                                <div className="h-px bg-slate-100 dark:bg-slate-800 mx-4"></div>
                            )}

                            {/* Lines Section */}
                            {results.lines.length > 0 && (
                                <div className="p-2">
                                    <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">route</span>
                                        Lines ({results.lines.length})
                                    </div>
                                    <div className="space-y-1">
                                        {results.lines.map(line => {
                                            const company = getLineCompany(line);
                                            return (
                                                <button
                                                    key={line.id}
                                                    onClick={() => {
                                                        const fullId = `${line.corp_id}::${line.id}`;
                                                        onSelectLine(line.id.toString(), fullId);
                                                        setIsOpen(false);
                                                        setQuery('');
                                                    }}
                                                    className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group/item flex items-center gap-4"
                                                >
                                                    <div className="size-10 rounded-xl flex items-center justify-center shrink-0 border-2" style={{ borderColor: line.color || '#3b82f6', backgroundColor: (line.color || '#3b82f6') + '10' }}>
                                                        <span className="material-symbols-outlined" style={{ color: line.color || '#3b82f6' }}>subway</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center mb-0.5">
                                                            <span className="font-black text-slate-800 dark:text-slate-100 group-hover/item:text-primary transition-colors truncate">
                                                                {line.name}
                                                            </span>
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                                {company?.name}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 font-medium truncate">
                                                            {line.name_en}
                                                            {company?.name_en && <span className="text-slate-400"> · {company.name_en}</span>}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 flex justify-between items-center px-5">
                        <span className="uppercase tracking-widest">Search results are updated live</span>
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">keyboard_return</span>
                            SELECT
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RailSearch;
