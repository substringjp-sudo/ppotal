/**
 * "그 사람에게 몇 월 며칠이었나"를 나타내는 날짜 키.
 *
 * 이 저장소가 여태 쓰던 `toISOString().split('T')[0]` 은 UTC 달력의 날짜다.
 * KST(UTC+9)에서는 자정부터 오전 9시까지 어제 날짜를 돌려준다. 기록이 자정을
 * 넘긴 직후가 정확히 그 구간이라, 그 사이에 남긴 메모·장소·사진은 전날 칸에
 * 쌓이고 오늘 칸은 비어 보인다. 기기의 현지 달력을 그대로 읽어 그 어긋남을
 * 없앤다.
 *
 * 이미 날짜만 담긴 문자열("2026-09-20")은 그 자체가 날짜 키다. Date 로 한 번
 * 돌리면 UTC 자정으로 해석돼 음수 시간대에서 하루 밀리므로 그대로 돌려준다.
 */
export const localDateKey = (input: Date | number | string = new Date()): string => {
    if (typeof input === 'string') {
        const dateOnly = /^(\d{4}-\d{2}-\d{2})/.exec(input);
        if (dateOnly) return dateOnly[1];
    }
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/**
 * 다음 현지 자정까지 남은 ms.
 *
 * 날짜를 화면이 그려질 때 한 번만 계산하면, 자정을 넘긴 채 열어둔 화면은 계속
 * 어제를 가리킨다. 기록 중에는 화면을 켜 둔 채로 자정을 넘기는 일이 흔하다.
 */
export const msUntilNextLocalMidnight = (now: Date = new Date()): number => {
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return Math.max(1000, next.getTime() - now.getTime());
};
