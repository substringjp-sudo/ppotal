import { Trip, TripWarning } from '../../types/trip';
import { TravelStyle } from '../../types/user';
import { AIRPORTS, Airport } from '../airports';
import { calculateDistance } from '../geo-utils';
import { timeToMinutes } from '../utils';

export function validateFlightCompleteness(trip: Trip, warnings: TripWarning[], style?: TravelStyle) {
    if (!trip.transportSettings?.useFlight) return;

    const flights = trip.flights || [];
    const hasOutbound = flights.some(f => f.type === 'outbound');
    const hasInbound = flights.some(f => f.type === 'inbound');
    const isInternationalTrip = flights.some(f => f.isInternational);

    const baseSeverity: TripWarning['severity'] = style?.planning === 'flexible' ? 'info' : 'warning';

    // A1: 귀국편/출국편 누락 - 해외여행이면 severity 강화
    if (!hasOutbound) {
        warnings.push({
            id: 'missing-outbound-flight',
            type: 'missing_essential',
            severity: isInternationalTrip ? 'warning' : 'info',
            message: '출국 항공편 정보가 없습니다.' + (isInternationalTrip ? ' 해외 여행의 경우 항공편 정보는 필수입니다.' : ''),
            sourceType: 'flight'
        });
    }

    if (!hasInbound) {
        warnings.push({
            id: 'missing-inbound-flight',
            type: 'missing_essential',
            severity: isInternationalTrip ? 'warning' : 'info',
            message: '귀국 항공편 정보가 없습니다.' + (isInternationalTrip ? ' 귀국편이 없으면 편도 여행이 됩니다. 확인해 주세요.' : ''),
            suggestion: '귀국편을 아직 구매하지 않았다면, 가격이 오르기 전에 예약을 서두르세요.',
            sourceType: 'flight'
        });
    }

    if (isInternationalTrip) {
        const unbookedInternational = flights.filter(f => f.isInternational && (f.type === 'outbound' || f.type === 'inbound') && !f.isBooked);
        
        if (unbookedInternational.length > 0) {
            warnings.push({
                id: 'unbooked-international-trip',
                type: 'not_booked',
                severity: baseSeverity,
                message: '해외 여행의 경우 출국 또는 귀국 항공편 예약이 완료되지 않았습니다. 예약 상태를 확인해 주세요.',
                sourceType: 'flight'
            });
        }
    }

    // B4: 출국편/귀국편 날짜 역전 체크
    if (hasOutbound && hasInbound) {
        const outboundDates = flights.filter(f => f.type === 'outbound' && f.date).map(f => f.date!);
        const inboundDates = flights.filter(f => f.type === 'inbound' && f.date).map(f => f.date!);
        
        if (outboundDates.length > 0 && inboundDates.length > 0) {
            const lastOutbound = outboundDates.sort().pop()!;
            const firstInbound = inboundDates.sort()[0];
            
            if (firstInbound < lastOutbound) {
                warnings.push({
                    id: 'flight-date-reversal',
                    type: 'timeline_conflict',
                    severity: 'critical',
                    message: `귀국편 날짜(${firstInbound})가 출국편 날짜(${lastOutbound})보다 앞서 있습니다. 날짜를 확인해 주세요.`,
                    suggestion: '출국편과 귀국편의 날짜가 올바른지 다시 확인하세요. 날짜 입력 오류일 가능성이 높습니다.',
                    sourceType: 'flight'
                });
            }
        }
    }
}

export function validateFlightTimeRange(trip: Trip, warnings: TripWarning[]) {
    (trip.flights || []).forEach(f => {
        const depMinutes = timeToMinutes(f.departureTime);
        const arrMinutes = timeToMinutes(f.arrivalTime);
        
        const isEarlyMorning = (m: number | null) => m !== null && m >= 0 && m <= 4 * 60;
        
        if (isEarlyMorning(depMinutes) || isEarlyMorning(arrMinutes)) {
            warnings.push({
                id: `flight-time-warning-${f.id}`,
                type: 'flight_time',
                severity: 'info',
                message: `항공편(${f.flightNumber || '정보 없음'})의 시간이 새벽 시간대(00:00~04:00)입니다. 이동 수단을 확인해 보세요.`,
                sourceType: 'flight',
                sourceId: f.id
            });
        }
    });
}

export function validateFlightSpeed(trip: Trip, warnings: TripWarning[]) {
    (trip.flights || []).forEach(f => {
        let dLat = f.departureLat, dLng = f.departureLng, aLat = f.arrivalLat, aLng = f.arrivalLng;
        
        if (!dLat && f.departureLocation) {
            const a = AIRPORTS.find((ap: Airport) => ap.code === f.departureLocation);
            if (a) { dLat = a.lat; dLng = a.lng; }
        }
        if (!aLat && f.arrivalLocation) {
            const a = AIRPORTS.find((ap: Airport) => ap.code === f.arrivalLocation);
            if (a) { aLat = a.lat; aLng = a.lng; }
        }

        if (dLat && dLng && aLat && aLng && f.flightDurationMinutes) {
            const dist = calculateDistance(dLat, dLng, aLat, aLng);
            const hours = f.flightDurationMinutes / 60;
            if (hours > 0) {
                const speed = dist / hours;
                if (dist > 100 && (speed < 200 || speed > 1500)) {
                    warnings.push({
                        id: `flight-speed-${f.id}`,
                        type: 'unrealistic_speed',
                        severity: 'warning',
                        message: `비행 거리(${Math.round(dist)}km) 대비 소요 시간(${f.flightDurationMinutes}분)이 현실적이지 않습니다. 운행 시간이 맞는지 확인해 주세요.`,
                        sourceType: 'flight',
                        sourceId: f.id
                    });
                }
            }
        }
    });
}

export function validateRentalCarPeriod(trip: Trip, warnings: TripWarning[]) {
    (trip.driving || []).forEach(d => {
        if (d.isRental && d.pickupTime && d.returnTime) {
            const start = new Date(d.pickupTime).getTime();
            const end = new Date(d.returnTime).getTime();
            if (!isNaN(start) && !isNaN(end)) {
                const totalHours = (end - start) / (1000 * 60 * 60);
                if (totalHours <= 0) return;
                
                const extraHours = totalHours % 24;
                if (extraHours > 0 && extraHours <= 6) {
                    warnings.push({
                        id: `rental-duration-${d.id}`,
                        type: 'budget_exceeded',
                        severity: 'info',
                        message: `렌터카 대여 일수 외에 추가 시간이 ${Math.floor(extraHours)}시간입니다. 렌터카는 24시간 단위로 요금이 부과되는 경우가 많아, 몇 시간 초과로 하루치 요금이 추가될 수 있으니 확인해 보세요.`,
                        sourceType: 'driving',
                        sourceId: d.id
                    });
                }
            }
        }
    });
}

export function validatePublicTransportFeasibility(trip: Trip, warnings: TripWarning[]) {
     (trip.publicTransport || []).forEach(pt => {
        if (pt.departureLat && pt.departureLng && pt.arrivalLat && pt.arrivalLng && pt.departureTime && pt.arrivalTime) {
            const dist = calculateDistance(pt.departureLat, pt.departureLng, pt.arrivalLat, pt.arrivalLng);
            
            const start = timeToMinutes(pt.departureTime)!;
            let end = timeToMinutes(pt.arrivalTime)!;
            if (pt.isNextDayArrival) end += 24 * 60;
            
            const durationHrs = (end - start) / 60;
            
            if (durationHrs <= 0 && dist > 1) {
                warnings.push({
                    id: `pt-time-${pt.id}`,
                    type: 'impossible_transport',
                    severity: 'critical',
                    message: `대중교통('${pt.name || pt.type}')의 소요 시간이 유효하지 않습니다.`,
                    sourceType: 'publicTransport',
                    sourceId: pt.id
                });
            } else if (durationHrs > 0) {
                const speed = dist / durationHrs;
                let maxSpeed = 150; 
                if (pt.type === 'taxi') maxSpeed = 130;
                if (pt.type === 'train' && speed > 350) maxSpeed = 350; 
                
                if (speed > maxSpeed && dist > 10) {
                    warnings.push({
                        id: `pt-speed-${pt.id}`,
                        type: 'unrealistic_speed',
                        severity: 'warning',
                        message: `대중교통('${pt.name || pt.type}')의 이동 속도가 거리 대비 너무 빠릅니다(약 ${Math.round(speed)}km/h).`,
                        sourceType: 'publicTransport',
                        sourceId: pt.id
                    });
                } else if (speed < 1 && dist > 2) {
                    warnings.push({
                        id: `pt-speed-slow-${pt.id}`,
                        type: 'unrealistic_speed',
                        severity: 'info',
                        message: `대중교통('${pt.name || pt.type}')의 이동 속도가 너무 느립니다(시속 1km 미만). 시간을 다시 확인해 보세요.`,
                        sourceType: 'publicTransport',
                        sourceId: pt.id
                    });
                } else if (speed > 500 && dist > 10) {
                    warnings.push({
                        id: `pt-speed-extreme-${pt.id}`,
                        type: 'unrealistic_speed',
                        severity: 'warning',
                        message: `대중교통('${pt.name || pt.type}')의 이동 속도가 비정상적으로 빠릅니다(시속 500km 초과).`,
                        sourceType: 'publicTransport',
                        sourceId: pt.id
                    });
                }
            }
        }
    });
}

export function validateDrivingFeasibility(trip: Trip, warnings: TripWarning[]) {
    (trip.driving || []).forEach(d => {
        if (d.pickupLat && d.pickupLng && d.returnLat && d.returnLng && d.pickupTime && d.returnTime && !d.isReturnSameAsPickup) {
            const dist = calculateDistance(d.pickupLat, d.pickupLng, d.returnLat, d.returnLng);
            
            const start = timeToMinutes(d.pickupTime)!;
            const end = timeToMinutes(d.returnTime)!;
            
            const durationHrs = (end - start) / 60;
            
            if (durationHrs <= 0 && dist > 1) {
                warnings.push({
                    id: `driving-time-${d.id}`,
                    type: 'impossible_transport',
                    severity: 'critical',
                    message: `운전(${d.isRental ? '렌터카' : '개인차량'})의 반납 시간이 대여 시간보다 빠릅니다.`,
                    sourceType: 'driving',
                    sourceId: d.id
                });
            } else if (durationHrs > 0) {
                const speed = dist / durationHrs;
                const maxSpeed = 150; 
                
                if (speed > maxSpeed && dist > 10) {
                    warnings.push({
                        id: `driving-speed-${d.id}`,
                        type: 'impossible_transport',
                        severity: 'warning',
                        message: `이동 거리 대비 설정된 시간이 너무 짧아 보입니다(예상 시속 약 ${Math.round(speed)}km/h).`,
                        sourceType: 'driving',
                        sourceId: d.id
                    });
                }
            }
        }
    });
}

export function validateFlightLayovers(trip: Trip, warnings: TripWarning[]) {
    (trip.flights || []).forEach(f => {
        (f.layovers || []).forEach((layover, idx) => {
            if (layover.durationMinutes !== undefined && layover.durationMinutes < 90) {
                warnings.push({
                    id: `layover-short-${f.id}-${idx}`,
                    type: 'timeline_conflict',
                    severity: 'warning',
                    message: `항공편(${f.flightNumber || '정보 없음'})의 환승 대기 시간(${layover.durationMinutes}분)이 짧습니다. 입국 수속 및 터미널 이동 시간을 확인해 보세요.`,
                    sourceType: 'flight',
                    sourceId: f.id,
                    metadata: { layoverIndex: idx }
                });
            }
        });
    });
}

/**
 * 대중교통(열차, 버스 등) 일정이 다른 리소스와 겹치는지 확인
 */
export function validatePublicTransportConflicts(trip: Trip, warnings: TripWarning[]) {
    const transports = trip.publicTransport || [];
    if (transports.length === 0) return;

    transports.forEach(pt => {
        if (!pt.date || !pt.departureTime || !pt.arrivalTime) return;

        const ptStart = timeToMinutes(pt.departureTime)!;
        let ptEnd = timeToMinutes(pt.arrivalTime)!;
        if (pt.isNextDayArrival) ptEnd += 24 * 60;

        // 1. 항공편과 겹침 확인
        trip.flights?.forEach(flight => {
            if (flight.date !== pt.date || !flight.departureTime || !flight.arrivalTime) return;

            const fStart = timeToMinutes(flight.departureTime)!;
            const fEnd = timeToMinutes(flight.arrivalTime)!;

            if (ptStart < fEnd && fStart < ptEnd) {
                warnings.push({
                    id: `pt-flight-conflict-${pt.id}-${flight.id}`,
                    type: 'overlap',
                    severity: 'info',
                    message: `대중교통(${pt.name || pt.type}) 일정이 항공편(${flight.flightNumber || '정보 없음'}) 시간과 겹칩니다. 확인해 보세요.`,
                    suggestion: '항공편 이용 전후의 대중교통 이동 시간을 다시 점검해 보세요.',
                    sourceType: 'publicTransport',
                    sourceId: pt.id
                });
            }
        });

        // 2. 다른 대중교통과 겹침 확인
        transports.forEach(other => {
            if (pt.id === other.id || other.date !== pt.date || !other.departureTime || !other.arrivalTime) return;

            const oStart = timeToMinutes(other.departureTime)!;
            let oEnd = timeToMinutes(other.arrivalTime)!;
            if (other.isNextDayArrival) oEnd += 24 * 60;

            if (ptStart < oEnd && oStart < ptEnd) {
                warnings.push({
                    id: `pt-pt-conflict-${pt.id}-${other.id}`,
                    type: 'overlap',
                    severity: 'info',
                    message: `대중교통(${pt.name || pt.type}) 일정이 다른 대중교통(${other.name || other.type}) 시간과 겹칩니다.`,
                    sourceType: 'publicTransport',
                    sourceId: pt.id
                });
            }
        });

        // 3. 타임라인 일정과 겹침 확인
        const day = trip.dailyTimeline?.find(d => d.date === pt.date);
        day?.events?.forEach(event => {
            if (!event.startTime || !event.endTime || !event.isFixedTime) return;

            const eStart = timeToMinutes(event.startTime)!;
            const eEnd = timeToMinutes(event.endTime)!;

            if (ptStart < eEnd && eStart < ptEnd) {
                warnings.push({
                    id: `pt-event-conflict-${pt.id}-${event.id}`,
                    type: 'overlap',
                    severity: 'info',
                    message: `대중교통(${pt.name || pt.type}) 일정이 '${event.title}' 일정 시간과 겹칩니다.`,
                    sourceType: 'publicTransport',
                    sourceId: pt.id
                });
            }
        });
    });
}

/**
 * 운전(렌터카 등) 일정이 다른 리소스와 겹치는지 확인
 */
export function validateDrivingConflicts(trip: Trip, warnings: TripWarning[]) {
    const drivings = trip.driving || [];
    if (drivings.length === 0) return;

    drivings.forEach(d => {
        if (!d.date || !d.pickupTime || !d.returnTime) return;

        const dStart = timeToMinutes(d.pickupTime)!;
        const dEnd = timeToMinutes(d.returnTime)!;

        // 항공편과 겹침 확인
        trip.flights?.forEach(flight => {
            if (flight.date !== d.date || !flight.departureTime || !flight.arrivalTime) return;

            const fStart = timeToMinutes(flight.departureTime)!;
            const fEnd = timeToMinutes(flight.arrivalTime)!;

            if (dStart < fEnd && fStart < dEnd) {
                warnings.push({
                    id: `driving-flight-conflict-${d.id}-${flight.id}`,
                    type: 'overlap',
                    severity: 'info',
                    message: `운전(${d.isRental ? '렌터카' : '차량'}) 일정이 항공편 시간과 겹칩니다.`,
                    sourceType: 'driving',
                    sourceId: d.id
                });
            }
        });

        // 타임라인 일정과 겹침 확인 (운전 중에는 다른 일정을 수행할 수 없음)
        const day = trip.dailyTimeline?.find(day => day.date === d.date);
        day?.events?.forEach(event => {
            if (!event.startTime || !event.endTime || !event.isFixedTime) return;

            const eStart = timeToMinutes(event.startTime)!;
            const eEnd = timeToMinutes(event.endTime)!;

            if (dStart < eEnd && eStart < dEnd) {
                warnings.push({
                    id: `driving-event-conflict-${d.id}-${event.id}`,
                    type: 'overlap',
                    severity: 'info',
                    message: `운전 일정이 '${event.title}' 일정 시간과 겹칩니다. 운전 중에는 다른 일정을 수행하기 어렵습니다.`,
                    sourceType: 'driving',
                    sourceId: d.id
                });
            }
        });
    });
}

