"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDateConsistency = validateDateConsistency;
exports.validateVisaRequirements = validateVisaRequirements;
exports.validateSeasonalCaution = validateSeasonalCaution;
exports.validateCrowdPreference = validateCrowdPreference;
exports.checkPreparationReadiness = checkPreparationReadiness;
exports.checkPassportRules = checkPassportRules;
exports.checkLateArrivalAccommodation = checkLateArrivalAccommodation;
exports.checkPowerAdapterRequirement = checkPowerAdapterRequirement;
exports.checkEmptyTimelineDays = checkEmptyTimelineDays;
exports.checkTravelInsurance = checkTravelInsurance;
exports.validateUrgentBookings = validateUrgentBookings;
function validateDateConsistency(trip, warnings) {
    if (!trip.dates || !trip.dates.startDate || !trip.dates.endDate)
        return;
    const tripStart = trip.dates.startDate;
    const tripEnd = trip.dates.endDate;
    (trip.flights || []).forEach(f => {
        if (f.date && (f.date < tripStart || f.date > tripEnd)) {
            warnings.push({
                id: `date-flight-${f.id}`,
                type: 'timeline_conflict',
                severity: 'warning',
                message: `항공권 일정이 여행 기간(${tripStart} ~ ${tripEnd})을 벗어납니다.`,
                sourceType: 'flight',
                sourceId: f.id
            });
        }
    });
    (trip.accommodation || []).forEach(acc => {
        if (!acc.startDate || !acc.endDate)
            return;
        if (acc.startDate < tripStart || acc.endDate > tripEnd) {
            warnings.push({
                id: `date-acc-${acc.id}`,
                type: 'timeline_conflict',
                severity: 'warning',
                message: `숙소 일정이 여행 기간(${tripStart} ~ ${tripEnd})을 벗어납니다.`,
                sourceType: 'accommodation',
                sourceId: acc.id
            });
        }
    });
    (trip.driving || []).forEach(d => {
        if (d.date && (d.date < tripStart || d.date > tripEnd)) {
            warnings.push({
                id: `date-driving-${d.id}`,
                type: 'timeline_conflict',
                severity: 'warning',
                message: `운행 일정이 여행 기간(${tripStart} ~ ${tripEnd})을 벗어납니다.`,
                sourceType: 'driving',
                sourceId: d.id
            });
        }
    });
    (trip.publicTransport || []).forEach(pt => {
        if (pt.date && (pt.date < tripStart || pt.date > tripEnd)) {
            warnings.push({
                id: `date-pt-${pt.id}`,
                type: 'timeline_conflict',
                severity: 'warning',
                message: `대중교통 이용 일정이 여행 기간(${tripStart} ~ ${tripEnd})을 벗어납니다.`,
                sourceType: 'publicTransport',
                sourceId: pt.id
            });
        }
    });
}
function validateVisaRequirements(trip, warnings) {
    const isInternational = trip.flights?.some(f => f.isInternational);
    if (!isInternational)
        return;
    const hasWarning = warnings.some(w => w.id === 'visa-check');
    if (hasWarning)
        return;
    warnings.push({
        id: 'visa-check',
        type: 'not_booked',
        severity: 'info',
        message: '해외 여행 시 목적지(비자 면제 여부, 여권 잔여 기간 등)의 입국 요건을 반드시 확인하세요.',
        suggestion: '방문 국가의 비자 면제 여부와 여권 잔여 기간(보통 6개월 이상)을 외교부 홈페이지나 대사관에서 확인하세요.',
        sourceType: 'flight'
    });
}
function validateSeasonalCaution(trip, warnings) {
    if (!trip.dates?.startDate)
        return;
    const startMonth = new Date(trip.dates.startDate).getMonth() + 1;
    const regions = trip.locations.regions || [];
    regions.forEach(reg => {
        const name = reg.name || '';
        if ((name.includes('일본') || name.includes('도쿄') || name.includes('오사카') || name.includes('후쿠오카')) && (startMonth >= 6 && startMonth <= 9)) {
            warnings.push({
                id: `season-typhoon-${reg.id}`,
                type: 'location',
                severity: 'info',
                message: `${name}의 ${startMonth}월은 장마나 태풍의 영향을 받을 수 있습니다. 우천 시 실내 일정 등을 미리 준비해 보세요.`,
                suggestion: '갑작스러운 비에 대비해 박물관, 미술관, 쇼핑몰 등 실내 일정 후보를 미리 찾아두세요.',
                sourceType: 'location'
            });
        }
        if ((name.includes('유럽') || name.includes('이탈리아') || name.includes('스페인')) && (startMonth >= 7 && startMonth <= 8)) {
            warnings.push({
                id: `season-heat-${reg.id}`,
                type: 'location',
                severity: 'info',
                message: `유럽 지역의 ${startMonth}월은 극심한 폭염이 발생할 수 있습니다. 한낮 야외 활동에 유의하세요.`,
                sourceType: 'location'
            });
        }
        if ((name.includes('홋카이도') || name.includes('삿포로') || name.includes('북유럽') || name.includes('아이슬란드')) && (startMonth >= 12 || startMonth <= 2)) {
            warnings.push({
                id: `season-snow-${reg.id}`,
                type: 'location',
                severity: 'info',
                message: `${name}의 겨울철은 폭설로 인한 교통 지연이 잦을 수 있습니다. 이동 시간을 넉넉히 잡으세요.`,
                sourceType: 'location'
            });
        }
    });
}
function validateCrowdPreference(trip, warnings, style) {
    if (!style?.crowdPreference)
        return;
    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        (day.events || []).forEach(event => {
            if (style.crowdPreference === 'quiet') {
                const crowdedSubCategories = ['amusement', 'landmark', 'aquarium', 'concert', 'historical'];
                if (event.subCategory && crowdedSubCategories.includes(event.subCategory)) {
                    warnings.push({
                        id: `crowd-quiet-${event.id}`,
                        type: 'location',
                        severity: 'info',
                        message: `'${event.title}'은(는) 인파가 몰리는 유명 장소일 가능성이 높습니다. 한적한 여행을 원하신다면 방문 시간을 조정하거나 대안을 찾아보세요.`,
                        sourceType: 'event',
                        sourceId: event.id,
                        metadata: { dayIndex: dayIdx }
                    });
                }
            }
        });
    });
}
function checkPreparationReadiness(trip, warnings) {
    if (!trip.dates?.startDate)
        return;
    const today = new Date();
    const startDate = new Date(trip.dates.startDate);
    const diffDays = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    // 1. 여권/비자 체크 (해외 여행인 경우)
    if (trip.isOverseas || trip.flights?.some(f => f.isInternational)) {
        const essentialItems = ['여권', '비권', 'Passport', 'Visa'];
        const checkedEssentials = trip.checklist?.filter(item => essentialItems.some(essential => item.title.includes(essential)) && item.isDone) || [];
        // 여행이 14일 이내로 다가왔는데 여권/비자 항목이 체크되지 않았거나 아예 없는 경우
        if (checkedEssentials.length === 0 && diffDays <= 14 && diffDays >= -1) {
            warnings.push({
                id: 'prep-essential-missing',
                type: 'not_booked',
                severity: diffDays <= 7 ? 'critical' : 'warning',
                message: `여행이 ${diffDays}일 남았습니다. 여권, 비자 등 필수 준비물이 완료되었는지 확인해 주세요.`,
                suggestion: '출국 전 여권 실물 소지 여부와 비자 승인 여부를 반드시 마지막으로 확인하세요.',
                sourceType: 'checklist'
            });
        }
    }
    // 2. 예약 누락 체크 (숙소/항공편 중 status가 booked가 아닌 것)
    const unbookedAcc = trip.accommodation?.filter(acc => acc.status !== 'booked') || [];
    if (unbookedAcc.length > 0 && diffDays <= 14 && diffDays >= -1) {
        warnings.push({
            id: 'prep-acc-unbooked',
            type: 'not_booked',
            severity: 'warning',
            message: `아직 예약이 확정되지 않은 숙소가 ${unbookedAcc.length}곳 있습니다. 여행 전 예약을 마무리하세요.`,
            suggestion: '여행 기간이 얼마 남지 않았습니다. 숙소 예약을 서둘러 확정하고 확약서를 출력하거나 폰에 저장하세요.',
            sourceType: 'accommodation'
        });
    }
}
function checkPassportRules(trip, warnings) {
    if (!trip.dates?.startDate)
        return;
    if (!(trip.isOverseas || trip.flights?.some(f => f.isInternational)))
        return;
    // 간단한 체크: 체크리스트에 '여권' 관련 항목이 완료되었는지 확인
    const passportItem = trip.checklist?.find(item => item.title.includes('여권') || item.title.toLowerCase().includes('passport'));
    if (!passportItem || !passportItem.isDone) {
        warnings.push({
            id: 'passport-validity-check',
            type: 'not_booked',
            severity: 'warning',
            message: '해외 여행 시 여권 만료일이 입국일 기준 6개월 이상 남았는지 꼭 확인하세요.',
            suggestion: '여권 잔여 기간이 부족하면 입국이 거절될 수 있습니다. 지금 즉시 여권 만료일을 확인하고 필요시 재발급 신청을 하세요.',
            sourceType: 'checklist'
        });
    }
}
function checkLateArrivalAccommodation(trip, warnings) {
    if (!trip.flights || !trip.accommodation)
        return;
    trip.flights.forEach(flight => {
        if (!flight.arrivalTime || !flight.date)
            return;
        const hour = parseInt(flight.arrivalTime.split(':')[0]);
        if (hour >= 21 || hour < 5) { // 밤 9시 이후 도착 고려
            // 해당 날짜에 숙박이 시작되는지 확인
            const accStartsThisDay = trip.accommodation.find(acc => acc.startDate === flight.date);
            if (accStartsThisDay) {
                warnings.push({
                    id: `late-checkin-${flight.id}`,
                    type: 'timeline_conflict',
                    severity: 'warning',
                    message: `항공편이 늦은 시간(${flight.arrivalTime})에 도착합니다. '${accStartsThisDay.name}' 숙소의 체크인 마감 시간을 확인하거나 미리 연락해 두세요.`,
                    suggestion: '심야 도착 시 숙소 입구 비밀번호나 셀프 체크인 가이드를 숙소 측에 요청하여 미리 받아두세요.',
                    sourceType: 'flight',
                    sourceId: flight.id
                });
            }
        }
    });
}
function checkPowerAdapterRequirement(trip, warnings) {
    if (!trip.isOverseas)
        return;
    warnings.push({
        id: 'power-adapter-info',
        type: 'seasonal',
        severity: 'info',
        message: '방문 국가의 전압과 플러그 타입(돼지코 등)을 확인하고 멀티 어댑터를 준비하세요.',
        suggestion: '해당 국가는 한국과 다른 플러그 타입을 사용합니다. 유니버설 어댑터를 미리 챙겨 가세요.',
        sourceType: 'other'
    });
}
function checkEmptyTimelineDays(trip, warnings) {
    if (!trip.dailyTimeline || trip.dailyTimeline.length === 0)
        return;
    if (!trip.dates?.startDate || !trip.dates?.endDate)
        return;
    const totalDays = Math.ceil((new Date(trip.dates.endDate).getTime() - new Date(trip.dates.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    // 3일 이상 여행인 경우만 체크 (당일치기는 제외)
    if (totalDays < 3)
        return;
    const daysWithEvents = trip.dailyTimeline.filter(day => day.events && day.events.length > 0).length;
    const emptyDays = totalDays - daysWithEvents;
    if (emptyDays > 0 && emptyDays >= Math.ceil(totalDays * 0.4)) {
        warnings.push({
            id: 'timeline-empty-days',
            type: 'timeline_conflict',
            severity: 'info',
            message: `${totalDays}일 여행 중 ${emptyDays}일의 일정이 아직 비어 있어요. 빈 날을 채워보시겠어요?`,
            suggestion: '일정이 없는 날에 방문하고 싶은 장소나 식당을 하나씩 적어보세요.',
            sourceType: 'event'
        });
    }
}
function checkTravelInsurance(trip, warnings) {
    if (!(trip.isOverseas || trip.flights?.some(f => f.isInternational)))
        return;
    if (!trip.dates?.startDate)
        return;
    const today = new Date();
    const startDate = new Date(trip.dates.startDate);
    const diffDays = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    // 출발 30일 이내인 경우만 안내
    if (diffDays > 30 || diffDays < -1)
        return;
    const hasInsurance = trip.checklist?.some(item => item.title.includes('보험') || item.title.toLowerCase().includes('insurance'));
    if (!hasInsurance) {
        warnings.push({
            id: 'travel-insurance-missing',
            type: 'not_booked',
            severity: 'info',
            message: '여행자 보험이 준비물에 기록되어 있지 않아요. 혹시 챙기셨나요?',
            suggestion: '만일의 사고나 질병에 대비해 여행자 보험을 준비해두는 것을 추천해요. 출발 전까지 가입 가능합니다.',
            sourceType: 'checklist'
        });
    }
}
// A4: D-3 임박 예매 미완료 긴급 경고
function validateUrgentBookings(trip, warnings) {
    if (!trip.dates?.startDate)
        return;
    const today = new Date();
    const startDate = new Date(trip.dates.startDate);
    const diffDays = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    // 출발 3일 이내만 해당
    if (diffDays > 3 || diffDays < 0)
        return;
    const urgentItems = [];
    // 미예약 항공편
    const unbookedFlights = (trip.flights || []).filter(f => !f.isBooked && (f.type === 'outbound' || f.type === 'inbound'));
    if (unbookedFlights.length > 0) {
        urgentItems.push(`항공편 ${unbookedFlights.length}건`);
    }
    // 미예약 숙소
    const unbookedAccomm = (trip.accommodation || []).filter(acc => acc.status !== 'booked');
    if (unbookedAccomm.length > 0) {
        urgentItems.push(`숙소 ${unbookedAccomm.length}건`);
    }
    // 미예약 렌터카
    const unbookedDriving = (trip.driving || []).filter(d => !d.isBooked);
    if (unbookedDriving.length > 0) {
        urgentItems.push(`렌터카 ${unbookedDriving.length}건`);
    }
    if (urgentItems.length > 0) {
        const dLabel = diffDays === 0 ? '오늘 출발' : diffDays === 1 ? '내일 출발' : `출발 ${diffDays}일 전`;
        warnings.push({
            id: 'urgent-bookings',
            type: 'booking_urgent',
            severity: 'critical',
            message: `${dLabel}인데 아직 예약되지 않은 항목이 있습니다: ${urgentItems.join(', ')}. 즉시 확인이 필요합니다!`,
            suggestion: '출발이 임박했습니다. 예약이 완료되지 않은 항목은 지금 바로 처리해 주세요. 당일 예약은 가격이 높거나 불가능할 수 있습니다.',
            sourceType: 'general'
        });
    }
}
