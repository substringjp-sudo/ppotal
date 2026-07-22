import { Trip, TripWarning, TripEvent, WarningSourceType, SubCategory } from '../../types/trip';
import { TravelStyle } from '../../types/user';
import { calculateDistance } from '../geo-utils';
import { timeToMinutes } from '../utils';
import { getSunPhases } from '../sun-utils';

export function validateItineraryConflicts(trip: Trip, warnings: TripWarning[], style?: TravelStyle) {
    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        const eventsWithTime = (day.events || []).filter(e => e.startTime && e.endTime && e.isFixedTime);
        
        for (let i = 0; i < eventsWithTime.length; i++) {
            for (let j = i + 1; j < eventsWithTime.length; j++) {
                const e1 = eventsWithTime[i];
                const e2 = eventsWithTime[j];
                
                const s1 = timeToMinutes(e1.startTime)!;
                const f1 = timeToMinutes(e1.endTime)!;
                const s2 = timeToMinutes(e2.startTime)!;
                const f2 = timeToMinutes(e2.endTime)!;
                
                if (s1 < f2 && s2 < f1) {
                    let severity: TripWarning['severity'] = 'warning';
                    
                    if (style?.strictness === 'strict') severity = 'critical';
                    if (style?.strictness === 'relaxed') severity = 'info';

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

export function validateInterEventTravel(trip: Trip, warnings: TripWarning[], style?: TravelStyle) {
    const dailyTimeline = trip.dailyTimeline || [];
    
    // 1. 일자별 내부 이동 검증 (기존 로직 유지 및 보강)
    dailyTimeline.forEach((day, dayIdx) => {
        const sortedEvents = [...(day.events || [])].filter(e => e.startTime && e.endTime).sort((a, b) => {
            return a.startTime!.localeCompare(b.startTime!);
        });

        // 1-1. 이벤트 간 이동
        for (let i = 0; i < sortedEvents.length - 1; i++) {
            checkTwoPointsFeasibility(sortedEvents[i], sortedEvents[i+1], warnings, `(${dayIdx + 1}일차) `, style);
        }

        // 1-2. 해당 일의 첫 비행기 도착 -> 첫 일정 이동 체크
        const firstEvent = sortedEvents[0];
        if (firstEvent && firstEvent.startTime) {
            const sameDayArrivalFlight = trip.flights?.find(f => f.date === day.date && f.arrivalTime);
            if (sameDayArrivalFlight && sameDayArrivalFlight.arrivalLat && sameDayArrivalFlight.arrivalLng) {
                // 비행기 도착 지점에서 첫 일정 장소까지
                checkPointToPointFeasibility(
                    { lat: sameDayArrivalFlight.arrivalLat!, lng: sameDayArrivalFlight.arrivalLng!, time: sameDayArrivalFlight.arrivalTime!, name: `도착 항공편(${sameDayArrivalFlight.arrivalLocation})` },
                    { lat: firstEvent.location?.lat, lng: firstEvent.location?.lng, time: firstEvent.startTime!, name: firstEvent.title },
                    warnings,
                    `(${dayIdx + 1}일차) 항공기 도착 후 첫 일정까지 `,
                    style,
                    'flight',
                    sameDayArrivalFlight.id
                );
            }
        }
    });

    // 2. 일자 간 이동 검증 (Day N 마지막 -> Day N+1 첫 일정)
    for (let i = 0; i < dailyTimeline.length - 1; i++) {
        const day1 = dailyTimeline[i];
        const day2 = dailyTimeline[i+1];
        
        const lastEvent = [...(day1.events || [])].filter(e => e.endTime).sort((a, b) => b.endTime!.localeCompare(a.endTime!))[0];
        const nextFirstEvent = [...(day2.events || [])].filter(e => e.startTime).sort((a, b) => a.startTime!.localeCompare(b.startTime!))[0];

        if (lastEvent && nextFirstEvent && lastEvent.location?.lat && lastEvent.location?.lng && nextFirstEvent.location?.lat && nextFirstEvent.location?.lng) {
            const dist = calculateDistance(lastEvent.location.lat, lastEvent.location.lng, nextFirstEvent.location.lat, nextFirstEvent.location.lng);
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
                        message: `${i+1}일차 마지막 장소와 ${i+2}일차 첫 장소 사이의 거리가 매우 멉니다(약 ${Math.round(dist)}km). 이동 수단을 확인해 주세요.`,
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
function checkTwoPointsFeasibility(e1: TripEvent, e2: TripEvent, warnings: TripWarning[], prefix: string = "", style?: TravelStyle) {
    if (e1.endTime && e2.startTime && e1.location?.lat && e1.location?.lng && e2.location?.lat && e2.location?.lng) {
        checkPointToPointFeasibility(
            { lat: e1.location.lat, lng: e1.location.lng, time: e1.endTime, name: e1.title },
            { lat: e2.location.lat, lng: e2.location.lng, time: e2.startTime, name: e2.title },
            warnings,
            prefix,
            style,
            'event',
            e1.id
        );
    }
}

function checkPointToPointFeasibility(
    p1: { lat: number, lng: number, time: string, name: string },
    p2: { lat: number | undefined, lng: number | undefined, time: string, name: string },
    warnings: TripWarning[],
    prefix: string,
    style: TravelStyle | undefined,
    sourceType: WarningSourceType,
    sourceId: string
) {
    if (!p2.lat || !p2.lng || !p2.time) return;

    const dist = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    const gapMinutes = timeToMinutes(p2.time)! - timeToMinutes(p1.time)!;

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
    } else if (speed > 80 && dist > 5) {
        // 다소 빠른 속도
        let severity: TripWarning['severity'] = 'warning';
        if (style?.strictness === 'relaxed') severity = 'info';

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


export function validateDailyIntensity(trip: Trip, warnings: TripWarning[], style?: TravelStyle) {
    (trip.dailyTimeline || []).forEach((day, idx) => {
        const eventCount = day.events?.length || 0;
        let threshold = style?.planning === 'planned' ? 8 : 5;
        // 체력형은 빡빡한 일정을 선호하므로 기준을 완화, 여유형은 강화
        if (style?.active === 'energetic') threshold += 3;
        else if (style?.active === 'relaxed') threshold = Math.max(3, threshold - 1);

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

export function validateEventDates(trip: Trip, warnings: TripWarning[]) {
    if (!trip.dates || !trip.dates.startDate || !trip.dates.endDate) return;

    const tripStart = trip.dates.startDate;
    const tripEnd = trip.dates.endDate;

    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        const dayDate = day.date;
        if (!dayDate) return;

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
export function validateOperatingHours(trip: Trip, warnings: TripWarning[]) {
    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        (day.events || []).forEach(event => {
            if (event.startTime && event.endTime && event.location?.openingHours && event.location?.closingHours) {
                const s = timeToMinutes(event.startTime)!;
                const f = timeToMinutes(event.endTime)!;
                const open = timeToMinutes(event.location.openingHours)!;
                const close = timeToMinutes(event.location.closingHours)!;

                // 운영 시간이 자정을 넘기는 경우 처리 (예: 10:00 ~ 02:00)
                const isOpenOvernight = close < open;
                
                let isOutside = false;
                if (isOpenOvernight) {
                    // 자정을 넘기는 경우: (open보다 작음 && close보다 큼) 이면 영업 종료
                    if (s < open && s > close) isOutside = true;
                    if (f < open && f > close) isOutside = true;
                } else {
                    // 일반적인 경우: open보다 작거나 close보다 크면 영업 종료
                    if (s < open || s > close) isOutside = true;
                    if (f < open || f > close) isOutside = true;
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
export function validateDuplicateEvents(trip: Trip, warnings: TripWarning[]) {
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

// 일몰 후 야외/경치 일정 (낮 경치를 놓칠 수 있음) — sun-utils 재활용
const SCENIC_SUBCATEGORIES: SubCategory[] = ['scenic', 'landmark', 'amusement', 'activity'];
export function validateSunsetOutdoor(trip: Trip, warnings: TripWarning[]) {
    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        (day.events || []).forEach(event => {
            const sub = event.subCategory;
            if (!sub || !SCENIC_SUBCATEGORIES.includes(sub)) return;
            if (!event.startTime || !event.location?.lat || !event.location?.lng) return;

            const { sunsetMins, sunset } = getSunPhases(day.date, event.location.lat, event.location.lng);
            const start = timeToMinutes(event.startTime);
            if (start !== null && start >= sunsetMins) {
                warnings.push({
                    id: `sunset-outdoor-${event.id}`,
                    type: 'timeline_conflict',
                    severity: 'info',
                    message: `'${event.title}' 일정이 일몰(약 ${sunset}) 이후에 시작해요. 낮 풍경을 원하신다면 시간을 앞당겨 보세요.`,
                    suggestion: '전망·경치 명소는 해가 있을 때 방문하면 더 좋습니다. 일몰 전으로 일정을 옮겨보세요.',
                    sourceType: 'event',
                    sourceId: event.id,
                    metadata: { dayIndex: dayIdx }
                });
            }
        });
    });
}

// 장거리 비행 후 첫날 강행군 (시차·피로) — timeDifference / flightDurationMinutes 재활용
export function validateFirstDayJetlag(trip: Trip, warnings: TripWarning[], style?: TravelStyle) {
    const longHaul = (trip.flights || []).find(
        f => f.type === 'outbound' && f.date && (f.flightDurationMinutes || 0) >= 360
    );
    if (!longHaul) return;

    const arrivalDay = (trip.dailyTimeline || []).find(d => d.date === longHaul.date);
    if (!arrivalDay?.events || arrivalDay.events.length === 0) return;

    const threshold = style?.active === 'energetic' ? 5 : 3;
    const eventCount = arrivalDay.events.length;
    const hasLateEvent = arrivalDay.events.some(e => {
        const end = timeToMinutes(e.endTime);
        return end !== null && end >= 21 * 60;
    });

    if (eventCount >= threshold || hasLateEvent) {
        const hasTimeDiff = !!(trip.timeDifference && trip.timeDifference.trim() && trip.timeDifference.trim() !== '0');
        const hours = Math.round((longHaul.flightDurationMinutes || 0) / 60);
        warnings.push({
            id: 'first-day-jetlag',
            type: 'time_pressure',
            severity: 'info',
            message: `장거리 비행(약 ${hours}시간) 후 도착 첫날 일정이 ${eventCount}개로 빡빡해요.${hasTimeDiff ? ' 시차 피로까지 겹칠 수 있어요.' : ''}`,
            suggestion: '도착 첫날은 이동·체크인·시차 적응만으로도 지칩니다. 숙소 근처 위주로 가볍게 잡아보세요.',
            sourceType: 'flight',
            sourceId: longHaul.id
        });
    }
}

// 가족 동반 여행의 페이싱 (memberCounts 재활용) — 아이·어르신 동반 시 무리한 일정 완화 제안
export function validateFamilyPacing(trip: Trip, warnings: TripWarning[], style?: TravelStyle) {
    const familyCount = trip.memberCounts?.family || 0;
    if (familyCount <= 0) return;
    if (style?.active === 'energetic') return; // 강행군 선호면 스킵

    let flagged = false;
    (trip.dailyTimeline || []).forEach(day => {
        if (flagged) return;
        const events = day.events || [];
        const hasLate = events.some(e => {
            const end = timeToMinutes(e.endTime);
            return end !== null && end >= 22 * 60;
        });
        if (hasLate || events.length >= 6) flagged = true;
    });

    if (flagged) {
        warnings.push({
            id: 'family-pacing',
            type: 'time_pressure',
            severity: 'info',
            message: '가족과 함께하는 여행에 늦은 밤 일정이나 빡빡한 날이 있어요. 아이·어르신 동반 시 체력과 휴식을 고려해 보세요.',
            suggestion: '가족 여행은 이동을 줄이고 중간중간 휴식·식사 시간을 넉넉히 두는 것이 좋아요.',
            sourceType: 'event'
        });
    }
}

// 다른 날 동일 장소 중복 방문 (좌표 기반) — 의도치 않은 중복 감지
export function validateSamePlaceMultipleDays(trip: Trip, warnings: TripWarning[]) {
    const seen = new Map<string, number>(); // key -> 최초 dayIdx
    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        (day.events || []).forEach(event => {
            const loc = event.location;
            if (!loc?.lat || !loc?.lng) return; // 좌표 있는 경우만 (오탐 방지)
            const key = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
            const firstDay = seen.get(key);
            if (firstDay === undefined) {
                seen.set(key, dayIdx);
            } else if (firstDay !== dayIdx) {
                warnings.push({
                    id: `same-place-multi-${event.id}`,
                    type: 'duplicate_event',
                    severity: 'info',
                    message: `'${event.title}'을(를) ${firstDay + 1}일차와 ${dayIdx + 1}일차에 모두 방문해요. 의도한 재방문인지 확인해 보세요.`,
                    suggestion: '실수로 같은 장소를 다른 날에 중복 추가한 것은 아닌지 확인하세요. 의도한 재방문이면 그대로 두셔도 좋아요.',
                    sourceType: 'event',
                    sourceId: event.id,
                    metadata: { dayIndex: dayIdx }
                });
            }
        });
    });
}

// B7 + C8: 마지막 날 귀국편 전 일정 과잉 / 공항 이동 시간 미고려
export function validateLastDayPressure(trip: Trip, warnings: TripWarning[]) {
    if (!trip.flights || !trip.dailyTimeline || trip.dailyTimeline.length === 0) return;

    // 귀국편 찾기
    const inboundFlights = trip.flights.filter(f => f.type === 'inbound' && f.date && f.departureTime);
    if (inboundFlights.length === 0) return;

    inboundFlights.forEach(flight => {
        const flightDay = trip.dailyTimeline?.find(day => day.date === flight.date);
        if (!flightDay?.events || flightDay.events.length === 0) return;

        const depMinutes = timeToMinutes(flight.departureTime)!;
        // 공항 도착 최소 시간 (국제선 3시간, 국내선 1.5시간)
        const isInternational = flight.isInternational;
        const airportBuffer = isInternational ? 180 : 90; // 분 단위
        const cutoffMinutes = depMinutes - airportBuffer;

        // cutoff 시간 이후에 끝나는 일정이 있는지 확인
        const conflictingEvents = flightDay.events.filter(e => {
            if (!e.endTime) return false;
            const endMin = timeToMinutes(e.endTime);
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
export function validateMealTimeGaps(trip: Trip, warnings: TripWarning[], style?: TravelStyle) {
    // 유연한 여행 스타일이거나 체력형(강행군 감수)이면 건너뜀
    if (style?.planning === 'flexible' || style?.active === 'energetic') return;

    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        const events = (day.events || [])
            .filter(e => e.startTime && e.endTime && e.isFixedTime)
            .sort((a, b) => a.startTime!.localeCompare(b.startTime!));
        
        if (events.length < 3) return; // 일정이 적으면 의미 없음

        // 점심 시간대: 11:00 ~ 14:00 사이에 30분 이상 공백이 있는지
        const lunchRange = { start: 11 * 60, end: 14 * 60 };
        // 저녁 시간대: 17:00 ~ 20:00 사이에 30분 이상 공백이 있는지
        const dinnerRange = { start: 17 * 60, end: 20 * 60 };

        const hasGapInRange = (range: { start: number, end: number }) => {
            // 식사 카테고리 일정이 이미 있으면 OK
            const hasFoodEvent = events.some(e => {
                const s = timeToMinutes(e.startTime)!;
                return s >= range.start && s <= range.end && (
                    e.subCategory === 'restaurant' || e.subCategory === 'cafe' || 
                    e.subCategory === 'food' || e.subCategory === 'dessert' || e.subCategory === 'drink'
                );
            });
            if (hasFoodEvent) return true;

            // 해당 시간대에 30분 이상 갭이 있는지 체크
            for (let i = 0; i < events.length - 1; i++) {
                const end = timeToMinutes(events[i].endTime)!;
                const nextStart = timeToMinutes(events[i + 1].startTime)!;
                const gap = nextStart - end;
                
                // 갭이 해당 시간대와 겹치고 30분 이상이면 OK
                if (gap >= 30 && end < range.end && nextStart > range.start) {
                    return true;
                }
            }
            
            // 첫 일정 시작 전에 범위가 있는지
            const firstStart = timeToMinutes(events[0].startTime)!;
            if (firstStart > range.start && firstStart - range.start >= 30) return true;
            
            // 마지막 일정 뒤에 범위가 있는지
            const lastEnd = timeToMinutes(events[events.length - 1].endTime)!;
            if (lastEnd < range.end && range.end - lastEnd >= 30) return true;

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
        } else if (noLunch) {
            warnings.push({
                id: `meal-gap-lunch-${dayIdx}`,
                type: 'time_pressure',
                severity: 'info',
                message: `${dayIdx + 1}일차 점심 시간대(11:00~14:00)에 식사 여유가 없어 보입니다.`,
                sourceType: 'event',
                metadata: { dayIndex: dayIdx }
            });
        } else if (noDinner) {
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
export function validateConsecutiveTravelDays(trip: Trip, warnings: TripWarning[], style?: TravelStyle) {
    if (!trip.dailyTimeline || trip.dailyTimeline.length < 3) return;

    // 체력형(energetic)은 연속 이동 허용치를 높임
    const threshold = style?.active === 'energetic' ? 4 : 3;
    let consecutiveCount = 0;
    let startDay = 0;

    trip.dailyTimeline.forEach((day, dayIdx) => {
        // 해당 날에 이동 이벤트(항공/열차/버스 등)가 있는지 확인
        const hasLongTransport = 
            (trip.flights || []).some(f => f.date === day.date) ||
            (trip.publicTransport || []).some(pt => pt.date === day.date && pt.duration && pt.duration > 120) ||
            (trip.driving || []).some(d => d.date === day.date);

        if (hasLongTransport) {
            if (consecutiveCount === 0) startDay = dayIdx;
            consecutiveCount++;
        } else {
            if (consecutiveCount >= threshold) {
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
