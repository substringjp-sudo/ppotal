"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFlightDuration = calculateFlightDuration;
exports.getTimeDifferenceStr = getTimeDifferenceStr;
exports.calculateArrivalTime = calculateArrivalTime;
const airports_1 = require("./airports");
const common_1 = require("./constants/common");
const utils_1 = require("./utils");
/**
 * 비행 소요 시간 계산 (분 단위)
 * @param depTime 출발지 현지 시간 ("HH:mm")
 * @param arrTime 도착지 현지 시간 ("HH:mm")
 * @param depCode 출발 공항 코드
 * @param arrCode 도착 공항 코드
 * @param isNextDay 도착일이 출발일 다음날인지 여부
 */
function calculateFlightDuration(depTime, arrTime, depCode, arrCode, isNextDay = false) {
    if (!depTime || !arrTime || !depCode || !arrCode)
        return 0;
    const depAirport = airports_1.AIRPORTS.find(a => a.code === depCode);
    const arrAirport = airports_1.AIRPORTS.find(a => a.code === arrCode);
    if (!depAirport || !arrAirport)
        return 0;
    const depMinutesLocal = (0, utils_1.timeToMinutes)(depTime);
    const arrMinutesLocal = (0, utils_1.timeToMinutes)(arrTime);
    // UTC로 변환
    const depMinutesUTC = depMinutesLocal - depAirport.timezone * 60;
    let arrMinutesUTC = arrMinutesLocal - arrAirport.timezone * 60;
    if (isNextDay) {
        arrMinutesUTC += common_1.MINUTES_IN_DAY;
    }
    let duration = arrMinutesUTC - depMinutesUTC;
    // 비행 시간이 음수면 날짜가 넘어간 것으로 간주 (단, isNextDay가 명시되지 않은 경우만)
    if (duration < 0 && !isNextDay) {
        duration += common_1.MINUTES_IN_DAY;
    }
    return duration;
}
/**
 * 시차 문자열 반환 (예: "+1시간", "-7시간")
 */
function getTimeDifferenceStr(depCode, arrCode) {
    const depAirport = airports_1.AIRPORTS.find(a => a.code === depCode);
    const arrAirport = airports_1.AIRPORTS.find(a => a.code === arrCode);
    if (!depAirport || !arrAirport)
        return "";
    const diff = arrAirport.timezone - depAirport.timezone;
    if (diff === 0)
        return "시차 없음";
    const sign = diff > 0 ? "+" : "";
    return `시차 ${sign}${diff}시간`;
}
/**
 * 도착 예정 시간 계산 (출발 시간 + 소요 시간 기반)
 */
function calculateArrivalTime(depTime, durationMinutes, depCode, arrCode) {
    if (!depTime || !depCode || !arrCode)
        return { time: "", isNextDay: false };
    const depAirport = airports_1.AIRPORTS.find(a => a.code === depCode);
    const arrAirport = airports_1.AIRPORTS.find(a => a.code === arrCode);
    if (!depAirport || !arrAirport)
        return { time: "", isNextDay: false };
    const depMinutesLocal = (0, utils_1.timeToMinutes)(depTime);
    const depMinutesUTC = depMinutesLocal - depAirport.timezone * 60;
    const arrMinutesUTC = depMinutesUTC + durationMinutes;
    const arrMinutesLocal = arrMinutesUTC + arrAirport.timezone * 60;
    const isNextDay = arrMinutesLocal >= common_1.MINUTES_IN_DAY;
    const normalizedTime = (0, utils_1.minutesToTime)(arrMinutesLocal);
    return { time: normalizedTime, isNextDay };
}
