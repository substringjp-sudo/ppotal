/**
 * 다차원 여행 페르소나 매트릭스 시스템 타입 정의
 * 
 * 컨셉(Concept), 연령대(Age), 성별/동행(Companion), 규모(PartySize), 
 * 기간(Duration), 예산(Budget), 목적지 성격(Destination) 등 다차원 속성을 체계화합니다.
 */

import { SectionId } from '../constants/editTrip';

// 1. 연령대 분류
export type AgeGroup = 
    | 'gen_z_20s_early'     // 20대 초반 (Z세대, 대학생, 실속/가성비, 트렌드 민감)
    | 'young_adult_20s_late' // 20대 후반 ~ 30대 초반 (직장인, 미식/쇼핑/휴식, 가심비)
    | 'family_age_30s_40s'   // 30대 ~ 40대 (영유아/초등 자녀 동반, 안전/편의 최우선)
    | 'middle_age_50s'       // 50대 (자녀 독립, 여유로운 휴양, 부부/동창 여행)
    | 'senior_60s_plus';     // 60대 이상 시니어 (효도 여행, 완만한 동선, 건강/식단 배려)

// 2. 성별 및 동행 구성
export type CompanionGroup =
    | 'solo_female'          // 여성 1인 나홀로 (치안/안전, 인생샷, 감성 카페)
    | 'solo_male'            // 남성 1인 나홀로 (자유도, 액티비티, 로컬 탐방, 워케이션)
    | 'couple_romantic'      // 커플 / 신혼부부 (로맨틱, 무드, 인생샷, 프라이빗)
    | 'friends_female'       // 여성 친구 모임 (쇼핑, 디저트, 사진, 핫플레이스)
    | 'friends_male'         // 남성 친구 모임 (액티비티, 주류/야시장, 스포츠, 가성비)
    | 'friends_mixed'        // 남녀 혼성 친구 모임 (공평한 더치페이, 다양한 선호 조율)
    | 'family_infant'        // 영유아(0~4세) 동반 부부 (침대가드, 유모차, 온돌, 위생)
    | 'family_kids'          // 어린이/청소년(5~15세) 동반 가족 (테마파크, 체험 학습, 패밀리룸)
    | 'family_seniors'       // 부모님 효도 동반 (완만한 동선, 한식/소화, 픽업 택시)
    | 'multi_gen_family';    // 3대 대가족 (조부모+부모+자녀, 대형 숙소, 밴 차량)

// 3. 인원 규모 분류
export type PartySizeTier =
    | 'solo_1'               // 1인
    | 'pair_2'               // 2인
    | 'small_3_4'            // 3~4인 (일반 승용차 1대 / 객실 1~2개)
    | 'medium_5_8'           // 5~8인 (7~9인승 밴 필수 / 독채 또는 객실 2~3개)
    | 'large_9_plus';        // 9인 이상 단체 (대형 밴/버스, 단체 예약, 정산 복잡)

// 4. 여행 기간 분류
export type DurationTier =
    | 'night_owl_1_2'        // 1박 2일 ~ 2박 3일 (주말 밤도깨비, 초고속 핵심 압축)
    | 'short_vacation_3_5'   // 3박 4일 ~ 4박 5일 (일반 휴가/골든위크, 밸런스형)
    | 'medium_trip_6_10'     // 6박 7일 ~ 9박 10일 (중기 해외여행, 다도시 이동)
    | 'long_trip_11_20'      // 11일 ~ 20일 (유럽/미주 장기 여행, 세탁/체력 관리)
    | 'stay_month_21_plus';  // 21일 이상 한달살기 (워케이션, 현지 일상 체험, 정기 결제)

// 5. 예산 수준 분류
export type BudgetTier =
    | 'budget_backpacker'    // 가성비 백패커 (도미토리/게스트하우스, 대중교통, 편의점)
    | 'balanced_comfort'     // 밸런스 가심비 (3~4성 호텔, 대표 맛집, 적절한 쇼핑)
    | 'luxury_premium';      // 하이엔드 럭셔리 (5성급 리조트, 파인다이닝, 프라이빗 밴)

// 6. 목적지 환경 특성
export type DestinationContextType =
    | 'developed_metro'      // 대도시/메트로폴리스 (도쿄, 뉴욕, 런던, 싱가포르)
    | 'tropical_island'      // 열대 휴양지/해변 (발리, 다낭, 괌, 푸켓, 하와이)
    | 'historic_cultural'    // 역사/유적/건축 도시 (로마, 교토, 파리, 바르셀로나)
    | 'nature_roadtrip'      // 대자연/로드트립 (스위스 알프스, 몽골, 아이슬란드, 뉴질랜드)
    | 'visa_strict';         // 사전 비자/입국 엄격국 (중국, 미국, 인도 등)

// ─── 페르소나 인사이트 결과 모델 ─────────────────────────────────────

export interface PersonaDelight {
    id: string;
    titleKo: string;
    descriptionKo: string;
    icon: string;
    sectionId: SectionId;
}

export interface PersonaPainPoint {
    id: string;
    riskTitleKo: string;
    riskDescriptionKo: string;
    severity: 'critical' | 'warning' | 'info';
    solutionTitleKo: string;
    solutionActionKo: string;
    suggestedCheckItem?: {
        title: string;
        sectionId: SectionId;
        cardId: string;
        tagKo: string;
    };
}

export interface TravelPersonaProfile {
    code: string;
    nameKo: string;
    headlineKo: string;
    summaryKo: string;
    ageGroup: AgeGroup;
    companionGroup: CompanionGroup;
    partySizeTier: PartySizeTier;
    durationTier: DurationTier;
    budgetTier: BudgetTier;
    destinationContext: DestinationContextType;
    conceptTheme: string;
    badgeEmoji: string;
    badgeColor: string;
}

export interface PersonaInsightReport {
    persona: TravelPersonaProfile;
    delights: PersonaDelight[];
    painPoints: PersonaPainPoint[];
    essentialActionables: {
        id: string;
        title: string;
        description: string;
        sectionId: SectionId;
        cardId: string;
        priority: 'essential' | 'recommended';
        tag: string;
    }[];
    customTipKo: string;
}

export interface PersonaInputParams {
    countryKey?: string | null;
    countryName?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    participants?: { type: string; count: number }[];
    theme?: string | null;
    isParticipantsUndecided?: boolean;
    isDatesUndecided?: boolean;
}
