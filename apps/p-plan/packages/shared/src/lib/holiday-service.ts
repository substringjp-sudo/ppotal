import { Trip, TripWarning } from '../types/trip';
import { resolveCountryProfile } from './data/country-profiles';

/**
 * 공휴일 보강 서비스 (Nager.Date, 무키·무료·CORS 허용).
 *
 * 온디바이스 정적 공휴일 데이터셋(근사·2025~2027)을 실제/정식 공휴일로 보강한다.
 * 국가 프로필의 key(ISO 3166-1 alpha-2)로 조회하며, 실패/미지원 국가는 조용히 폴백.
 */

export interface PublicHoliday {
    date: string; // YYYY-MM-DD
    localName: string;
    name: string;
}

const holidayCache = new Map<string, PublicHoliday[] | null>();

export async function fetchPublicHolidays(countryCode: string, year: number): Promise<PublicHoliday[] | null> {
    const key = `${countryCode}-${year}`;
    if (holidayCache.has(key)) return holidayCache.get(key) ?? null;
    try {
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
        if (!res.ok) {
            holidayCache.set(key, null);
            return null;
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
            holidayCache.set(key, null);
            return null;
        }
        const holidays: PublicHoliday[] = data
            .filter((h: any) => typeof h?.date === 'string')
            .map((h: any) => ({ date: h.date, localName: h.localName || h.name || '공휴일', name: h.name || '' }));
        holidayCache.set(key, holidays);
        return holidays;
    } catch {
        holidayCache.set(key, null);
        return null;
    }
}

function yearsInRange(startDate: string, endDate: string): number[] {
    const ys = parseInt(startDate.slice(0, 4), 10);
    const ye = parseInt(endDate.slice(0, 4), 10);
    const out: number[] = [];
    if (isNaN(ys) || isNaN(ye)) return out;
    for (let y = ys; y <= ye && out.length < 3; y++) out.push(y);
    return out;
}

/**
 * 여행 기간에 걸치는 현지 공휴일을 정식 데이터로 경고화(비동기). validateTrip 결과에 합쳐 쓴다.
 */
export async function getHolidayAdvisories(trip: Trip): Promise<TripWarning[]> {
    if (!trip.dates?.startDate || !trip.dates?.endDate) return [];
    const start = trip.dates.startDate;
    const end = trip.dates.endDate;

    const codes = new Set<string>();
    (trip.locations?.regions || []).forEach(r => {
        const p = resolveCountryProfile(r.name);
        if (p) codes.add(p.key);
    });
    if (codes.size === 0) return [];

    const years = yearsInRange(start, end);
    const warnings: TripWarning[] = [];
    const seenDates = new Set<string>();

    for (const code of codes) {
        for (const year of years) {
            const holidays = await fetchPublicHolidays(code, year);
            if (!holidays) continue;
            holidays.forEach(h => {
                if (h.date >= start && h.date <= end && !seenDates.has(`${code}-${h.date}`)) {
                    seenDates.add(`${code}-${h.date}`);
                    warnings.push({
                        id: `holiday-api-${code}-${h.date}`,
                        type: 'seasonal',
                        severity: 'info',
                        message: `${h.date}은 현지 공휴일 '${h.localName}'이에요. 관공서·은행·일부 상점이 휴무이거나 혼잡할 수 있어요.`,
                        suggestion: '공휴일에는 영업 여부를 미리 확인하고, 인기 명소·교통 혼잡에 대비하세요.',
                        sourceType: 'location',
                    });
                }
            });
        }
    }
    return warnings;
}
