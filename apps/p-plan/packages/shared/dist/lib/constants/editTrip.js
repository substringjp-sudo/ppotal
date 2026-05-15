"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSPORT_LABELS = exports.TRANSPORT_ICONS = exports.SECTIONS = exports.SOURCE_TO_SECTION_MAP = void 0;
exports.SOURCE_TO_SECTION_MAP = {
    flight: 'transport',
    accommodation: 'accommodation',
    driving: 'transport',
    publicTransport: 'transport',
    event: 'timeline',
    checklist: 'basics',
    prep: 'basics',
    general: 'basics'
};
exports.SECTIONS = [
    { id: 'basics', label: '기본', icon: 'settings', description: '여행 제목, 날짜, 지역' },
    { id: 'transport', label: '교통', icon: 'directions_car', description: '항공, 렌터카, 대중교통' },
    { id: 'accommodation', label: '숙소', icon: 'hotel', description: '호텔, 에어비앤비 등' },
    { id: 'timeline', label: '일정', icon: 'event_note', description: '상세 타임라인 및 경로' },
    { id: 'reservations', label: '예약', icon: 'confirmation_number', description: '식당, 투어, 기타 영수증' },
];
exports.TRANSPORT_ICONS = {
    walking: 'directions_walk',
    bus: 'directions_bus',
    train: 'directions_railway',
    taxi: 'local_taxi',
    bicycle: 'directions_bike',
    flight: 'flight',
    ship: 'directions_boat'
};
exports.TRANSPORT_LABELS = {
    walking: '도보',
    bus: '버스',
    train: '열차',
    taxi: '택시',
    bicycle: '자전거',
    flight: '항공',
    ship: '선박'
};
