"use client";

import { rankByRelevance } from '../lib/searchRanking';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, History, MapPin, Train, SearchX } from 'lucide-react';
import { RailData, Station, Line } from '../types/railData';
import { trackEvent } from '../lib/gtag';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName, getLocalizedAddress } from '../lib/i18n-utils';
import { useRegionNames } from '../hooks/useRegionNames';

interface RailSearchProps {
    railData: RailData | null;
    onSelectStation: (id: string) => void;
    onSelectLine: (id: string, fullId: string) => void;
    isMobile?: boolean;
}

import { RAIL_SEARCH_TRANSLATIONS, getTranslations } from '../lib/translations';



const HighlightMatch = ({ text, query }: { text: string; query: string }) => {
    if (!query || !text) return <>{text}</>;

    // Escape special characters for regex
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <span key={i} className="text-primary font-black underline decoration-2 underline-offset-2 decoration-primary/30">{part}</span>
                ) : (
                    part
                )
            )}
        </>
    );
};

const RailSearch: React.FC<RailSearchProps> = ({ railData, onSelectStation, onSelectLine, isMobile }) => {
    const { isKorean, isJapanese, language } = useI18n();
    const t = getTranslations(RAIL_SEARCH_TRANSLATIONS, language);
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const regionNames = useRegionNames();
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [recentSearches, setRecentSearches] = useState<{ id: string, name: string, name_en?: string, name_kr?: string, type: 'station' | 'line' }[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        const saved = localStorage.getItem('jprail_recent_searches');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse recent searches", e);
            }
        }
    }, []);

    const addToRecent = (id: string, name: string, name_en: string | undefined, name_kr: string | undefined, type: 'station' | 'line') => {
        setRecentSearches(prev => {
            const next = [{ id, name, name_en, name_kr, type }, ...prev.filter(s => s.id !== id)].slice(0, 5);
            localStorage.setItem('jprail_recent_searches', JSON.stringify(next));
            return next;
        });
    };

    const clearRecent = () => {
        setRecentSearches([]);
        localStorage.removeItem('jprail_recent_searches');
    };



    // Global shortcut Ctrl+K / Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
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

        // Search Stations - Deduplicate by name and prefecture for cleaner list
        const stationsMap = new Map<string, Station>();
        rankByRelevance(Object.values(railData.stations), q).forEach(s => {
            const key = `${s.name}-${s.prefecture_id}`;
            if (!stationsMap.has(key)) stationsMap.set(key, s);
        });

        const matchedStations = Array.from(stationsMap.values()).slice(0, 15);
        const matchedLines = rankByRelevance(Object.values(railData.lines), q, 10);

        return { stations: matchedStations, lines: matchedLines };
    }, [railData, query]);

    const totalResults = results.stations.length + results.lines.length;
    const hasResults = totalResults > 0;

    useEffect(() => {
        setSelectedIndex(-1);
    }, [query]);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && listRef.current) {
            const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const max = query.length === 0 ? recentSearches.length : totalResults;
            if (max > 0) setSelectedIndex(prev => (prev + 1) % max);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const max = query.length === 0 ? recentSearches.length : totalResults;
            if (max > 0) setSelectedIndex(prev => (prev - 1 + max) % max);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            if (query.length === 0) {
                const recent = recentSearches[selectedIndex];
                if (recent.type === 'station') handleSelectStation(recent.id);
                else {
                    const line = Object.values(railData?.lines || {}).find(l => l.id.toString() === recent.id);
                    if (line) handleSelectLine(line);
                }
                return;
            }

            if (selectedIndex < results.stations.length) {
                const station = results.stations[selectedIndex];
                handleSelectStation(station.id);
            } else {
                const lineIndex = selectedIndex - results.stations.length;
                const line = results.lines[lineIndex];
                handleSelectLine(line);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    const handleSelectStation = (id: string) => {
        const station = railData?.stations[id];
        if (station) addToRecent(id, station.name, station.name_en, station.name_kr, 'station');
        onSelectStation(id);
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(-1);
    };

    const handleSelectLine = (line: Line) => {
        addToRecent(line.id.toString(), line.name, line.name_en, line.name_kr, 'line');
        const fullId = `${line.corp_id}::${line.id}`;
        onSelectLine(line.id.toString(), fullId);
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(-1);
    };

    const getStationLines = (station: Station) => {
        if (!railData) return [];
        const linesMap = new Map<string, { name: string, name_en?: string, name_kr?: string, color: string }>();
        station.platform_ids?.forEach(pid => {
            const platform = railData.platforms[pid];
            if (platform) {
                const line = railData.lines[platform.line];
                if (line) {
                    linesMap.set(line.id.toString(), {
                        name: line.name,
                        name_en: line.name_en,
                        name_kr: line.name_kr,
                        color: line.color || '#3b82f6'
                    });
                }
            }
        });
        return Array.from(linesMap.values());
    };

    const getLineCompany = (line: Line) => {
        if (!railData) return null;
        return railData.companies[line.corp_id];
    };

    const getPlaceholder = () => {
        return t.placeholder;
    };

    return (
        <div ref={containerRef} className="relative w-full max-w-xs lg:max-w-sm">
            <div className="relative flex items-center w-full">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={getPlaceholder()}
                    className="w-full h-9 pl-9 pr-8 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/50 focus:bg-white dark:focus:bg-slate-900 border border-transparent focus:border-slate-200 dark:focus:border-slate-700 rounded-full transition-all focus:outline-none placeholder-slate-400 text-slate-800 dark:text-white"
                />
                <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                {query ? (
                    <button
                        onClick={() => {
                            setQuery('');
                            setIsOpen(false);
                        }}
                        className="absolute right-3 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all text-slate-400"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                ) : (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500">
                            {typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500">K</span>
                    </div>
                )}
            </div>

            {/* Results Popover */}
            {isOpen && (query.length > 0 || recentSearches.length > 0) && (
                <div className="absolute top-10 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-[2000] max-h-[70vh] flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                    {query.length === 0 ? (
                        <div className="p-2">
                            <div className="px-3 py-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <History className="w-3.5 h-3.5" />
                                    {t.recentSearches}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        clearRecent();
                                    }}
                                    className="hover:text-primary transition-colors lowercase tracking-normal font-bold"
                                >
                                    {t.clearAll}
                                </button>
                            </div>
                            <div className="space-y-1">
                                {recentSearches.map((recent, idx) => {
                                    const isSelected = selectedIndex === idx;
                                    return (
                                        <button
                                            key={`${recent.type}-${recent.id}`}
                                            data-index={idx}
                                            onClick={() => {
                                                if (recent.type === 'station') handleSelectStation(recent.id);
                                                else {
                                                    const line = Object.values(railData?.lines || {}).find(l => l.id.toString() === recent.id);
                                                    if (line) handleSelectLine(line);
                                                }
                                            }}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                            className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 border ${isSelected
                                                ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
                                                }`}
                                        >
                                            {recent.type === 'station' ? (
                                                <MapPin className="w-4 h-4 text-primary shrink-0" />
                                            ) : (
                                                <Train className="w-4 h-4 text-indigo-400 shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0 flex flex-col">
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{language === 'ja' ? recent.name : getLocalizedName(recent, language)}</span>
                                                {language !== 'ja' && (
                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate">
                                                        {recent.name}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${recent.type === 'station'
                                                ? 'text-primary bg-primary/10 border-primary/20'
                                                : 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20'
                                                }`}>
                                                {recent.type === 'station' ? t.station : t.line}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : !hasResults ? (
                        <div className="p-8 text-center animate-in fade-in zoom-in duration-200">
                            <div className="size-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                                <SearchX className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">{t.noResults}</h4>
                            <p className="text-xs text-slate-400 font-bold px-2">{t.noResultsDetail(query)}</p>
                        </div>
                    ) : (
                        <div ref={listRef} className="overflow-y-auto custom-scrollbar max-h-[360px]">
                            {/* Stations Section */}
                            {results.stations.length > 0 && (
                                <div className="p-2">
                                    <div className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="size-2 rounded-full bg-primary/40 animate-pulse"></div>
                                        {t.stationsFound(results.stations.length)}
                                    </div>
                                    <div className="space-y-1">
                                        {results.stations.map((station, idx) => {
                                            const isSelected = selectedIndex === idx;
                                            const lines = getStationLines(station);
                                            const address = getLocalizedAddress(station.prefecture_id, station.city_id, regionNames, language);

                                            return (
                                                <button
                                                    key={station.id}
                                                    data-index={idx}
                                                    onClick={() => handleSelectStation(station.id)}
                                                    onMouseEnter={() => setSelectedIndex(idx)}
                                                    className={`w-full text-left p-4 rounded-2xl transition-all group/item flex justify-between items-start gap-3 border ${isSelected
                                                        ? 'bg-primary/10 border-primary/20 shadow-sm'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
                                                        }`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="mb-1.5 flex flex-col">
                                                            <h3 className={`text-xl font-black transition-colors leading-tight ${isSelected ? 'text-primary' : 'text-slate-950 dark:text-white group-hover/item:text-primary'
                                                                }`}>
                                                                <HighlightMatch text={language === 'ja' ? station.name : getLocalizedName(station, language)} query={query} />
                                                            </h3>
                                                            {language !== 'ja' && (
                                                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                                                    <HighlightMatch text={station.name} query={query} />
                                                                </span>
                                                            )}
                                                        </div>

                                                        {address && (
                                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-3 uppercase tracking-tight">
                                                                <span className="material-symbols-outlined text-[14px]">location_on</span>
                                                                <span className="truncate">
                                                                    {address}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="flex flex-wrap gap-1.5">
                                                            {lines.map((l, lIdx) => (
                                                                <div key={lIdx} className="flex flex-col gap-0.5 bg-white/50 dark:bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: l.color }}></div>
                                                                        <span className="text-[9px] font-extrabold text-slate-600 dark:text-slate-400 tracking-tight leading-tight">{getLocalizedName(l, language)}</span>
                                                                    </div>
                                                                    {(isKorean ? l.name_kr || l.name_en : l.name_en) && (
                                                                        <span className="text-[7.5px] font-bold text-slate-400 dark:text-slate-500 leading-none pl-3 uppercase">
                                                                            {isKorean ? l.name_kr || l.name_en : l.name_en}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className={`shrink-0 size-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-primary text-white scale-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-0 group-hover/item:opacity-100 scale-90'
                                                        }`}>
                                                        <span className="material-symbols-outlined text-xl">{isSelected ? 'near_me' : 'search'}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Divider */}
                            {results.stations.length > 0 && results.lines.length > 0 && (
                                <div className="h-px bg-slate-100 dark:bg-slate-800 mx-6 my-2"></div>
                            )}

                            {/* Lines Section */}
                            {results.lines.length > 0 && (
                                <div className="p-2">
                                    <div className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="size-2 rounded-full bg-indigo-400/40 animate-pulse"></div>
                                        {t.linesFound(results.lines.length)}
                                    </div>
                                    <div className="space-y-1">
                                        {results.lines.map((line, idx) => {
                                            const globalIdx = results.stations.length + idx;
                                            const isSelected = selectedIndex === globalIdx;
                                            const company = getLineCompany(line);
                                            const lineColor = line.color || '#3b82f6';

                                            return (
                                                <button
                                                    key={line.id}
                                                    data-index={globalIdx}
                                                    onClick={() => handleSelectLine(line)}
                                                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                                                    className={`w-full text-left p-4 rounded-2xl transition-all group/item flex items-center gap-4 border ${isSelected
                                                        ? 'bg-indigo-500/10 border-indigo-500/20 shadow-sm'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
                                                        }`}
                                                >
                                                    <div
                                                        className="size-12 rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-inner relative transition-transform duration-500 group-hover/item:rotate-12"
                                                        style={{
                                                            borderColor: lineColor,
                                                            backgroundColor: lineColor + '15'
                                                        }}
                                                    >
                                                        <span className="material-symbols-outlined text-2xl" style={{ color: lineColor }}>subway</span>
                                                        <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm">
                                                            <div className="size-2 rounded-full" style={{ backgroundColor: lineColor }}></div>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-0.5 gap-2">
                                                            <div className="flex flex-col">
                                                                <h3 className={`text-[17px] font-black transition-colors leading-tight ${isSelected ? 'text-indigo-600' : 'text-slate-950 dark:text-white group-hover/item:text-indigo-500'
                                                                    }`}>
                                                                    <HighlightMatch text={getLocalizedName(line, language)} query={query} />
                                                                </h3>
                                                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate">
                                                                    <HighlightMatch text={isKorean ? line.name_kr || line.name_en || '' : line.name_en || ''} query={query} />
                                                                </span>
                                                            </div>
                                                            {company?.name && (
                                                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 shrink-0 mt-1 flex flex-col items-end">
                                                                    <span className="leading-tight">{getLocalizedName(company, language)}</span>
                                                                    {isKorean && (company.name_kr || company.name_en) && (
                                                                        <span className="text-[8px] opacity-60 leading-none">{company.name_kr || company.name_en}</span>
                                                                    )}
                                                                    {!isKorean && company.name_en && (
                                                                        <span className="text-[8px] opacity-60 leading-none">{company.name_en}</span>
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={`shrink-0 size-8 rounded-lg flex items-center justify-center transition-all duration-300 ${isSelected ? 'text-indigo-500 scale-100' : 'text-slate-300 opacity-0 group-hover/item:opacity-100 scale-90'
                                                        }`}>
                                                        <span className="material-symbols-outlined text-xl">map</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bottom Status Bar */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 flex justify-between items-center px-6">
                        <div className="flex items-center gap-3">
                            <span className="uppercase tracking-[0.2em]">{t.pressEnter}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 opacity-60">
                                <span className="p-1 px-1.5 bg-slate-200 dark:bg-slate-700 rounded text-[9px]">ESC</span>
                                <span>{t.close}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-xs">keyboard_return</span>
                                <span className="uppercase tracking-widest">{t.showOnMap}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RailSearch;

