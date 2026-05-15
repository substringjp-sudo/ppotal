import { TransportationMethod } from '../../types/trip';

export const SOURCE_TO_SECTION_MAP: Record<string, SectionId> = {
    flight: 'transport',
    accommodation: 'accommodation',
    driving: 'transport',
    publicTransport: 'transport',
    event: 'timeline',
    checklist: 'basics',
    prep: 'basics',
    general: 'basics'
};

export type SectionId = 'basics' | 'timeline' | 'transport' | 'accommodation' | 'reservations';

export const SECTIONS: { id: SectionId; label: string; icon: string; description: string }[] = [
    { id: 'basics', label: '기본', icon: 'settings', description: '여행 제목, 날짜, 지역' },
    { id: 'transport', label: '교통', icon: 'directions_car', description: '항공, 렌터카, 대중교통' },
    { id: 'accommodation', label: '숙소', icon: 'hotel', description: '호텔, 에어비앤비 등' },
    { id: 'timeline', label: '일정', icon: 'event_note', description: '상세 타임라인 및 경로' },
    { id: 'reservations', label: '예약', icon: 'confirmation_number', description: '식당, 투어, 기타 영수증' },
];

export const TRANSPORT_ICONS: Record<TransportationMethod, string> = {
    walking: 'directions_walk',
    bus: 'directions_bus',
    train: 'directions_railway',
    taxi: 'local_taxi',
    bicycle: 'directions_bike',
    flight: 'flight',
    ship: 'directions_boat'
};

export const TRANSPORT_LABELS: Record<TransportationMethod, string> = {
    walking: '도보',
    bus: '버스',
    train: '열차',
    taxi: '택시',
    bicycle: '자전거',
    flight: '항공',
    ship: '선박'
};
