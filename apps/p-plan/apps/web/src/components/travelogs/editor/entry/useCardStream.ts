'use client';

import {
    createContext, useCallback, useContext, useMemo, useRef, useState,
} from 'react';

/**
 * 카드 스트림 키보드 내비게이션.
 *
 * 여행 블로그를 쓸 때 가장 큰 스트레스는 사진 사이 틈을 찾아 클릭하고, 글을 쓰다
 * 앞뒤 사진을 확인하러 손을 떼는 것이다. 카드 스트림은 글 칸이 이미 열려 있어 틈을
 * 찾을 필요가 없고, 이 훅이 "키보드에서 손 떼지 않고 다음 장소로" 이어가게 한다.
 *
 * 설계 원칙 — 구 에디터의 실패(Enter/Tab 오버로드)를 반복하지 않는다:
 *   · 평범한 키는 절대 가로채지 않는다. Enter=줄바꿈, Tab=브라우저 기본 포커스 이동.
 *   · 흐름 이동은 수식키 조합으로만. ⌘/Ctrl+Enter = 다음, +Shift = 이전.
 *   · 마지막 카드에서 한 번 더 누르면 새 글 카드를 열어 흐름이 끊기지 않는다.
 */

interface CardStreamValue {
    activeId: string | null;
    registerField: (id: string, el: HTMLTextAreaElement | null) => void;
    focusEntry: (id: string) => void;
    focusRelative: (fromId: string, dir: 1 | -1) => void;
    setActiveId: (id: string | null) => void;
}

const CardStreamContext = createContext<CardStreamValue | null>(null);

export function useCardStreamContext(): CardStreamValue | null {
    return useContext(CardStreamContext);
}

/**
 * 스트림 상태를 만든다. 부모(에디터 페이지)가 카드 순서(ids)와 "마지막에서 더 진행"
 * 콜백을 넘긴다.
 */
export function useCardStreamState(ids: string[], onOverflow?: () => void): CardStreamValue {
    const fields = useRef(new Map<string, HTMLTextAreaElement | null>());
    const [activeId, setActiveId] = useState<string | null>(null);
    const idsRef = useRef(ids);
    idsRef.current = ids;

    const registerField = useCallback((id: string, el: HTMLTextAreaElement | null) => {
        if (el) fields.current.set(id, el);
        else fields.current.delete(id);
    }, []);

    const focusEntry = useCallback((id: string) => {
        const el = fields.current.get(id);
        if (!el) return;
        el.focus();
        // 커서를 글 끝으로 — 이어 쓰기 좋게
        const len = el.value.length;
        try { el.setSelectionRange(len, len); } catch { /* noop */ }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []);

    const focusRelative = useCallback((fromId: string, dir: 1 | -1) => {
        const list = idsRef.current;
        const i = list.indexOf(fromId);
        if (i === -1) return;
        const next = list[i + dir];
        if (next) {
            focusEntry(next);
        } else if (dir === 1 && onOverflow) {
            // 마지막 카드에서 한 번 더 → 새 글 카드로 흐름을 잇는다
            onOverflow();
        }
    }, [focusEntry, onOverflow]);

    return useMemo(
        () => ({ activeId, registerField, focusEntry, focusRelative, setActiveId }),
        [activeId, registerField, focusEntry, focusRelative],
    );
}

export const CardStreamProvider = CardStreamContext.Provider;

/**
 * 카드의 주 입력칸(소감/글)에 붙이는 핸들러 묶음.
 * onRate를 주면 ⌘/Ctrl+1~5로 별점을 매길 수 있다(장소 카드).
 */
export function useCardStreamField(id: string, opts?: { onRate?: (n: number) => void }) {
    const ctx = useCardStreamContext();
    const onRate = opts?.onRate;

    const ref = useCallback((el: HTMLTextAreaElement | null) => {
        ctx?.registerField(id, el);
    }, [ctx, id]);

    const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const mod = e.metaKey || e.ctrlKey;
        if (!mod) return;                    // 수식키 없는 입력은 절대 건드리지 않는다

        if (e.key === 'Enter') {
            e.preventDefault();
            ctx?.focusRelative(id, e.shiftKey ? -1 : 1);
            return;
        }
        if (e.key === 'ArrowDown') { e.preventDefault(); ctx?.focusRelative(id, 1); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); ctx?.focusRelative(id, -1); return; }

        if (onRate && /^[1-5]$/.test(e.key)) {
            e.preventDefault();
            onRate(Number(e.key));
        }
    }, [ctx, id, onRate]);

    const onFocus = useCallback(() => ctx?.setActiveId(id), [ctx, id]);
    const onBlur = useCallback(() => {
        // 다른 카드로 옮겨간 경우엔 그 카드가 곧바로 setActiveId 하므로 건드리지 않는다
        setTimeout(() => {
            if (document.activeElement?.tagName !== 'TEXTAREA') ctx?.setActiveId(null);
        }, 0);
    }, [ctx]);

    return { ref, onKeyDown, onFocus, onBlur, isActive: ctx?.activeId === id };
}
