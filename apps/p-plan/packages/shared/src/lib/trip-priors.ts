import type { Trip, TripSummary } from '../types/trip';

/**
 * 계획을 "기록의 재료"가 아니라 "기록을 해석하는 사전 정보"로 쓰기 위한 어댑터.
 *
 * 계획에서 기록을 만들 수는 없다 — 계획은 의도고 기록은 증거라서, 계획을 베끼면
 * 한 일이 아니라 하려던 일이 남는다. 하지만 계획은 증거를 **해석**할 때 우리가 가진
 * 가장 정밀한 신호다: 날짜·지역·시간대·후보 장소가 이미 사용자 손으로 적혀 있다.
 *
 * 중요한 건 이 신호가 **계획대로 다녔는지와 무관하게** 유효하다는 점이다.
 * 오사카성을 안 갔어도 8/3~8/6에 오사카에 있었다는 사실은 변하지 않고,
 * 버킷리스트 20곳 중 8곳만 갔어도 그 8곳은 여전히 후보 안에 들어있다.
 * 그래서 계획에서 이탈할수록 효과는 서서히 줄 뿐, 무너지지 않는다.
 */

export interface PlannedPlace {
    name: string;
    lat?: number;
    lng?: number;
    googlePlaceId?: string;
    /** 일정에서 온 경우의 방문 예정일 (YYYY-MM-DD) */
    date?: string;
    /** HH:mm */
    startTime?: string;
    endTime?: string;
    source: 'itinerary' | 'bucketlist';
}

export interface TripPriors {
    tripId: string;
    title: string;
    startDate?: string;
    endDate?: string;
    /** 계획에 적힌 장소들 — 좌표가 있는 것만 POI 사전정보로 쓸모가 있다 */
    plannedPlaces: PlannedPlace[];
    /** 대표 지역명 (역지오코딩 보정·표시용) */
    regionNames: string[];
}

/** 계획에서 사전 정보를 뽑아낸다. 계획이 비어 있으면 빈 배열이 나오고, 호출부는 그대로 폴백한다. */
export function buildTripPriors(trip: Trip): TripPriors {
    const plannedPlaces: PlannedPlace[] = [];

    // 일정(dailyTimeline)이 가장 강한 신호 — 날짜와 시각까지 붙어 있다
    (trip.dailyTimeline || []).forEach((day) => {
        (day.events || []).forEach((ev) => {
            const loc = ev.location;
            if (!loc?.name) return;
            plannedPlaces.push({
                name: loc.name,
                lat: loc.lat,
                lng: loc.lng,
                googlePlaceId: loc.googlePlaceId,
                date: day.date,
                startTime: ev.startTime,
                endTime: ev.endTime,
                source: 'itinerary',
            });
        });
    });

    // 버킷리스트는 날짜가 없지만 "후보 어휘"로서 값이 있다
    (trip.bucketList || []).forEach((item) => {
        const place = item.place;
        if (!place?.name) return;
        plannedPlaces.push({
            name: place.name,
            lat: place.lat,
            lng: place.lng,
            source: 'bucketlist',
        });
    });

    return {
        tripId: trip.id,
        title: trip.title,
        startDate: trip.dates?.startDate,
        endDate: trip.dates?.endDate,
        plannedPlaces,
        regionNames: trip.locations?.regionNames || [],
    };
}

/**
 * 여행지의 UTC 오프셋(분)을 추정한다 — EXIF의 시간대 없는 시각을 해석하는 데 쓴다.
 *
 * `trip.timeDifference`는 절대 시간대가 아니라 사용자 거주지 기준 시차(예: "+2")라서,
 * 업로드하는 브라우저의 오프셋에 더해야 절대값이 된다. 대개 집에서 올리므로 이 가정이 맞고,
 * 비어 있거나 해석이 안 되면 undefined를 돌려줘 호출부가 기존 동작으로 폴백하게 한다.
 */
export function tripUtcOffsetMinutes(
    trip: Pick<Trip, 'timeDifference'>,
    homeOffsetMinutes: number,
): number | undefined {
    const raw = trip.timeDifference?.trim();
    if (!raw) return undefined;
    const m = raw.match(/^([+-]?\d{1,2})(?:\.5|:30)?/);
    if (!m) return undefined;
    const hours = Number(m[1]);
    if (Number.isNaN(hours)) return undefined;
    const half = /(\.5|:30)/.test(raw) ? (hours < 0 ? -30 : 30) : 0;
    return homeOffsetMinutes + hours * 60 + half;
}

function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const R = 6371000;
    const dLat = (bLat - aLat) * Math.PI / 180;
    const dLng = (bLng - aLng) * Math.PI / 180;
    const la1 = aLat * Math.PI / 180;
    const la2 = bLat * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * 사진 클러스터 좌표가 계획에 적힌 장소 위인지 찾는다.
 *
 * 맞으면 역지오코딩이 주는 동네 이름("오사카시") 대신 사용자가 직접 적어둔 이름
 * ("오사카성")을 바로 쓸 수 있다 — 확인 배지 없이 처음부터 맞는 카드가 된다.
 * 날짜가 어긋나면 반경을 좁혀서, 같은 곳을 다른 날 지나간 경우를 걸러낸다.
 */
export function matchPlannedPlace(
    plannedPlaces: PlannedPlace[],
    at: { lat: number; lng: number; date?: string },
    maxMeters = 150,
): PlannedPlace | undefined {
    let best: { p: PlannedPlace; d: number } | undefined;
    for (const p of plannedPlaces) {
        if (p.lat == null || p.lng == null) continue;
        const d = metersBetween(at.lat, at.lng, p.lat, p.lng);
        // 일정에 날짜가 있는데 방문일과 다르면 더 엄격하게 본다
        const dateMismatch = !!(p.date && at.date && p.date !== at.date);
        const limit = dateMismatch ? maxMeters / 3 : maxMeters;
        if (d > limit) continue;
        if (!best || d < best.d) best = { p, d };
    }
    return best?.p;
}

/**
 * 사진 시각이 어느 여행에 속하는지 찾는다.
 *
 * 사진 뭉치만 보고 "여행의 시작과 끝"을 추론하면 틀리기 쉽지만, 계획에는 날짜가
 * 이미 정확히 적혀 있다. 추론 대신 조회로 끝낼 수 있는 문제다.
 * 여행 전후 하루씩은 여유를 둔다(밤 비행기·새벽 도착).
 */
export function findTripForDate(
    trips: Pick<TripSummary, 'id' | 'title' | 'dates'>[],
    isoTimestamp: string,
    graceDays = 1,
): Pick<TripSummary, 'id' | 'title' | 'dates'> | undefined {
    const t = Date.parse(isoTimestamp);
    if (Number.isNaN(t)) return undefined;
    const graceMs = graceDays * 86_400_000;

    const matches = trips.filter((trip) => {
        const s = trip.dates?.startDate ? Date.parse(`${trip.dates.startDate}T00:00:00`) : NaN;
        const e = trip.dates?.endDate ? Date.parse(`${trip.dates.endDate}T23:59:59`) : NaN;
        if (Number.isNaN(s) || Number.isNaN(e)) return false;
        return t >= s - graceMs && t <= e + graceMs;
    });
    if (matches.length <= 1) return matches[0];

    // 겹치는 여행이 여러 개면 기간이 짧은 쪽(더 구체적인 쪽)을 택한다
    return matches.sort((a, b) => {
        const span = (x: typeof a) =>
            Date.parse(`${x.dates.endDate}T00:00:00`) - Date.parse(`${x.dates.startDate}T00:00:00`);
        return span(a) - span(b);
    })[0];
}

/**
 * 여러 사진에 걸쳐 가장 많이 걸리는 여행 하나를 고른다 (업로드 묶음 단위 귀속).
 * 과반이 아니어도 최다면 채택하되, 하나도 안 걸리면 undefined.
 */
export function attributeToTrip(
    trips: Pick<TripSummary, 'id' | 'title' | 'dates'>[],
    isoTimestamps: string[],
): Pick<TripSummary, 'id' | 'title' | 'dates'> | undefined {
    const tally = new Map<string, { trip: Pick<TripSummary, 'id' | 'title' | 'dates'>; n: number }>();
    isoTimestamps.forEach((ts) => {
        const trip = findTripForDate(trips, ts);
        if (!trip) return;
        const cur = tally.get(trip.id);
        if (cur) cur.n++;
        else tally.set(trip.id, { trip, n: 1 });
    });
    let best: { trip: Pick<TripSummary, 'id' | 'title' | 'dates'>; n: number } | undefined;
    tally.forEach((v) => { if (!best || v.n > best.n) best = v; });
    return best?.trip;
}
