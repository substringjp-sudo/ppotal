/**
 * 마우스와 손가락을 갈라 보는 규칙.
 *
 * 지도에서 구간을 그리는 동작은 두 입력에서 **들어가는 문이 다를 수밖에 없다**. 마우스는
 * 누른 순간 바로 그리기 시작해도 된다 — 지도를 미는 것도 누른 채 끄는 것이지만, 역 위에서
 * 누른 것은 지도를 밀려던 것이 아니라고 봐도 거의 틀리지 않는다. 손가락은 다르다. 화면을
 * 짚고 끄는 동작은 **지도를 미는 유일한 방법**이라, 그걸 그리기로 가로채면 지도를 못 민다.
 * 그래서 손가락은 잠깐 눌러 두는 것으로 문을 연다.
 *
 * ## 창 너비가 아니라 이벤트로 가른다
 *
 * 전에는 창 너비(`isPhoneWidth`, 768px)로 갈랐다. 창 너비는 **화면이 좁은가**를 답하지
 * **무엇으로 짚었는가**를 답하지 않는다. 그래서 화면이 넓은 터치 노트북에서는 손가락으로
 * 아무리 눌러도 그리기가 열리지 않았고, 반대로 좁은 창에 마우스를 쓰면 누르자마자 그려도
 * 될 것을 굳이 기다리게 했다.
 *
 * `PointerEvent.pointerType` 은 한 번의 짚음마다 답을 준다. 기기가 아니라 **이번 동작**이
 * 무엇인지 묻는 것이라, 터치 노트북에서 마우스와 손가락을 번갈아 써도 매번 맞는 문이
 * 열린다. 레이아웃(시트·글자 크기)은 여전히 창 너비의 몫이므로 `isMobile` 은 그대로 둔다.
 */

export type PointerKind = 'mouse' | 'touch' | 'pen' | 'unknown';

/** 그리기로 들어가는 문. 바로 시작할지, 눌러 두기를 기다릴지. */
export type DrawEntry = 'immediate' | 'hold';

/**
 * 손가락을 뗀 뒤 브라우저가 흉내로 쏘아 주는 마우스 이벤트를 무시할 시간(ms).
 *
 * 터치 화면에서 한 번 짚으면 `touchstart…touchend` 다음에 `mousedown/mouseup/click` 이
 * 뒤따른다. 옛 웹페이지가 마우스만 보고 짜여 있어도 동작하라고 있는 것인데, 여기서는
 * 짚기 한 번이 그리기 두 번으로 들어오는 셈이 된다. 300ms 면 대개 충분하지만 느린 기기와
 * 오래 짚은 경우를 감안해 넉넉히 잡았다 — 이 창 안에 진짜 마우스가 움직일 일은 드물고,
 * 드물게 겹치더라도 다음 짚음에서 바로 열린다.
 */
export const COMPAT_MOUSE_WINDOW_MS = 700;

export function normalisePointerType(raw: string | null | undefined): PointerKind {
    if (raw === 'mouse' || raw === 'touch' || raw === 'pen') return raw;
    return 'unknown';
}

/**
 * 이 입력이 어느 문으로 들어가야 하는가.
 *
 * 펜은 손가락 쪽이다. 화면에 대고 끄는 것은 펜도 지도를 미는 동작이라, 마우스처럼
 * 곧바로 가로채면 지도를 못 민다.
 *
 * `coarseFallback` 은 `pointerType` 을 모를 때(`unknown`)만 쓴다 — 포인터 이벤트가 없는
 * 오래된 브라우저에서 `(pointer: coarse)` 가 답을 대신한다.
 */
export function entryFor(kind: PointerKind, coarseFallback: boolean): DrawEntry {
    if (kind === 'mouse') return 'immediate';
    if (kind === 'touch' || kind === 'pen') return 'hold';
    return coarseFallback ? 'hold' : 'immediate';
}

/**
 * 지금 들어온 마우스 이벤트가 방금 짚은 손가락의 흉내인가.
 *
 * `lastTouchAt` 이 없으면(이 화면에서 손가락을 쓴 적이 없으면) 언제나 진짜 마우스다.
 */
export function isCompatibilityMouse(
    lastTouchAt: number | null,
    now: number,
    windowMs: number = COMPAT_MOUSE_WINDOW_MS
): boolean {
    if (lastTouchAt === null) return false;
    const since = now - lastTouchAt;
    return since >= 0 && since < windowMs;
}

/**
 * 역을 누른 마우스 이벤트로 그리기를 시작해도 되는가.
 *
 * 두 물음을 하나로 묶는다. **이번 짚음이 마우스의 문으로 들어가는가**(`entryFor`), 그리고
 * **방금 뗀 손가락의 흉내가 아닌가**(`isCompatibilityMouse`). 둘 다 참일 때만 받는다.
 */
export function acceptsMouseDown(
    kind: PointerKind,
    coarseFallback: boolean,
    lastTouchAt: number | null,
    now: number,
    windowMs: number = COMPAT_MOUSE_WINDOW_MS
): boolean {
    if (entryFor(kind, coarseFallback) !== 'immediate') return false;
    return !isCompatibilityMouse(lastTouchAt, now, windowMs);
}

/** `(pointer: coarse)` — 짚는 것이 손가락뿐인 기기인가. 서버에서는 답하지 않는다. */
export function prefersCoarsePointer(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    try {
        return window.matchMedia('(pointer: coarse)').matches;
    } catch {
        return false;
    }
}
