"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateItineraryConflicts = validateItineraryConflicts;
exports.validateInterEventTravel = validateInterEventTravel;
exports.validateDailyIntensity = validateDailyIntensity;
exports.validateEventDates = validateEventDates;
exports.validateOperatingHours = validateOperatingHours;
exports.validateDuplicateEvents = validateDuplicateEvents;
exports.validateLastDayPressure = validateLastDayPressure;
exports.validateMealTimeGaps = validateMealTimeGaps;
exports.validateConsecutiveTravelDays = validateConsecutiveTravelDays;
const geo_utils_1 = require("../geo-utils");
const utils_1 = require("../utils");
function validateItineraryConflicts(trip, warnings, style) {
    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        const eventsWithTime = (day.events || []).filter(e => e.startTime && e.endTime && e.isFixedTime);
        for (let i = 0; i < eventsWithTime.length; i++) {
            for (let j = i + 1; j < eventsWithTime.length; j++) {
                const e1 = eventsWithTime[i];
                const e2 = eventsWithTime[j];
                const s1 = (0, utils_1.timeToMinutes)(e1.startTime);
                const f1 = (0, utils_1.timeToMinutes)(e1.endTime);
                const s2 = (0, utils_1.timeToMinutes)(e2.startTime);
                const f2 = (0, utils_1.timeToMinutes)(e2.endTime);
                if (s1 < f2 && s2 < f1) {
                    let severity = 'warning';
                    if (style?.strictness === 'strict')
                        severity = 'critical';
                    if (style?.strictness === 'relaxed')
                        severity = 'info';
                    warnings.push({
                        id: `event-conflict-${e1.id}-${e2.id}`,
                        type: 'timeline_conflict',
                        severity,
                        message: `${dayIdx + 1}일차: '${e1.title}'과 '${e2.title}'의 시간이 겹칩니다. 일정을 조정해 보세요.`,
                        suggestion: '두 일정 중 하나를 삭제하거나, 시작/종료 시간을 겹치지 않게 수정해 보세요.',
                        sourceType: 'event',
                        sourceId: e1.id,
                        metadata: { dayIndex: dayIdx, otherId: e2.id }
                    });
                }
            }
        }
    });
}
function validateInterEventTravel(trip, warnings, style) {
    const dailyTimeline = trip.dailyTimeline || [];
    // 1. 일자별 내부 이동 검증 (기존 로직 유지 및 보강)
    dailyTimeline.forEach((day, dayIdx) => {
        const sortedEvents = [...(day.events || [])].filter(e => e.startTime && e.endTime).sort((a, b) => {
            return a.startTime.localeCompare(b.startTime);
        });
        // 1-1. 이벤트 간 이동
        for (let i = 0; i < sortedEvents.length - 1; i++) {
            checkTwoPointsFeasibility(sortedEvents[i], sortedEvents[i + 1], warnings, `(${dayIdx + 1}일차) `, style);
        }
        // 1-2. 해당 일의 첫 비행기 도착 -> 첫 일정 이동 체크
        const firstEvent = sortedEvents[0];
        if (firstEvent && firstEvent.startTime) {
            const sameDayArrivalFlight = trip.flights?.find(f => f.date === day.date && f.arrivalTime);
            if (sameDayArrivalFlight && sameDayArrivalFlight.arrivalLat && sameDayArrivalFlight.arrivalLng) {
                // 비행기 도착 지점에서 첫 일정 장소까지
                checkPointToPointFeasibility({ lat: sameDayArrivalFlight.arrivalLat, lng: sameDayArrivalFlight.arrivalLng, time: sameDayArrivalFlight.arrivalTime, name: `도착 항공편(${sameDayArrivalFlight.arrivalLocation})` }, { lat: firstEvent.location?.lat, lng: firstEvent.location?.lng, time: firstEvent.startTime, name: firstEvent.title }, warnings, `(${dayIdx + 1}일차) 항공기 도착 후 첫 일정까지 `, style, 'flight', sameDayArrivalFlight.id);
            }
        }
    });
    // 2. 일자 간 이동 검증 (Day N 마지막 -> Day N+1 첫 일정)
    for (let i = 0; i < dailyTimeline.length - 1; i++) {
        const day1 = dailyTimeline[i];
        const day2 = dailyTimeline[i + 1];
        const lastEvent = [...(day1.events || [])].filter(e => e.endTime).sort((a, b) => b.endTime.localeCompare(a.endTime))[0];
        const nextFirstEvent = [...(day2.events || [])].filter(e => e.startTime).sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
        if (lastEvent && nextFirstEvent && lastEvent.location?.lat && lastEvent.location?.lng && nextFirstEvent.location?.lat && nextFirstEvent.location?.lng) {
            const dist = (0, geo_utils_1.calculateDistance)(lastEvent.location.lat, lastEvent.location.lng, nextFirstEvent.location.lat, nextFirstEvent.location.lng);
            // 날짜가 바뀌므로 최소 6시간 이상의 휴식/이동 시간이 있다고 가정 (00:00 기준 gap 계산은 복잡하므로 거리 위주로만 체크)
            if (dist > 500) { // 하룻밤 사이에 500km 이상 이동
                // 중간에 비행기나 기차 일정이 있는지 확인 (매우 단순화된 체크)
                const hasLongDistTransport = trip.flights?.some(f => f.date === day1.date || f.date === day2.date) ||
                    trip.publicTransport?.some(pt => (pt.date === day1.date || pt.date === day2.date) && pt.type === 'train');
                if (!hasLongDistTransport) {
                    warnings.push({
                        id: `cross-day-dist-${lastEvent.id}-${nextFirstEvent.id}`,
                        type: 'impossible_travel',
                        severity: 'warning',
                        message: `${i + 1}일차 마지막 장소와 ${i + 2}일차 첫 장소 사이의 거리가 매우 멉니다(약 ${Math.round(dist)}km). 이동 수단을 확인해 주세요.`,
                        suggestion: '날짜가 바뀌더라도 약 500km 이상 이동은 항공편이나 고속열차 일정이 필요합니다. 교통 정보를 보강해 보세요.',
                        sourceType: 'event',
                        sourceId: lastEvent.id
                    });
                }
            }
        }
    }
}
// 헬퍼 함수: 두 이벤트 간 타당성 체크
function checkTwoPointsFeasibility(e1, e2, warnings, prefix = "", style) {
    if (e1.endTime && e2.startTime && e1.location?.lat && e1.location?.lng && e2.location?.lat && e2.location?.lng) {
        checkPointToPointFeasibility({ lat: e1.location.lat, lng: e1.location.lng, time: e1.endTime, name: e1.title }, { lat: e2.location.lat, lng: e2.location.lng, time: e2.startTime, name: e2.title }, warnings, prefix, style, 'event', e1.id);
    }
}
function checkPointToPointFeasibility(p1, p2, warnings, prefix, style, sourceType, sourceId) {
    if (!p2.lat || !p2.lng || !p2.time)
        return;
    const dist = (0, geo_utils_1.calculateDistance)(p1.lat, p1.lng, p2.lat, p2.lng);
    const gapMinutes = (0, utils_1.timeToMinutes)(p2.time) - (0, utils_1.timeToMinutes)(p1.time);
    if (gapMinutes <= 0) {
        if (dist > 0.5) {
            warnings.push({
                id: `impossible-teleport-${sourceId}-${p1.name}-${p2.name}`,
                type: 'impossible_travel',
                severity: 'critical',
                message: `${prefix}'${p1.name}' 종료(혹은 도착) 후 장소 이동 없이 '${p2.name}'이 시작됩니다. (이동 거리: 약 ${Math.round(dist)}km)`,
                suggestion: '두 일정 사이의 간격을 늘리거나(최소 30분~1시간), 이동 장소를 확인해 보세요.',
                sourceType,
                sourceId
            });
        }
        return;
    }
    const speed = dist / (gapMinutes / 60);
    // 심각한 속도 위반
    if (speed > 150 && dist > 10) {
        warnings.push({
            id: `too-fast-${sourceId}-${p1.name}-${p2.name}`,
            type: 'unrealistic_speed',
            severity: 'critical',
            message: `${prefix}'${p1.name}'에서 '${p2.name}'까지의 이동에 필요한 속도가 너무 빠릅니다(약 ${Math.round(speed)}km/h).`,
            suggestion: '이동 시간을 넉넉히 확보하거나(일정 시작/종료 시간 조정), 인접한 다른 장소를 고려해 보세요.',
            sourceType,
            sourceId
        });
    }
    else if (speed > 80 && dist > 5) {
        // 다소 빠른 속도
        let severity = 'warning';
        if (style?.strictness === 'relaxed')
            severity = 'info';
        warnings.push({
            id: `tight-travel-${sourceId}-${p1.name}-${p2.name}`,
            type: 'unrealistic_speed',
            severity,
            message: `${prefix}'${p1.name}'에서 '${p2.name}'까지의 이동 시간이 촉박해 보입니다(약 ${Math.round(dist)}km, 필요 속도: ${Math.round(speed)}km/h).`,
            suggestion: '동선을 좀 더 효율적으로 재구성하거나, 이동 수단을 미리 확인해 보세요.',
            sourceType,
            sourceId
        });
    }
}
function validateDailyIntensity(trip, warnings, style) {
    (trip.dailyTimeline || []).forEach((day, idx) => {
        const eventCount = day.events?.length || 0;
        const threshold = style?.planning === 'planned' ? 8 : 5;
        if (eventCount >= threshold) {
            warnings.push({
                id: `daily-intensity-${idx}`,
                type: 'timeline_conflict',
                severity: 'info',
                message: `${idx + 1}일차 일정이${style?.planning === 'flexible' ? '매우 ' : ' '}많습니다(${eventCount}개). ${style?.planning === 'flexible' ? '여유 있는 여행을 위해 일정을 줄여보는 건 어떨까요?' : '이동 시간과 휴식 시간을 충분히 고려하셨나요?'}`,
                suggestion: '하루 일정이 너무 많으면 체력적으로 힘들 수 있습니다. 가장 중요한 3~4개 일정 위주로 재편해 보세요.',
                sourceType: 'event',
                metadata: { dayIndex: idx }
            });
        }
    });
}
function validateEventDates(trip, warnings) {
    if (!trip.dates || !trip.dates.startDate || !trip.dates.endDate)
        return;
    const tripStart = trip.dates.startDate;
    const tripEnd = trip.dates.endDate;
    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        const dayDate = day.date;
        if (!dayDate)
            return;
        if (dayDate < tripStart || dayDate > tripEnd) {
            warnings.push({
                id: `date-day-${dayIdx}`,
                type: 'timeline_conflict',
                severity: 'warning',
                message: `${dayIdx + 1}일차 일정의 날짜(${dayDate})가 전체 여행 기간(${tripStart} ~ ${tripEnd})을 벗어납니다.`,
                sourceType: 'event',
                metadata: { dayIndex: dayIdx }
            });
        }
    });
}
function validateOperatingHours(trip, warnings) {
    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        (day.events || []).forEach(event => {
            if (event.startTime && event.endTime && event.location?.openingHours && event.location?.closingHours) {
                const s = (0, utils_1.timeToMinutes)(event.startTime);
                const f = (0, utils_1.timeToMinutes)(event.endTime);
                const open = (0, utils_1.timeToMinutes)(event.location.openingHours);
                const close = (0, utils_1.timeToMinutes)(event.location.closingHours);
                // 운영 시간이 자정을 넘기는 경우 처리 (예: 10:00 ~ 02:00)
                const isOpenOvernight = close < open;
                let isOutside = false;
                if (isOpenOvernight) {
                    // 자정을 넘기는 경우: (open보다 작음 && close보다 큼) 이면 영업 종료
                    if (s < open && s > close)
                        isOutside = true;
                    if (f < open && f > close)
                        isOutside = true;
                }
                else {
                    // 일반적인 경우: open보다 작거나 close보다 크면 영업 종료
                    if (s < open || s > close)
                        isOutside = true;
                    if (f < open || f > close)
                        isOutside = true;
                }
                if (isOutside) {
                    warnings.push({
                        id: `op-hours-${event.id}`,
                        type: 'timeline_conflict',
                        severity: 'warning',
                        message: `'${event.title}' 일정이 장소의 운영 시간(${event.location.openingHours} ~ ${event.location.closingHours})을 벗어납니다.`,
                        suggestion: '장소의 실제 운영 시간을 다시 확인하거나, 방문 시간대를 조정해 보세요.',
                        sourceType: 'event',
                        sourceId: event.id,
                        metadata: { dayIndex: dayIdx }
                    });
                }
                // 2. 요일별 휴무 체크 (closedDays)
                if (event.location.closedDays && event.location.closedDays.length > 0) {
                    const dayDate = new Date(day.date);
                    const dayOfWeek = dayDate.getDay(); // 0: Sunday, 6: Saturday
                    if (event.location.closedDays.includes(dayOfWeek)) {
                        const daysMap = ['일', '월', '화', '수', '목', '금', '토'];
                        warnings.push({
                            id: `op-closed-day-${event.id}`,
                            type: 'timeline_conflict',
                            severity: 'critical',
                            message: `'${event.title}' 장소는 해당 요일(${daysMap[dayOfWeek]}요일)에 정기 휴무입니다.`,
                            suggestion: '인근의 다른 날짜로 일정을 옮기거나, 해당 날짜에 방문 가능한 다른 장소를 찾아보세요.',
                            sourceType: 'event',
                            sourceId: event.id,
                            metadata: { dayIndex: dayIdx }
                        });
                    }
                }
                // 3. 시즌 운영 체크 (openingMonths)
                if (event.location.openingMonths && event.location.openingMonths.length > 0) {
                    const dayDate = new Date(day.date);
                    const month = dayDate.getMonth() + 1; // 1 ~ 12
                    if (!event.location.openingMonths.includes(month)) {
                        warnings.push({
                            id: `op-seasonal-closed-${event.id}`,
                            type: 'seasonal',
                            severity: 'critical',
                            message: `'${event.title}' 장소는 해당 월(${month}월)에는 운영하지 않는 시즌 한정 장소입니다.`,
                            suggestion: '해당 장소의 운영 시즌을 확인하고 여행 월을 조정하거나, 대체 장소를 고려해 보세요.',
                            sourceType: 'event',
                            sourceId: event.id,
                            metadata: { dayIndex: dayIdx }
                        });
                    }
                }
            }
        });
    });
}
// B5: 동일 일정 중복 등록 감지
function validateDuplicateEvents(trip, warnings) {
    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        const events = day.events || [];
        for (let i = 0; i < events.length; i++) {
            for (let j = i + 1; j < events.length; j++) {
                const e1 = events[i];
                const e2 = events[j];
                // 같은 제목 + 같은 시작 시간
                const sameTitle = e1.title && e2.title && e1.title.trim() === e2.title.trim();
                const sameTime = e1.startTime && e2.startTime && e1.startTime === e2.startTime;
                // 같은 장소 (좌표 기반)
                const samePlace = e1.location?.lat && e2.location?.lat &&
                    e1.location.lat === e2.location.lat && e1.location.lng === e2.location.lng;
                if (sameTitle && (sameTime || samePlace)) {
                    warnings.push({
                        id: `dup-event-${e1.id}-${e2.id}`,
                        type: 'duplicate_event',
                        severity: 'warning',
                        message: `${dayIdx + 1}일차에 '${e1.title}' 일정이 중복 등록되어 있습니다.`,
                        suggestion: '실수로 같은 일정을 두 번 추가하신 것 같습니다. 하나를 삭제해 주세요.',
                        sourceType: 'event',
                        sourceId: e1.id,
                        metadata: { dayIndex: dayIdx, otherId: e2.id }
                    });
                }
            }
        }
    });
}
// B7 + C8: 마지막 날 귀국편 전 일정 과잉 / 공항 이동 시간 미고려
function validateLastDayPressure(trip, warnings) {
    if (!trip.flights || !trip.dailyTimeline || trip.dailyTimeline.length === 0)
        return;
    // 귀국편 찾기
    const inboundFlights = trip.flights.filter(f => f.type === 'inbound' && f.date && f.departureTime);
    if (inboundFlights.length === 0)
        return;
    inboundFlights.forEach(flight => {
        const flightDay = trip.dailyTimeline?.find(day => day.date === flight.date);
        if (!flightDay?.events || flightDay.events.length === 0)
            return;
        const depMinutes = (0, utils_1.timeToMinutes)(flight.departureTime);
        // 공항 도착 최소 시간 (국제선 3시간, 국내선 1.5시간)
        const isInternational = flight.isInternational;
        const airportBuffer = isInternational ? 180 : 90; // 분 단위
        const cutoffMinutes = depMinutes - airportBuffer;
        // cutoff 시간 이후에 끝나는 일정이 있는지 확인
        const conflictingEvents = flightDay.events.filter(e => {
            if (!e.endTime)
                return false;
            const endMin = (0, utils_1.timeToMinutes)(e.endTime);
            return endMin !== null && endMin > cutoffMinutes;
        });
        if (conflictingEvents.length > 0) {
            const bufferHours = Math.round(airportBuffer / 60 * 10) / 10;
            warnings.push({
                id: `last-day-pressure-${flight.id}`,
                type: 'time_pressure',
                severity: 'warning',
                message: `귀국편 출발(${flight.departureTime}) 전 ${bufferHours}시간 내에 일정(${conflictingEvents.map(e => e.title).join(', ')})이 있습니다. 공항 이동 시간이 부족할 수 있습니다.`,
                suggestion: `${isInternational ? '국제선은 출발 3시간 전' : '국내선은 출발 1.5시간 전'}까지 공항 도착이 권장됩니다. 일정을 앞당기거나 줄여보세요.`,
                sourceType: 'flight',
                sourceId: flight.id
            });
        }
    });
}
// C1: 식사 시간 미확보 (빡빡한 일정 사이 점심/저녁 공백 없음)
function validateMealTimeGaps(trip, warnings, style) {
    // 유연한 여행 스타일이면 건너뜀
    if (style?.planning === 'flexible')
        return;
    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        const events = (day.events || [])
            .filter(e => e.startTime && e.endTime && e.isFixedTime)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
        if (events.length < 3)
            return; // 일정이 적으면 의미 없음
        // 점심 시간대: 11:00 ~ 14:00 사이에 30분 이상 공백이 있는지
        const lunchRange = { start: 11 * 60, end: 14 * 60 };
        // 저녁 시간대: 17:00 ~ 20:00 사이에 30분 이상 공백이 있는지
        const dinnerRange = { start: 17 * 60, end: 20 * 60 };
        const hasGapInRange = (range) => {
            // 식사 카테고리 일정이 이미 있으면 OK
            const hasFoodEvent = events.some(e => {
                const s = (0, utils_1.timeToMinutes)(e.startTime);
                return s >= range.start && s <= range.end && (e.subCategory === 'restaurant' || e.subCategory === 'cafe' ||
                    e.subCategory === 'food' || e.subCategory === 'dessert' || e.subCategory === 'drink');
            });
            if (hasFoodEvent)
                return true;
            // 해당 시간대에 30분 이상 갭이 있는지 체크
            for (let i = 0; i < events.length - 1; i++) {
                const end = (0, utils_1.timeToMinutes)(events[i].endTime);
                const nextStart = (0, utils_1.timeToMinutes)(events[i + 1].startTime);
                const gap = nextStart - end;
                // 갭이 해당 시간대와 겹치고 30분 이상이면 OK
                if (gap >= 30 && end < range.end && nextStart > range.start) {
                    return true;
                }
            }
            // 첫 일정 시작 전에 범위가 있는지
            const firstStart = (0, utils_1.timeToMinutes)(events[0].startTime);
            if (firstStart > range.start && firstStart - range.start >= 30)
                return true;
            // 마지막 일정 뒤에 범위가 있는지
            const lastEnd = (0, utils_1.timeToMinutes)(events[events.length - 1].endTime);
            if (lastEnd < range.end && range.end - lastEnd >= 30)
                return true;
            return false;
        };
        const noLunch = !hasGapInRange(lunchRange);
        const noDinner = !hasGapInRange(dinnerRange);
        if (noLunch && noDinner) {
            warnings.push({
                id: `meal-gap-both-${dayIdx}`,
                type: 'time_pressure',
                severity: 'info',
                message: `${dayIdx + 1}일차에 점심과 저녁 식사 시간이 모두 확보되지 않았습니다. 일정 사이에 여유를 두세요.`,
                suggestion: '하루 종일 관광하더라도 식사 시간은 최소 30분~1시간 확보하는 것이 좋습니다.',
                sourceType: 'event',
                metadata: { dayIndex: dayIdx }
            });
        }
        else if (noLunch) {
            warnings.push({
                id: `meal-gap-lunch-${dayIdx}`,
                type: 'time_pressure',
                severity: 'info',
                message: `${dayIdx + 1}일차 점심 시간대(11:00~14:00)에 식사 여유가 없어 보입니다.`,
                sourceType: 'event',
                metadata: { dayIndex: dayIdx }
            });
        }
        else if (noDinner) {
            warnings.push({
                id: `meal-gap-dinner-${dayIdx}`,
                type: 'time_pressure',
                severity: 'info',
                message: `${dayIdx + 1}일차 저녁 시간대(17:00~20:00)에 식사 여유가 없어 보입니다.`,
                sourceType: 'event',
                metadata: { dayIndex: dayIdx }
            });
        }
    });
}
// C2: 연속 이동일 경고 (3일 이상 연속 도시간 이동)
function validateConsecutiveTravelDays(trip, warnings) {
    if (!trip.dailyTimeline || trip.dailyTimeline.length < 3)
        return;
    let consecutiveCount = 0;
    let startDay = 0;
    trip.dailyTimeline.forEach((day, dayIdx) => {
        // 해당 날에 이동 이벤트(항공/열차/버스 등)가 있는지 확인
        const hasLongTransport = (trip.flights || []).some(f => f.date === day.date) ||
            (trip.publicTransport || []).some(pt => pt.date === day.date && pt.duration && pt.duration > 120) ||
            (trip.driving || []).some(d => d.date === day.date);
        if (hasLongTransport) {
            if (consecutiveCount === 0)
                startDay = dayIdx;
            consecutiveCount++;
        }
        else {
            if (consecutiveCount >= 3) {
                warnings.push({
                    id: `consecutive-travel-${startDay}`,
                    type: 'time_pressure',
                    severity: 'info',
                    message: `${startDay + 1}일차~${startDay + consecutiveCount}일차까지 ${consecutiveCount}일 연속 장거리 이동이 있습니다. 체력 소모가 클 수 있습니다.`,
                    suggestion: '연속 이동 사이에 휴식일이나 가벼운 일정을 배치하면 여행 피로를 줄일 수 있습니다.',
                    sourceType: 'event',
                    metadata: { startDay, count: consecutiveCount }
                });
            }
            consecutiveCount = 0;
        }
    });
    // 마지막까지 연속이었을 경우
    if (consecutiveCount >= 3) {
        warnings.push({
            id: `consecutive-travel-${startDay}`,
            type: 'time_pressure',
            severity: 'info',
            message: `${startDay + 1}일차~${startDay + consecutiveCount}일차까지 ${consecutiveCount}일 연속 장거리 이동이 있습니다. 체력 소모가 클 수 있습니다.`,
            suggestion: '연속 이동 사이에 휴식일이나 가벼운 일정을 배치하면 여행 피로를 줄일 수 있습니다.',
            sourceType: 'event',
            metadata: { startDay, count: consecutiveCount }
        });
    }
}
