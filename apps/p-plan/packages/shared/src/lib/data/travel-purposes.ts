/**
 * 12대 여행 목적(Travel Purpose / Theme) 및 맞춤형 지능 제안 데이터셋
 * 
 * 액티비티, 쇼핑, 성지순례/덕질, 호캉스, 신혼여행, 콘서트, 미식, 가족/효도 등
 * 여행 목적에 따라 사용자가 놓치기 쉬운 핵심 필수 입력 항목과 준비물을 선제적으로 제안합니다.
 */

import { SectionId } from '../constants/editTrip';

export interface PurposeSuggestionItem {
    id: string;
    title: string;
    description: string;
    sectionId: SectionId;
    cardId: string; // 'documents' | 'money' | 'connectivity' | 'transport' | 'power' | 'health' | 'season' | 'activity' | 'shopping' | 'general' | 'custom'
    isEssential: boolean;
    tagKo: string;
}

export interface TravelPurposeDef {
    id: string;
    label: string;
    desc: string;
    categoryGroup: 'leisure' | 'culture' | 'special' | 'lifestyle';
    icon: string; // Material Symbols
    emoji: string;
    color: string;
    keyHighlightsKo: string[];
    prioritySections: SectionId[]; // 우선적으로 입력해야 할 섹션들
    suggestions: PurposeSuggestionItem[];
}

export const TRAVEL_PURPOSES: TravelPurposeDef[] = [
    // ── 1. 쇼핑 & 플렉스 ──────────────────────────────────────────
    {
        id: '쇼핑',
        label: '쇼핑 & 플렉스',
        desc: '명품, 아울렛, 트렌디 샵, 백화점 쇼핑',
        categoryGroup: 'lifestyle',
        icon: 'shopping_bag',
        emoji: '🛍️',
        color: '#ec4899',
        keyHighlightsKo: ['면세 한도($800) 관리', '택스리펀 영수증 보관', '대형 수하물 캐리어'],
        prioritySections: ['budget', 'checklist', 'timeline'],
        suggestions: [
            {
                id: 'prep-tax-refund',
                title: '해외 현지 택스리펀(Tax Refund) 환급 영수증 및 여권 원본 지참',
                description: '현지 매장 결제 시 여권 실물을 제시해야 면세 혜택을 즉시 또는 공항에서 환급받을 수 있습니다.',
                sectionId: 'budget',
                cardId: 'shopping',
                isEssential: true,
                tagKo: '면세 환급'
            },
            {
                id: 'prep-luggage-scale',
                title: '휴대용 디지털 수하물 캐리어 저울 지참',
                description: '쇼핑으로 불어난 짐의 항공사 위탁 수하물 무게 제한(보통 15~23kg) 초과 요금을 예방하세요.',
                sectionId: 'checklist',
                cardId: 'shopping',
                isEssential: false,
                tagKo: '수하물 대비'
            },
            {
                id: 'prep-large-carrier',
                title: '확장형 대형 캐리어(28인치+) 및 접이식 폴딩백 준비',
                description: '구입한 물품과 선물들을 안전하게 담을 여유 공간을 확보하세요.',
                sectionId: 'checklist',
                cardId: 'shopping',
                isEssential: false,
                tagKo: '쇼핑 짐'
            }
        ]
    },

    // ── 2. 콘서트 & 페스티벌 & 직관 ─────────────────────────────────
    {
        id: '콘서트',
        label: '콘서트 & 페스티벌',
        desc: '아이돌/가수 공연, 뮤직 페스티벌, 스포츠 직관',
        categoryGroup: 'special',
        icon: 'confirmation_number',
        emoji: '🎤',
        color: '#8b5cf6',
        keyHighlightsKo: ['티켓 본인인증 신분증', '응원봉/보조배터리', '공연장 반입 규정'],
        prioritySections: ['reservations', 'checklist', 'timeline'],
        suggestions: [
            {
                id: 'prep-ticket-id-match',
                title: '티켓 예매자 본인 확인용 실물 신분증(여권/주민등록증) 필수 지참',
                description: '공연장 입장 시 예매자 명의와 신분증이 일치하지 않으면 입장이 거부될 수 있습니다.',
                sectionId: 'reservations',
                cardId: 'documents',
                isEssential: true,
                tagKo: '본인 확인'
            },
            {
                id: 'prep-concert-powerbank',
                title: '대용량 보조배터리(20,000mAh) 및 응원봉 여분 건전지(AAA 등)',
                description: '현장 대기 시간과 전자기기/응원봉 사용으로 인한 배터리 방전을 방지하세요.',
                sectionId: 'checklist',
                cardId: 'power',
                isEssential: true,
                tagKo: '전원 충전'
            },
            {
                id: 'prep-venue-bag-policy',
                title: '공연장 가방 규격(투명 가방 규정/소형 가방) 및 반입 금지 물품 확인',
                description: '해외 스타디움 및 아레나는 가방 크기 규제가 엄격하여 물품보관소 이용이 필요할 수 있습니다.',
                sectionId: 'checklist',
                cardId: 'activity',
                isEssential: false,
                tagKo: '반입 규정'
            }
        ]
    },

    // ── 3. 성지순례 & 덕질 & 촬영지 ─────────────────────────────────
    {
        id: '성지순례',
        label: '성지순례 & 덕질',
        desc: '애니/영화/드라마 로케이션, 굿즈 샵, 성지 투어',
        categoryGroup: 'culture',
        icon: 'auto_awesome',
        emoji: '✨',
        color: '#06b6d4',
        keyHighlightsKo: ['촬영지 좌표 매핑', '굿즈샵 오픈런/예약', '인증샷 소품/에어캡'],
        prioritySections: ['timeline', 'reservations', 'checklist'],
        suggestions: [
            {
                id: 'prep-anime-location-coords',
                title: '작품 속 실제 명장면 촬영지(성지) 정확한 스트리트뷰 좌표 저장',
                description: '골목이나 계단 등 숨은 스팟은 구글 지도에 정확한 위도/경도 핀을 찍어두는 것이 필수입니다.',
                sectionId: 'timeline',
                cardId: 'activity',
                isEssential: true,
                tagKo: '성지 좌표'
            },
            {
                id: 'prep-goods-bubblewrap',
                title: '피규어 및 한정판 굿즈 포장용 완충재(뽁뽁이/에어캡) 지참',
                description: '귀국 시 박스 손상 및 피규어 파손 없이 안전하게 운반할 수 있습니다.',
                sectionId: 'checklist',
                cardId: 'shopping',
                isEssential: false,
                tagKo: '굿즈 보호'
            },
            {
                id: 'prep-anime-prop-photo',
                title: '성지 인증샷용 아크릴 스탠드/누이구루미/포토카드 및 삼각대',
                description: '명장면과 같은 구도로 인증샷을 촬영할 수 있는 소품을 챙기세요.',
                sectionId: 'checklist',
                cardId: 'activity',
                isEssential: false,
                tagKo: '인증 소품'
            }
        ]
    },

    // ── 4. 액티비티 & 스포츠 ──────────────────────────────────────
    {
        id: '액티비티',
        label: '액티비티 & 스포츠',
        desc: '서핑, 다이빙, 스키, 등산, 패러글라이딩, 트래킹',
        categoryGroup: 'leisure',
        icon: 'hiking',
        emoji: '🏄‍♂️',
        color: '#f97316',
        keyHighlightsKo: ['레저 특약 여행자보험', '장비 렌탈/바우처', '기능성 의류/방수팩'],
        prioritySections: ['reservations', 'checklist', 'basics'],
        suggestions: [
            {
                id: 'prep-activity-insurance',
                title: '수상레저/스포츠/등산 특약 포함 여행자보험 가입',
                description: '일반 보험은 위험 레저 활동 중 사고 시 보상이 제외될 수 있으므로 레저 특약을 확인하세요.',
                sectionId: 'basics',
                cardId: 'health',
                isEssential: true,
                tagKo: '레저 보험'
            },
            {
                id: 'prep-waterproof-case',
                title: '스마트폰 방수팩 및 아쿠아슈즈 / 기능성 래시가드',
                description: '수중 활동 시 전자기기 침수 방지 및 산호초/바위 부상을 예방하세요.',
                sectionId: 'checklist',
                cardId: 'activity',
                isEssential: true,
                tagKo: '안전 장비'
            },
            {
                id: 'prep-activity-voucher',
                title: '액티비티 예약 바우처 및 라이선스(스쿠버 오픈워터 등) 실물/모바일 저장',
                description: '현장 센터 체크인 시 다이빙 자격증이나 사전 예약증 확인이 필요합니다.',
                sectionId: 'reservations',
                cardId: 'activity',
                isEssential: true,
                tagKo: '라이선스'
            }
        ]
    },

    // ── 5. 호캉스 & 스파 & 힐링 ────────────────────────────────────
    {
        id: '호캉스',
        label: '호캉스 & 스파',
        desc: '럭셔리 호텔, 온천/스파, 라운지, 여유로운 휴식',
        categoryGroup: 'leisure',
        icon: 'spa',
        emoji: '🛁',
        color: '#10b981',
        keyHighlightsKo: ['부대시설(수영장/스파) 운영시간', '레이트 체크아웃', '호텔 어메니티'],
        prioritySections: ['accommodation', 'reservations', 'checklist'],
        suggestions: [
            {
                id: 'prep-hotel-facilities',
                title: '호텔 인피니티 풀/사우나/스파 운영시간 및 수영모/복장 규정 확인',
                description: '부대시설마다 정기 점검일이나 사전 예약제(선베드 예약 등)가 있을 수 있습니다.',
                sectionId: 'accommodation',
                cardId: 'custom',
                isEssential: true,
                tagKo: '부대시설'
            },
            {
                id: 'prep-late-checkout',
                title: '호텔 레이트 체크아웃(Late Check-out) 가능 여부 사전 문의',
                description: '마지막 날 비행기 시간까지 여유롭게 호텔에서 쉴 수 있도록 사전에 요청하세요.',
                sectionId: 'accommodation',
                cardId: 'custom',
                isEssential: false,
                tagKo: '체크아웃'
            },
            {
                id: 'prep-bath-bomb',
                title: '호텔 욕조용 입욕제(배스밤) 및 릴렉스 스킨케어 팩',
                description: '여행 중 피로를 녹여줄 나만의 스파 힐링 타임을 준비하세요.',
                sectionId: 'checklist',
                cardId: 'health',
                isEssential: false,
                tagKo: '힐링 케어'
            }
        ]
    },

    // ── 6. 바캉스 & 해변 & 리조트 ──────────────────────────────────
    {
        id: '바캉스',
        label: '바캉스 & 해변',
        desc: '에메랄드빛 해변, 비치 클럽, 선셋, 여름 바캉스',
        categoryGroup: 'leisure',
        icon: 'beach_access',
        emoji: '🏖️',
        color: '#0284c7',
        keyHighlightsKo: ['자외선 차단/선크림', '비치웨어/비치타월', '일몰 선셋 바 동선'],
        prioritySections: ['checklist', 'timeline', 'reservations'],
        suggestions: [
            {
                id: 'prep-sunscreen-aloe',
                title: '고차단 선크림(SPF50+ PA++++) 및 진정용 알로에 수딩젤',
                description: '강렬한 열대 자외선으로 인한 일광 화상(선번)을 예방하고 진정시키세요.',
                sectionId: 'checklist',
                cardId: 'health',
                isEssential: true,
                tagKo: '자외선 케어'
            },
            {
                id: 'prep-beach-towel-bag',
                title: '속건성 비치타월 및 모래 털기 쉬운 메시 비치백',
                description: '해변에서 물놀이 후 쾌적하게 짐을 정리할 수 있습니다.',
                sectionId: 'checklist',
                cardId: 'season',
                isEssential: false,
                tagKo: '비치 용품'
            },
            {
                id: 'prep-sunset-bar-res',
                title: '일몰(Sunset) 명당 비치클럽 및 선셋 레스토랑 좌석 사전 예약',
                description: '골든아워 시간대는 예약이 조기 마감되므로 선셋 시간에 맞춰 미리 좋은 자리를 예약하세요.',
                sectionId: 'reservations',
                cardId: 'activity',
                isEssential: false,
                tagKo: '선셋 예약'
            }
        ]
    },

    // ── 7. 신혼여행 & 허니문 & 로맨틱 ──────────────────────────────
    {
        id: '신혼여행',
        label: '신혼여행 & 커플',
        desc: '로맨틱 허니문, 커플 기념일, 프라이빗 럭셔리',
        categoryGroup: 'special',
        icon: 'favorite',
        emoji: '💍',
        color: '#e11d48',
        keyHighlightsKo: ['허니문 특전/어메니티', '로맨틱 디너 예약', '현지 스냅 촬영'],
        prioritySections: ['accommodation', 'reservations', 'budget'],
        suggestions: [
            {
                id: 'prep-honeymoon-perks',
                title: '숙소 예약 시 허니문(Honeymoon) 사전 기재 및 특전(웰컴 와인/케이크) 요청',
                description: '대부분의 럭셔리 리조트 및 호텔에서 허니문 전용 무료 특전을 제공합니다.',
                sectionId: 'accommodation',
                cardId: 'custom',
                isEssential: true,
                tagKo: '허니문 특전'
            },
            {
                id: 'prep-romantic-dinner',
                title: '오션뷰/루프탑 로맨틱 파인다이닝 디너 사전 테이블 예약',
                description: '특별한 날을 기념하기 위해 드레스코드를 확인하고 좋은 뷰의 테이블을 미리 확보하세요.',
                sectionId: 'reservations',
                cardId: 'activity',
                isEssential: true,
                tagKo: '디너 예약'
            },
            {
                id: 'prep-couple-snap',
                title: '현지 스냅 사진 작가 예약 및 커플 시밀러룩 의상 준비',
                description: '평생 남을 여행 인생 사진을 위해 스냅 동선과 조화로운 의상을 매칭하세요.',
                sectionId: 'reservations',
                cardId: 'activity',
                isEssential: false,
                tagKo: '스냅 촬영'
            }
        ]
    },

    // ── 8. 역사 & 문화 & 답사 & 건축 ──────────────────────────────
    {
        id: '답사',
        label: '역사 & 문화 답사',
        desc: '유적지 탐방, 국립박물관, 미술관, 도슨트 투어',
        categoryGroup: 'culture',
        icon: 'museum',
        emoji: '🏛️',
        color: '#d97706',
        keyHighlightsKo: ['박물관 도슨트/오디오 가이드', '유적지 휴관일/무료입장', '유선 이어폰'],
        prioritySections: ['reservations', 'timeline', 'checklist'],
        suggestions: [
            {
                id: 'prep-museum-docent',
                title: '주요 박물관/미술관 도슨트 투어 및 한국어 오디오 가이드 사전 예약',
                description: '루브르, 대영박물관, 바티칸 등은 도슨트 가이드와 함께할 때 작품 이해도가 배가됩니다.',
                sectionId: 'reservations',
                cardId: 'activity',
                isEssential: true,
                tagKo: '도슨트 예약'
            },
            {
                id: 'prep-wired-earphone',
                title: '박물관 오디오 가이드 기기용 3.5mm 유선 이어폰 지참',
                description: '현장 대여 오디오 가이드 수신기는 블루투스 연결이 불가한 경우가 많습니다.',
                sectionId: 'checklist',
                cardId: 'power',
                isEssential: false,
                tagKo: '오디오 가이드'
            },
            {
                id: 'prep-historic-closure-days',
                title: '방문 유적지/사찰/궁궐의 정기 휴관일 및 종교 의식 일정 파악',
                description: '월요일 휴관이나 특정 종교 축일로 인한 관람 제한을 사전에 방지하세요.',
                sectionId: 'timeline',
                cardId: 'activity',
                isEssential: true,
                tagKo: '휴관일 점검'
            }
        ]
    },

    // ── 9. 미식 & 와인 & 카페 투어 ─────────────────────────────────
    {
        id: '미식',
        label: '미식 & 와인 투어',
        desc: '로컬 맛집, 미슐랭 스타, 와이너리, 카페 투어',
        categoryGroup: 'lifestyle',
        icon: 'restaurant',
        emoji: '🍷',
        color: '#b91c1c',
        keyHighlightsKo: ['미슐랭/맛집 테이블 예약', '드레스코드(스마트 캐주얼)', '소화제/와인 에어캡'],
        prioritySections: ['reservations', 'checklist', 'budget'],
        suggestions: [
            {
                id: 'prep-michelin-booking',
                title: '예약 곤란 미슐랭/인기 로컬 맛집 사전 테이블 예약',
                description: '구글 맵, 캐치테이블, 타베로그, 오픈테이블 등을 통해 1~2개월 전 예약하세요.',
                sectionId: 'reservations',
                cardId: 'activity',
                isEssential: true,
                tagKo: '맛집 예약'
            },
            {
                id: 'prep-dining-dresscode',
                title: '파인다이닝 레스토랑 드레스코드(재킷/구두/스마트 캐주얼) 의상 준비',
                description: '샌들, 반바지, 트레이닝복 착용 시 입장이 제한될 수 있습니다.',
                sectionId: 'checklist',
                cardId: 'general',
                isEssential: false,
                tagKo: '드레스코드'
            },
            {
                id: 'prep-digestive-winebag',
                title: '소화제/위장약/숙취해소제 및 와인/주류 포장용 에어캡 백',
                description: '다양한 음식을 편안하게 즐기고, 현지 특산 와인을 안전하게 캐리어에 담아오세요.',
                sectionId: 'checklist',
                cardId: 'health',
                isEssential: false,
                tagKo: '소화제 & 주류'
            }
        ]
    },

    // ── 10. 가족 & 부모님 효도 & 아이 동반 ─────────────────────────
    {
        id: '가족',
        label: '가족 & 효도 여행',
        desc: '부모님 효도 관광, 아이 동반 패밀리 여행',
        categoryGroup: 'lifestyle',
        icon: 'family_restroom',
        emoji: '👨‍👩‍👧‍👦',
        color: '#4f46e5',
        keyHighlightsKo: ['온돌/침대가드 요청', '유모차/카시트 렌탈', '완만한 동선 & 비상약'],
        prioritySections: ['accommodation', 'transport', 'timeline', 'checklist'],
        suggestions: [
            {
                id: 'prep-family-bed-guard',
                title: '숙소 유아용 침대(Crib) / 침대 가드 또는 온돌방 사전 요청',
                description: '어린 자녀 낙상 방지 및 어르신의 편안한 숙면을 위해 숙소에 미리 요청하세요.',
                sectionId: 'accommodation',
                cardId: 'custom',
                isEssential: true,
                tagKo: '침대 가드'
            },
            {
                id: 'prep-stroller-carseat',
                title: '렌터카 유아 카시트 신청 및 휴대용 경량 유모차 준비',
                description: '도로교통법상 카시트 착용은 의무이며, 관광지에서 유모차 유무는 피로도를 크게 좌우합니다.',
                sectionId: 'transport',
                cardId: 'transport',
                isEssential: true,
                tagKo: '유모차/카시트'
            },
            {
                id: 'prep-kids-fever-meds',
                title: '어린이/어르신 상비약 (해열진통 시럽, 지사제, 소화제, 체온계) 지참',
                description: '해외에서는 소아 전용 약을 구하기 어려우므로 처방약과 상비약을 넉넉히 챙기세요.',
                sectionId: 'checklist',
                cardId: 'health',
                isEssential: true,
                tagKo: '어린이 상비약'
            }
        ]
    },

    // ── 11. 워케이션 & 비즈니스 & 출장 ─────────────────────────────
    {
        id: '워케이션',
        label: '워케이션 & 비즈니스',
        desc: '일과 쉼의 조화, 공유오피스, 비즈니스 출장',
        categoryGroup: 'lifestyle',
        icon: 'laptop_mac',
        emoji: '💻',
        color: '#475569',
        keyHighlightsKo: ['객실 데스크 & 초고속 Wi-Fi', '노트북 고속 충전기', '비즈니스 영수증'],
        prioritySections: ['accommodation', 'checklist', 'budget'],
        suggestions: [
            {
                id: 'prep-workation-wifi',
                title: '숙소 객실 내 작업 데스크 유무 및 Wi-Fi 속도/공유오피스 위치 확인',
                description: '화상 회의와 원활한 원격 근무를 위해 안정적인 인터넷 환경을 사전에 점검하세요.',
                sectionId: 'accommodation',
                cardId: 'custom',
                isEssential: true,
                tagKo: '근무 환경'
            },
            {
                id: 'prep-laptop-charger-hub',
                title: '노트북용 고출력 멀티 충전기(PD 65W+) 및 C타입 멀티허브',
                description: '외장 모니터 연결 및 다양한 업무 기기를 한 번에 충전할 수 있도록 준비하세요.',
                sectionId: 'checklist',
                cardId: 'power',
                isEssential: true,
                tagKo: '업무 기기'
            },
            {
                id: 'prep-expense-receipts',
                title: '회사 경비 처리용 인보이스(영수증) 발급 조건 확인',
                description: '호텔 및 교통비 정산을 위해 법인명/사업자등록번호가 기재된 영수증을 챙기세요.',
                sectionId: 'budget',
                cardId: 'money',
                isEssential: false,
                tagKo: '경비 증빙'
            }
        ]
    },

    // ── 12. 사진 & 영상 & 인스타 핫플 ──────────────────────────────
    {
        id: '사진',
        label: '사진 & 영상 핫플',
        desc: '인생샷 스팟, 골든아워 일출/일몰, 드론, 유튜브/릴스',
        categoryGroup: 'culture',
        icon: 'photo_camera',
        emoji: '📸',
        color: '#eab308',
        keyHighlightsKo: ['골든아워 일출/일몰 시간대 동선', '여분 배터리/SD카드', '촬영 허가증'],
        prioritySections: ['timeline', 'checklist', 'reservations'],
        suggestions: [
            {
                id: 'prep-golden-hour-timing',
                title: '일출/일몰 골든아워(Golden Hour) 및 매직아워 시간대 촬영지 배치',
                description: '빛이 가장 아름다운 일출 직후 30분, 일몰 직전 1시간에 핵심 포토스팟을 방문하세요.',
                sectionId: 'timeline',
                cardId: 'activity',
                isEssential: true,
                tagKo: '골든아워'
            },
            {
                id: 'prep-camera-battery-sd',
                title: '카메라 여분 배터리 3개 이상 및 대용량 고속 SD카드(128GB+)',
                description: '4K 영상 촬영과 연사로 인한 메모리 부족 및 배터리 소진을 방지하세요.',
                sectionId: 'checklist',
                cardId: 'power',
                isEssential: true,
                tagKo: '촬영 장비'
            },
            {
                id: 'prep-drone-permit',
                title: '드론 촬영 시 현지 비행 금지 구역(NFZ) 및 사전 비행 승인 신청',
                description: '도심, 유적지, 국립공원은 무단 드론 비행 시 거액의 벌금이 부과될 수 있습니다.',
                sectionId: 'basics',
                cardId: 'documents',
                isEssential: false,
                tagKo: '드론 허가'
            }
        ]
    }
];

/**
 * 주어진 테마/목적 문자열에 해당하는 목적 정의를 검색합니다.
 */
export function resolveTravelPurpose(themeOrPurpose?: string | null): TravelPurposeDef {
    if (!themeOrPurpose) return TRAVEL_PURPOSES[0];
    const clean = themeOrPurpose.trim().toLowerCase();
    const found = TRAVEL_PURPOSES.find(p => 
        clean.includes(p.id.toLowerCase()) || 
        clean.includes(p.label.toLowerCase()) ||
        p.desc.toLowerCase().includes(clean)
    );
    return found || TRAVEL_PURPOSES[0];
}

/**
 * 특정 섹션(기본, 교통, 숙소, 예약, 일정, 예산, 준비물)에 해당하는 목적별 스마트 제안 아이템들을 추출합니다.
 */
export function getSmartSuggestionsForSection(sectionId: SectionId, themeOrPurpose?: string | null): PurposeSuggestionItem[] {
    const purpose = resolveTravelPurpose(themeOrPurpose);
    return purpose.suggestions.filter(s => s.sectionId === sectionId || sectionId === 'overview');
}
