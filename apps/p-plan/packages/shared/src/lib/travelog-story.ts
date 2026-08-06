/**
 * 여행기 카드 스트림 — 장소 카드(TravelogPlace)와 글 카드(TravelogNote)를 하나의
 * 순서 있는 흐름으로 합친다.
 *
 * 새 에디터의 핵심 전제: "쓰는 것 = 읽히는 것 = 스팟"이다. 별도 문서(sections)를
 * 쓰고 거기서 장소를 파생하는 게 아니라, 장소·글 카드 자체가 원천 데이터이고
 * 뷰어는 이 스트림을 그대로 렌더한다.
 */
import type { Travelog, TravelogPlace, TravelogNote } from '../types/record';

export type StoryEntry =
    | { kind: 'place'; order: number; place: TravelogPlace }
    | { kind: 'note'; order: number; note: TravelogNote };

/** 장소·글 카드를 order 순으로 합친다 (order 없으면 배열 등장 순서로 보정) */
export function buildStoryEntries(
    travelog: Pick<Travelog, 'places' | 'notes'>,
): StoryEntry[] {
    const places = travelog.places || [];
    const notes = travelog.notes || [];
    const entries: StoryEntry[] = [
        ...places.map((place, i) => ({ kind: 'place' as const, order: place.order ?? i, place })),
        ...notes.map((note, i) => ({ kind: 'note' as const, order: note.order ?? places.length + i, note })),
    ];
    entries.sort((a, b) => a.order - b.order);
    return entries;
}

/**
 * 카드 스트림을 일자별로 묶는다 (타임라인 템플릿용).
 * 장소 카드의 day/visitDate가 바뀔 때마다 새 날짜 그룹을 연다. 글 카드는 자체 날짜가
 * 없으므로 헤더를 만들지 않고 현재 그룹의 흐름에 그대로 끼어든다.
 */
export function groupStoryEntriesByDay(entries: StoryEntry[]): {
    day?: number;
    date?: string;
    entries: StoryEntry[];
}[] {
    const groups: { day?: number; date?: string; entries: StoryEntry[] }[] = [];
    let current: { day?: number; date?: string; entries: StoryEntry[] } | null = null;

    for (const e of entries) {
        if (e.kind === 'place') {
            const day = e.place.day;
            const date = e.place.visitDate;
            const isNewGroup = !current || (day != null && day !== current.day) || (day == null && date != null && date !== current.date);
            if (isNewGroup) {
                current = { day, date, entries: [] };
                groups.push(current);
            }
        }
        if (!current) {
            current = { entries: [] };
            groups.push(current);
        }
        current.entries.push(e);
    }
    return groups;
}

/** 장소·글 카드를 합쳐 정렬된 order로 되돌려 쓴다 (드래그 재정렬 후 저장용) */
export function reorderStoryEntries(
    entries: StoryEntry[],
): { places: TravelogPlace[]; notes: TravelogNote[] } {
    const places: TravelogPlace[] = [];
    const notes: TravelogNote[] = [];
    entries.forEach((e, order) => {
        if (e.kind === 'place') places.push({ ...e.place, order });
        else notes.push({ ...e.note, order });
    });
    return { places, notes };
}
