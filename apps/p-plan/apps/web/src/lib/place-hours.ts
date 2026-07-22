/**
 * Google Places 영업시간(opening_hours)을 앱의 EventLocation 모델
 * (openingHours / closingHours / closedDays)로 변환한다.
 *
 * 이 정보가 채워지면 기존 validateOperatingHours 검증기가 "영업시간 외 방문"과
 * "정기 휴무일 방문"을 자동으로 잡아준다. Google Places는 로그인(지도 로드) 상태에서만
 * 호출되므로 자연스럽게 로그인 전용 기능이 된다.
 */

export interface MappedPlaceHours {
    openingHours?: string; // "HH:mm"
    closingHours?: string; // "HH:mm"
    closedDays?: number[]; // 0(일)~6(토)
}

const fmt = (t?: google.maps.places.PlaceOpeningHoursTime): string | undefined => {
    if (!t?.time || t.time.length !== 4) return undefined;
    return `${t.time.slice(0, 2)}:${t.time.slice(2)}`;
};

export function mapGooglePlaceOpeningHours(
    oh?: google.maps.places.PlaceOpeningHours
): MappedPlaceHours {
    const periods = oh?.periods;
    if (!periods || periods.length === 0) return {};

    // 24시간 영업: period가 1개이고 close가 없는 경우
    if (periods.length === 1 && !periods[0].close) {
        return { openingHours: '00:00', closingHours: '23:59', closedDays: [] };
    }

    // 영업 요일 집계 → 없는 요일은 정기 휴무
    const openDays = new Set<number>();
    periods.forEach(p => {
        if (p.open && typeof p.open.day === 'number') openDays.add(p.open.day);
    });
    const closedDays: number[] = [];
    for (let d = 0; d < 7; d++) if (!openDays.has(d)) closedDays.push(d);

    // 대표 영업시간 (요일별로 다를 수 있어 근사치 — 첫 번째 완전한 period 사용)
    const representative = periods.find(p => p.open && p.close) || periods[0];

    return {
        openingHours: fmt(representative?.open),
        closingHours: fmt(representative?.close),
        // 매일 영업이면 빈 배열은 굳이 저장하지 않음(기존 값 보존 위해 undefined)
        closedDays: closedDays.length > 0 ? closedDays : undefined,
    };
}
