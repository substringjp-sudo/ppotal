import { AIRPORTS } from './airports';
import { MINUTES_IN_DAY } from './constants/common';
import { timeToMinutes, minutesToTime } from './utils';


/**
 * 비행 소요 시간 계산 (분 단위)
 * @param depTime 출발지 현지 시간 ("HH:mm")
 * @param arrTime 도착지 현지 시간 ("HH:mm")
 * @param depCode 출발 공항 코드
 * @param arrCode 도착 공항 코드
 * @param isNextDay 도착일이 출발일 다음날인지 여부
 */
export function calculateFlightDuration(
    depTime: string,
    arrTime: string,
    depCode: string,
    arrCode: string,
    isNextDay: boolean = false
): number {
    if (!depTime || !arrTime || !depCode || !arrCode) return 0;

    const depAirport = AIRPORTS.find(a => a.code === depCode);
    const arrAirport = AIRPORTS.find(a => a.code === arrCode);

    if (!depAirport || !arrAirport) return 0;

    const depMinutesLocal = timeToMinutes(depTime);
    const arrMinutesLocal = timeToMinutes(arrTime);

    // UTC로 변환
    const depMinutesUTC = depMinutesLocal - depAirport.timezone * 60;
    let arrMinutesUTC = arrMinutesLocal - arrAirport.timezone * 60;

    if (isNextDay) {
        arrMinutesUTC += MINUTES_IN_DAY;
    }

    let duration = arrMinutesUTC - depMinutesUTC;
    
    // 비행 시간이 음수면 날짜가 넘어간 것으로 간주 (단, isNextDay가 명시되지 않은 경우만)
    if (duration < 0 && !isNextDay) {
        duration += MINUTES_IN_DAY;
    }

    return duration;
}

/**
 * 시차 문자열 반환 (예: "+1시간", "-7시간")
 */
export function getTimeDifferenceStr(depCode: string, arrCode: string): string {
    const depAirport = AIRPORTS.find(a => a.code === depCode);
    const arrAirport = AIRPORTS.find(a => a.code === arrCode);

    if (!depAirport || !arrAirport) return "";

    const diff = arrAirport.timezone - depAirport.timezone;
    if (diff === 0) return "시차 없음";
    const sign = diff > 0 ? "+" : "";
    return `시차 ${sign}${diff}시간`;
}

/**
 * 도착 예정 시간 계산 (출발 시간 + 소요 시간 기반)
 */
export function calculateArrivalTime(
    depTime: string,
    durationMinutes: number,
    depCode: string,
    arrCode: string
): { time: string, isNextDay: boolean } {
    if (!depTime || !depCode || !arrCode) return { time: "", isNextDay: false };

    const depAirport = AIRPORTS.find(a => a.code === depCode);
    const arrAirport = AIRPORTS.find(a => a.code === arrCode);

    if (!depAirport || !arrAirport) return { time: "", isNextDay: false };

    const depMinutesLocal = timeToMinutes(depTime);
    const depMinutesUTC = depMinutesLocal - depAirport.timezone * 60;
    
    const arrMinutesUTC = depMinutesUTC + durationMinutes;
    const arrMinutesLocal = arrMinutesUTC + arrAirport.timezone * 60;

    const isNextDay = arrMinutesLocal >= MINUTES_IN_DAY;
    const normalizedTime = minutesToTime(arrMinutesLocal);

    return { time: normalizedTime, isNextDay };
}
