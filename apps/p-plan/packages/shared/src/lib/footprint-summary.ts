import type { FootprintActivity } from '../types/record';

/**
 * 발자취를 "지역 누적"으로 집계한다.
 *
 * 여행 데이터는 매일 쌓이지 않는다 — 1년에 두세 번, 며칠씩 몰아서 생긴다. 그래서
 * 날짜 목록을 첫 화면에 두면 대부분이 빈 공간이고 무엇보다 쌓이는 느낌이 나지 않는다.
 * 띄엄띄엄한 기록을 다루는 서비스들이 공통적으로 공간(지도)과 누적(몇 개국·몇 도시)을
 * 인덱스로 쓰고 시간을 필터로 미뤄두는 이유다.
 *
 * 여기서 시간은 "최근 방문"과 드릴다운 안에서만 등장한다.
 */

export interface RegionAccumulation {
    region: string;
    /** 방문 횟수 — 시간상 떨어진 묶음의 수 (연속된 며칠은 한 번으로 센다) */
    visitCount: number;
    /** 이 지역에서 기록된 서로 다른 장소 수 */
    placeCount: number;
    activityCount: number;
    firstVisit?: string;
    lastVisit?: string;
    /** 여행기로 쓴 활동이 하나라도 있는가 */
    hasTravelog: boolean;
}

export interface FootprintSummary {
    activityCount: number;
    placeCount: number;
    regionCount: number;
    /** 여행기로 옮겨진 활동 수 / 기록만 남은 활동 수 */
    writtenCount: number;
    unwrittenCount: number;
    regions: RegionAccumulation[];
}

const isWritten = (a: FootprintActivity) => !!a.travelogIds?.length;

/** 서로 다른 방문으로 셀 시간 간격 — 이보다 벌어지면 "다시 갔다"고 본다 */
const VISIT_GAP_DAYS = 3;

export function summarizeFootprint(activities: FootprintActivity[]): FootprintSummary {
    const byRegion = new Map<string, FootprintActivity[]>();
    let placeTotal = 0;

    activities.forEach((a) => {
        placeTotal += a.places?.length || 0;
        const key = a.region || regionFallback(a);
        if (!key) return;
        const list = byRegion.get(key);
        if (list) list.push(a);
        else byRegion.set(key, [a]);
    });

    const regions: RegionAccumulation[] = [];
    byRegion.forEach((list, region) => {
        const sorted = [...list].sort(
            (a, b) => Date.parse(a.startAt) - Date.parse(b.startAt),
        );

        // 며칠에 걸친 한 번의 여행을 한 번의 방문으로 센다
        let visitCount = sorted.length ? 1 : 0;
        for (let i = 1; i < sorted.length; i++) {
            const gapDays = (Date.parse(sorted[i].startAt) - Date.parse(sorted[i - 1].endAt)) / 86_400_000;
            if (gapDays > VISIT_GAP_DAYS) visitCount++;
        }

        const placeKeys = new Set<string>();
        sorted.forEach((a) => (a.places || []).forEach((p) => {
            placeKeys.add(p.googlePlaceId || p.name || `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`);
        }));

        regions.push({
            region,
            visitCount,
            placeCount: placeKeys.size,
            activityCount: sorted.length,
            firstVisit: sorted[0]?.startAt,
            lastVisit: sorted[sorted.length - 1]?.endAt,
            hasTravelog: sorted.some(isWritten),
        });
    });

    // 많이 간 곳 먼저, 같으면 최근 순
    regions.sort((a, b) =>
        b.visitCount - a.visitCount ||
        (b.lastVisit || '').localeCompare(a.lastVisit || ''),
    );

    return {
        activityCount: activities.length,
        placeCount: placeTotal,
        regionCount: regions.length,
        writtenCount: activities.filter(isWritten).length,
        unwrittenCount: activities.filter((a) => !isWritten(a)).length,
        regions,
    };
}

/** region이 아직 없는(예전에 저장된) 활동은 대표 장소 이름으로라도 묶어본다 */
function regionFallback(a: FootprintActivity): string | undefined {
    return a.places?.[0]?.name || undefined;
}

export interface UnwrittenStretch {
    /** 이 묶음의 활동들 */
    activities: FootprintActivity[];
    startAt: string;
    endAt: string;
    region?: string;
    tripId?: string;
    placeCount: number;
    photoCount: number;
}

/**
 * 여행기로 쓰지 않은 활동들을 "한 번의 여행" 단위로 묶는다.
 *
 * 발자취 레이어가 존재하는 이유가 바로 이것이다 — 다녀왔지만 안 쓴 것.
 * 화면에 드러내야 다시 돌아올 이유가 되고, 작성으로 가는 다리가 된다.
 */
export function findUnwrittenStretches(
    activities: FootprintActivity[],
    gapDays = VISIT_GAP_DAYS,
): UnwrittenStretch[] {
    const unwritten = activities
        .filter((a) => !isWritten(a))
        .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
    if (unwritten.length === 0) return [];

    const groups: FootprintActivity[][] = [];
    let current: FootprintActivity[] = [unwritten[0]];
    for (let i = 1; i < unwritten.length; i++) {
        const gap = (Date.parse(unwritten[i].startAt) - Date.parse(unwritten[i - 1].endAt)) / 86_400_000;
        // 같은 여행에 속한다고 표시돼 있으면 날짜가 벌어져도 붙여둔다
        const sameTrip = !!unwritten[i].tripId && unwritten[i].tripId === unwritten[i - 1].tripId;
        if (gap > gapDays && !sameTrip) {
            groups.push(current);
            current = [unwritten[i]];
        } else {
            current.push(unwritten[i]);
        }
    }
    groups.push(current);

    return groups.map((g) => {
        const regionTally = new Map<string, number>();
        g.forEach((a) => { if (a.region) regionTally.set(a.region, (regionTally.get(a.region) || 0) + 1); });
        let region: string | undefined;
        let top = 0;
        regionTally.forEach((n, name) => { if (n > top) { top = n; region = name; } });

        return {
            activities: g,
            startAt: g[0].startAt,
            endAt: g[g.length - 1].endAt,
            region,
            tripId: g.find((a) => a.tripId)?.tripId,
            placeCount: g.reduce((s, a) => s + (a.places?.length || 0), 0),
            photoCount: g.reduce((s, a) => s + (a.photoUrls?.length || 0), 0),
        };
    // 최근 것부터 — 기억이 살아있을 때 쓰는 게 쉽다
    }).sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt));
}
