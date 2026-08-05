/**
 * 여행기 블로그 피드 — 여행기(글) 단위 후보 조립 + 인기·추천 랭킹 (순수 함수).
 *
 * 스팟 피드가 "장소 한 컷"이라면, 이건 "여행기 통째"를 카드로 보는 깊이형 표면.
 * v1은 팔로우 그래프 없이 공개 여행기를 인기(저장·좋아요) + 신선도 + 세렌디피티로
 * 정렬한다. 팔로잉 피드는 이후 팔로우 도입 시 추가.
 */
import type { Travelog } from '../types/record';
import { derivePlacesFromTimeline } from './travelog-places';

export interface BlogCard {
    id: string;
    title: string;
    cover?: string;
    summary?: string;
    authorName?: string;
    authorPhotoURL?: string;
    theme?: string;
    region?: string;
    placeCount: number;
    saveCount: number;
    likeCount: number;
    startDate?: string;
    endDate?: string;
    updatedAt: string;
}

/** 여행기의 대표 표지: coverImageUrl → 대표컷 지정 장소 → 첫 장소/사진 */
function travelogCover(t: Travelog, places: ReturnType<typeof derivePlacesFromTimeline>): string | undefined {
    if (t.coverImageUrl) return t.coverImageUrl;
    for (const p of places) { if (p.coverPhotoUrl) return p.coverPhotoUrl; }
    for (const p of places) { if (p.photoUrls && p.photoUrls.length) return p.photoUrls[0]; }
    return undefined;
}

export function buildBlogCards(travelogs: Travelog[]): BlogCard[] {
    return travelogs.map((t) => {
        const places = (t.places && t.places.length ? t.places : derivePlacesFromTimeline(t.timeline));
        const region = places.find((p) => p.location?.city || p.location?.prefecture || p.location?.country)?.location;
        return {
            id: t.id,
            title: t.title || '여행기',
            cover: travelogCover(t, places),
            summary: t.summary || undefined,
            authorName: t.authorName,
            authorPhotoURL: t.authorPhotoURL,
            theme: t.theme,
            region: region ? (region.city || region.prefecture || region.country) : undefined,
            placeCount: places.length,
            saveCount: t.saveCount ?? 0,
            likeCount: t.likeCount ?? 0,
            startDate: t.startDate,
            endDate: t.endDate,
            updatedAt: t.updatedAt || t.createdAt || '',
        };
    });
}

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const daysAgo = (iso: string) => {
    const t = Date.parse(iso);
    return isNaN(t) ? 365 : Math.max(0, (Date.now() - t) / 86400000);
};

/** 인기(저장·좋아요) + 신선도 + 세렌디피티. 스팟 피드보다 인기 비중을 조금 더 둔다. */
export function rankBlogCards(cards: BlogCard[], opts: { seed?: number } = {}): BlogCard[] {
    const rand = mulberry32(opts.seed ?? 1);
    return cards
        .map((c) => {
            const trending = Math.log1p(c.saveCount * 2 + c.likeCount);
            const freshness = Math.exp(-daysAgo(c.updatedAt) / 45);
            const score = 1.1 * trending + 0.6 * freshness + 0.5 * rand();
            return { c, score };
        })
        .sort((a, b) => b.score - a.score)
        .map((x) => x.c);
}
