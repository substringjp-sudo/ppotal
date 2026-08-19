"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { RailData, Station } from '../types/railData';
import { Trip } from '../types/trip';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName, getLocalizedAddress, RegionNames } from '../lib/i18n-utils';
import { useRegionNames } from '../hooks/useRegionNames';
import { MY_LINES_TRANSLATIONS, getTranslations } from '../lib/translations';
import { findCandidateRoutes, CandidateRoute, RouteSearchResult, RouteSegment } from '../lib/routeSearch';
import RouteMiniMap, { RouteMiniMapWaypoint } from './RouteMiniMap';
import { rankByRelevance } from '../lib/searchRanking';
import { Z } from '../lib/layers';

export interface RouteGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    railData: RailData | null;
    onAddTrip: (trip: Trip) => void;
}

type Translations = ReturnType<typeof getTranslations<typeof MY_LINES_TRANSLATIONS.ko>>;

/** Picks legible text for a coloured line badge. */
const textOn = (hex?: string) => {
    if (!hex) return '#ffffff';
    const value = hex.replace('#', '');
    if (value.length !== 6) return '#ffffff';
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.62 ? '#0f172a' : '#ffffff';
};

const getStationLineColors = (station: Station, railData: RailData | null): string[] => {
    if (!railData) return [];
    const colors = new Set<string>();
    station.platform_ids?.forEach(pid => {
        const line = railData.lines[railData.platforms[pid]?.line];
        if (line) colors.add(line.color || '#94a3b8');
    });
    return Array.from(colors).slice(0, 6);
};

/* ------------------------------------------------------------------ *
 * Compact station picker
 * ------------------------------------------------------------------ */

interface StationPickerRowProps {
    role: 'start' | 'via' | 'end';
    placeholder: string;
    selectedStation: Station | null;
    onSelectStation: (station: Station | null) => void;
    railData: RailData | null;
    regionNames: RegionNames | null;
    onRemove?: () => void;
}

const ROLE_STYLES: Record<StationPickerRowProps['role'], { dot: string; ring: string }> = {
    start: { dot: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
    via: { dot: 'bg-amber-500', ring: 'ring-amber-500/30' },
    end: { dot: 'bg-rose-500', ring: 'ring-rose-500/30' }
};

const StationPickerRow: React.FC<StationPickerRowProps> = ({
    role,
    placeholder,
    selectedStation,
    onSelectStation,
    railData,
    regionNames,
    onRemove
}) => {
    const { language } = useI18n();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const results = useMemo(() => {
        if (!railData) return [];
        const q = query.toLowerCase().trim();
        if (!q) return [];

        const scored: Station[] = [];
        const seen = new Set<string>();

        for (const station of rankByRelevance(Object.values(railData.stations), q)) {
            const key = `${station.name}-${station.prefecture_id}`;
            if (seen.has(key)) continue;
            seen.add(key);
            scored.push(station);
            if (scored.length >= 8) break;
        }

        return scored;
    }, [railData, query]);

    const styles = ROLE_STYLES[role];

    return (
        <div className="relative" ref={containerRef}>
            <div
                className={`flex items-center gap-2 h-9 px-2 rounded-xl border bg-white dark:bg-slate-900 transition-shadow ${
                    isOpen
                        ? `border-primary ring-2 ${styles.ring}`
                        : 'border-slate-200 dark:border-slate-700'
                }`}
            >
                <span className={`size-2 rounded-full shrink-0 ${styles.dot}`} />

                {selectedStation ? (
                    <button
                        type="button"
                        onClick={() => {
                            onSelectStation(null);
                            setQuery('');
                            setIsOpen(true);
                            requestAnimationFrame(() => inputRef.current?.focus());
                        }}
                        className="flex-1 min-w-0 flex items-baseline gap-1.5 text-left group"
                    >
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                            {getLocalizedName(selectedStation, language)}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                            {getLocalizedAddress(
                                selectedStation.prefecture_id,
                                selectedStation.city_id,
                                regionNames,
                                language
                            )}
                        </span>
                        <span className="material-symbols-outlined text-[13px] text-slate-300 group-hover:text-primary shrink-0 ml-auto">
                            edit
                        </span>
                    </button>
                ) : (
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder={placeholder}
                        className="flex-1 min-w-0 bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none"
                    />
                )}

                {onRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="p-0.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                    >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                )}
            </div>

            {isOpen && !selectedStation && results.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[1100] max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {results.map(station => (
                        <button
                            key={station.id}
                            type="button"
                            onClick={() => {
                                onSelectStation(station);
                                setQuery('');
                                setIsOpen(false);
                            }}
                            className="w-full px-2.5 py-1.5 text-left hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex items-center gap-2"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                        {getLocalizedName(station, language)}
                                    </span>
                                    {language !== 'ja' && (
                                        <span className="text-[9px] text-slate-400 shrink-0">{station.name}</span>
                                    )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                    {getLocalizedAddress(
                                        station.prefecture_id,
                                        station.city_id,
                                        regionNames,
                                        language
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-0.5 shrink-0">
                                {getStationLineColors(station, railData).map((color, index) => (
                                    <span
                                        key={index}
                                        className="size-1.5 rounded-full"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ------------------------------------------------------------------ *
 * Route visualisation pieces
 * ------------------------------------------------------------------ */

/** Proportional bar showing which line covers which share of the ride. */
const RouteStrip: React.FC<{ segments: RouteSegment[]; language: 'ko' | 'en' | 'ja' }> = ({
    segments,
    language
}) => (
    <div className="flex items-stretch gap-[3px] h-[22px]">
        {segments.map((segment, index) => {
            if (segment.kind === 'walk') {
                return (
                    <div
                        key={index}
                        className="w-5 shrink-0 flex items-center justify-center rounded-md border border-dashed border-slate-300 dark:border-slate-600"
                    >
                        <span className="material-symbols-outlined text-[12px] text-slate-400">
                            directions_walk
                        </span>
                    </div>
                );
            }

            const color = segment.line?.color || '#1c74e9';
            return (
                <div
                    key={index}
                    className="min-w-[28px] rounded-md px-1.5 flex items-center overflow-hidden"
                    style={{ flexGrow: Math.max(segment.distance, 0.5), flexBasis: 0, backgroundColor: color }}
                    title={`${getLocalizedName(segment.line, language)} · ${segment.distance}km`}
                >
                    <span
                        className="text-[9px] font-extrabold truncate leading-none"
                        style={{ color: textOn(color) }}
                    >
                        {getLocalizedName(segment.line, language)}
                    </span>
                </div>
            );
        })}
    </div>
);

type StationLabeller = (stationId: string, fallback: string) => string;

/** Vertical breakdown shown for the route the user has picked. */
const RouteDetail: React.FC<{
    candidate: CandidateRoute;
    language: 'ko' | 'en' | 'ja';
    t: Translations;
    stationLabel: StationLabeller;
}> = ({ candidate, language, t, stationLabel }) => (
    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
        {candidate.segments.map((segment, index) => (
            <div key={index} className="flex items-stretch gap-2">
                <span
                    className={`w-[3px] rounded-full shrink-0 ${segment.kind === 'walk' ? 'bg-slate-300 dark:bg-slate-600' : ''}`}
                    style={
                        segment.kind === 'walk'
                            ? undefined
                            : { backgroundColor: segment.line?.color || '#1c74e9' }
                    }
                />
                <div className="flex-1 min-w-0 py-0.5">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                        {segment.kind === 'walk' ? t.walkTransfer : getLocalizedName(segment.line, language)}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                        {stationLabel(segment.fromStationId, segment.fromName)} →{' '}
                        {stationLabel(segment.toStationId, segment.toName)}
                        {segment.kind === 'rail' && ` · ${segment.distance} km`}
                    </div>
                </div>
            </div>
        ))}
    </div>
);

interface CandidateCardProps {
    candidate: CandidateRoute;
    isSelected: boolean;
    isHovered: boolean;
    onSelect: () => void;
    onHover: (hovered: boolean) => void;
    language: 'ko' | 'en' | 'ja';
    t: Translations;
    stationLabel: StationLabeller;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
    candidate,
    isSelected,
    isHovered,
    onSelect,
    onHover,
    language,
    t,
    stationLabel
}) => {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isHovered && cardRef.current) {
            cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [isHovered]);

    const badges = [
        candidate.isRecommended && { label: t.badgeRecommended, className: 'bg-primary text-white' },
        candidate.isShortest && {
            label: t.badgeShortest,
            className:
                'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
        },
        candidate.isFewestTransfers && {
            label: t.badgeFewestTransfers,
            className:
                'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25'
        }
    ].filter(Boolean) as { label: string; className: string }[];

    const first = candidate.segments[0];
    const last = candidate.segments[candidate.segments.length - 1];
    const chain = [
        first && stationLabel(first.fromStationId, first.fromName),
        ...candidate.transferStationIds.map((id, index) =>
            stationLabel(id, candidate.transfers[index] || id)
        ),
        last && stationLabel(last.toStationId, last.toName)
    ].filter(Boolean);

    return (
        <div
            ref={cardRef}
            onClick={onSelect}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
            className={`p-2.5 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                isSelected
                    ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
                    : isHovered
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-400/50 shadow-md scale-[1.01]'
                      : 'bg-white/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
            }`}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 flex-wrap min-w-0">
                    {badges.map(badge => (
                        <span
                            key={badge.label}
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide ${badge.className}`}
                        >
                            {badge.label}
                        </span>
                    ))}
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">
                        {candidate.transferCount === 0
                            ? t.direct
                            : t.transferTimes(candidate.transferCount)}
                    </span>
                </div>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0">{candidate.distance} km</span>
            </div>

            <RouteStrip segments={candidate.segments} language={language} />

            <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-400 truncate min-w-0">{chain.join(' · ')}</p>
                {isSelected && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        {t.selected}
                    </span>
                )}
            </div>

            {isSelected && (
                <RouteDetail
                    candidate={candidate}
                    language={language}
                    t={t}
                    stationLabel={stationLabel}
                />
            )}
        </div>
    );
};

/* ------------------------------------------------------------------ *
 * Modal
 * ------------------------------------------------------------------ */

export const RouteGeneratorModal: React.FC<RouteGeneratorModalProps> = ({
    isOpen,
    onClose,
    railData,
    onAddTrip
}) => {
    const { language } = useI18n();
    const t = getTranslations(MY_LINES_TRANSLATIONS, language);

    const regionNames = useRegionNames();

    const [startStation, setStartStation] = useState<Station | null>(null);
    const [endStation, setEndStation] = useState<Station | null>(null);
    const [viaStations, setViaStations] = useState<(Station | null)[]>([]);

    const [searchResult, setSearchResult] = useState<RouteSearchResult | null>(null);
    const [selectedByLeg, setSelectedByLeg] = useState<Record<number, string>>({});
    const [activeLeg, setActiveLeg] = useState(0);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        if (isOpen) return;
        setStartStation(null);
        setEndStation(null);
        setViaStations([]);
        setSearchResult(null);
        setSelectedByLeg({});
        setActiveLeg(0);
        setHoveredId(null);
        setHasSearched(false);
        setIsSearching(false);
    }, [isOpen]);

    // Editing the itinerary invalidates whatever was found for the old one.
    useEffect(() => {
        setSearchResult(null);
        setSelectedByLeg({});
        setHasSearched(false);
        setActiveLeg(0);
    }, [startStation, endStation, viaStations]);

    const stationLabel = useCallback<StationLabeller>(
        (stationId, fallback) => {
            const station = railData?.stations?.[stationId];
            return station ? getLocalizedName(station, language) : fallback;
        },
        [railData, language]
    );

    const legs = searchResult?.legs ?? [];

    const chosenCandidates = useMemo(
        () =>
            legs
                .map(leg => leg.candidates.find(c => c.id === selectedByLeg[leg.legIndex]))
                .filter((c): c is CandidateRoute => Boolean(c)),
        [legs, selectedByLeg]
    );

    const allLegsSelected = legs.length > 0 && chosenCandidates.length === legs.length;

    const summary = useMemo(() => {
        if (!allLegsSelected) return null;
        const distance = chosenCandidates.reduce((sum, c) => sum + c.distance, 0);
        const transfers = chosenCandidates.reduce((sum, c) => sum + c.transferCount, 0);
        return { distance: Math.round(distance * 10) / 10, transfers };
    }, [allLegsSelected, chosenCandidates]);

    const waypoints = useMemo<RouteMiniMapWaypoint[]>(() => {
        const list: RouteMiniMapWaypoint[] = [];
        if (startStation) list.push({ station: startStation, role: 'start' });
        viaStations.forEach(via => {
            if (via) list.push({ station: via, role: 'via' });
        });
        if (endStation) list.push({ station: endStation, role: 'end' });
        return list;
    }, [startStation, viaStations, endStation]);

    /** Everything on the map: settled legs plus the options for the leg being compared. */
    const { settled, alternatives } = useMemo(() => {
        const settledRoutes: CandidateRoute[] = [];
        legs.forEach(leg => {
            if (leg.legIndex === activeLeg) return;
            const chosen = leg.candidates.find(c => c.id === selectedByLeg[leg.legIndex]);
            if (chosen) settledRoutes.push(chosen);
        });
        return {
            settled: settledRoutes,
            alternatives: legs.find(leg => leg.legIndex === activeLeg)?.candidates ?? []
        };
    }, [legs, activeLeg, selectedByLeg]);

    const activeId = hoveredId ?? selectedByLeg[activeLeg] ?? null;

    // The summary card floats over the map; measure it so the route is never hidden behind it.
    const summaryRef = useRef<HTMLDivElement>(null);
    const [summaryHeight, setSummaryHeight] = useState(0);

    useEffect(() => {
        const element = summaryRef.current;
        if (!element || typeof ResizeObserver === 'undefined') {
            setSummaryHeight(0);
            return;
        }
        const observer = new ResizeObserver(entries => {
            const height = entries[0]?.contentRect.height ?? 0;
            setSummaryHeight(Math.round(height) + 20);
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [summary]);

    const handleSearchRoutes = useCallback(() => {
        if (!startStation || !endStation || !railData) return;

        setIsSearching(true);
        setHasSearched(false);

        const stops = [startStation, ...viaStations.filter((v): v is Station => v !== null), endStation];

        // Yield a frame so the spinner paints before the search blocks the thread.
        setTimeout(() => {
            const result = findCandidateRoutes(stops, railData);

            const initial: Record<number, string> = {};
            result.legs.forEach(leg => {
                if (leg.candidates.length > 0) initial[leg.legIndex] = leg.candidates[0].id;
            });

            setSearchResult(result);
            setSelectedByLeg(initial);
            setActiveLeg(0);
            setIsSearching(false);
            setHasSearched(true);
        }, 50);
    }, [startStation, endStation, viaStations, railData]);

    const handleCreateTrip = () => {
        if (!startStation || !endStation || !allLegsSelected) return;

        const stops = [startStation, ...viaStations.filter((v): v is Station => v !== null), endStation];
        const startName = getLocalizedName(startStation, language);
        const endName = getLocalizedName(endStation, language);

        const path: string[] = [];
        const sectionIds: number[] = [];
        const geometries: [number, number][][] = [];
        let distance = 0;

        chosenCandidates.forEach(candidate => {
            distance += candidate.distance;
            sectionIds.push(...candidate.sectionIds);
            geometries.push(...candidate.geometries);

            if (path.length > 0 && path[path.length - 1] === candidate.stationIds[0]) {
                path.push(...candidate.stationIds.slice(1));
            } else {
                path.push(...candidate.stationIds);
            }
        });

        onAddTrip({
            id: `trip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: `${startName} ~ ${endName}`,
            start: startName,
            end: endName,
            startId: startStation.id,
            endId: endStation.id,
            distance: Math.round(distance * 10) / 10,
            path,
            waypoints: stops.map(s => s.id),
            geometries,
            sectionIds,
            createdAt: new Date().toISOString()
        });
        onClose();
    };

    if (!isOpen) return null;

    const activeLegResult = legs.find(leg => leg.legIndex === activeLeg);

    return (
        // Above the map's side panels (z-5000) and the app header (z-10001).
        <div style={{ zIndex: Z.modal }} className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-5xl h-[94vh] sm:h-[88vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-primary">alt_route</span>
                        <div className="leading-tight">
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                                {t.createRouteTitle}
                            </h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                {t.routeSubtitle}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                {/* Body: list on the left, map on the right (map on top when narrow) */}
                <div className="flex-1 min-h-0 flex flex-col-reverse md:flex-row">
                    <aside className="flex-1 md:flex-none md:w-[340px] lg:w-[366px] min-h-0 flex flex-col border-t md:border-t-0 md:border-r border-slate-100 dark:border-slate-800">
                        {/* Planner — stays put while results scroll underneath it */}
                        <div className="p-2.5 shrink-0 space-y-1.5 bg-slate-50/70 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                            <StationPickerRow
                                role="start"
                                placeholder={t.searchStartPlaceholder}
                                selectedStation={startStation}
                                onSelectStation={setStartStation}
                                railData={railData}
                                regionNames={regionNames}
                            />

                            {viaStations.map((via, index) => (
                                <StationPickerRow
                                    key={index}
                                    role="via"
                                    placeholder={t.searchViaPlaceholder}
                                    selectedStation={via}
                                    onSelectStation={station =>
                                        setViaStations(prev =>
                                            prev.map((item, i) => (i === index ? station : item))
                                        )
                                    }
                                    onRemove={() =>
                                        setViaStations(prev => prev.filter((_, i) => i !== index))
                                    }
                                    railData={railData}
                                    regionNames={regionNames}
                                />
                            ))}

                            <StationPickerRow
                                role="end"
                                placeholder={t.searchEndPlaceholder}
                                selectedStation={endStation}
                                onSelectStation={setEndStation}
                                railData={railData}
                                regionNames={regionNames}
                            />

                            <div className="flex items-center gap-1.5 pt-0.5">
                                <button
                                    type="button"
                                    onClick={() => setViaStations(prev => [...prev, null])}
                                    className="h-9 px-2.5 rounded-xl text-[11px] font-bold text-primary hover:bg-primary/10 border border-primary/25 transition-colors flex items-center gap-1 shrink-0"
                                >
                                    <span className="material-symbols-outlined text-[15px]">add</span>
                                    {t.addVia}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSearchRoutes}
                                    disabled={!startStation || !endStation || isSearching}
                                    className={`flex-1 h-9 rounded-xl text-[11px] font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all ${
                                        !startStation || !endStation || isSearching
                                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                            : 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-[0.99]'
                                    }`}
                                >
                                    <span
                                        className={`material-symbols-outlined text-[15px] ${isSearching ? 'animate-spin' : ''}`}
                                    >
                                        {isSearching ? 'progress_activity' : 'search'}
                                    </span>
                                    {isSearching ? t.searching : t.searchRoute}
                                </button>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
                            {!hasSearched && !isSearching && (
                                <p className="text-[11px] text-slate-400 text-center py-6 px-4 leading-relaxed">
                                    {t.beforeSearchHint}
                                </p>
                            )}

                            {hasSearched && legs.length === 0 && (
                                <div className="p-5 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="material-symbols-outlined text-2xl text-slate-400 block mb-1">
                                        search_off
                                    </span>
                                    <p className="text-[11px] font-bold text-slate-500">{t.noRouteFound}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{t.noRouteHint}</p>
                                </div>
                            )}

                            {legs.length > 1 && (
                                <div className="space-y-1.5 mb-2">
                                    <div className="flex items-center justify-between px-0.5">
                                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px] text-primary">alt_route</span>
                                            {t.selectLegHeader}
                                        </span>
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                            chosenCandidates.length === legs.length
                                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
                                        }`}>
                                            {chosenCandidates.length}/{legs.length} {t.selected}
                                        </span>
                                    </div>
                                    <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-inner flex gap-1.5 overflow-x-auto custom-scrollbar">
                                        {legs.map(leg => {
                                            const isActive = leg.legIndex === activeLeg;
                                            const isLegSelected = Boolean(selectedByLeg[leg.legIndex]);
                                            return (
                                                <button
                                                    key={leg.legIndex}
                                                    type="button"
                                                    onClick={() => setActiveLeg(leg.legIndex)}
                                                    className={`flex-1 min-w-[140px] px-2.5 py-2 rounded-xl text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
                                                        isActive
                                                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-emerald-500 ring-4 ring-emerald-500/15 shadow-md font-bold'
                                                            : isLegSelected
                                                              ? 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-400 font-bold'
                                                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-sm font-bold animate-pulse'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-1 w-full">
                                                        <span className={`text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
                                                            isActive
                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                : isLegSelected
                                                                  ? 'text-slate-600 dark:text-slate-400'
                                                                  : 'text-amber-600 dark:text-amber-400'
                                                        }`}>
                                                            <span className="material-symbols-outlined text-[13px]">
                                                                {isLegSelected ? 'check_circle' : 'pending'}
                                                            </span>
                                                            {t.legLabel} {leg.legIndex + 1}
                                                        </span>
                                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                                            isActive
                                                                ? 'bg-emerald-500 text-white font-extrabold'
                                                                : isLegSelected
                                                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                                                  : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                                                        }`}>
                                                            {isLegSelected ? t.selected : t.needSelect}
                                                        </span>
                                                    </div>
                                                    <div className={`text-[11px] font-extrabold truncate ${
                                                        isActive ? 'text-emerald-950 dark:text-emerald-100 font-black' : 'text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {getLocalizedName(leg.startStation, language)} → {getLocalizedName(leg.endStation, language)}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {activeLegResult && (
                                <>
                                    <div className="flex items-center justify-between px-0.5">
                                        <h4 className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 truncate">
                                            {getLocalizedName(activeLegResult.startStation, language)} →{' '}
                                            {getLocalizedName(activeLegResult.endStation, language)}
                                        </h4>
                                        <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                            {t.candidateCount(activeLegResult.candidates.length)}
                                        </span>
                                    </div>

                                    {activeLegResult.candidates.map(candidate => (
                                        <CandidateCard
                                            key={candidate.id}
                                            candidate={candidate}
                                            isSelected={selectedByLeg[activeLeg] === candidate.id}
                                            isHovered={hoveredId === candidate.id}
                                            onSelect={() =>
                                                setSelectedByLeg(prev => ({
                                                    ...prev,
                                                    [activeLeg]: candidate.id
                                                }))
                                            }
                                            onHover={hovered => setHoveredId(hovered ? candidate.id : null)}
                                            language={language}
                                            t={t}
                                            stationLabel={stationLabel}
                                        />
                                    ))}

                                    {searchResult?.hasTooManyCandidates && (
                                        <p className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 rounded-lg p-2 leading-relaxed">
                                            {t.tooManyCandidatesWarning}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </aside>

                    {/* Map */}
                    <main className="relative h-[38vh] md:h-auto md:flex-1 min-h-0 bg-[#e6edf3] dark:bg-[#0b1220]">
                        <RouteMiniMap
                            railData={railData}
                            settled={settled}
                            alternatives={alternatives}
                            activeId={activeId}
                            waypoints={waypoints}
                            onHoverCandidate={setHoveredId}
                            onSelectCandidate={id => {
                                // Routes from already-decided legs are also on the map;
                                // clicking one must not overwrite the leg being edited.
                                if (!alternatives.some(candidate => candidate.id === id)) return;
                                setSelectedByLeg(prev => ({ ...prev, [activeLeg]: id }));
                            }}
                            emptyMessage={t.emptyMapHint}
                            bottomInset={summary ? summaryHeight : 0}
                        />

                        {summary && (
                            <div className="absolute inset-x-0 bottom-0 p-2.5 pointer-events-none">
                                <div ref={summaryRef} className="pointer-events-auto rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-xl p-2.5 flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-4 shrink-0">
                                        <div className="whitespace-nowrap">
                                            <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                                                {t.totalDistanceLabel}
                                            </div>
                                            <div className="text-sm font-black text-primary leading-tight">
                                                {summary.distance} km
                                            </div>
                                        </div>
                                        <div className="whitespace-nowrap">
                                            <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                                                {t.totalTransfersLabel}
                                            </div>
                                            <div className="text-sm font-black text-slate-700 dark:text-slate-200 leading-tight">
                                                {summary.transfers === 0
                                                    ? t.direct
                                                    : t.transferTimes(summary.transfers)}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCreateTrip}
                                        className="ml-auto h-9 px-3 rounded-xl bg-primary text-white text-[11px] font-extrabold uppercase tracking-wide hover:bg-primary/90 active:scale-[0.99] transition-all shadow-md shadow-primary/25 flex items-center justify-center gap-1.5 shrink-0 grow sm:grow-0"
                                    >
                                        <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                        {t.createTrip}
                                    </button>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};
