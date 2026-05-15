"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAccommodationOverlap = validateAccommodationOverlap;
exports.validateAccommodationGaps = validateAccommodationGaps;
exports.validateAccommodationCapacity = validateAccommodationCapacity;
exports.validateAccommodationExpectedTimes = validateAccommodationExpectedTimes;
exports.checkAccommodationFlightConflict = checkAccommodationFlightConflict;
exports.validateNoAccommodation = validateNoAccommodation;
exports.validateCheckoutDaySchedule = validateCheckoutDaySchedule;
const utils_1 = require("../utils");
function validateAccommodationOverlap(trip, warnings, style) {
    if (!trip.accommodation || trip.accommodation.length < 2)
        return;
    const accommodations = trip.accommodation.filter(acc => acc.startDate && acc.endDate);
    for (let i = 0; i < accommodations.length; i++) {
        for (let j = i + 1; j < accommodations.length; j++) {
            const a = accommodations[i];
            const b = accommodations[j];
            // 1. 완전 중복 체크 (날짜가 겹치면서 이름이나 위치가 같은 경우)
            const isSamePlace = a.name === b.name || (a.lat === b.lat && a.lng === b.lng && a.lat !== undefined);
            const isOverlapping = a.startDate < b.endDate && b.startDate < a.endDate;
            if (isOverlapping) {
                if (isSamePlace) {
                    warnings.push({
                        id: `acc-duplicate-${a.id}-${b.id}`,
                        type: 'overlap',
                        severity: 'critical',
                        message: `'${a.name}' 숙소가 중복으로 등록되어 있습니다. 날짜가 겹치는지 확인해 주세요.`,
                        suggestion: '중복 기입된 숙소 정보를 삭제하거나, 날짜가 겹치지 않도록 수정하세요.',
                        sourceType: 'accommodation',
                        sourceId: a.id,
                        metadata: { otherId: b.id }
                    });
                }
                else {
                    const isBothBooked = a.status === 'booked' && b.status === 'booked';
                    let severity = isBothBooked ? 'critical' : 'warning';
                    if (style?.strictness === 'relaxed' && !isBothBooked) {
                        severity = 'info';
                    }
                    warnings.push({
                        id: `acc-overlap-${a.id}-${b.id}`,
                        type: 'overlap',
                        severity,
                        message: `'${a.name}'와 '${b.name}'의 예약 일정이 중복됩니다. 같은 기간에 서로 다른 두 숙소가 필요한지 확인해 보세요.`,
                        suggestion: '같은 기간에 여러 도시를 방문하는 중이 아니라면, 체크인/체크아웃 날짜가 겹치지 않게 조정하세요.',
                        sourceType: 'accommodation',
                        sourceId: a.id,
                        metadata: { otherId: b.id }
                    });
                }
            }
        }
    }
}
function validateAccommodationGaps(trip, warnings, style) {
    if (!trip.dates || !trip.dates.startDate || !trip.dates.endDate)
        return;
    const start = new Date(trip.dates.startDate);
    const end = new Date(trip.dates.endDate);
    // 여행의 매 밤마다 체크
    const currentDate = new Date(start);
    while (currentDate < end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCovered = (trip.accommodation || []).some(acc => {
            if (!acc.startDate || !acc.endDate)
                return false;
            return dateStr >= acc.startDate && dateStr < acc.endDate;
        });
        if (!isCovered) {
            let severity = 'info';
            // 계획형인 경우 숙소 미지정을 더 중요하게 알림
            if (style?.planning === 'planned')
                severity = 'warning';
            warnings.push({
                id: `acc-gap-${dateStr}`,
                type: 'location',
                severity,
                message: `${dateStr} 숙박 정보가 비어 있습니다. 해당 날짜의 숙소를 등록해 주세요.`,
                suggestion: '여행 기간 내 모든 밤에 대해 숙소 예약 정보가 필요합니다. 숙소를 추가하거나 기존 숙소 기간을 연장하세요.',
                sourceType: 'accommodation',
                metadata: { date: dateStr }
            });
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
}
function validateAccommodationCapacity(trip, warnings) {
    if (!trip.accommodation || !trip.participants)
        return;
    const guestCount = trip.participants.length || 1;
    trip.accommodation.forEach(acc => {
        // 방 개수가 인원수보다 너무 많은 경우 (실수 가능성)
        if (acc.roomCount && acc.roomCount > guestCount * 2) {
            warnings.push({
                id: `acc-rooms-too-many-${acc.id}`,
                type: 'budget_exceeded',
                severity: 'info',
                message: `숙소 '${acc.name}'의 객실 수(${acc.roomCount})가 여행 인원(${guestCount}명) 대비 매우 많습니다.`,
                sourceType: 'accommodation',
                sourceId: acc.id
            });
        }
        // 인원 대비 침대 수가 부족한 경우
        if (acc.bedCount && acc.bedCount < guestCount) {
            warnings.push({
                id: `acc-beds-short-${acc.id}`,
                type: 'timeline_conflict',
                severity: 'warning',
                message: `숙소 '${acc.name}'의 침대 수(${acc.bedCount})가 여행 인원(${guestCount}명)보다 적습니다. 숙박 가능 인원을 확인해 보세요.`,
                suggestion: '침대가 부족하면 숙박이 불편할 수 있습니다. 엑스트라 베드 신청이나 객실 변경을 고려해 보세요.',
                sourceType: 'accommodation',
                sourceId: acc.id
            });
        }
    });
}
function validateAccommodationExpectedTimes(trip, warnings, style) {
    (trip.accommodation || []).forEach(acc => {
        // 체크인 시간 체크
        if (acc.expectedCheckInTime && acc.checkInStartTime) {
            const expected = (0, utils_1.timeToMinutes)(acc.expectedCheckInTime);
            const policy = (0, utils_1.timeToMinutes)(acc.checkInStartTime);
            if (expected !== null && policy !== null && expected < policy) {
                warnings.push({
                    id: `acc-checkin-early-${acc.id}`,
                    type: 'timeline_conflict',
                    severity: 'info',
                    message: `'${acc.name}'의 예정 입실 시간(${acc.expectedCheckInTime})이 정책 시작 시간(${acc.checkInStartTime})보다 빠릅니다. 얼리 체크인 가능 여부를 확인해 보세요.`,
                    suggestion: '체크인 전 짐 보관 서비스가 있는지 숙소에 문의하거나, 주변 유인 보관소를 찾아보세요.',
                    sourceType: 'accommodation',
                    sourceId: acc.id
                });
            }
        }
        // 체크아웃 시간 체크
        if (acc.expectedCheckOutTime && acc.checkOutEndTime) {
            const expected = (0, utils_1.timeToMinutes)(acc.expectedCheckOutTime);
            const policy = (0, utils_1.timeToMinutes)(acc.checkOutEndTime);
            if (expected !== null && policy !== null && expected > policy) {
                let severity = 'warning';
                if (style?.strictness === 'relaxed')
                    severity = 'info';
                warnings.push({
                    id: `acc-checkout-late-${acc.id}`,
                    type: 'timeline_conflict',
                    severity,
                    message: `'${acc.name}'의 예정 퇴실 시간(${acc.expectedCheckOutTime})이 정책 마감 시간(${acc.checkOutEndTime})보다 늦습니다. 레이트 체크아웃 가능 여부를 확인하세요.`,
                    suggestion: '체크아웃 후 짐 보관이 가능한지 확인하거나, 일정을 조금 앞당겨 보세요.',
                    sourceType: 'accommodation',
                    sourceId: acc.id
                });
            }
        }
    });
}
function checkAccommodationFlightConflict(trip, warnings) {
    if (!trip.accommodation || !trip.flights)
        return;
    trip.accommodation.forEach(acc => {
        if (!acc.startDate || !acc.endDate)
            return;
        // 1. 체크인 날짜의 비행 일정 확인
        trip.flights?.forEach(flight => {
            if (!flight.date)
                return;
            // 체크인 당일 비행기 도착 시간 vs 체크인 시간
            if (flight.date === acc.startDate && flight.arrivalTime) {
                const arrTime = (0, utils_1.timeToMinutes)(flight.arrivalTime);
                const checkIn = (0, utils_1.timeToMinutes)(acc.expectedCheckInTime || acc.checkInStartTime || '15:00');
                // 비행기 도착이 체크인보다 늦는데, 숙소 일정이 그 전부터 있는 경우 (체크인 당일 늦게 도착은 괜찮으나, 비행기가 너무 늦으면 체크인 불가할 수 있음)
                // 만약 비행기 도착이 밤 11시인데 체크인 마감이 10시면 경고
                if (arrTime > 22 * 60) {
                    warnings.push({
                        id: `acc-flight-late-arr-${acc.id}-${flight.id}`,
                        type: 'timeline_conflict',
                        severity: 'info',
                        message: `'${acc.name}' 체크인 당일 항공편 도착이 늦습니다(${flight.arrivalTime}). 숙소의 24시간 체크인 가능 여부나 셀프 체크인 방법을 확인해 보세요.`,
                        suggestion: '심야 도착 예정임을 숙소에 미리 메시지로 알리고 체크인 방법을 확답 받으세요.',
                        sourceType: 'accommodation',
                        sourceId: acc.id
                    });
                }
            }
            // 체크아웃 당일 비행기 출발 시간 vs 체크아웃 시간
            if (flight.date === acc.endDate && flight.departureTime) {
                const depTime = (0, utils_1.timeToMinutes)(flight.departureTime);
                const checkOut = (0, utils_1.timeToMinutes)(acc.expectedCheckOutTime || acc.checkOutEndTime || '11:00');
                // 비행기 출발이 체크아웃보다 너무 이른 경우
                if (depTime < checkOut - 60) {
                    warnings.push({
                        id: `acc-flight-early-dep-${acc.id}-${flight.id}`,
                        type: 'timeline_conflict',
                        severity: 'info',
                        message: `'${acc.name}' 체크아웃 날 항공편 출발이 이릅니다(${flight.departureTime}). 이른 체크아웃과 이동 시간을 고려하셨나요?`,
                        suggestion: '공항 이동 시간을 고려하여 전날 미리 이동 수단을 예약하거나 체크아웃 절차를 확인하세요.',
                        sourceType: 'accommodation',
                        sourceId: acc.id
                    });
                }
            }
            // 숙박 기간 중 비행 정보가 있는 경우 (출국/귀국 외 경유나 중간 이동)
            if (flight.date > acc.startDate && flight.date < acc.endDate) {
                // 이 경우는 보통 연박 중에 다른 도시를 다녀오거나 하는 특수 상황
                warnings.push({
                    id: `acc-flight-during-stay-${acc.id}-${flight.id}`,
                    type: 'overlap',
                    severity: 'warning',
                    message: `'${acc.name}' 숙소에 묵는 일정 중에 비행 일정(${flight.flightNumber || flight.departureLocation})이 있습니다. 숙소를 비우는 일정이 맞는지 확인해 주세요.`,
                    suggestion: '다른 도시로의 단기 여행이라면 짐 보관 서비스를 이용하고, 아니라면 숙소 예약 기간을 조정하세요.',
                    sourceType: 'accommodation',
                    sourceId: acc.id
                });
            }
        });
    });
}
// A2: 숙소 전혀 미등록 (다일 여행인데 숙소가 0개)
function validateNoAccommodation(trip, warnings) {
    if (!trip.dates?.durationDays || trip.dates.durationDays < 2)
        return;
    if (!trip.accommodation || trip.accommodation.length === 0) {
        const isOverseas = trip.isOverseas || trip.flights?.some(f => f.isInternational);
        warnings.push({
            id: 'no-accommodation',
            type: 'missing_essential',
            severity: isOverseas ? 'warning' : 'info',
            message: `${trip.dates.durationDays}일 여행인데 등록된 숙소가 없습니다.${isOverseas ? ' 해외 여행의 경우 숙소 예약은 필수입니다.' : ''}`,
            suggestion: '숙소 정보를 등록하면 체크인/체크아웃 시간 관리와 동선 최적화에 도움이 됩니다.',
            sourceType: 'accommodation'
        });
    }
}
// C4: 숙소 체크아웃 날의 이른 일정 경고
function validateCheckoutDaySchedule(trip, warnings) {
    if (!trip.accommodation || !trip.dailyTimeline)
        return;
    trip.accommodation.forEach(acc => {
        if (!acc.endDate)
            return;
        const checkOutEndTime = acc.expectedCheckOutTime || acc.checkOutEndTime || '11:00';
        const checkOutMinutes = (0, utils_1.timeToMinutes)(checkOutEndTime);
        if (checkOutMinutes === null)
            return;
        // 체크아웃 날짜에 해당하는 일정 찾기
        const checkoutDay = trip.dailyTimeline?.find(day => day.date === acc.endDate);
        if (!checkoutDay?.events || checkoutDay.events.length === 0)
            return;
        // 체크아웃 시간 이전에 시작하는 일정 찾기
        const earlyEvents = checkoutDay.events.filter(e => {
            if (!e.startTime)
                return false;
            const eventStart = (0, utils_1.timeToMinutes)(e.startTime);
            // 체크아웃보다 30분 이상 앞선 일정 (짐 정리 시간 고려)
            return eventStart !== null && eventStart < checkOutMinutes - 30;
        });
        if (earlyEvents.length > 0) {
            warnings.push({
                id: `checkout-schedule-${acc.id}`,
                type: 'logistics_gap',
                severity: 'info',
                message: `'${acc.name}' 체크아웃 날(${acc.endDate})에 체크아웃 전 일정(${earlyEvents[0].title})이 있습니다. 짐 정리와 체크아웃 시간(${checkOutEndTime})을 고려해 주세요.`,
                suggestion: '체크아웃 전에 짐을 프론트에 맡기거나, 일정 시작 시간을 체크아웃 이후로 조정하는 것을 권장합니다.',
                sourceType: 'accommodation',
                sourceId: acc.id
            });
        }
    });
}
