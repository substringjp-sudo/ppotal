'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, MapPin, X, Lock } from 'lucide-react';
import { isGoogleMapsReady } from '@pplaner/shared';

/**
 * 지역 한정 장소 검색.
 *
 * 여행 지역이 이미 정해졌다면, 장소 검색이 전 세계 동명의 장소를 뒤질 필요가 없다.
 * scope(국가 코드 / 지역 중심 좌표+반경)를 받아 Google Places 결과를 그 지역으로
 * 좁혀준다.
 *
 * Google Places는 과금 대상이므로, 이 컴포넌트는 지도 스크립트가 로드된
 * (= 로그인한) 상태에서만 동작한다. 비로그인 상태에서는 로그인 유도 UI를 보여준다.
 */

export interface RegionScope {
    /** 표시용 라벨 (예: "도쿄, 일본") */
    label?: string;
    /** 지역 중심 좌표 — locationBias 로 사용 */
    center?: { lat: number; lng: number };
    /** 바이어스 반경 (km, 기본 30) */
    radiusKm?: number;
    /** ISO 3166-1 alpha-2 국가 코드 (예: "jp") — 있으면 국가 단위로 제한 */
    countryCode?: string;
    /** 지역 경계 — 있으면 중심 대신 이 영역으로 바이어스 */
    bounds?: { south: number; west: number; north: number; east: number };
}

export interface SelectedPlace {
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
    placeId?: string;
    url?: string;
}

interface RegionScopedPlaceSearchProps {
    scope?: RegionScope;
    onSelect: (place: SelectedPlace) => void;
    placeholder?: string;
    className?: string;
    /** 비로그인/미로드 상태에서 보여줄 안내 문구 */
    lockedHint?: string;
}

const inputCls =
    'w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export default function RegionScopedPlaceSearch({
    scope,
    onSelect,
    placeholder = '장소 검색',
    className = '',
    lockedHint = '로그인하면 지역 한정 장소 검색을 사용할 수 있어요.',
}: RegionScopedPlaceSearchProps) {
    const [ready, setReady] = useState(false);
    const [input, setInput] = useState('');
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesRef = useRef<google.maps.places.PlacesService | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 지도 로드 여부 폴링 (로그인 후 스크립트가 뒤늦게 준비될 수 있으므로)
    useEffect(() => {
        if (isGoogleMapsReady(['places'])) {
            setReady(true);
            return;
        }
        const timer = setInterval(() => {
            if (isGoogleMapsReady(['places'])) {
                setReady(true);
                clearInterval(timer);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const fetchPredictions = useCallback(
        (value: string) => {
            if (!value.trim() || !isGoogleMapsReady(['places'])) {
                setPredictions([]);
                return;
            }
            if (!autoRef.current) {
                autoRef.current = new window.google.maps.places.AutocompleteService();
            }

            const request: google.maps.places.AutocompletionRequest = { input: value };
            if (scope?.bounds && window.google?.maps?.LatLngBounds) {
                request.locationBias = new window.google.maps.LatLngBounds(
                    { lat: scope.bounds.south, lng: scope.bounds.west },
                    { lat: scope.bounds.north, lng: scope.bounds.east }
                );
            } else if (scope?.center && window.google?.maps?.LatLng) {
                request.locationBias = new window.google.maps.LatLng(scope.center.lat, scope.center.lng);
                request.radius = (scope.radiusKm ?? 30) * 1000;
            }
            if (scope?.countryCode) {
                request.componentRestrictions = { country: scope.countryCode };
            }

            setLoading(true);
            autoRef.current.getPlacePredictions(request, (results, status) => {
                setLoading(false);
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                    setPredictions(results);
                    setOpen(true);
                } else {
                    setPredictions([]);
                    setOpen(value.length > 0);
                }
            });
        },
        [scope]
    );

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInput(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!value.trim()) {
            setPredictions([]);
            setOpen(false);
            return;
        }
        debounceRef.current = setTimeout(() => fetchPredictions(value), 300);
    };

    const onSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
        setInput(prediction.structured_formatting.main_text);
        setOpen(false);
        setPredictions([]);
        if (!isGoogleMapsReady(['places'])) return;
        if (!placesRef.current) {
            placesRef.current = new window.google.maps.places.PlacesService(document.createElement('div'));
        }
        placesRef.current.getDetails(
            {
                placeId: prediction.place_id,
                fields: ['name', 'formatted_address', 'geometry', 'url', 'place_id'],
            },
            (place, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                    onSelect({
                        name: place.name || prediction.structured_formatting.main_text,
                        address: place.formatted_address,
                        lat: place.geometry?.location?.lat(),
                        lng: place.geometry?.location?.lng(),
                        placeId: place.place_id,
                        url: place.url,
                    });
                }
            }
        );
    };

    // 비로그인/미로드: 잠금 안내
    if (!ready) {
        return (
            <div
                className={`flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400 ${className}`}
            >
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>{lockedHint}</span>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
                type="text"
                value={input}
                onChange={onInputChange}
                onFocus={() => predictions.length > 0 && setOpen(true)}
                placeholder={placeholder}
                className={inputCls}
            />
            {input && (
                <button
                    type="button"
                    onClick={() => {
                        setInput('');
                        setPredictions([]);
                        setOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    aria-label="지우기"
                >
                    <X className="h-4 w-4" />
                </button>
            )}

            {scope?.label && (
                <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <MapPin className="h-3 w-3" />
                    {scope.label} 인근으로 한정해 검색 중
                </p>
            )}

            {open && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    {predictions.length > 0 ? (
                        predictions.map((p) => (
                            <button
                                key={p.place_id}
                                type="button"
                                onClick={() => onSelectPrediction(p)}
                                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {p.structured_formatting.main_text}
                                    </span>
                                    <span className="block truncate text-[10px] text-slate-400">
                                        {p.structured_formatting.secondary_text}
                                    </span>
                                </span>
                            </button>
                        ))
                    ) : (
                        <p className="px-3 py-4 text-center text-xs text-slate-400">
                            {loading ? '검색 중…' : '검색 결과가 없어요.'}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
