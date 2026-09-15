import type { CandidateRoute, RouteGraph } from './routeSearch';
import type { Trip } from '../types/trip';

/**
 * 기록해 둔 여정을 고치는 연산들.
 *
 * 여정은 **끝점 두 개와 그 사이에 고른 경로**로 정해진다. 그래서 편집은 둘 중
 * 하나다 — 끝점을 옮기거나, 같은 끝점 사이의 다른 경로를 고르거나.
 *
 * 화면 없이 시험할 수 있도록 순수 함수로 둔다. 경로를 새로 찾아야 하는 것은
 * 후보(`CandidateRoute`)를 받아서 얹기만 한다 — 탐색 자체는 호출하는 쪽의 몫이다.
 */

/** 여정의 시작 역 id. `startId` 가 비어 있으면 지나간 역 목록의 첫 칸을 쓴다. */
export function startIdOf(trip: Trip): string | undefined {
    return trip.startId || trip.path?.[0];
}

/** 여정의 종료 역 id. */
export function endIdOf(trip: Trip): string | undefined {
    return trip.endId || trip.path?.[trip.path.length - 1];
}

/**
 * 제자리로 돌아오는 여정인지.
 *
 * 끝점이 같은 자리면 순환이다. 다만 **끝점을 모르는 기록**(앱에서 넘어온 것)은
 * 둘 다 undefined 라서 `startId === endId` 가 참이 되어 버린다 — 전부 순환으로
 * 보이던 버그가 여기서 났다. 그래서 끝점이 실제로 있을 때만 견준다.
 *
 * 구간이 둘 이하면 순환이라 부르지 않는다. 한 정거장 갔다 온 것은 왕복이지 순환이
 * 아니고, 화면에 "(순환)"이라고 적으면 거짓말이 된다.
 */
export function isRoundTrip(trip: Trip): boolean {
    const a = startIdOf(trip);
    return !!a && a === endIdOf(trip) && (trip.sectionIds?.length || 0) > 2;
}

/**
 * 방향을 뒤집는다.
 *
 * 탄 선로는 그대로고 순서만 반대다. 그래서 새로 찾을 것이 없다 — 거리도 구간도
 * 같은 것을 뒤집기만 하면 된다. 폴리라인은 묶음의 순서와 각 묶음 안의 점 순서를
 * 모두 뒤집어야 선이 거꾸로 자란다.
 */
export function reverseTrip(trip: Trip): Trip {
    return {
        ...trip,
        start: trip.end,
        end: trip.start,
        startId: endIdOf(trip),
        endId: startIdOf(trip),
        path: [...(trip.path || [])].reverse(),
        waypoints: [...(trip.waypoints || [])].reverse(),
        sectionIds: [...(trip.sectionIds || [])].reverse(),
        geometries: [...(trip.geometries || [])].reverse().map(line => [...line].reverse())
    };
}

/**
 * 고른 경로를 여정에 얹는다.
 *
 * 끝점은 건드리지 않는다. 같은 두 역 사이에서 **어느 길로 갔는지**만 바꾸는
 * 연산이기 때문이다. 이름과 날짜도 그대로 둔다 — 사용자가 적어 둔 것이다.
 */
export function applyRoute(trip: Trip, route: CandidateRoute): Trip {
    return {
        ...trip,
        path: route.stationIds,
        sectionIds: route.sectionIds,
        geometries: route.geometries,
        distance: route.distance
    };
}

/**
 * 한쪽 끝을 한 역만큼 줄인다.
 *
 * 지나간 역이 둘뿐이면 줄일 수 없다 — 역 하나짜리 여정은 여정이 아니다.
 * 구간과 폴리라인도 같이 한 칸 덜어 낸다. 거리는 다시 재지 않고 호출하는 쪽에서
 * 새로 찾은 경로로 덮어쓰는 편이 정확하지만, 그 전에도 화면이 맞게 보이도록
 * 지나간 역 목록은 바로 줄여 둔다.
 */
export function retractTrip(trip: Trip, which: 'start' | 'end'): Trip | null {
    const path = trip.path || [];
    if (path.length <= 2) return null;

    if (which === 'start') {
        const nextPath = path.slice(1);
        return {
            ...trip,
            path: nextPath,
            startId: nextPath[0],
            sectionIds: (trip.sectionIds || []).slice(1),
            geometries: (trip.geometries || []).slice(1)
        };
    }
    const nextPath = path.slice(0, -1);
    return {
        ...trip,
        path: nextPath,
        endId: nextPath[nextPath.length - 1],
        sectionIds: (trip.sectionIds || []).slice(0, -1),
        geometries: (trip.geometries || []).slice(0, -1)
    };
}

/**
 * 한쪽 끝에서 한 역 더 갈 수 있는 곳들.
 *
 * 이미 지나간 역은 뺀다. 되돌아가는 것을 "한 역 더 갔다"고 부를 수는 없고, 그대로
 * 두면 왕복을 늘리는 단추가 되어 버린다. 걸어서 갈아타는 간선도 뺀다 — 늘리는 것은
 * 선로를 한 구간 더 타는 일이지 걷는 일이 아니다.
 */
export function neighboursToExtend(
    graph: RouteGraph,
    trip: Trip,
    which: 'start' | 'end'
): string[] {
    const path = trip.path || [];
    const tip = which === 'start' ? startIdOf(trip) : endIdOf(trip);
    if (!tip) return [];

    const visited = new Set(path);
    const out: string[] = [];
    const seen = new Set<string>();
    for (const edge of graph.adj.get(tip) || []) {
        if (edge.isWalk) continue;
        if (visited.has(edge.to) || seen.has(edge.to)) continue;
        seen.add(edge.to);
        out.push(edge.to);
    }
    return out;
}

/**
 * 끝점을 바꾼 뒤 다시 찾아야 하는지.
 *
 * 끝점이 그대로면 경로를 다시 찾을 이유가 없다. 쓸데없이 다시 찾으면 사용자가
 * 골라 둔 경로가 조용히 다른 것으로 바뀐다.
 */
export function needsResearch(before: Trip, after: Trip): boolean {
    return startIdOf(before) !== startIdOf(after) || endIdOf(before) !== endIdOf(after);
}
