/**
 * 비행 소요 시간 계산 (분 단위)
 * @param depTime 출발지 현지 시간 ("HH:mm")
 * @param arrTime 도착지 현지 시간 ("HH:mm")
 * @param depCode 출발 공항 코드
 * @param arrCode 도착 공항 코드
 * @param isNextDay 도착일이 출발일 다음날인지 여부
 */
export declare function calculateFlightDuration(depTime: string, arrTime: string, depCode: string, arrCode: string, isNextDay?: boolean): number;
/**
 * 시차 문자열 반환 (예: "+1시간", "-7시간")
 */
export declare function getTimeDifferenceStr(depCode: string, arrCode: string): string;
/**
 * 도착 예정 시간 계산 (출발 시간 + 소요 시간 기반)
 */
export declare function calculateArrivalTime(depTime: string, durationMinutes: number, depCode: string, arrCode: string): {
    time: string;
    isNextDay: boolean;
};
