import { Trip, TripWarning } from '../../types/trip';
import { timeToMinutes } from '../utils';

/**
 * 예약 및 계획 완전성 검증기.
 *
 * trip.reservations는 그동안 어떤 검증기도 다루지 않았다. "확정인데 정보 없음",
 * "예약 필요한데 미완료", "예약 시간이 일정과 충돌"은 전부 우리가 가진 데이터만으로
 * 신뢰성 있게 확인 가능한 항목이다. 데이터 완전성(좌표·시각 누락)은 다른 모든 점검의
 * 정확도를 좌우하므로 함께 안내한다.
 */

// 예약 확정/미완료 상태 점검
export function validateReservationCompleteness(trip: Trip, warnings: TripWarning[]) {
    (trip.reservations || []).forEach(r => {
        if (r.status === 'confirmed' && !r.link) {
            warnings.push({
                id: `res-no-info-${r.id}`,
                type: 'not_booked',
                severity: 'info',
                message: `'${r.title}' 예약이 확정 상태인데 예약 링크/바우처 정보가 없어요. 현장 제시용 정보를 저장해 두세요.`,
                suggestion: '예약 확인 메일의 예약번호나 바우처 링크를 기록해 두면 현장에서 헤매지 않아요.',
                sourceType: 'other',
                sourceId: r.id,
            });
        }
        if (r.status === 'missing') {
            warnings.push({
                id: `res-missing-${r.id}`,
                type: 'not_booked',
                severity: 'warning',
                message: `'${r.title}'은(는) 예약이 필요하다고 표시돼 있는데 아직 예약 전이에요.`,
                suggestion: '인기 명소·식당은 조기 마감될 수 있어요. 예약을 서두르세요.',
                sourceType: 'other',
                sourceId: r.id,
            });
        }
    });
}

// 예약 시간이 같은 날 고정 일정과 겹치는지
export function validateReservationConflicts(trip: Trip, warnings: TripWarning[]) {
    (trip.reservations || []).forEach(r => {
        if (!r.date || !r.time) return;
        const rt = timeToMinutes(r.time);

        const day = trip.dailyTimeline?.find(d => d.date === r.date);
        day?.events?.forEach(e => {
            if (!e.isFixedTime || !e.startTime || !e.endTime) return;
            const s = timeToMinutes(e.startTime);
            const f = timeToMinutes(e.endTime);
            if (rt >= s && rt < f) {
                warnings.push({
                    id: `res-event-conflict-${r.id}-${e.id}`,
                    type: 'timeline_conflict',
                    severity: 'warning',
                    message: `예약 '${r.title}'(${r.time})이 '${e.title}' 일정 시간과 겹쳐요.`,
                    suggestion: '예약 시간과 일정이 겹치지 않도록 한쪽을 조정하세요.',
                    sourceType: 'other',
                    sourceId: r.id,
                    metadata: { otherId: e.id },
                });
            }
        });
    });
}

// 다른 점검의 정확도를 위한 데이터 완전성 안내 (집계형 — 항목마다 경고하지 않아 노이즈 최소)
export function validateDataCompleteness(trip: Trip, warnings: TripWarning[]) {
    // 1. 장소명은 있는데 좌표가 없는 일정 (동선·영업시간 점검 불가)
    let missingCoords = 0;
    (trip.dailyTimeline || []).forEach(d => {
        (d.events || []).forEach(e => {
            if (e.location?.name && (e.location.lat == null || e.location.lng == null)) missingCoords++;
        });
    });
    if (missingCoords > 0) {
        warnings.push({
            id: 'completeness-event-coords',
            type: 'missing_essential',
            severity: 'info',
            message: `${missingCoords}개 일정에 위치 좌표가 없어 동선·영업시간 점검이 제한돼요.`,
            suggestion: '장소를 지도 검색으로 선택하면 이동 시간·운영시간·지역 확인이 더 정확해져요.',
            sourceType: 'event',
        });
    }

    // 2. 출발/도착 시각이 비어 있는 항공편
    const flightsMissingTime = (trip.flights || []).filter(f => !f.departureTime || !f.arrivalTime).length;
    if (flightsMissingTime > 0) {
        warnings.push({
            id: 'completeness-flight-time',
            type: 'missing_essential',
            severity: 'info',
            message: `${flightsMissingTime}개 항공편에 출발/도착 시각이 비어 있어 시간 점검이 제한돼요.`,
            suggestion: '항공권의 정확한 시각을 입력하면 환승·공항 이동·첫날 일정 점검이 가능해요.',
            sourceType: 'flight',
        });
    }
}
