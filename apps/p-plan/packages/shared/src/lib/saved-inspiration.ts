/**
 * 저장 지도 → 여행 테마 영감 (순수 함수).
 *
 * "가고 싶은 지도"에 쌓인 스팟들을 지역 × 테마로 묶어, 계획을 구상하는 순간
 * "내 취향이 이런 여행을 가리키네"를 발견하게 한다. 목록 삽입이 아니라 영감.
 */
import type { SavedSpot } from './spot-social';

export interface InspirationCluster {
    key: string;
    region: string;          // 대표 지역
    theme?: string;          // 대표 테마(있으면)
    count: number;
    spots: SavedSpot[];
    covers: string[];        // 대표 썸네일 몇 장
}

const norm = (s?: string | null) => (s || '').trim();

/**
 * 저장 스팟을 지역(+테마) 클러스터로 묶어, 큰 묶음부터 정렬해 돌려준다.
 * 지역이 같으면 한 여행의 씨앗이 될 수 있다는 가정. 테마가 지배적이면 함께 라벨.
 */
export function clusterSavedSpots(saved: SavedSpot[], opts: { min?: number; max?: number } = {}): InspirationCluster[] {
    const min = opts.min ?? 2;      // 최소 이 개수는 모여야 "여행"으로 제안
    const max = opts.max ?? 8;

    const byRegion = new Map<string, SavedSpot[]>();
    for (const s of saved) {
        const region = norm(s.region);
        if (!region) continue;
        if (!byRegion.has(region)) byRegion.set(region, []);
        byRegion.get(region)!.push(s);
    }

    const clusters: InspirationCluster[] = [];
    for (const [region, spots] of byRegion) {
        if (spots.length < min) continue;
        // 지배적 테마 찾기
        const themeCount = new Map<string, number>();
        for (const s of spots) {
            const t = norm(s.theme);
            if (t) themeCount.set(t, (themeCount.get(t) || 0) + 1);
        }
        let theme: string | undefined;
        let top = 0;
        for (const [t, c] of themeCount) if (c > top) { top = c; theme = t; }
        // 과반(strict majority)이 아니면 지역만으로 (혼합 — 임의 라벨 방지)
        if (top <= spots.length / 2) theme = undefined;

        clusters.push({
            key: region + (theme ? `::${theme}` : ''),
            region,
            theme,
            count: spots.length,
            spots,
            covers: spots.map((s) => s.coverUrl).filter((u): u is string => !!u).slice(0, 4),
        });
    }

    clusters.sort((a, b) => b.count - a.count);
    return clusters.slice(0, max);
}
