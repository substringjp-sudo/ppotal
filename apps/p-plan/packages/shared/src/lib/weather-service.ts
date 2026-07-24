import { Trip, TripWarning } from '../types/trip';

/**
 * 날씨 보강 서비스 (Open-Meteo, 무키·무료·CORS 허용).
 *
 * 온디바이스 seasonalCaution(위도·월 휴리스틱)을 실제 예보로 보강한다.
 * 검증 엔진은 동기이므로, 날씨는 비동기로 가져와(fetchTripWeather) 순수 함수
 * getWeatherAdvisories로 경고를 만든 뒤 기존 warnings에 합친다.
 * 실패하거나 예보 범위(약 16일) 밖이면 조용히 폴백(빈 결과).
 */

export interface DailyWeather {
    date: string; // YYYY-MM-DD
    tempMaxC?: number;
    tempMinC?: number;
    precipitationProb?: number; // %
    weatherCode?: number; // WMO code
}

export interface TripWeather {
    source: 'open-meteo';
    daily: DailyWeather[];
}

const weatherCache = new Map<string, TripWeather | null>();

function isRainyCode(code?: number): boolean {
    if (code === undefined) return false;
    // WMO: 51-67 이슬비/비, 71-77 눈, 80-82 소나기, 85-86 소낙눈, 95-99 뇌우
    return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
}

/**
 * 여행지 중심 좌표 + 여행 날짜에 대한 예보를 가져온다.
 * 예보 유효 범위(오늘~약 16일) 밖이거나 실패하면 null(폴백).
 */
export async function fetchTripWeather(trip: Trip): Promise<TripWeather | null> {
    const center = trip.locations?.center;
    if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number') return null;
    if (!trip.dates?.startDate) return null;

    const start = trip.dates.startDate;
    const end = trip.dates.endDate || start;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startD = new Date(`${start}T00:00:00`);
    const daysUntil = Math.floor((startD.getTime() - today.getTime()) / 86400000);
    if (isNaN(daysUntil) || daysUntil > 16 || daysUntil < -1) return null; // 예보 범위 밖 → 온디바이스 폴백

    const key = `${center.lat.toFixed(2)},${center.lng.toFixed(2)},${start},${end}`;
    if (weatherCache.has(key)) return weatherCache.get(key) ?? null;

    try {
        const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${center.lat}&longitude=${center.lng}` +
            `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
            `&timezone=auto&start_date=${start}&end_date=${end}`;
        const res = await fetch(url);
        if (!res.ok) {
            weatherCache.set(key, null);
            return null;
        }
        const data = await res.json();
        const d = data?.daily;
        if (!d?.time || !Array.isArray(d.time)) {
            weatherCache.set(key, null);
            return null;
        }
        const daily: DailyWeather[] = d.time.map((date: string, i: number) => ({
            date,
            tempMaxC: d.temperature_2m_max?.[i],
            tempMinC: d.temperature_2m_min?.[i],
            precipitationProb: d.precipitation_probability_max?.[i],
            weatherCode: d.weathercode?.[i],
        }));
        const result: TripWeather = { source: 'open-meteo', daily };
        weatherCache.set(key, result);
        return result;
    } catch {
        weatherCache.set(key, null);
        return null;
    }
}

/**
 * 예보를 경고(TripWarning)로 변환하는 순수 함수. validateTrip 결과에 합쳐 쓴다.
 */
export function getWeatherAdvisories(trip: Trip, weather: TripWeather | null): TripWarning[] {
    if (!weather || weather.daily.length === 0) return [];
    const warnings: TripWarning[] = [];

    weather.daily.forEach(w => {
        const rain = (w.precipitationProb ?? 0) >= 60 || isRainyCode(w.weatherCode);
        if (rain) {
            const day = trip.dailyTimeline?.find(d => d.date === w.date);
            const hasOutdoor = day?.events?.some(
                e => e.subCategory === 'scenic' || e.subCategory === 'activity'
            );
            const prob = w.precipitationProb !== undefined ? `강수확률 ${w.precipitationProb}%` : '강수 예보';
            warnings.push({
                id: `weather-rain-${w.date}`,
                type: 'seasonal',
                severity: hasOutdoor ? 'warning' : 'info',
                message: `${w.date}에 비 예보(${prob})가 있어요.${hasOutdoor ? ' 이 날 야외 일정이 있으니 실내 대안을 준비하세요.' : ''}`,
                suggestion: '우산·우비를 챙기고, 야외 일정은 실내 대체 후보를 미리 찾아두세요.',
                sourceType: 'location',
            });
        }
    });

    const maxTemps = weather.daily.map(w => w.tempMaxC).filter((t): t is number => typeof t === 'number');
    const minTemps = weather.daily.map(w => w.tempMinC).filter((t): t is number => typeof t === 'number');

    if (maxTemps.some(t => t >= 33)) {
        warnings.push({
            id: 'weather-heat',
            type: 'seasonal',
            severity: 'info',
            message: '여행 기간에 낮 최고 33°C 이상 폭염이 예보돼요. 물·양산·자외선 차단을 챙기세요.',
            suggestion: '한낮 야외 활동은 피하고, 실내·그늘 일정을 배치하세요.',
            sourceType: 'location',
        });
    }
    if (minTemps.some(t => t <= 0)) {
        warnings.push({
            id: 'weather-cold',
            type: 'seasonal',
            severity: 'info',
            message: '여행 기간에 영하권 추위가 예보돼요. 방한 의류를 준비하세요.',
            sourceType: 'location',
        });
    }

    return warnings;
}
