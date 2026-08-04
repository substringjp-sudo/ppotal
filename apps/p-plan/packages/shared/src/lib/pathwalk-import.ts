/**
 * PATHWALK 인입 계약 & 변환기.
 *
 * PATHWALK(여행 중 자동 기록 앱)가 넘겨줄 발자취를 웹 여행기(Travelog)로 변환한다.
 * 실제 연동은 PATHWALK 쪽 준비가 필요하므로, 여기서는 (1) 넘겨받을 데이터 계약과
 * (2) 그것을 Travelog(timeline + places[])로 만드는 순수 변환기, (3) 체험용 샘플을 둔다.
 *
 * 원시 위치 로그(TripFootprint)는 극도로 민감해 서버로 나가면 안 되므로, PATHWALK는
 * "사용자가 추출을 허용한 주요 거점(정지 클러스터 대표점)"만 아래 형태로 건넨다.
 */
import type { Travelog, TravelogDailyPlan, TravelogEvent } from '../types/record';
import type { ActivityType } from '../types/record';
import { derivePlacesFromTimeline } from './travelog-places';
import { generateId } from '../types/common';

/** PATHWALK가 건네는 거점 하나 (정지 클러스터 대표점) */
export interface PathwalkTracePoint {
    timestamp: string;        // ISO datetime (현지 기준)
    lat: number;
    lng: number;
    placeName?: string;       // 역지오코딩/POI 이름 (있으면)
    googlePlaceId?: string;
    address?: string;
    photoUrls?: string[];     // 그 장소에서 찍은 사진
    stayMinutes?: number;     // 체류 시간(분)
    activityType?: ActivityType;
    note?: string;            // 앱이 남긴 메모(있으면)
}

/** PATHWALK 인입 페이로드 계약 */
export interface PathwalkImport {
    schemaVersion?: number;   // 계약 버전 (현재 1)
    tripId?: string;          // 계획과 연동된 경우
    title?: string;
    theme?: string;
    startDate?: string;       // YYYY-MM-DD
    endDate?: string;         // YYYY-MM-DD
    points: PathwalkTracePoint[];  // 시간순 거점 목록
}

const ymd = (ts: string): string => {
    const s = (ts || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date().toISOString().slice(0, 10);
};
const hm = (ts: string): string => {
    const m = (ts || '').match(/T(\d{2}:\d{2})/);
    return m ? m[1] : '';
};
const addMinutes = (time: string, mins: number): string => {
    if (!time) return '';
    const [h, mi] = time.split(':').map(Number);
    const total = h * 60 + mi + mins;
    const hh = Math.floor((total % 1440) / 60);
    const mm = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

/** 인입 페이로드가 최소 요건을 갖췄는지 검증 */
export function isValidPathwalkImport(data: any): data is PathwalkImport {
    return !!data
        && Array.isArray(data.points)
        && data.points.length > 0
        && data.points.every((p: any) => typeof p?.lat === 'number' && typeof p?.lng === 'number' && typeof p?.timestamp === 'string');
}

/**
 * PATHWALK 발자취 → Travelog.
 * 거점들을 날짜별로 묶어 timeline을 만들고, 기존 place substrate로 places[]를 파생한다.
 */
export function travelogFromPathwalk(data: PathwalkImport, userId: string): Travelog {
    // 시간순 정렬
    const points = [...data.points].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));

    // 날짜별 그룹핑 → timeline
    const byDay = new Map<string, PathwalkTracePoint[]>();
    for (const p of points) {
        const key = ymd(p.timestamp);
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key)!.push(p);
    }
    const dates = Array.from(byDay.keys()).sort();
    const timeline: TravelogDailyPlan[] = dates.map((date, i) => ({
        day: i + 1,
        date,
        events: byDay.get(date)!.map((p): TravelogEvent => {
            const time = hm(p.timestamp);
            const hasStay = typeof p.stayMinutes === 'number' && p.stayMinutes > 0;
            return {
                id: generateId(),
                title: p.placeName || '방문한 장소',
                type: 'activity',
                date,
                time: hasStay ? undefined : time || undefined,
                startTime: hasStay ? time || undefined : undefined,
                endTime: hasStay ? addMinutes(time, p.stayMinutes!) || undefined : undefined,
                location: {
                    name: p.placeName || '방문한 장소',
                    lat: p.lat,
                    lng: p.lng,
                    googlePlaceId: p.googlePlaceId,
                    address: p.address,
                },
                memo: p.note,
                imageUrls: p.photoUrls,
            };
        }),
    }));

    const places = derivePlacesFromTimeline(timeline);
    const firstName = points.find((p) => p.placeName)?.placeName;

    return {
        id: data.tripId || `log_${generateId()}`,
        tripId: data.tripId || undefined,
        userId: userId || 'anonymous',
        title: data.title || (firstName ? `${firstName} 여행기` : 'PATHWALK 여행기'),
        summary: '',
        theme: data.theme || '기록',
        memberCounts: { me: 1, partner: 0, family: 0, friends: 0 },
        sourceContext: data.tripId ? 'plan_with_trace' : 'trace_only',
        startDate: data.startDate || dates[0],
        endDate: data.endDate || dates[dates.length - 1],
        status: 'draft',
        isPublic: false,
        recordingMode: 'standard',
        timeline,
        places,
        sections: [{ id: generateId(), type: 'text', content: '' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

/** 체험용 샘플 발자취 (도쿄 하루) */
export function samplePathwalkImport(): PathwalkImport {
    const d = new Date().toISOString().slice(0, 10);
    return {
        schemaVersion: 1,
        title: 'PATHWALK 도쿄 하루',
        theme: '기록',
        points: [
            { timestamp: `${d}T09:20:00`, lat: 35.6595, lng: 139.7005, placeName: '시부야 스크램블 교차로', address: '시부야', stayMinutes: 40, photoUrls: [] },
            { timestamp: `${d}T11:10:00`, lat: 35.6717, lng: 139.7650, placeName: '메이지 신궁', address: '시부야구', stayMinutes: 70 },
            { timestamp: `${d}T13:30:00`, lat: 35.7148, lng: 139.7967, placeName: '센소지', address: '아사쿠사', stayMinutes: 55 },
            { timestamp: `${d}T16:00:00`, lat: 35.7101, lng: 139.8107, placeName: '도쿄 스카이트리', address: '스미다구', stayMinutes: 80 },
        ],
    };
}
