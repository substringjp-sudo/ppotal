/**
 * 준비물을 "카드"로 묶는다.
 *
 * 준비 항목을 하나의 긴 목록으로 늘어놓으면 전부 해내야 하는 숙제로 읽힌다. 여행마다
 * 필요한 준비는 다른데, 목록은 그 차이를 표현하지 못하고 30줄짜리 미완성 체크리스트만
 * 남긴다. 그래서 항목이 아니라 **주제(카드)** 단위로 다룬다 — 사용자는 이번 여행에
 * 필요한 카드만 골라 담고, 담은 카드 안에서 체크한다. 스스로 고른 카드 5장은
 * 남이 준 30줄과 전혀 다르게 읽힌다.
 *
 * 카드의 축은 이미 있는 PrepCategory를 그대로 쓴다. 추천 엔진이 여권·비자를 documents로,
 * 어댑터·전압을 power로 내보내고 있어서 주제별 묶음이 사실상 완성돼 있다.
 *
 * 순수 함수 — 네트워크·저장소를 건드리지 않는다.
 */
import type { ChecklistItem, Trip } from '../types/trip';
import {
    generatePreparationItems,
    type GeneratePrepOptions,
    type PrepCategory,
    type PrepItem,
    type PrepPriority,
} from './preparation-service';

/** 직접 적은 항목이 모이는 카드. 카테고리가 아니므로 별도 id를 쓴다. */
export const CUSTOM_CARD_ID = 'custom';

export const PREP_PRIORITY_RANK: Record<PrepPriority, number> = {
    essential: 0,
    recommended: 1,
    optional: 2,
};

export interface PrepCardDef {
    id: string;
    title: string;
    /** Material Symbols Rounded 아이콘 이름 */
    icon: string;
    /** 이 카드가 무엇을 위한 것인지 — 담을지 말지 판단할 근거 */
    blurb: string;
}

/**
 * 카드 정의. 순서가 곧 화면 노출 순서다 — 없으면 출발 자체가 막히는 것(서류)부터,
 * 있으면 좋은 것(쇼핑·액티비티) 순으로 둔다.
 */
export const PREP_CARD_DEFS: PrepCardDef[] = [
    { id: 'documents', title: '서류·입국', icon: 'description', blurb: '여권·비자·전자여행허가처럼 없으면 출발이 막히는 것들' },
    { id: 'money', title: '돈·결제', icon: 'payments', blurb: '환전, 해외결제 카드, 현지 현금 사정' },
    { id: 'connectivity', title: '통신', icon: 'wifi', blurb: '현지에서 지도와 번역을 쓰려면 데이터가 필요해요' },
    { id: 'transport', title: '교통·운전', icon: 'directions_car', blurb: '면허, 교통카드, 차량 호출 앱' },
    { id: 'power', title: '전원·전자기기', icon: 'power', blurb: '플러그 모양과 전압이 다르면 충전이 안 돼요' },
    { id: 'health', title: '건강·위생', icon: 'medical_services', blurb: '보험, 상비약, 현지 위생' },
    { id: 'season', title: '계절 준비', icon: 'thermostat', blurb: '가는 시기의 날씨에 맞춘 것들' },
    { id: 'activity', title: '액티비티', icon: 'hiking', blurb: '사전 예약, 장비, 보험 특약' },
    { id: 'shopping', title: '쇼핑', icon: 'shopping_bag', blurb: '택스리펀, 면세 한도' },
    { id: 'general', title: '안전·생활', icon: 'shield', blurb: '도난 방지처럼 현지에서 겪게 되는 것들' },
    { id: CUSTOM_CARD_ID, title: '직접 추가', icon: 'edit_note', blurb: '내가 적어 둔 것들' },
];

const DEF_BY_ID = new Map(PREP_CARD_DEFS.map(d => [d.id, d]));
const CARD_ORDER = new Map(PREP_CARD_DEFS.map((d, i) => [d.id, i]));

export function getPrepCardDef(id: string): PrepCardDef {
    return DEF_BY_ID.get(id) || { id, title: id, icon: 'label', blurb: '' };
}

/** 담아 둔 카드 — 항목이 실제로 들어 있다. */
export interface ActivePrepCard extends PrepCardDef {
    items: ChecklistItem[];
    doneCount: number;
    /**
     * 이 주제에서 아직 담지 않은 추천 항목.
     * 카드를 담은 뒤에 계획이 바뀌어(항공편 추가 등) 새 준비물이 생길 수 있다.
     * 카드 단위로만 제안하면 이미 담은 카드에 생긴 새 항목을 영영 알려주지 못한다.
     */
    unaddedItems: PrepItem[];
    /** 담긴 항목 중 미완료인 필수 항목 수 */
    pendingEssentialCount: number;
}

/** 아직 담지 않은 카드 — 담으면 items가 통째로 들어온다. */
export interface SuggestedPrepCard extends PrepCardDef {
    items: PrepItem[];
    /** 카드의 중요도 = 안에서 가장 높은 항목의 중요도 */
    priority: PrepPriority;
    /** 왜 이 카드를 제안하는지 — 가장 중요한 항목의 근거를 대표로 보여준다 */
    reason?: string;
}

export interface PrepCardsResult {
    active: ActivePrepCard[];
    suggested: SuggestedPrepCard[];
}

/** 추천 항목을 체크리스트 항목으로 바꾼다(카드에 담을 때 쓴다). */
export function checklistItemFromPrepItem(item: PrepItem): Omit<ChecklistItem, 'id' | 'isDone'> {
    return {
        title: item.title,
        cardId: item.category,
        prepId: item.id,
        priority: item.priority,
        tags: [],
    };
}

/**
 * 여행의 준비 카드를 만든다.
 *
 * - active: 체크리스트에 이미 들어 있는 항목을 카드별로 묶은 것
 * - suggested: 추천 엔진이 필요하다고 본 카드 중 아직 담지 않았고 접어 두지도 않은 것
 */
export function buildPrepCards(trip: Trip, options?: GeneratePrepOptions): PrepCardsResult {
    const checklist = trip.checklist || [];
    const dismissed = new Set(trip.dismissedPrepCards || []);

    const generated = generatePreparationItems(trip, options);

    // 이미 담은 추천 항목은 다시 제안하지 않는다. 생성기 id로 맞추되, 카드 도입 이전에
    // 담긴 항목은 id가 없으므로 제목으로도 한 번 더 걸러 준다.
    const addedPrepIds = new Set(checklist.map(c => c.prepId).filter(Boolean) as string[]);
    const addedTitles = new Set(checklist.map(c => c.title.trim()));
    const isAdded = (p: PrepItem) => addedPrepIds.has(p.id) || addedTitles.has(p.title.trim());

    // ── 담아 둔 카드 ──────────────────────────────────────
    const byCard = new Map<string, ChecklistItem[]>();
    for (const item of checklist) {
        // cardId가 없는 항목(카드 도입 이전 데이터, 사용자가 직접 적은 것)은 '직접 추가'로 모은다.
        const cardId = item.cardId || CUSTOM_CARD_ID;
        if (!byCard.has(cardId)) byCard.set(cardId, []);
        byCard.get(cardId)!.push(item);
    }

    const unaddedByCategory = new Map<string, PrepItem[]>();
    for (const p of generated) {
        if (isAdded(p)) continue;
        if (!unaddedByCategory.has(p.category)) unaddedByCategory.set(p.category, []);
        unaddedByCategory.get(p.category)!.push(p);
    }

    const active: ActivePrepCard[] = [...byCard.entries()].map(([cardId, items]) => ({
        ...getPrepCardDef(cardId),
        items,
        doneCount: items.filter(i => i.isDone).length,
        unaddedItems: sortByPriority(unaddedByCategory.get(cardId) || []),
        pendingEssentialCount: items.filter(i => !i.isDone && i.priority === 'essential').length,
    }));
    active.sort(byCardOrder);

    // ── 제안할 카드 ───────────────────────────────────────
    const activeIds = new Set(active.map(c => c.id));
    const suggested: SuggestedPrepCard[] = [...unaddedByCategory.entries()]
        .filter(([cardId]) => !activeIds.has(cardId) && !dismissed.has(cardId))
        .map(([cardId, items]) => {
            const sorted = sortByPriority(items);
            const top = sorted[0];
            return {
                ...getPrepCardDef(cardId),
                items: sorted,
                priority: top?.priority || 'recommended',
                reason: top?.reason,
            };
        });
    // 중요한 카드가 아래로 밀리지 않도록 중요도 먼저, 같으면 카드 정의 순서대로.
    suggested.sort((a, b) => {
        const p = PREP_PRIORITY_RANK[a.priority] - PREP_PRIORITY_RANK[b.priority];
        return p !== 0 ? p : byCardOrder(a, b);
    });

    return { active, suggested };
}

function sortByPriority<T extends { priority: PrepPriority }>(items: T[]): T[] {
    return [...items].sort((a, b) => PREP_PRIORITY_RANK[a.priority] - PREP_PRIORITY_RANK[b.priority]);
}

function byCardOrder(a: { id: string }, b: { id: string }): number {
    const ai = CARD_ORDER.get(a.id) ?? 999;
    const bi = CARD_ORDER.get(b.id) ?? 999;
    return ai - bi;
}

export type { PrepCategory };
