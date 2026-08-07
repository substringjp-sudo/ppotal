'use client';

import { useEffect, useState } from 'react';
import {
    useTripStore,
    fetchTripWeather,
    getWeatherAdvisories,
    getHolidayAdvisories,
    type TripWarning,
} from '@pplaner/shared';

/**
 * 온라인 실시간 자문 (날씨·공휴일).
 *
 * validateTrip은 동기라 온디바이스 경고만 담는다. 여기서는 비동기 API(Open-Meteo,
 * Nager.Date) 결과를 별도로 가져와 표시한다. 실패/범위 밖이면 아무것도 렌더하지 않음.
 */
export default function OnlineAdvisories() {
    const trip = useTripStore((s) => s.currentTrip);
    const [advisories, setAdvisories] = useState<TripWarning[]>([]);
    const [loading, setLoading] = useState(false);

    const tripId = trip?.id;
    const start = trip?.dates?.startDate;
    const end = trip?.dates?.endDate;
    const centerKey = trip?.locations?.center
        ? `${trip.locations.center.lat.toFixed(2)},${trip.locations.center.lng.toFixed(2)}`
        : '';

    useEffect(() => {
        let cancelled = false;
        if (!trip || !start) {
            setAdvisories([]);
            return;
        }
        setLoading(true);
        (async () => {
            try {
                const [weather, holidays] = await Promise.all([
                    fetchTripWeather(trip).then(w => getWeatherAdvisories(trip, w)),
                    getHolidayAdvisories(trip),
                ]);
                if (cancelled) return;
                const map = new Map<string, TripWarning>();
                [...weather, ...holidays].forEach(w => map.set(w.id, w));
                setAdvisories(Array.from(map.values()));
            } catch {
                if (!cancelled) setAdvisories([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripId, start, end, centerKey]);

    if (loading && advisories.length === 0) return null;
    if (advisories.length === 0) return null;

    const colorFor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
            case 'warning':
                return 'border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
            default:
                return 'border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
        }
    };

    return (
        <div className="w-full px-5 py-4">
            <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-rounded text-lg text-sky-500" aria-hidden="true">
                    cloud
                </span>
                <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                    실시간 정보
                    <span className="ml-1.5 text-xs font-bold text-slate-400">날씨 · 공휴일</span>
                </h3>
            </div>
            <div className="space-y-2">
                {advisories.map(a => (
                    <div key={a.id} className={`rounded-xl border p-3 ${colorFor(a.severity)}`}>
                        <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-100">
                            {a.message}
                        </p>
                        {a.suggestion && (
                            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                {a.suggestion}
                            </p>
                        )}
                    </div>
                ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
                실시간 예보/공휴일 데이터 기반 안내예요. 상황에 따라 달라질 수 있어요.
            </p>
        </div>
    );
}
