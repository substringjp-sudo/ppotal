/* 신규 검증기 4종의 "양성 경로"가 실제로 발화하는지 확인하는 스모크 테스트. (일회성) */
import { validateReservationCompleteness, validateReservationConflicts, validateDataCompleteness } from '../lib/validators/completeness-validators';
import { validateSelfTransferAirportChange } from '../lib/validators/transport-validators';
import { validateHolidayCongestion } from '../lib/validators/holiday-validators';
import { Trip, TripWarning } from '../types/trip';

const results: Array<[string, boolean]> = [];
const check = (name: string, warnings: TripWarning[], id: string) =>
  results.push([name, warnings.some(w => w.id === id)]);

// ① 예약 완전성/미완료
{
  const w: TripWarning[] = [];
  const trip = { reservations: [
    { id: 'r1', title: '식당', status: 'confirmed' },       // 링크 없음 → res-no-info
    { id: 'r2', title: '입장권', status: 'missing' },        // 미예약 → res-missing
  ] } as unknown as Trip;
  validateReservationCompleteness(trip, w);
  check('res-no-info', w, 'res-no-info-r1');
  check('res-missing', w, 'res-missing-r2');
}

// 예약-일정 충돌
{
  const w: TripWarning[] = [];
  const trip = {
    reservations: [{ id: 'r3', title: '오마카세', status: 'confirmed', date: '2026-08-01', time: '19:30' }],
    dailyTimeline: [{ date: '2026-08-01', events: [
      { id: 'e1', title: '공연', isFixedTime: true, startTime: '19:00', endTime: '21:00' },
    ] }],
  } as unknown as Trip;
  validateReservationConflicts(trip, w);
  check('res-event-conflict', w, 'res-event-conflict-r3-e1');
}

// ③ 셀프환승 공항 변경 (같은 날 연결, 도착≠출발)
{
  const w: TripWarning[] = [];
  const trip = { flights: [
    { id: 'f1', type: 'outbound', date: '2026-08-01', departureLocation: 'ICN', departureTime: '09:00', arrivalLocation: 'LGW', arrivalTime: '17:00' },
    { id: 'f2', type: 'outbound', date: '2026-08-01', departureLocation: 'LHR', departureTime: '21:00', arrivalLocation: 'CDG', arrivalTime: '23:00' },
  ] } as unknown as Trip;
  validateSelfTransferAirportChange(trip, w);
  check('self-transfer-airport', w, 'self-transfer-airport-f1-f2');

  // 오픈조(며칠 간격)는 발화하면 안 됨
  const w2: TripWarning[] = [];
  const openJaw = { flights: [
    { id: 'g1', type: 'outbound', date: '2026-08-01', departureLocation: 'ICN', departureTime: '09:00', arrivalLocation: 'NRT', arrivalTime: '12:00' },
    { id: 'g2', type: 'inbound', date: '2026-08-05', departureLocation: 'KIX', departureTime: '18:00', arrivalLocation: 'ICN', arrivalTime: '21:00' },
  ] } as unknown as Trip;
  validateSelfTransferAirportChange(openJaw, w2);
  results.push(['open-jaw-not-flagged (must be false)', w2.length === 0]);
}

// ② 연휴 × 미예약 숙소
{
  const w: TripWarning[] = [];
  const trip = {
    dates: { startDate: '2026-05-01', endDate: '2026-05-05' }, // 일본 골든위크
    locations: { regions: [{ name: '도쿄' }] },
    accommodation: [{ id: 'a1', status: 'tentative' }],
  } as unknown as Trip;
  validateHolidayCongestion(trip, w);
  check('holiday-booking-urgent', w, 'holiday-booking-urgent');

  // 확정 숙소면 촉구 경고는 없어야 함
  const w2: TripWarning[] = [];
  const booked = {
    dates: { startDate: '2026-05-01', endDate: '2026-05-05' },
    locations: { regions: [{ name: '도쿄' }] },
    accommodation: [{ id: 'a1', status: 'booked' }],
  } as unknown as Trip;
  validateHolidayCongestion(booked, w2);
  results.push(['holiday-urgent-suppressed-when-booked (must be false)', !w2.some(x => x.id === 'holiday-booking-urgent')]);
}

// ④ 데이터 완전성
{
  const w: TripWarning[] = [];
  const trip = {
    dailyTimeline: [{ date: '2026-08-01', events: [
      { id: 'e1', title: '명소', location: { name: '어딘가' } }, // 좌표 없음
    ] }],
    flights: [{ id: 'f1', type: 'outbound', departureTime: '', arrivalTime: '' }], // 시각 없음
  } as unknown as Trip;
  validateDataCompleteness(trip, w);
  check('completeness-event-coords', w, 'completeness-event-coords');
  check('completeness-flight-time', w, 'completeness-flight-time');
}

let allOk = true;
console.log('\n===== 신규 검증기 양성 경로 스모크 =====');
for (const [name, ok] of results) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) allOk = false;
}
console.log(`\n${allOk ? '✅ 전체 통과' : '❌ 실패 있음'}`);
