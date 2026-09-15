/**
 * 그리는 동안 손가락·커서가 화면 가장자리에 닿으면 지도를 밀어 주는 규칙.
 *
 * 구간을 그리다 보면 화면 밖으로 이어 그려야 할 때가 온다. 손을 떼고, 지도를 옮기고,
 * 다시 잡아 이어 그리게 하면 **한 동작으로 끝난다**는 말이 거짓이 된다.
 *
 * ## 감촉을 정하는 두 가지
 *
 * **띠의 폭.** 너무 넓으면 화면 가운데서 그리는데도 지도가 슬며시 움직여 어지럽고,
 * 너무 좁으면 커서가 화면 밖으로 나가 버린 뒤에야 움직인다.
 *
 * **속도 곡선.** 띠에 들어서자마자 빠르게 밀면 지도가 튀어 나간다. 그래서 들어선 깊이의
 * **제곱**으로 올린다 — 띠의 절반쯤에서는 최고 속도의 1/4로 슬금슬금 기어가고, 가장자리에
 * 바짝 붙어야 제 속도가 난다. 얼마나 빨리 갈지를 손 위치로 조절하게 되는 셈이다.
 *
 * 가로·세로를 따로 재므로 모서리에서는 대각선으로 흐른다.
 *
 * 앱(jpApp 의 `domain/engine/EdgePan.kt`)과 **같은 규칙·같은 상수**다.
 */

/** 가장자리에서 이만큼 안쪽부터 지도가 따라오기 시작한다(px). */
export const BAND_PX = 76;

/** 가장자리에 바짝 붙었을 때의 속도(px/초). */
export const MAX_SPEED_PX_PER_SEC = 1100;

/**
 * 한 축에서 밀 속도. 왼쪽/위로 밀면 음수, 오른쪽/아래로 밀면 양수.
 *
 * `position` 이 0 보다 작거나 `size` 보다 크면(화면 밖으로 나갔다면) 최고 속도로 민다 —
 * 더 밀 수 없는 상태를 더 세게 밀 필요는 없다.
 */
export function axisSpeed(
    position: number,
    size: number,
    bandPx: number,
    maxSpeedPxPerSec: number
): number {
    if (size <= 0 || bandPx <= 0) return 0;
    const band = Math.min(bandPx, size / 2);
    const fromStart = position;
    const fromEnd = size - position;
    let depth: number;
    let sign: number;
    if (fromStart < fromEnd) {
        if (fromStart >= band) return 0;
        depth = band - fromStart;
        sign = -1;
    } else {
        if (fromEnd >= band) return 0;
        depth = band - fromEnd;
        sign = 1;
    }
    const t = Math.min(1, Math.max(0, depth / band));
    return sign * maxSpeedPxPerSec * t * t;
}

/**
 * 이번 틱에 지도를 밀 거리(px). `[dx, dy]`.
 *
 * `seconds` 는 지난 틱부터 흐른 시간이다. 프레임이 밀려 한참 뒤에 불려도 한 번에 확
 * 튀지 않도록 부르는 쪽에서 적당히 잘라 넣는다.
 */
export function step(
    x: number,
    y: number,
    width: number,
    height: number,
    seconds: number,
    bandPx: number = BAND_PX,
    maxSpeedPxPerSec: number = MAX_SPEED_PX_PER_SEC
): [number, number] {
    return [
        axisSpeed(x, width, bandPx, maxSpeedPxPerSec) * seconds,
        axisSpeed(y, height, bandPx, maxSpeedPxPerSec) * seconds
    ];
}

/** 지금 지도가 따라올 자리인가. 그렇지 않으면 타이머를 돌리지 않는다. */
export function isActive(
    x: number,
    y: number,
    width: number,
    height: number,
    bandPx: number = BAND_PX
): boolean {
    return axisSpeed(x, width, bandPx, 1) !== 0 || axisSpeed(y, height, bandPx, 1) !== 0;
}
