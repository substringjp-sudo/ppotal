import { TransportationMethod } from '../../types/trip';

export const SOURCE_TO_SECTION_MAP: Record<string, SectionId> = {
    flight: 'transport',
    accommodation: 'accommodation',
    driving: 'transport',
    publicTransport: 'transport',
    event: 'timeline',
    budget: 'budget',
    checklist: 'checklist',
    prep: 'checklist',
    general: 'basics'
};

export type SectionId = 'overview' | 'basics' | 'timeline' | 'transport' | 'accommodation' | 'reservations' | 'budget' | 'checklist';

/**
 * 'overview'는 다른 섹션과 성격이 다르다 — 편집 대상이 아니라 전체를 훑어보는 자리다.
 * 예전에는 /dashboard라는 별도 페이지였는데, 위젯 대부분이 편집기 섹션과 같은 데이터를
 * 보여주면서 결국 "여기서 보고 저기로 편집하러 가는" 왕복만 만들었다. 같은 화면 안의
 * 첫 섹션으로 들어오면 보기와 고치기 사이에 페이지 전환이 없어진다.
 */
export const SECTIONS: { id: SectionId; label: string; icon: string; description: string }[] = [
    { id: 'overview', label: '한눈에', icon: 'dashboard', description: '준비 현황 요약' },
    { id: 'basics', label: '기본', icon: 'settings', description: '여행 제목, 날짜, 지역' },
    { id: 'transport', label: '교통', icon: 'directions_car', description: '항공, 렌터카, 대중교통' },
    { id: 'accommodation', label: '숙소', icon: 'hotel', description: '호텔, 에어비앤비 등' },
    { id: 'reservations', label: '예약', icon: 'confirmation_number', description: '식당, 투어, 기타 영수증' },
    { id: 'timeline', label: '일정', icon: 'event_note', description: '상세 타임라인 및 경로' },
    { id: 'budget', label: '예산', icon: 'payments', description: '예상 총액, 지출·정산' },
    { id: 'checklist', label: '준비물', icon: 'checklist', description: '비자·환전·어댑터 등 목적지별 준비물' },
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
