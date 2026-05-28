"use client";

import dynamic from 'next/dynamic';
import React from 'react';
import Link from 'next/link';

import { LanguageSelector } from './LanguageSelector';
import { trackEvent } from '../lib/gtag';

import HowToModal from './HowToModal';
import { useRailData } from '../hooks/useRailData';
import { useMapData } from '../hooks/useMapData';
import { Trip } from '../types/trip';
import { LineSegment, StationNode } from '../lib/graphUtils';
import { useAuth } from '@ppotal/ui';
import { Train, Map as MapIcon, Share2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { I18nProvider, useI18n } from '../lib/i18n-context';
import { collection, query, getDocs, setDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { getStationInfoRemote } from '../lib/rail-api';

import { Station } from '../types/railData';
import { MapProps } from './Map';
import MapLoadingIndicator from './MapLoadingIndicator';
import FeedbackModal from './FeedbackModal';
import AuthModal from './auth/AuthModal';
import ExportModal from './ExportModal';
import UpdateNoticeModal from './UpdateNoticeModal';



const MapWithNoSSR = dynamic<MapProps>(() => import('./Map'), {
    ssr: false,
    loading: () => <div style={{ height: '100%', width: '100%', backgroundColor: '#a0c4ff' }} />
});

const MapPaneWithNoSSR = dynamic(() => import('./MapPane'), { ssr: false });
import { SidebarProps } from './Sidebar';

const SidebarWithNoSSR = dynamic<SidebarProps>(() => import('./Sidebar'), { ssr: false });
import MyLinesPane from './MyLinesPane';
import RailSearch from './RailSearch';

import type { MobileLinePreviewProps } from './Mobile/MobileLinePreview';
const MobileLinePreviewWithNoSSR = dynamic<MobileLinePreviewProps>(() => import('./Mobile/MobileLinePreview'), { ssr: false });

import type { MobileStationPreviewProps } from './Mobile/MobileStationPreview';
const MobileStationPreviewWithNoSSR = dynamic<MobileStationPreviewProps>(() => import('./Mobile/MobileStationPreview'), { ssr: false });

import type { LineDetailPaneProps } from './LineDetailPane';
const LineDetailPaneWithNoSSR = dynamic<LineDetailPaneProps>(() => import('./LineDetailPane'), { ssr: false });

import type { StationDetailPaneProps } from './StationDetailPane';
const StationDetailPaneWithNoSSR = dynamic<StationDetailPaneProps>(() => import('./StationDetailPane'), { ssr: false });
const MapStylePanel = dynamic(() => import('./MapStylePanel'), { ssr: false });


export interface MapStyleSettings {
    unselected: {
        opacity: number;
        weight: number;
    };
    unvisited: {
        weight: number;
        showOutline: boolean;
        stationSize: number;
    };
    visited: {
        weight: number;
        showOutline: boolean;
        stationSize: number;
    };
    showLabels: boolean;
    showAirports: boolean;
}

export const DEFAULT_STYLE_SETTINGS: MapStyleSettings = {
    unselected: {
        opacity: 0.3,
        weight: 1.0,
    },
    unvisited: {
        weight: 2.5,
        showOutline: true,
        stationSize: 1.0,
    },
    visited: {
        weight: 3.5,
        showOutline: true,
        stationSize: 1.2,
    },
    showLabels: false,
    showAirports: true
};

const MobileBottomSheet = dynamic(() => import('./Mobile/MobileBottomSheet'), { ssr: false });

import { MAIN_PAGE_TRANSLATIONS, getTranslations } from '../lib/translations';


const MainPageClient = () => {
    const [selectedLines, setSelectedLines] = React.useState<string[]>([]);
    const [lineLengths, setLineLengths] = React.useState<Record<string, number>>({});
    const [visitedLineLengths, setVisitedLineLengths] = React.useState<Record<string, number>>({});
    const [recordedTrips, setRecordedTrips] = React.useState<Trip[]>([]);
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [activeLine, setActiveLine] = React.useState<string | null>(null);
    const [lineDetailData, setLineDetailData] = React.useState<{
        segments: LineSegment[],
        visitedEdges: Set<string>,
        visitedStations: Set<string>,
        nodes: Map<string, StationNode>,
        getShortestPath: (start: string, end: string, lines?: string[]) => Promise<{ path: string[], distance: number, geometries: [number, number][][], sectionIds: number[] } | null>
    } | null>(null);
    const [styleSettings, setStyleSettings] = React.useState<MapStyleSettings>(DEFAULT_STYLE_SETTINGS);
    const [selectedStation, setSelectedStation] = React.useState<Station | null>(null);
    // Trip Recording States
    const [tripStartStation, setTripStartStation] = React.useState<Station | null>(null);
    const isTripInProgress = !!tripStartStation;
    const [isMobile, setIsMobile] = React.useState(false);
    const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

    const [draftTrip, setDraftTrip] = React.useState<Trip | null>(null);
    const [tempPath, setTempPath] = React.useState<string[]>([]);
    const [isHowToOpen, setIsHowToOpen] = React.useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false);
    const [isInfoOpen, setIsInfoOpen] = React.useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
    const [isMapTransitioning, setIsMapTransitioning] = React.useState(false);
    const [isMapStyleOpen, setIsMapStyleOpen] = React.useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
    const [exportImageData, setExportImageData] = React.useState<string | null>(null);
    const { user, profile, loading: authLoading, refreshProfile } = useAuth();
    const [isHoverLoading, setIsHoverLoading] = React.useState(false);
    const [isRecordingLoading, setIsRecordingLoading] = React.useState(false);

    const { language, isKorean } = useI18n();
    const t = getTranslations(MAIN_PAGE_TRANSLATIONS, language);
    const toFirestoreTrip = (trip: Trip) => ({
        ...trip,
        geometries: JSON.stringify(trip.geometries)
    });

    const fromFirestoreTrip = (data: Record<string, unknown>): Trip => ({
        ...(data as unknown as Trip),
        geometries: typeof data.geometries === 'string' ? JSON.parse(data.geometries) : data.geometries
    });

    React.useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setWindowWidth(width);
            setIsMobile(width <= 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const exportMap = async () => {
        const mapElement = document.querySelector('.leaflet-container') as HTMLElement;
        if (!mapElement) return;

        setIsExportModalOpen(true);
        setExportImageData(null);

        try {
            const mapRect = mapElement.getBoundingClientRect();
            const exportScale = 2;
            const outputWidth = Math.round(mapRect.width * exportScale);
            const outputHeight = Math.round(mapRect.height * exportScale);

            // 최종 합성용 캔버스 생성
            const outputCanvas = document.createElement('canvas');
            outputCanvas.width = outputWidth;
            outputCanvas.height = outputHeight;
            const ctx = outputCanvas.getContext('2d')!;

            // 배경색 (바다색) 채우기
            ctx.fillStyle = '#a0c4ff';
            ctx.fillRect(0, 0, outputWidth, outputHeight);

            const dpr = window.devicePixelRatio || 1;

            // 지도 경계 클리핑 설정 (전체 그리기 동안 유지)
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, outputWidth, outputHeight);
            ctx.clip();

            // Leaflet Canvas pane들을 z-index 순서대로 합성
            // SVG pane은 상호작용 전용이므로 제외 (oklab 색상 파싱 에러 방지)
            const paneNames = ['background', 'railroad-glow', 'railroad-casing', 'railroad-lines', 'station-labels'];

            for (const paneName of paneNames) {
                const pane = mapElement.querySelector(`.leaflet-${paneName}-pane`) as HTMLElement | null;
                if (!pane) continue;

                const canvases = pane.querySelectorAll('canvas');
                for (const canvas of Array.from(canvases)) {
                    if (canvas.width === 0 || canvas.height === 0) continue;

                    try {
                        const canvasRect = canvas.getBoundingClientRect();
                        const offsetX = canvasRect.left - mapRect.left;
                        const offsetY = canvasRect.top - mapRect.top;
                        // canvas.width는 dpr 반영된 실제 픽셀, CSS 크기 = canvas.width / dpr
                        const cssW = canvas.width / dpr;
                        const cssH = canvas.height / dpr;

                        ctx.drawImage(
                            canvas,
                            0, 0, canvas.width, canvas.height,
                            offsetX * exportScale, offsetY * exportScale,
                            cssW * exportScale, cssH * exportScale
                        );
                    } catch (canvasErr) {
                        console.warn('[Export] canvas draw skipped:', canvasErr);
                    }
                }
            }

            ctx.restore();

            const dataUrl = outputCanvas.toDataURL('image/png');
            setExportImageData(dataUrl);
            trackEvent('export_map_preview', 'engagement', 'png');
        } catch (err) {
            console.error('[Export] Export failed:', err);
            setIsExportModalOpen(false);
        }
    };

    const handleLogout = async () => {
        const { logout } = await import('../lib/auth-context').then(m => m.useAuth()); // This won't work easily here due to hook rules, but I'll use logout from context
    };

    const { railData, isLoading: isRailLoading } = useRailData();
    const { isLoading: isMapDataLoading } = useMapData();

    const isTotalLoading = !isLoaded || isRailLoading || isMapDataLoading;

    React.useEffect(() => {
        if (railData && railData.hierarchy) {
            const allKeys: string[] = [];
            const hierarchyData = (railData.hierarchy.companies || railData.hierarchy);
            Object.entries(hierarchyData).forEach(([companyId, companyObj]) => {
                const lines = companyObj.lines || companyObj;
                Object.keys(lines).forEach(lineId => allKeys.push(`${companyId}::${lineId}`));
            });
            setSelectedLines(allKeys);
        }
    }, [railData]);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        const loadInitialData = async () => {
            if (authLoading) return;
            try {
                const saved = localStorage.getItem('jprail_trips');
                let localTrips: Trip[] = [];
                if (saved) {
                    localTrips = JSON.parse(saved);
                }

                if (user) {
                    const tripsRef = collection(db, `users/${user.uid}/trips`);
                    const q = query(tripsRef);
                    const querySnapshot = await getDocs(q);
                    const cloudTrips: Trip[] = [];
                    querySnapshot.forEach((doc) => {
                        cloudTrips.push(fromFirestoreTrip(doc.data()));
                    });

                    if (cloudTrips.length === 0 && localTrips.length > 0) {
                        const batch = writeBatch(db);
                        localTrips.forEach(trip => {
                            const tRef = doc(db, `users/${user.uid}/trips`, trip.id);
                            batch.set(tRef, toFirestoreTrip(trip));
                        });
                        await batch.commit();
                        setRecordedTrips(localTrips);
                    } else {
                        setRecordedTrips(cloudTrips.length > 0 ? cloudTrips : localTrips);
                    }
                } else {
                    setRecordedTrips(localTrips);
                }
            } catch (e) {
                console.error("Failed to load initial trips", e);
            } finally {
                setIsLoaded(true);
            }
        };

        loadInitialData();
    }, [user, authLoading]);

    React.useEffect(() => {
        if (isLoaded && typeof window !== 'undefined') {
            try {
                localStorage.setItem('jprail_trips', JSON.stringify(recordedTrips));
            } catch (e) {
                console.error("Failed to save trips to localStorage", e);
            }
        }
    }, [recordedTrips, isLoaded]);

    const handleStartTrip = React.useCallback((station: Station) => {
        setTripStartStation(station);
        trackEvent('start_trip', 'interaction', station.name);
    }, []);

    const handleEndTrip = React.useCallback(async (endStation: Station) => {
        if (!tripStartStation || !lineDetailData) return;

        setIsRecordingLoading(true);
        try {
            const pathResult = await lineDetailData.getShortestPath(tripStartStation.id, endStation.id, undefined);

            if (pathResult) {
                const newTrip: Trip = {
                    id: `trip-${Date.now()}`,
                    name: `${tripStartStation.name} → ${endStation.name}`,
                    start: tripStartStation.name,
                    end: endStation.name,
                    startId: tripStartStation.id,
                    endId: endStation.id,
                    path: pathResult.path,
                    waypoints: [tripStartStation.id, endStation.id],
                    geometries: pathResult.geometries,
                    distance: pathResult.distance,
                    sectionIds: pathResult.sectionIds,
                    createdAt: new Date().toISOString()
                };

                setRecordedTrips(prev => [...prev, newTrip]);
                trackEvent('end_trip', 'engagement', `${newTrip.start} to ${newTrip.end}`, Math.round(newTrip.distance));

                // Sync with Firebase if user logged in
                if (user) {
                    await setDoc(doc(db, `users/${user.uid}/trips`, newTrip.id), toFirestoreTrip(newTrip));
                }

                // Reset
                setTripStartStation(null);
                setDraftTrip(null);
                setSelectedStation(null);
            }
        } catch (err) {
            console.error("End trip remote search failed:", err);
        } finally {
            setIsRecordingLoading(false);
        }
    }, [tripStartStation, lineDetailData, user]);

    const handleRecordTrip = React.useCallback(async (trip: Trip) => {
        setIsRecordingLoading(true);
        try {
            setRecordedTrips(prev => {
                if (prev.find(t => t.id === trip.id)) return prev;
                return [...prev, trip];
            });
            setDraftTrip(null);

            trackEvent('record_trip', 'engagement', `${trip.start} to ${trip.end}`, Math.round(trip.distance));

            if (user) {
                await setDoc(doc(db, `users/${user.uid}/trips`, trip.id), toFirestoreTrip(trip));
            }
        } catch (e) {
            console.error("Cloud sync failed", e);
        } finally {
            setIsRecordingLoading(false);
        }
    }, [user]);

    const toggleLine = React.useCallback((line: string) => {
        setSelectedLines(prev =>
            prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]
        );
    }, []);

    const handlePrefectureClick = React.useCallback((name: string) => {
        trackEvent('prefecture_click', 'interaction', name);
    }, []);

    const setSelectedLinesList = React.useCallback((lines: string[]) => {
        setSelectedLines(lines);
    }, []);

    const [zoomTarget, setZoomTarget] = React.useState<{ type: 'line' | 'station', id: string } | null>(null);

    const handleSearchSelectStation = React.useCallback((id: string) => {
        if (!railData) return;
        const station = railData.stations[id];
        if (station) {
            setSelectedStation(station);
            setZoomTarget({ type: 'station', id });
            trackEvent('search_select_station', 'search', station.name);
        }
    }, [railData]);

    const handleSearchSelectLine = React.useCallback((id: string, fullId: string) => {
        if (!railData) return;
        const line = railData.lines[id];
        if (line) {
            // Ensure the line is visible on map
            if (!selectedLines.includes(fullId)) {
                setSelectedLines(prev => [...prev, fullId]);
            }
            setActiveLine(fullId);
            setZoomTarget({ type: 'line', id: fullId });
            trackEvent('search_select_line', 'search', line.name);
        }
    }, [railData, selectedLines]);

    const handleRailroadClick = React.useCallback((line: string) => {
        setActiveLine(line);
        setSelectedStation(null);

        if (isMobile) {
            setIsMobileSheetOpen(false);
        }

        setSelectedLines(prev => {
            if (prev.includes(line)) return prev;
            let next = [...prev, line];
            if (next.length > 1 && next.includes("__NONE__")) next = next.filter(l => l !== "__NONE__");
            return next;
        });

        trackEvent('railroad_click', 'interaction', line);
    }, [isMobile]);

    const handleLineClick = React.useCallback((line: string) => {
        setActiveLine(line);
        setSelectedStation(null);
        setZoomTarget({ type: 'line', id: line });

        if (isMobile) {
            setIsMobileSheetOpen(false);
        }

        setSelectedLines(prev => {
            let next = prev.includes(line) ? prev : [...prev, line];
            if (next.length > 1 && next.includes("__NONE__")) next = next.filter(l => l !== "__NONE__");
            return next;
        });
    }, [isMobile]);

    const handleStationClick = React.useCallback((stationId: string) => {
        if (!railData?.stations) return;

        const station = (railData.stations as { [key: string]: Station })[stationId];

        if (station) {
            // Close any existing popups by temporarily setting to null
            setSelectedStation(null);

            setTimeout(async () => {
                setSelectedStation(station);
                setActiveLine(null);
                if (isMobile) {
                    setIsMobileSheetOpen(false);
                }
                trackEvent('station_click', 'interaction', station.name);

                // Fetch extra station info (like neighbors) from remote
                try {
                    const remoteInfo = await getStationInfoRemote(stationId);
                    if (remoteInfo) {
                        setSelectedStation(prev => {
                            if (prev && prev.id === stationId) {
                                return { ...prev, ...remoteInfo };
                            }
                            return prev;
                        });
                    }
                } catch (err) {
                    console.error("Failed to fetch remote station info:", err);
                }

                // Preview trip path if one is in progress
                if (tripStartStation && lineDetailData) {
                    try {
                        const pathResult = await lineDetailData.getShortestPath(tripStartStation.id, station.id, undefined);
                        if (pathResult) {
                            const previewTrip: Trip = {
                                id: 'preview',
                                start: tripStartStation.name,
                                end: station.name,
                                path: pathResult.path,
                                waypoints: [tripStartStation.id, station.id],
                                geometries: pathResult.geometries,
                                distance: pathResult.distance,
                                sectionIds: pathResult.sectionIds,
                            };
                            setDraftTrip(previewTrip);
                        }
                    } catch (err) {
                        console.error("Station click remote search failed:", err);
                    }
                }
            }, 0);
        }
    }, [isMobile, railData, tripStartStation, lineDetailData]);

    const hoverRequestRef = React.useRef<number>(0);

    const handleStationHover = React.useCallback(async (stationId: string | null) => {
        if (!tripStartStation || !lineDetailData || !railData?.stations) {
            return;
        }

        const targetStationId = stationId || (selectedStation?.id !== tripStartStation.id ? selectedStation?.id : null);

        if (targetStationId) {
            const station = (railData.stations as Record<string, Station>)[targetStationId];
            if (station && station.id !== tripStartStation.id) {
                const requestId = ++hoverRequestRef.current;
                setIsHoverLoading(true);
                try {
                    const pathResult = await lineDetailData.getShortestPath(tripStartStation.id, station.id, undefined);
                    
                    // 현재 호버 중인 역이 여전히 동일한지 확인
                    if (requestId !== hoverRequestRef.current) return;

                    if (pathResult) {
                        const previewTrip: Trip = {
                            id: 'preview',
                            start: tripStartStation.name,
                            end: station.name,
                            path: pathResult.path,
                            waypoints: [tripStartStation.id, station.id],
                            geometries: pathResult.geometries,
                            distance: pathResult.distance,
                            sectionIds: pathResult.sectionIds,
                        };
                        setDraftTrip(previewTrip);
                    } else {
                        setDraftTrip(null);
                    }
                } catch (err) {
                    if (requestId === hoverRequestRef.current) {
                        console.error("Hover remote search failed:", err);
                        setDraftTrip(null);
                    }
                } finally {
                    if (requestId === hoverRequestRef.current) {
                        setIsHoverLoading(false);
                    }
                }
            } else if (station && station.id === tripStartStation.id) {
                setDraftTrip(null);
            }
        } else {
            setDraftTrip(null);
        }
    }, [railData, tripStartStation, lineDetailData, selectedStation]);

    const handleResetTrips = React.useCallback(async () => {
        if (recordedTrips.length === 0) return;

        setIsRecordingLoading(true);
        try {
            setRecordedTrips([]);
            setVisitedLineLengths({});
            localStorage.removeItem('jprail_trips');
            trackEvent('reset_all_trips', 'engagement', 'confirm');

            if (user) {
                const batch = writeBatch(db);
                // In some versions it was users/${user.uid}/trips, let's keep it consistent
                const tripsRef = collection(db, `users/${user.uid}/trips`);
                const querySnapshot = await getDocs(query(tripsRef));
                querySnapshot.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }
        } catch (e) {
            console.error("Cloud reset failed", e);
        } finally {
            setIsRecordingLoading(false);
        }
    }, [recordedTrips.length, user]);

    const stats = React.useMemo(() => {
        const visitedLineIds = Object.keys(visitedLineLengths);
        const lineCount = visitedLineIds.length;
        const distanceCount = Math.round(Object.values(visitedLineLengths).reduce((sum, val) => (sum as number) + (val as number), 0) * 10) / 10;

        const companySet = new Set<string>();
        visitedLineIds.forEach(id => {
            const company = id.split('::')[0];
            if (company) companySet.add(company);
        });

        const stationSet = new Set<string>();
        recordedTrips.forEach(trip => {
            if (trip.path) trip.path.forEach((sid: string) => stationSet.add(sid));
        });

        return {
            lines: lineCount,
            stations: stationSet.size,
            distance: distanceCount,
            companies: companySet.size
        };
    }, [visitedLineLengths, recordedTrips]);

    const handleDeleteTrip = React.useCallback(async (id: string) => {
        setIsRecordingLoading(true);
        try {
            setRecordedTrips(prev => prev.filter(t => t.id !== id));
            trackEvent('delete_trip', 'engagement', id);
    
            if (user) {
                await deleteDoc(doc(db, `users/${user.uid}/trips`, id));
            }
        } catch (e) {
            console.error("Cloud delete failed", e);
        } finally {
            setIsRecordingLoading(false);
        }
    }, [user]);

    const [isMobileSheetOpen, setIsMobileSheetOpen] = React.useState(false);

    const handleMapClick = React.useCallback(() => {
        setIsMapStyleOpen(false);
        setSelectedStation(null);
        setActiveLine(null);
        setIsMobileSheetOpen(false);
    }, []);

    const handleDraftComplete = React.useCallback((trip: Trip) => {
        setDraftTrip(trip);
        setTempPath([]);
    }, []);

    const handleDragUpdate = React.useCallback((waypoints: string[]) => {
        setTempPath(waypoints);
    }, []);

    const handleStationPathCreate = React.useCallback(async (startId: string, endId: string) => {
        if (!lineDetailData?.getShortestPath || !activeLine) return;

        try {
            const pathData = await lineDetailData.getShortestPath(startId, endId, [activeLine]);
            if (pathData) {
                const trip = {
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    start: lineDetailData.nodes.get(startId)?.name || startId,
                    end: lineDetailData.nodes.get(endId)?.name || endId,
                    ...pathData,
                    waypoints: [startId, endId]
                };
                setDraftTrip(trip as any);
                setTempPath([]);
            }
        } catch (err) {
            console.error("Direct path remote search failed:", err);
        }
    }, [lineDetailData, activeLine]);

    const mobilePreviewLines = React.useMemo(() => {
        if (!selectedStation || !railData?.platforms || !railData.lines) return [];
        const lineIds = selectedStation.platform_ids
            .map(platformId => String(railData.platforms[platformId]?.line))
            .filter((lineId, index, self) => lineId !== "undefined" && self.indexOf(lineId) === index);

        return lineIds.map(lineId => {
            const line = railData.lines[lineId];
            if (!line) return null;
            return `${line.corp_id}::${line.id}`;
        }).filter((id): id is string => !!id);
    }, [selectedStation, railData]);

    const setLineIdMapping = React.useCallback(() => { }, []);

    return (
        <div className="flex flex-col bg-slate-50 dark:bg-slate-950 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
            <div className="h-screen flex flex-col overflow-hidden relative max-w-[1920px] mx-auto w-full shadow-2xl shadow-slate-900/10">
                <a
                    href="#main-content"
                    className="absolute -left-[9999px] top-auto w-px h-px overflow-hidden z-[-1] bg-primary text-white p-2.5 rounded-b-lg no-underline font-bold focus:left-1/2 focus:-translate-x-1/2 focus:w-auto focus:h-auto focus:z-[10001]"
                >
                    Skip to main content
                </a>

                <header className="flex h-14 items-center border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 md:px-6 shrink-0 z-[10001] shadow-sm relative">
                    {/* Left: Logo & Title */}
                    <div className="flex items-center gap-3 shrink-0 mr-4">
                        <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
                            <span className="material-symbols-outlined text-2xl">train</span>
                        </div>
                        <h1 className="text-lg md:text-xl font-black tracking-tight text-slate-800 dark:text-white block">
                            <span className="text-primary">Japan</span>RailNote
                        </h1>
                    </div>

                    {/* Middle: Search (Centered) */}
                    {!isMobile && (
                        <div className="flex-1 flex justify-center px-4">
                            <RailSearch
                                railData={railData}
                                onSelectStation={handleSearchSelectStation}
                                onSelectLine={handleSearchSelectLine}
                                isMobile={isMobile}
                            />
                        </div>
                    )}

                    {/* Right: Navigation & Actions */}
                    <div className="flex items-center gap-3 md:gap-6 shrink-0 ml-auto mr-0">
                        <nav className="hidden lg:flex items-center gap-6">
                            <button
                                onClick={() => setIsHowToOpen(true)}
                                className="text-sm font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-lg">lightbulb</span>
                                {language === 'ko' ? "도움말" : language === 'ja' ? "ヘルプ" : "Tips"}
                            </button>
                            <button
                                onClick={() => setIsFeedbackOpen(true)}
                                className="text-sm font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-lg">chat_bubble</span>
                                {language === 'ko' ? "피드백" : language === 'ja' ? "フィードバック" : "Feedback"}
                            </button>
                            <Link
                                href="/directory"
                                className="text-sm font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-lg">list_alt</span>
                                {language === 'ko' ? "디렉토리" : language === 'ja' ? "路線一覧" : "Directory"}
                            </Link>
                            <button
                                onClick={exportMap}
                                className="text-sm font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-lg">download</span>
                                {language === 'ko' ? "내보내기" : language === 'ja' ? "エクスポート" : "Export"}
                            </button>
                        </nav>

                        {!isMobile && <div className="hidden lg:block h-6 w-px bg-slate-200 dark:bg-slate-700"></div>}

                        <div className="flex items-center gap-2 md:gap-4">
                            {isMobile && (
                                <div className="flex items-center gap-2">
                                    <LanguageSelector variant="dropdown" className="pointer-events-auto" />
                                    <button
                                        onClick={() => setIsInfoOpen(true)}
                                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
                                        aria-label="Info"
                                    >
                                        <span className="material-symbols-outlined text-xl">info</span>
                                    </button>
                                </div>
                            )}

                            {!isMobile && (
                                <button
                                    onClick={exportMap}
                                    className="lg:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
                                    aria-label="Export"
                                >
                                    <span className="material-symbols-outlined text-xl">download</span>
                                </button>
                            )}

                            {user ? (
                                <div
                                    className="size-8 md:size-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold cursor-pointer ring-2 ring-white dark:ring-slate-800 shadow-md transition-transform hover:scale-105"
                                    onClick={() => isMobile && setIsMobileSheetOpen(true)}
                                    title={user.email || 'User'}
                                >
                                    {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAuthModalOpen(true)}
                                    className="bg-primary hover:bg-primary/90 text-white px-4 md:px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm whitespace-nowrap"
                                >
                                    {language === 'ko' ? "로그인" : language === 'ja' ? "ログイン" : "Login"}
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                <main id="main-content" className="flex-1 relative overflow-hidden focus:outline-none" tabIndex={-1}>
                    {/* Background Layer: The Map - Now spans full background */}
                    <div className="absolute inset-0 z-0">
                        <MapWithNoSSR>
                            <MapPaneWithNoSSR
                                selectedLines={selectedLines}
                                recordedTrips={recordedTrips}
                                onRecordTrip={handleRecordTrip}
                                onRailroadClick={handleRailroadClick}
                                onStationClick={handleStationClick}
                                onSetSelectedLines={setSelectedLinesList}
                                onSetActiveLine={setActiveLine}
                                isHoverLoading={isHoverLoading}
                                isRecordingLoading={isRecordingLoading}
                                onLengthsCalculated={setLineLengths}
                                onVisitedLengthsCalculated={setVisitedLineLengths}
                                onLineMappingCreated={setLineIdMapping}
                                activeLine={activeLine}
                                onLineDetailData={setLineDetailData}
                                zoomTarget={zoomTarget}
                                onZoomComplete={() => setZoomTarget(null)}
                                styleSettings={styleSettings}
                                isMobile={isMobile}
                                selectedStation={selectedStation?.id}
                                onMapClick={handleMapClick}
                                showLabels={styleSettings.showLabels}
                                onToggleLabels={() => setStyleSettings(prev => ({ ...prev, showLabels: !prev.showLabels }))}
                                draftTrip={draftTrip}
                                onDraftComplete={handleDraftComplete}
                                onDragUpdate={handleDragUpdate}
                                onTransitionStateChange={setIsMapTransitioning}
                                tripStartStationId={tripStartStation?.id || null}
                                onStationHover={handleStationHover}
                                onPrefectureClick={handlePrefectureClick}
                                leftBound={isMobile ? 0 : 350}
                                rightBound={isMobile ? windowWidth : windowWidth - 320}
                            />
                        </MapWithNoSSR>
                    </div>

                    {/* Foreground Layer: UI & Side Panels */}
                    <div className="absolute inset-0 z-[5000] flex pointer-events-none h-full overflow-hidden">
                        {isMobile && (
                            <div className="absolute top-0 left-0 right-0 z-[1100] pointer-events-none p-0 bg-transparent w-full">
                                {selectedStation && railData ? (
                                    <div className="p-2.5 pointer-events-auto">
                                        <MobileStationPreviewWithNoSSR
                                            station={selectedStation}
                                            lines={mobilePreviewLines}
                                            onLineClick={(lineId: string) => {
                                                handleRailroadClick(lineId);
                                            }}
                                            railData={railData}
                                            isTripInProgress={isTripInProgress}
                                            tripStartStationId={tripStartStation?.id || null}
                                            onStartTrip={handleStartTrip}
                                            onEndTrip={handleEndTrip}
                                            onCancel={() => {
                                                setTripStartStation(null);
                                                setDraftTrip(null);
                                            }}
                                        />
                                    </div>
                                ) : activeLine && lineDetailData && railData ? (
                                    <div className="p-0 max-h-[70vh] overflow-y-auto pointer-events-auto custom-scrollbar">
                                        <MobileLinePreviewWithNoSSR
                                            lineId={activeLine}
                                            visitedEdges={lineDetailData.visitedEdges}
                                            segments={lineDetailData.segments}
                                            nodes={lineDetailData.nodes}
                                            visitedStations={lineDetailData.visitedStations}
                                            selectedLines={selectedLines}
                                            onToggleLine={toggleLine}
                                            railData={railData}
                                        />
                                    </div>
                                ) : null}

                                {/* Floating portal for TubeMap minimap on mobile - Placed directly below the panel */}
                                {isMobile && activeLine && (
                                    <div className="mt-2.5 flex justify-center pointer-events-auto animate-in fade-in zoom-in duration-500 delay-150">
                                        <div id="tube-minimap-portal" className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-md rounded-2xl p-1.5 shadow-xl border border-white/20 dark:border-slate-800/30 min-h-[44px]" />
                                    </div>
                                )}
                            </div>
                        )}

                        {!isMobile && (
                            <aside className="w-[350px] h-full border-r border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl z-[1000] flex flex-col shadow-2xl shadow-slate-200/50 dark:shadow-black/20 pointer-events-auto">
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <SidebarWithNoSSR selectedLines={selectedLines} onToggleLine={toggleLine} onSetSelectedLines={setSelectedLinesList} lineLengths={lineLengths} visitedLineLengths={visitedLineLengths} activeLine={activeLine} onLineClick={handleLineClick} />
                                </div>
                            </aside>
                        )}

                        {/* Center Action Area - Holds details, floating controls, etc. */}
                        <div className="flex-1 relative flex flex-col min-w-0 pointer-events-none">
                            <div className="flex-1 overflow-hidden pointer-events-none relative">
                                <MapStylePanel
                                    settings={styleSettings}
                                    onSettingsChange={setStyleSettings}
                                    isOpen={isMapStyleOpen}
                                    onOpenChange={setIsMapStyleOpen}
                                />
                                <MapLoadingIndicator isLoading={isTotalLoading} isTransitioning={isMapTransitioning} />
                            </div>

                            {!isMobile && lineDetailData && activeLine && railData && (
                                <div className="relative z-[1100] pointer-events-auto">
                                    <LineDetailPaneWithNoSSR
                                        lineId={activeLine}
                                        segments={lineDetailData.segments}
                                        nodes={lineDetailData.nodes}
                                        visitedEdges={lineDetailData.visitedEdges}
                                        selectedLines={selectedLines}
                                        getShortestPath={lineDetailData.getShortestPath}
                                        onRecordTrip={handleRecordTrip}
                                        onStationClick={handleStationClick}
                                        onClose={() => setActiveLine(null)}
                                        onToggleLine={toggleLine}
                                        railData={railData}
                                    />
                                </div>
                            )}
                            {!isMobile && selectedStation && railData && (
                                <div className="relative z-[1100] pointer-events-auto">
                                    <StationDetailPaneWithNoSSR
                                        station={selectedStation}
                                        railData={railData}
                                        onClose={() => setSelectedStation(null)}
                                        isTripInProgress={isTripInProgress}
                                        tripStartStationId={tripStartStation?.id || null}
                                        onStartTrip={handleStartTrip}
                                        onEndTrip={handleEndTrip}
                                        onCancel={() => {
                                            setTripStartStation(null);
                                            setDraftTrip(null);
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {!isMobile && (
                            <aside className="w-[320px] h-full border-l border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl z-[1000] shadow-2xl shadow-slate-200/50 dark:shadow-black/20 flex flex-col pointer-events-auto">
                                <MyLinesPane
                                    recordedTrips={recordedTrips}
                                    onDeleteTrip={handleDeleteTrip}
                                    onResetTrips={handleResetTrips}
                                    railData={railData}
                                    lineLengths={lineLengths}
                                    visitedLineLengths={visitedLineLengths}
                                />
                            </aside>
                        )}
                    </div>

                    {isMobile && (
                        <MobileBottomSheet
                            isOpen={isMobileSheetOpen}
                            onToggle={setIsMobileSheetOpen}
                            onExpand={() => {
                                setSelectedStation(null);
                                setActiveLine(null);
                            }}
                            tabs={[
                                {
                                    id: 'sidebar',
                                    label: t.railList,
                                    summary: (
                                        <div className="flex items-center justify-between w-full px-2 py-1 bg-white/40 dark:bg-black/20 rounded-2xl border border-white/40 dark:border-white/5 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary text-xl">account_tree</span>
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{t.networkSelection}</span>
                                            </div>
                                            <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                                                <span className="text-[10px] font-black text-primary uppercase">
                                                    {t.linesSelected(selectedLines.filter(l => l !== "__NONE__").length)}
                                                </span>
                                            </div>
                                        </div>
                                    ),
                                    content: (
                                        <SidebarWithNoSSR
                                            selectedLines={selectedLines}
                                            onToggleLine={toggleLine}
                                            onSetSelectedLines={setSelectedLinesList}
                                            lineLengths={lineLengths}
                                            visitedLineLengths={visitedLineLengths}
                                            activeLine={activeLine}
                                            onLineClick={(line: string) => {
                                                handleLineClick(line);
                                                if (isMobile) setIsMobileSheetOpen(false);
                                            }}
                                            className="bg-transparent border-none shadow-none"
                                        />
                                    )
                                },
                                {
                                    id: 'mylines',
                                    label: t.myTrip,
                                    summary: (
                                        <div className="grid grid-cols-4 gap-1.5 w-full">
                                            {[
                                                { label: t.trips, val: recordedTrips.length, icon: 'route' },
                                                { label: t.lines, val: stats.lines, icon: 'directions_railway' },
                                                { label: t.km, val: stats.distance, icon: 'straighten', hideLabel: true, unit: 'km' },
                                                { label: t.stations, val: stats.stations, icon: 'location_on' },
                                            ].map((s, idx) => {
                                                const fullValue = `${s.val}${s.unit || ''}`;
                                                // Dynamic font size based on string length
                                                const getFontSize = (len: number) => {
                                                    if (len <= 4) return 'text-xs'; // Default (12px)
                                                    if (len <= 6) return 'text-[10px]';
                                                    return 'text-[8.5px]';
                                                };

                                                return (
                                                    <div key={idx} className="flex flex-col items-center justify-center py-2 px-1 bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-xl border border-white/40 dark:border-white/5 overflow-hidden">
                                                        <span className="material-symbols-outlined text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">{s.icon}</span>
                                                        <div className="flex items-baseline gap-1 min-w-0 w-full justify-center">
                                                            <span className={`${getFontSize(fullValue.length)} font-black text-slate-900 dark:text-white leading-none whitespace-nowrap`}>
                                                                {fullValue}
                                                            </span>
                                                            {!s.hideLabel && (
                                                                <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter shrink-0">
                                                                    {s.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ),
                                    content: (
                                        <MyLinesPane
                                            recordedTrips={recordedTrips}
                                            onDeleteTrip={handleDeleteTrip}
                                            onResetTrips={handleResetTrips}
                                            railData={railData}
                                            lineLengths={lineLengths}
                                            visitedLineLengths={visitedLineLengths}
                                            className="bg-transparent border-none shadow-none"
                                        />
                                    )
                                }
                            ]}
                        />
                    )}

                </main>
            </div >

            <HowToModal
                isOpen={isHowToOpen}
                onClose={() => setIsHowToOpen(false)}
            />

            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
            />

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                imageData={exportImageData}
                stats={stats}
            />

            <UpdateNoticeModal />


            {/* Info Modal for Mobile */}

            {isInfoOpen && (
                <div className="fixed inset-0 z-[11000] bg-slate-900/90 backdrop-blur-lg flex flex-col p-6 overflow-hidden animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-white text-xl font-black uppercase tracking-widest">{t.information}</h2>
                        <button
                            onClick={() => setIsInfoOpen(false)}
                            className="text-white/60 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-3xl">close</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-6">
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col gap-4">
                            <div>
                                <h3 className="text-white text-lg font-black mb-3 italic">{t.heroTitle}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    {t.heroDesc}
                                </p>
                            </div>
                            <Link href="/directory" className="inline-flex items-center gap-2 px-4 py-2 mt-2 border border-primary/40 rounded-lg text-primary text-sm font-bold uppercase tracking-wider hover:bg-primary/10 transition-colors w-fit">
                                <span className="material-symbols-outlined text-lg">list_alt</span>
                                {language === 'ko' ? "일본 철도 노선 디렉토리" : language === 'ja' ? "日本鉄道路線一覧" : "Japan Railway Directory"}
                            </Link>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h3 className="text-white text-lg font-black mb-5">{t.statsOverview}</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{t.records}</span>
                                    <span className="text-2xl font-black text-primary">{recordedTrips.length}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{t.visitedLines}</span>
                                    <span className="text-2xl font-black text-primary">{stats.lines}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{t.totalDistance}</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-primary">{stats.distance}</span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">km</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{t.avgDistance}</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-primary">{recordedTrips.length > 0 ? Math.round(stats.distance / recordedTrips.length) : 0}</span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">km</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-2 text-center pb-8">
                            <p className="text-xs text-slate-500 font-bold leading-relaxed mb-6">
                                {t.fullDirectoryDesc(stats.stations, stats.lines)}
                            </p>
                            <button
                                onClick={() => {
                                    setIsInfoOpen(false);
                                    setIsFeedbackOpen(true);
                                }}
                                className="w-full py-4 rounded-xl border-2 border-primary/30 text-primary font-black uppercase tracking-widest text-sm hover:bg-primary/10 transition-all active:scale-95"
                            >
                                {t.sendFeedback}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {!isMobile && (
                <div className="fixed bottom-0 right-0 z-[10002] p-2 sm:p-4 pointer-events-none">
                    <LanguageSelector className="pointer-events-auto rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90" />
                </div>
            )}
        </div>
    );
};

export default MainPageClient;
