/**
 * 스팟 피드 — 후보 풀 조립 + 휴리스틱 랭킹 (순수 함수).
 *
 * 공개 여행기들을 스팟(장소) 원자로 분해하고, 학습 모델 없이 신호만으로 정렬한다:
 *   점수 = 트렌딩(저장·좋아요) + 지역 친화 + 테마 친화 + 신선도 + 랜덤(세렌디피티)
 * 같은 작성자·지역이 연속으로 나오지 않도록 다양성 제약을 건다.
 * 데이터가 쌓이면 이 함수 뒤로 학습 모델을 갈아끼우면 된다(인터페이스 유지).
 */
import type { Travelog, TravelogPlace } from '../types/record';
import { derivePlacesFromTimeline } from './travelog-places';

export interface FeedSpot {
    key: string;              // 고유 키 (travelogId::spotId)
    spot: TravelogPlace;
    travelogId: string;
    travelogTitle: string;
    authorName?: string;
    authorPhotoURL?: string;
    theme?: string;
    region?: string;          // 다양성/친화 판단용 대표 지역
    saveCount: number;
    likeCount: number;
    updatedAt: string;
    coverUrl?: string;        // 대표 컷 (지정 없으면 첫 사진)
}

/** 스팟의 대표 지역 문자열 (city > prefecture > country > 주소 첫 토큰) */
export function spotRegion(p: TravelogPlace): string | undefined {
    const loc = p.location;
    if (!loc) return undefined;
    return loc.city || loc.prefecture || loc.country
        || (loc.address ? loc.address.split(/[\s,]/).filter(Boolean)[0] : undefined);
}

/** 공개 여행기들을 사진 있는 스팟 원자들로 펼친다 */
export function buildFeedSpots(travelogs: Travelog[]): FeedSpot[] {
    const out: FeedSpot[] = [];
    for (const t of travelogs) {
        const places = (t.places && t.places.length ? t.places : derivePlacesFromTimeline(t.timeline));
        for (const spot of places) {
            const cover = spot.coverPhotoUrl || spot.photoUrls?.[0];
            if (!cover) continue; // 피드는 사진이 있는 스팟만
            out.push({
                key: `${t.id}::${spot.id}`,
                spot,
                travelogId: t.id,
                travelogTitle: t.title || '여행기',
                authorName: t.authorName,
                authorPhotoURL: t.authorPhotoURL,
                theme: t.theme,
                region: spotRegion(spot),
                saveCount: t.saveCount ?? 0,
                likeCount: t.likeCount ?? 0,
                updatedAt: t.updatedAt || t.createdAt || '',
                coverUrl: cover,
            });
        }
    }
    return out;
}

// 결정적 난수 (mulberry32) — 세션 seed 하나로 흔들리지 않는 세렌디피티
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function daysAgo(iso: string): number {
    const t = Date.parse(iso);
    if (isNaN(t)) return 365;
    return Math.max(0, (Date.now() - t) / 86400000);
}

export interface RankOptions {
    userThemes?: string[];    // 개인화 씨앗 (내가 반응/기록한 테마)
    userRegions?: string[];   // 개인화 씨앗 (내 저장·계획 지역)
    seed?: number;            // 세션 고정 seed
}

/**
 * 스팟들을 휴리스틱으로 정렬한다. 점수 상위 + 다양성(연속 작성자/지역 억제).
 */
export function rankSpots(spots: FeedSpot[], opts: RankOptions = {}): FeedSpot[] {
    const themes = new Set((opts.userThemes || []).filter(Boolean));
    const regions = new Set((opts.userRegions || []).filter(Boolean));
    const rand = mulberry32(opts.seed ?? 1);

    const scored = spots.map((s) => {
        const trending = Math.log1p(s.saveCount * 2 + s.likeCount);      // 0.7 근처까지
        const freshness = Math.exp(-daysAgo(s.updatedAt) / 30);          // 0~1, 30일 반감
        const themeAff = s.theme && themes.has(s.theme) ? 1 : 0;
        const regionAff = s.region && regions.has(s.region) ? 1 : 0;
        const serendipity = rand();
        const score =
            0.9 * trending +
            0.8 * regionAff +
            0.6 * themeAff +
            0.7 * freshness +
            0.6 * serendipity;
        return { s, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // 다양성: 같은 작성자·지역이 바로 연달아 나오지 않게 그리디 재배치
    const ordered: FeedSpot[] = [];
    const pool = scored.map((x) => x.s);
    let lastAuthor: string | undefined;
    let lastRegion: string | undefined;
    while (pool.length) {
        let idx = pool.findIndex((s) => s.authorName !== lastAuthor && s.region !== lastRegion);
        if (idx === -1) idx = 0; // 다 겹치면 그냥 상위
        const [pick] = pool.splice(idx, 1);
        ordered.push(pick);
        lastAuthor = pick.authorName;
        lastRegion = pick.region;
    }
    return ordered;
}
