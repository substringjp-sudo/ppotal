'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, AlertTriangle, Globe, Flag, Map as MapIcon, Info, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, getDistance } from '@pplaner/shared';
import { GoogleMapsSearch } from '@/components/common/GoogleMapsSearch';
import { reverseGeocodeIds, resolveRegionIdsFromPlace } from '@pplaner/shared';

import { useTripStore } from '@pplaner/shared';

interface LocationSelectorProps {
    onLocationSelect: (location: {
        name: string;
        lat?: number;
        lng?: number;
        countryId?: string;
        prefectureId?: string;
        cityId?: string;
        countryName?: string;
        prefectureName?: string;
        cityName?: string;
        googlePlaceId?: string;
        url?: string;
    }) => void;
    location?: {
        name: string;
        address?: string;
        lat?: number;
        lng?: number;
        countryId?: string;
        prefectureId?: string;
        cityId?: string;
        countryName?: string;
        prefectureName?: string;
        cityName?: string;
        googlePlaceId?: string;
        url?: string;
    };

    initialValue?: string;
    initialAddress?: string;
    initialCoords?: { lat: number; lng: number };
    initialRegionIds?: { countryId?: string; prefectureId?: string; cityId?: string };
    label?: string;
    placeholder?: string;
    className?: string;
    showWarning?: boolean;
    warningDistance?: number; // km, default 20
    compact?: boolean;
    initialBias?: { lat: number; lng: number };
}

export function LocationSelector({
    onLocationSelect,
    location,
    initialValue,

    initialAddress,
    initialCoords,
    initialRegionIds,
    label,
    placeholder,
    className,
    showWarning = true,
    warningDistance = 20,
    compact = false,
    initialBias
}: LocationSelectorProps) {
    const { currentTrip: trip } = useTripStore();

    const [selectedPlace, setSelectedPlace] = useState<{
        name: string;
        address?: string;
        lat?: number;
        lng?: number;
        countryId?: string;
        prefectureId?: string;
        cityId?: string;
        countryName?: string;
        prefectureName?: string;
        cityName?: string;
        googlePlaceId?: string;
        url?: string;
    } | null>(null);
    const [nearbyRecommendations, setNearbyRecommendations] = useState<google.maps.places.PlaceResult[]>([]);
    const [isNearbyLoading, setIsNearbyLoading] = useState(false);
    const [isResolvingRegion, setIsResolvingRegion] = useState(false);
    const lastResolvedCoordsRef = useRef<string | null>(null);

    // No local region data loading needed


    // Set initial state if provided
    useEffect(() => {
        if (location) {
            setSelectedPlace(location);
        } else if (initialValue || initialCoords) {
            setSelectedPlace({
                name: initialValue || '',
                address: initialAddress,
                lat: initialCoords?.lat,
                lng: initialCoords?.lng,
                ...initialRegionIds
            });
        } else {
            // [FIX] 아무 정보도 들어오지 않은 경우(새 항목 생성 시 등) 명시적으로 상태를 비웁니다.
            setSelectedPlace(null);
        }
    }, [location, initialValue, initialAddress, initialCoords, initialRegionIds]);
    
    useEffect(() => {
        if (selectedPlace?.lat && selectedPlace?.lng && !selectedPlace.countryId && !isResolvingRegion) {

            const coordKey = `${selectedPlace.lat.toFixed(6)},${selectedPlace.lng.toFixed(6)}`;
            
            // [OPTIMIZED] 이미 해당 좌표에 대해 분석을 시도했다면(성공/실패 무관) 재요청 방지
            if (lastResolvedCoordsRef.current === coordKey) {
                // 이미 시도했으나 결과가 없는 경우 로딩 상태만 해제
                if (isResolvingRegion) setIsResolvingRegion(false);
                return;
            }
            
            let isMounted = true;
            
            // 디바운스 타임아웃 추가 (0.5초 대기 후 분석 시작)
            const debounceTimeout = setTimeout(() => {
                if (!isMounted) return;
                
                setIsResolvingRegion(true);
                lastResolvedCoordsRef.current = coordKey;

                const resolve = async () => {
                    try {
                        const spatialIds = await reverseGeocodeIds(selectedPlace.lat!, selectedPlace.lng!);
                        if (isMounted) {
                            const updated = { ...selectedPlace, ...spatialIds };
                            // 결과가 있든 없든 시도한 것으로 간주하여 무한 루프 방지
                            lastResolvedCoordsRef.current = coordKey;
                            setSelectedPlace(updated);
                            onLocationSelect(updated);
                        }
                    } catch (e) {
                        console.error('[LocationSelector] Geocoding error:', e);
                    } finally {
                        if (isMounted) setIsResolvingRegion(false);
                    }
                };
                resolve();
            }, 500);

            return () => {
                isMounted = false;
                clearTimeout(debounceTimeout);
            };
        }
    }, [selectedPlace?.lat, selectedPlace?.lng, selectedPlace?.countryId, isResolvingRegion]);



    const handlePlaceSelect = async (place: google.maps.places.PlaceResult) => {
        setIsResolvingRegion(true);
        try {
            const lat = place.geometry?.location?.lat();
            const lng = place.geometry?.location?.lng();
            const address = place.formatted_address;
            const name = place.name || '';
            const googlePlaceId = place.place_id;
            const url = place.url;

            // [OPTIMIZED] 구글 장소 정보를 활용하여 즉시 행정구역 분석
            const regionIds = await resolveRegionIdsFromPlace(place);

            const newLocation = {
                name,
                address,
                lat,
                lng,
                ...regionIds,
                googlePlaceId,
                url
            };

            // 선택된 좌표를 시도된 것으로 기록
            if (lat && lng) {
                lastResolvedCoordsRef.current = `${lat.toFixed(6)},${lng.toFixed(6)}`;
            }

            setSelectedPlace(newLocation);
            onLocationSelect(newLocation);
        } catch (e) {
            console.error('[LocationSelector] Place selection error:', e);
        } finally {
            setIsResolvingRegion(false);
        }
    };

    // Fetch nearby recommendations based on location bias
    useEffect(() => {
        const bias = initialBias || (selectedPlace?.lat && selectedPlace?.lng ? { lat: selectedPlace.lat, lng: selectedPlace.lng } : null);
        if (!bias || typeof google === 'undefined') return;

        const fetchNearby = () => {
            setIsNearbyLoading(true);
            const dummy = document.createElement('div');
            const service = new google.maps.places.PlacesService(dummy);
            
            const request: google.maps.places.PlaceSearchRequest = {
                location: new google.maps.LatLng(bias.lat, bias.lng),
                radius: 50,
                type: 'point_of_interest'
            };

            service.nearbySearch(request, (results, status) => {
                setIsNearbyLoading(false);
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    // 상위 3개 추천 (현재 선택된 장소와 중복 제외 시도)
                    const filtered = results
                        .filter(r => r.name !== selectedPlace?.name)
                        .slice(0, 3);
                    setNearbyRecommendations(filtered);
                }
            });
        };

        const timer = setTimeout(fetchNearby, 500);
        return () => clearTimeout(timer);
    }, [initialBias, selectedPlace?.lat, selectedPlace?.lng, selectedPlace?.name]);

    const isTooFar = false;

    const getRegionPath = () => {
        if (!selectedPlace) return null;
        
        return {
            country: selectedPlace.countryName,
            prefecture: selectedPlace.prefectureName,
            city: selectedPlace.cityName
        };
    };


    const regionPath = getRegionPath();

    return (
        <div className={cn("space-y-4", className)}>
            {label && (
                <label className="text-sm font-black text-slate-700 dark:text-slate-300 ml-1">
                    {label}
                </label>
            )}
            
            <GoogleMapsSearch 
                onPlaceSelect={handlePlaceSelect}
                initialValue={selectedPlace?.name}
                placeholder={placeholder}
                locationBias={initialBias || (selectedPlace?.lat && selectedPlace?.lng ? { lat: selectedPlace.lat, lng: selectedPlace.lng } : undefined)}
            />

            <AnimatePresence>
                {selectedPlace && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className={cn(
                            "relative bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 overflow-hidden",
                            compact ? "p-3" : "p-4"
                        )}>
                            {/* Loading Progress Bar */}
                            <AnimatePresence>
                                {isResolvingRegion && (
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        exit={{ opacity: 0 }}
                                        className="absolute top-0 left-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 z-10"
                                        transition={{ 
                                            width: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                                            opacity: { duration: 0.3 }
                                        }}
                                    />
                                )}
                            </AnimatePresence>
                            {/* Calculated Identity (Administrative Path) */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5 pl-1">
                                    <span className="material-symbols-rounded text-[12px] text-emerald-500">verified_user</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Calculated Identity</span>
                                </div>
                                <div className={cn("flex flex-wrap items-center", compact ? "gap-1.5" : "gap-2")}>
                                    {regionPath?.country ? (
                                        <div className={cn(
                                            "flex items-center gap-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-black text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:border-primary/30",
                                            compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]"
                                        )}>
                                            <Globe className={cn(compact ? "w-2.5 h-2.5" : "w-3 h-3", "text-primary")} />
                                            {regionPath.country}
                                            {selectedPlace.countryId && <span className="text-[8px] opacity-30 font-mono ml-1">{selectedPlace.countryId}</span>}
                                        </div>
                                    ) : selectedPlace.countryId ? (
                                        <div className={cn(
                                            "flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 font-black text-slate-400 dark:text-slate-500 shadow-sm",
                                            compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]"
                                        )}>
                                            <Globe className={cn(compact ? "w-2.5 h-2.5" : "w-3 h-3", "text-slate-400")} />
                                            {selectedPlace.countryId}
                                        </div>
                                    ) : isResolvingRegion ? (
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse pl-1 italic">
                                            <span className="material-symbols-rounded text-xs animate-spin">progress_activity</span>
                                            Locating region...
                                        </div>
                                    ) : (
                                        null
                                    )}

                                    {regionPath?.prefecture && (
                                        <>
                                            <span className="text-slate-300 dark:text-slate-700">/</span>
                                            <div className={cn(
                                                "flex items-center gap-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-black text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:border-amber-500/30",
                                                compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]"
                                            )}>
                                                <Flag className={cn(compact ? "w-2.5 h-2.5" : "w-3 h-3", "text-amber-500")} />
                                                {regionPath.prefecture}
                                                {selectedPlace.prefectureId && <span className="text-[8px] opacity-30 font-mono ml-1">{selectedPlace.prefectureId}</span>}
                                            </div>
                                        </>
                                    )}

                                    {regionPath?.city && (
                                        <>
                                            <span className="text-slate-300 dark:text-slate-700">/</span>
                                            <div className={cn(
                                                "flex items-center gap-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-black text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:border-emerald-500/30",
                                                compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]"
                                            )}>
                                                <MapIcon className={cn(compact ? "w-2.5 h-2.5" : "w-3 h-3", "text-emerald-500")} />
                                                {regionPath.city}
                                                {selectedPlace.cityId && <span className="text-[8px] opacity-30 font-mono ml-1">{selectedPlace.cityId}</span>}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Region IDs (Added task) */}
                            <div className="flex flex-wrap gap-2">
                                {selectedPlace.countryId && (
                                    <span className={cn(
                                        "px-2 py-0.5 bg-white dark:bg-slate-900 rounded-lg text-[9px] font-bold text-slate-500 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shadow-sm transition-all",
                                        isResolvingRegion && !selectedPlace.countryName && "animate-pulse"
                                    )}>
                                        <span className="text-[8px] opacity-40 font-mono">CID</span>
                                        {selectedPlace.countryName || selectedPlace.countryId}
                                    </span>
                                )}
                                {selectedPlace.prefectureId && (
                                    <span className={cn(
                                        "px-2 py-0.5 bg-white dark:bg-slate-900 rounded-lg text-[9px] font-bold text-slate-500 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shadow-sm transition-all",
                                        isResolvingRegion && !selectedPlace.prefectureName && "animate-pulse"
                                    )}>
                                        <span className="text-[8px] opacity-40 font-mono">PID</span>
                                        {selectedPlace.prefectureName || selectedPlace.prefectureId}
                                    </span>
                                )}
                                {selectedPlace.cityId && (
                                    <span className={cn(
                                        "px-2 py-0.5 bg-white dark:bg-slate-900 rounded-lg text-[9px] font-bold text-slate-500 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shadow-sm transition-all",
                                        isResolvingRegion && !selectedPlace.cityName && "animate-pulse"
                                    )}>
                                        <span className="text-[8px] opacity-40 font-mono">TID</span>
                                        {selectedPlace.cityName || selectedPlace.cityId}
                                    </span>
                                )}
                            </div>

                            {/* Address & Links */}
                            <div className="space-y-1">
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                                    <p className={cn("font-medium text-slate-500 dark:text-slate-400 leading-relaxed", compact ? "text-[11px]" : "text-xs")}>
                                        {selectedPlace.address || '주소 정보 없음'}
                                    </p>
                                </div>
                                {selectedPlace.url && (
                                    <a 
                                        href={selectedPlace.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={cn("inline-flex items-center gap-1 font-black text-primary hover:underline", compact ? "text-[9px] ml-5" : "text-[10px] ml-5")}
                                    >
                                        구글 맵에서 보기
                                        <ExternalLink className={cn(compact ? "w-2 h-2" : "w-2.5 h-2.5")} />
                                    </a>
                                )}
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Nearby Recommendations Chips & Coordinate Fallback */}
            {(nearbyRecommendations.length > 0 || (initialBias || (selectedPlace?.lat && selectedPlace?.lng))) && (
                <div className="space-y-2 mt-4 px-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        <span className="material-symbols-rounded text-xs text-primary animate-pulse">magic_button</span>
                        {nearbyRecommendations.length > 0 ? 'Recommended Nearby' : 'Coordinate Info'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {nearbyRecommendations.map((place) => (
                            <button
                                key={place.place_id}
                                type="button"
                                onClick={() => handlePlaceSelect(place)}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all flex items-center gap-1.5"
                            >
                                <MapPin className="w-2.5 h-2.5" />
                                <span className="truncate max-w-[120px]">{place.name}</span>
                            </button>
                        ))}
                        
                        {/* Always show actual coordinate as an option when biased/selected */}
                        {(initialBias || (selectedPlace?.lat && selectedPlace?.lng)) && (
                            <button
                                type="button"
                                onClick={() => {
                                    const b = initialBias || { lat: selectedPlace!.lat!, lng: selectedPlace!.lng! };
                                    handlePlaceSelect({
                                        name: `${b.lat.toFixed(4)}, ${b.lng.toFixed(4)}`,
                                        geometry: { location: new google.maps.LatLng(b.lat, b.lng) } as any,
                                        formatted_address: `${b.lat}, ${b.lng}`
                                    });
                                }}
                                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-[10px] font-black text-slate-500 hover:text-primary hover:border-primary transition-all flex items-center gap-1.5"
                            >
                                <Globe className="w-2.5 h-2.5" />
                                <span>{(initialBias || selectedPlace)?.lat?.toFixed(4)}, {(initialBias || selectedPlace)?.lng?.toFixed(4)}</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
