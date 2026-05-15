"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInternationalLicense = validateInternationalLicense;
exports.validateHealthPreparation = validateHealthPreparation;
exports.validateCommunicationPrep = validateCommunicationPrep;
exports.validateAirportTransfer = validateAirportTransfer;
exports.validateLateNightReturn = validateLateNightReturn;
// B6: 국제면허 미확인 (해외 렌터카 + 국제면허 체크리스트 없음)
function validateInternationalLicense(trip, warnings) {
    const hasDriving = (trip.driving || []).length > 0;
    const isOverseas = trip.isOverseas || trip.flights?.some(f => f.isInternational);
    if (!hasDriving || !isOverseas)
        return;
    // 체크리스트에서 국제면허 관련 항목 검색
    const hasLicenseChecklist = trip.checklist?.some(item => item.title.includes('국제면허') ||
        item.title.includes('국제운전') ||
        item.title.toLowerCase().includes('international driving') ||
        item.title.toLowerCase().includes('idp'));
    if (!hasLicenseChecklist) {
        warnings.push({
            id: 'international-license-missing',
            type: 'logistics_gap',
            severity: 'warning',
            message: '해외에서 렌터카를 이용하시는데 국제운전면허증이 준비물에 없습니다.',
            suggestion: '국제운전면허증은 가까운 경찰서나 면허시험장에서 당일 발급 가능합니다. 출발 전에 꼭 준비하세요.',
            sourceType: 'checklist'
        });
    }
}
// C5: 건강정보 미등록 (해외여행 + 건강/약 관련 체크리스트 없음)
function validateHealthPreparation(trip, warnings) {
    const isOverseas = trip.isOverseas || trip.flights?.some(f => f.isInternational);
    if (!isOverseas)
        return;
    if (!trip.dates?.durationDays || trip.dates.durationDays < 5)
        return; // 5일 이상 장기 여행만
    const hasHealthChecklist = trip.checklist?.some(item => item.title.includes('약') ||
        item.title.includes('상비약') ||
        item.title.includes('의약품') ||
        item.title.includes('보험') ||
        item.title.includes('건강') ||
        item.title.includes('병원') ||
        item.title.toLowerCase().includes('medicine') ||
        item.title.toLowerCase().includes('pharmacy'));
    if (!hasHealthChecklist) {
        warnings.push({
            id: 'health-preparation-missing',
            type: 'health_safety',
            severity: 'info',
            message: `${trip.dates.durationDays}일 해외 여행에 건강/의약품 관련 준비물이 없습니다. 상비약을 챙기셨는지 확인해 보세요.`,
            suggestion: '소화제, 진통제, 감기약, 밴드 등 기본 상비약과 개인 처방약을 챙기세요. 현지에서 약을 구하기 어려울 수 있습니다.',
            sourceType: 'checklist'
        });
    }
}
// C7: SIM/로밍 미준비 (해외여행 + 통신 관련 체크리스트 없음)
function validateCommunicationPrep(trip, warnings) {
    const isOverseas = trip.isOverseas || trip.flights?.some(f => f.isInternational);
    if (!isOverseas)
        return;
    const hasCommChecklist = trip.checklist?.some(item => item.title.includes('로밍') ||
        item.title.includes('유심') ||
        item.title.includes('SIM') ||
        item.title.includes('sim') ||
        item.title.includes('eSIM') ||
        item.title.includes('esim') ||
        item.title.includes('와이파이') ||
        item.title.includes('WiFi') ||
        item.title.includes('wifi') ||
        item.title.includes('포켓') ||
        item.title.toLowerCase().includes('pocket wifi') ||
        item.title.toLowerCase().includes('data'));
    if (!hasCommChecklist) {
        warnings.push({
            id: 'communication-prep-missing',
            type: 'logistics_gap',
            severity: 'info',
            message: '해외 여행에 통신(유심/로밍/와이파이) 관련 준비물이 없습니다.',
            suggestion: '해외에서 지도 앱, 번역 앱 등을 사용하려면 데이터 통신이 필수입니다. 유심, eSIM, 로밍, 포켓 와이파이 중 하나를 준비하세요.',
            sourceType: 'checklist'
        });
    }
}
// A3: 첫날 공항→시내 교통수단 없음 (좌표 기반 — 간이 버전)
function validateAirportTransfer(trip, warnings) {
    if (!trip.flights || !trip.dailyTimeline)
        return;
    // 도착 항공편 찾기
    const arrivalFlights = trip.flights.filter(f => f.type === 'outbound' && f.date && f.arrivalTime);
    if (arrivalFlights.length === 0)
        return;
    arrivalFlights.forEach(flight => {
        const arrivalDay = trip.dailyTimeline?.find(day => day.date === flight.date);
        if (!arrivalDay)
            return;
        // 도착 후 이동수단 이벤트가 있는지 확인
        const hasTransportAfterArrival = arrivalDay.events?.some(e => {
            if (!e.startTime || !flight.arrivalTime)
                return false;
            // 도착 후의 이동 관련 이벤트
            return e.startTime >= flight.arrivalTime && (e.subCategory === 'train' || e.subCategory === 'bus' ||
                e.subCategory === 'taxi' || e.subCategory === 'ship');
        });
        // 해당 날짜에 렌터카가 있는지
        const hasRental = (trip.driving || []).some(d => d.date === flight.date);
        // 해당 날짜에 대중교통이 있는지
        const hasPublicTransport = (trip.publicTransport || []).some(pt => pt.date === flight.date);
        if (!hasTransportAfterArrival && !hasRental && !hasPublicTransport) {
            warnings.push({
                id: `no-airport-transfer-${flight.id}`,
                type: 'missing_essential',
                severity: 'info',
                message: `도착 항공편(${flight.date} ${flight.arrivalTime}) 후 시내 이동 교통수단이 등록되지 않았습니다.`,
                suggestion: '공항에서 숙소나 첫 일정지까지 어떻게 이동할지 미리 계획해 두세요. (리무진, 택시, 렌터카, 철도 등)',
                sourceType: 'flight',
                sourceId: flight.id
            });
        }
    });
}
// C3: 심야 귀숙 경로 (21시 이후 끝나는 일정이 있으나 숙소까지 이동 수단 불명)
function validateLateNightReturn(trip, warnings) {
    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        const events = (day.events || []).filter(e => e.endTime);
        if (events.length === 0)
            return;
        // 21시 이후 끝나는 일정 찾기
        const lateEvents = events.filter(e => {
            const endMin = timeToMinutes(e.endTime);
            return endMin !== null && endMin >= 21 * 60; // 21:00 이후
        });
        if (lateEvents.length === 0)
            return;
        // 해당 날짜에 숙소가 있는지
        const dayDate = day.date;
        const hasAccommodation = (trip.accommodation || []).some(acc => acc.startDate && acc.endDate && dayDate && dayDate >= acc.startDate && dayDate < acc.endDate);
        if (hasAccommodation && lateEvents.length > 0) {
            const latestEvent = lateEvents.sort((a, b) => b.endTime.localeCompare(a.endTime))[0];
            warnings.push({
                id: `late-return-${dayIdx}`,
                type: 'logistics_gap',
                severity: 'info',
                message: `${dayIdx + 1}일차 '${latestEvent.title}'이 ${latestEvent.endTime}에 끝납니다. 심야에 숙소까지 안전하게 이동할 수 있는지 확인해 주세요.`,
                suggestion: '심야에는 대중교통이 끊길 수 있습니다. 택시나 차량 호출 앱을 미리 준비하거나, 일정을 앞당기는 것을 고려해 보세요.',
                sourceType: 'event',
                sourceId: latestEvent.id,
                metadata: { dayIndex: dayIdx }
            });
        }
    });
}
// 유틸: 시간 문자열을 분으로 변환
function timeToMinutes(time) {
    if (!time)
        return null;
    const parts = time.split(':');
    if (parts.length < 2)
        return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m))
        return null;
    return h * 60 + m;
}
