"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RailData, Station } from '../types/railData';
import { Trip } from '../types/trip';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName, getLocalizedAddress, RegionNames } from '../lib/i18n-utils';
import { MY_LINES_TRANSLATIONS, getTranslations } from '../lib/translations';
import { findCandidateRoutes, CandidateRoute, RouteSearchResult, LegSearchResult, RouteLineInfo } from '../lib/routeSearch';

export interface RouteGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    railData: RailData | null;
    onAddTrip: (trip: Trip) => void;
}

interface StationInputProps {
    label: string;
    placeholder: string;
    selectedStation: Station | null;
    onSelectStation: (station: Station | null) => void;
    railData: RailData | null;
    regionNames: RegionNames | null;
    onRemove?: () => void;
    isRemovable?: boolean;
    icon: string;
    iconColor?: string;
}

const getStationLines = (station: Station, railData: RailData | null) => {
    if (!railData) return [];
    const linesMap = new Map<string, { name: string; name_en?: string; name_kr?: string; color: string }>();
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

const StationPickerInput: React.FC<StationInputProps> = ({
    label,
    placeholder,
    selectedStation,
    onSelectStation,
    railData,
    regionNames,
    onRemove,
    isRemovable = false,
    icon,
    iconColor = 'text-primary'
}) => {
    const { language } = useI18n();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const POPULAR_NAMES = ['東京', '新大阪', '新宿', '京都', '名古屋', '博多'];

    const results = useMemo(() => {
        if (!railData) return [];
        const q = query.toLowerCase().trim();

        const stationsMap = new Map<string, Station>();

        if (!q) {
            Object.values(railData.stations).forEach(s => {
                if (POPULAR_NAMES.includes(s.name) && !stationsMap.has(s.name)) {
                    stationsMap.set(s.name, s);
                }
            });
            return Array.from(stationsMap.values());
        }

        Object.values(railData.stations).forEach(s => {
            const key = `${s.name}-${s.prefecture_id}`;
            if (!stationsMap.has(key)) {
                if (
                    s.name.toLowerCase().includes(q) ||
                    (s.name_en && s.name_en.toLowerCase().includes(q)) ||
                    (s.name_kr && s.name_kr.toLowerCase().includes(q))
                ) {
                    stationsMap.set(key, s);
                }
            }
        });

        return Array.from(stationsMap.values()).slice(0, 10);
    }, [railData, query]);

    const selectedAddress = selectedStation
        ? getLocalizedAddress(selectedStation.prefecture_id, selectedStation.city_id, regionNames, language)
        : '';
    const selectedLines = selectedStation ? getStationLines(selectedStation, railData) : [];

    return (
        <div className="relative flex flex-col gap-1" ref={containerRef}>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className={`material-symbols-outlined text-sm ${iconColor}`}>{icon}</span>
                {label}
            </label>

            {selectedStation ? (
                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in duration-150">
                    <div className="flex items-start gap-2.5 overflow-hidden flex-1 min-w-0">
                        <span className="material-symbols-outlined text-base text-primary shrink-0 mt-0.5">location_on</span>
                        <div className="flex flex-col min-w-0 space-y-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                    {getLocalizedName(selectedStation, language)}
                                </span>
                                {language !== 'ja' && selectedStation.name && (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                        {selectedStation.name}
                                    </span>
                                )}
                            </div>

                            {selectedAddress && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[11px] shrink-0">map</span>
                                    {selectedAddress}
                                </span>
                            )}

                            {selectedLines.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                    {selectedLines.map((l, lIdx) => (
                                        <div
                                            key={lIdx}
                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
                                        >
                                            <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: l.color }}></span>
                                            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                                                {getLocalizedName(l, language)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                            type="button"
                            onClick={() => onSelectStation(null)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title="변경"
                        >
                            <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        {isRemovable && onRemove && (
                            <button
                                type="button"
                                onClick={onRemove}
                                className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="삭제"
                            >
                                <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    />

                    {isOpen && results.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[1100] max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 custom-scrollbar">
                            {results.map(st => {
                                const address = getLocalizedAddress(st.prefecture_id, st.city_id, regionNames, language);
                                const lines = getStationLines(st, railData);

                                return (
                                    <button
                                        key={st.id}
                                        type="button"
                                        onClick={() => {
                                            onSelectStation(st);
                                            setQuery('');
                                            setIsOpen(false);
                                        }}
                                        className="w-full p-3 text-left hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex flex-col gap-1.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                                                {getLocalizedName(st, language)}
                                            </span>
                                            {language !== 'ja' && st.name && (
                                                <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                                    {st.name}
                                                </span>
                                            )}
                                        </div>

                                        {address && (
                                            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                                <span className="material-symbols-outlined text-[12px] text-slate-400">location_on</span>
                                                <span className="truncate">{address}</span>
                                            </div>
                                        )}

                                        {lines.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                {lines.map((l, lIdx) => (
                                                    <div
                                                        key={lIdx}
                                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60"
                                                    >
                                                        <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: l.color }}></span>
                                                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                                                            {getLocalizedName(l, language)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const RouteGeneratorModal: React.FC<RouteGeneratorModalProps> = ({
    isOpen,
    onClose,
    railData,
    onAddTrip
}) => {
    const { language } = useI18n();
    const t = getTranslations(MY_LINES_TRANSLATIONS, language);

    const [regionNames, setRegionNames] = useState<RegionNames | null>(null);

    useEffect(() => {
        fetch('/data/region_names.json')
            .then(res => res.json())
            .then(data => setRegionNames(data))
            .catch(err => console.error("Failed to load region names:", err));
    }, []);

    const [startStation, setStartStation] = useState<Station | null>(null);
    const [endStation, setEndStation] = useState<Station | null>(null);
    const [viaStations, setViaStations] = useState<(Station | null)[]>([]);

    const [searchResult, setSearchResult] = useState<RouteSearchResult | null>(null);
    const [selectedLegCandidates, setSelectedLegCandidates] = useState<Record<number, CandidateRoute | null>>({});
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setStartStation(null);
            setEndStation(null);
            setViaStations([]);
            setSearchResult(null);
            setSelectedLegCandidates({});
            setHasSearched(false);
            setIsSearching(false);
        }
    }, [isOpen]);

    // Compute combined stats for summary card (Hooks MUST be above early return if (!isOpen) return null)
    const combinedStats = useMemo(() => {
        if (!searchResult || !searchResult.legs.length) return null;
        let dist = 0;
        let transfers = 0;
        const lineList: RouteLineInfo[] = [];

        searchResult.legs.forEach(leg => {
            const chosen = selectedLegCandidates[leg.legIndex];
            if (chosen) {
                dist += chosen.distance;
                transfers += chosen.transferCount;
                chosen.lines.forEach(l => {
                    if (lineList.length === 0 || lineList[lineList.length - 1].id !== l.id) {
                        lineList.push(l);
                    }
                });
            }
        });

        return {
            totalDistance: Math.round(dist * 10) / 10,
            totalTransfers: transfers,
            lines: lineList
        };
    }, [searchResult, selectedLegCandidates]);

    if (!isOpen) return null;

    const handleAddVia = () => {
        setViaStations(prev => [...prev, null]);
    };

    const handleRemoveVia = (index: number) => {
        setViaStations(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleSetVia = (index: number, station: Station | null) => {
        setViaStations(prev => {
            const next = [...prev];
            next[index] = station;
            return next;
        });
    };

    const handleSearchRoutes = () => {
        if (!startStation || !endStation || !railData) return;

        setIsSearching(true);
        setHasSearched(false);

        const validVias = viaStations.filter((v): v is Station => v !== null);
        const waypoints = [startStation, ...validVias, endStation];

        setTimeout(() => {
            const result = findCandidateRoutes(waypoints, railData);
            setSearchResult(result);

            // Pre-select top candidate for each leg
            const initialSelected: Record<number, CandidateRoute | null> = {};
            result.legs.forEach(leg => {
                initialSelected[leg.legIndex] = leg.candidates.length > 0 ? leg.candidates[0] : null;
            });
            setSelectedLegCandidates(initialSelected);

            setIsSearching(false);
            setHasSearched(true);
        }, 150);
    };

    const handleSelectCandidateForLeg = (legIndex: number, candidate: CandidateRoute) => {
        setSelectedLegCandidates(prev => ({
            ...prev,
            [legIndex]: candidate
        }));
    };

    const handleCreateCombinedTrip = () => {
        if (!startStation || !endStation || !searchResult || searchResult.legs.length === 0) return;

        const validVias = viaStations.filter((v): v is Station => v !== null);
        const waypoints = [startStation, ...validVias, endStation];

        const startName = getLocalizedName(startStation, language);
        const endName = getLocalizedName(endStation, language);

        let totalDist = 0;
        const combinedStationIds: string[] = [];
        const combinedSectionIds: number[] = [];
        const combinedGeometries: [number, number][][] = [];

        searchResult.legs.forEach(leg => {
            const chosen = selectedLegCandidates[leg.legIndex];
            if (chosen) {
                totalDist += chosen.distance;
                chosen.sectionIds.forEach(s => combinedSectionIds.push(s));
                chosen.geometries.forEach(g => combinedGeometries.push(g));

                if (combinedStationIds.length === 0) {
                    combinedStationIds.push(...chosen.stationIds);
                } else {
                    if (combinedStationIds[combinedStationIds.length - 1] === chosen.stationIds[0]) {
                        combinedStationIds.push(...chosen.stationIds.slice(1));
                    } else {
                        combinedStationIds.push(...chosen.stationIds);
                    }
                }
            }
        });

        const newTrip: Trip = {
            id: `trip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: `${startName} ~ ${endName}`,
            start: startName,
            end: endName,
            startId: startStation.id,
            endId: endStation.id,
            distance: Math.round(totalDist * 10) / 10,
            path: combinedStationIds,
            waypoints: waypoints.map(w => w.id),
            geometries: combinedGeometries,
            sectionIds: combinedSectionIds,
            createdAt: new Date().toISOString()
        };

        onAddTrip(newTrip);
        onClose();
    };

    const isSearchDisabled = !startStation || !endStation;

    const allLegsSelected = searchResult && searchResult.legs.length > 0 &&
        searchResult.legs.every(leg => Boolean(selectedLegCandidates[leg.legIndex]));

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-xl">alt_route</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white text-base">
                                {t.createRouteTitle || '경로 자동 생성'}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                시작역과 도착역 사이의 세부 경로를 한눈에 비교하고 선택합니다.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                    {/* Station Inputs */}
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        {/* Start Station */}
                        <StationPickerInput
                            label={t.startStation || '시작역'}
                            placeholder="시작역 이름을 검색하세요 (예: 東京, Tokyo, 도쿄)"
                            selectedStation={startStation}
                            onSelectStation={setStartStation}
                            railData={railData}
                            regionNames={regionNames}
                            icon="trip_origin"
                            iconColor="text-emerald-500"
                        />

                        {/* Via Stations */}
                        {viaStations.map((via, idx) => (
                            <StationPickerInput
                                key={idx}
                                label={`${t.viaStation || '경유역'} ${idx + 1}`}
                                placeholder="경유역 이름을 검색하세요"
                                selectedStation={via}
                                onSelectStation={(st) => handleSetVia(idx, st)}
                                railData={railData}
                                regionNames={regionNames}
                                isRemovable={true}
                                onRemove={() => handleRemoveVia(idx)}
                                icon="adjust"
                                iconColor="text-amber-500"
                            />
                        ))}

                        {/* Add Via Button */}
                        <div className="flex justify-start">
                            <button
                                type="button"
                                onClick={handleAddVia}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors border border-primary/20"
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                                {t.addVia || '경유역 추가'}
                            </button>
                        </div>

                        {/* End Station */}
                        <StationPickerInput
                            label={t.endStation || '도착역'}
                            placeholder="도착역 이름을 검색하세요 (예: 新大阪, Shin-Osaka, 신오사카)"
                            selectedStation={endStation}
                            onSelectStation={setEndStation}
                            railData={railData}
                            regionNames={regionNames}
                            icon="location_on"
                            iconColor="text-rose-500"
                        />
                    </div>

                    {/* Search Button */}
                    <button
                        type="button"
                        onClick={handleSearchRoutes}
                        disabled={isSearchDisabled || isSearching}
                        className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                            isSearchDisabled || isSearching
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20 active:scale-[0.99]'
                        }`}
                    >
                        {isSearching ? (
                            <>
                                <span className="animate-spin material-symbols-outlined text-base">progress_activity</span>
                                경로 탐색 중...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-base">search</span>
                                {t.searchRoute || '경로 탐색'}
                            </>
                        )}
                    </button>

                    {/* Search Results */}
                    {hasSearched && searchResult && (
                        <div className="space-y-5 pt-2 animate-in fade-in duration-200">
                            {/* Warning Banner if >= 5 Candidates */}
                            {searchResult.hasTooManyCandidates && (
                                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
                                    <span className="material-symbols-outlined text-lg text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">warning</span>
                                    <div className="text-xs font-semibold leading-relaxed">
                                        <p className="font-bold mb-0.5">
                                            경우의 수가 5개 이상 발견되었습니다.
                                        </p>
                                        <p className="text-[11px] opacity-90">
                                            {t.tooManyCandidatesWarning || '경유역을 추가하면 더 정확한 경로를 지정할 수 있습니다.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {searchResult.legs.length > 0 ? (
                                <div className="space-y-6">
                                    {/* All Legs Stacked Vertically for At-a-Glance Selection */}
                                    {searchResult.legs.map((leg, legIdx) => {
                                        const sName = getLocalizedName(leg.startStation, language);
                                        const eName = getLocalizedName(leg.endStation, language);
                                        const currentSelected = selectedLegCandidates[legIdx];

                                        return (
                                            <div
                                                key={legIdx}
                                                className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800"
                                            >
                                                {/* Leg Section Title Banner */}
                                                <div className="flex items-center justify-between px-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="size-6 rounded-xl bg-primary text-white flex items-center justify-center text-xs font-black shadow-xs">
                                                            {legIdx + 1}
                                                        </span>
                                                        <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                                            <span>{sName}</span>
                                                            <span className="text-primary font-black">➔</span>
                                                            <span>{eName}</span>
                                                        </h4>
                                                    </div>

                                                    <span className="text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                                        경우의 수 {leg.candidates.length}개
                                                    </span>
                                                </div>

                                                {/* Candidate Cards Stack */}
                                                <div className="grid grid-cols-1 gap-2.5">
                                                    {leg.candidates.map((candidate) => {
                                                        const isSelected = currentSelected?.id === candidate.id;

                                                        return (
                                                            <div
                                                                key={candidate.id}
                                                                onClick={() => handleSelectCandidateForLeg(legIdx, candidate)}
                                                                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                                                                    isSelected
                                                                        ? 'bg-white dark:bg-slate-900 border-primary shadow-md ring-2 ring-primary/20'
                                                                        : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 shadow-2xs'
                                                                }`}
                                                            >
                                                                {/* Category Badges & Stats */}
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        {candidate.category === 'distance' ? (
                                                                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                                                                <span className="material-symbols-outlined text-[12px]">bolt</span>
                                                                                거리순 {candidate.rank}위
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                                                                                <span className="material-symbols-outlined text-[12px]">sync_alt</span>
                                                                                최소환승 {candidate.rank}위
                                                                            </span>
                                                                        )}

                                                                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                                            {candidate.transferCount === 0 ? '직통 (환승 없음)' : `환승 ${candidate.transferCount}회`}
                                                                        </span>
                                                                    </div>

                                                                    <div className="text-xs font-black text-primary">
                                                                        {candidate.distance} KM
                                                                    </div>
                                                                </div>

                                                                {/* Lines Badges */}
                                                                <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                                                                    {candidate.lines.map((line, lIdx) => (
                                                                        <React.Fragment key={line.id}>
                                                                            {lIdx > 0 && (
                                                                                <span className="text-slate-300 dark:text-slate-600 text-xs font-bold">➔</span>
                                                                            )}
                                                                            <span
                                                                                className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-2xs"
                                                                                style={{ backgroundColor: line.color || '#3b82f6' }}
                                                                            >
                                                                                {getLocalizedName(line, language)}
                                                                            </span>
                                                                        </React.Fragment>
                                                                    ))}
                                                                </div>

                                                                {/* Choice Indicator */}
                                                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                                                                    <span className="text-[10px] text-slate-400">
                                                                        {candidate.stationNames.slice(0, 5).join(' ➔ ')}
                                                                        {candidate.stationNames.length > 5 && ' ...'}
                                                                    </span>

                                                                    <div className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                                                                        isSelected
                                                                            ? 'bg-primary text-white shadow-2xs'
                                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                                    }`}>
                                                                        <span className="material-symbols-outlined text-xs">
                                                                            {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                                                                        </span>
                                                                        {isSelected ? '선택됨' : '선택'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Combined Route Summary & Action Card */}
                                    {allLegsSelected && combinedStats && (
                                        <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/30 shadow-xl space-y-3 mt-4 animate-in fade-in duration-200">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-xl text-primary">route</span>
                                                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                                        최종 조합 경로 요약
                                                    </h4>
                                                </div>
                                                <div className="text-xs font-black text-primary">
                                                    총 {combinedStats.totalDistance} KM
                                                </div>
                                            </div>

                                            {/* Combined line badges */}
                                            <div className="flex flex-wrap items-center gap-1.5 bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                                                {combinedStats.lines.map((line, lIdx) => (
                                                    <React.Fragment key={line.id}>
                                                        {lIdx > 0 && (
                                                            <span className="text-slate-300 dark:text-slate-600 text-xs font-bold">➔</span>
                                                        )}
                                                        <span
                                                            className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-2xs"
                                                            style={{ backgroundColor: line.color || '#3b82f6' }}
                                                        >
                                                            {getLocalizedName(line, language)}
                                                        </span>
                                                    </React.Fragment>
                                                ))}
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 px-1">
                                                <span>총 환승 횟수: {combinedStats.totalTransfers === 0 ? '직통 (환승 없음)' : `${combinedStats.totalTransfers}회`}</span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleCreateCombinedTrip}
                                                className="w-full py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-primary text-white hover:bg-primary/90 active:scale-[0.99] transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-base">check_circle</span>
                                                이 최종 경로로 여행 기록 생성
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
                                    <span className="material-symbols-outlined text-3xl mb-2 text-slate-400 block">search_off</span>
                                    {t.noRouteFound || '경로를 찾을 수 없습니다.'}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
