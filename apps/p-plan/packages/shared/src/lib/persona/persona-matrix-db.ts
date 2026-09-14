/**
 * 다차원 여행 페르소나 매트릭스 지능 룰베이스 (Persona Matrix DB)
 * 
 * 컨셉, 연령, 동행, 인원규모, 기간, 예산, 국가 환경의 교차 조합에 따른
 * 방대한 감동 포인트(Delights) 및 불만족/함정(Pain Points) 해결 룰셋을 정의합니다.
 */

import { 
    CompanionGroup, 
    PartySizeTier, 
    DurationTier, 
    DestinationContextType, 
    PersonaDelight, 
    PersonaPainPoint 
} from './persona-types';

// ─── 1. 동행 및 구성 기반 룰베이스 ──────────────────────────────────

export const COMPANION_MATRIX_RULES: Record<CompanionGroup, {
    delights: PersonaDelight[];
    painPoints: PersonaPainPoint[];
}> = {
    solo_female: {
        delights: [
            {
                id: 'delight-solo-female-safety',
                titleKo: '안전 보장 & 여성 안심 숙소 스마트 필터',
                descriptionKo: '치안이 검증된 대로변 숙소 및 24시간 프론트 데스크 운영 여부를 우선 체크합니다.',
                icon: 'verified_user',
                sectionId: 'accommodation'
            },
            {
                id: 'delight-solo-female-photo',
                titleKo: '나홀로 감성 사진 & 카페 투어 최적화',
                descriptionKo: '삼각대 촬영 가능 스팟과 혼자서도 부담 없는 1인 디저트/브런치 카페를 집중 제안합니다.',
                icon: 'photo_camera',
                sectionId: 'timeline'
            }
        ],
        painPoints: [
            {
                id: 'pain-solo-female-night',
                riskTitleKo: '심야 골목 이동 및 비상 연락망 부재',
                riskDescriptionKo: '혼자 여행 시 늦은 밤 인적 드문 골목이나 대중교통 단절 시 안전 위험이 증가합니다.',
                severity: 'critical',
                solutionTitleKo: '귀가 알림 & 현지 픽업 택시 앱 사전 연동',
                solutionActionKo: '현지 우버/그랩/Go 택시 앱 카드 등록 및 24시 긴급 외교부 콜센터 번호를 등록하세요.',
                suggestedCheckItem: {
                    title: '현지 호출 택시 앱(Grab/Uber/Go) 카드 등록 및 외교부 영사콜센터(+82-2-3210-0404) 저장',
                    sectionId: 'basics',
                    cardId: 'documents',
                    tagKo: '안전 필수'
                }
            }
        ]
    },

    solo_male: {
        delights: [
            {
                id: 'delight-solo-male-freedom',
                titleKo: '완벽한 자유 일정 & 로컬 딥 다이브',
                descriptionKo: '시간 제약 없는 즉흥 일정과 로컬 이자카야/골목 맛집 탐방에 최적화된 동선을 제공합니다.',
                icon: 'explore',
                sectionId: 'timeline'
            }
        ],
        painPoints: [
            {
                id: 'pain-solo-male-emergency',
                riskTitleKo: '여권/지갑 분실 시 1인 비상 대처 한계',
                riskDescriptionKo: '혼자 있을 때 전자기기 방전이나 소지품 분실 시 즉각적인 도움을 받기 어렵습니다.',
                severity: 'warning',
                solutionTitleKo: '클라우드 여권 사본 & 분실 비상금 분산 보관',
                solutionActionKo: '비상용 신용카드와 소액 현금을 캐리어와 가방에 분산 보관하세요.',
                suggestedCheckItem: {
                    title: '여권 사본/증명사진 모바일 클라우드 저장 및 비상 결제 수단 분산',
                    sectionId: 'basics',
                    cardId: 'documents',
                    tagKo: '비상 대비'
                }
            }
        ]
    },

    couple_romantic: {
        delights: [
            {
                id: 'delight-couple-ambiance',
                titleKo: '로맨틱 무드 & 뷰 맛집 좌석 예약 제안',
                descriptionKo: '오션뷰, 루프탑, 야경 명소의 프라이빗 2인 테이블 예약을 완벽 가이드합니다.',
                icon: 'favorite',
                sectionId: 'reservations'
            },
            {
                id: 'delight-couple-bed',
                titleKo: '더블/킹 베드 1개 확정 보장',
                descriptionKo: '트윈 침대로 잘못 배정되어 분위기가 깨지지 않도록 더블 침대 확정을 자동 점검합니다.',
                icon: 'bed',
                sectionId: 'accommodation'
            }
        ],
        painPoints: [
            {
                id: 'pain-couple-fatigue',
                riskTitleKo: '과도한 도보 이동으로 인한 다툼/체력 저하',
                riskDescriptionKo: '하루 2만 보 이상의 빡빡한 일정은 피로감으로 인해 여행 중 갈등을 유발하기 쉽습니다.',
                severity: 'warning',
                solutionTitleKo: '하루 2~3스팟 여유 페이싱 & 감성 카페 휴식 블록',
                solutionActionKo: '오후 3~4시 사이 디저트/스파 힐링 타임을 일정에 배치하세요.',
                suggestedCheckItem: {
                    title: '일정 내 오후 힐링 카페/스파 휴식 타임 블록 확보',
                    sectionId: 'timeline',
                    cardId: 'activity',
                    tagKo: '무드 케어'
                }
            }
        ]
    },

    friends_female: {
        delights: [
            {
                id: 'delight-friends-female-shopping-cafe',
                titleKo: '쇼핑 핫플 & 인스타 감성 카페 완벽 맵핑',
                descriptionKo: '백화점, 소품샵, 트렌디 디저트 카페를 동선 낭비 없이 묶어줍니다.',
                icon: 'shopping_bag',
                sectionId: 'timeline'
            },
            {
                id: 'delight-friends-female-split',
                titleKo: '깔끔한 실시간 1/N 정산 & 영수증 분할',
                descriptionKo: '결제자별 지출 내역을 터치 한 번으로 엔빵 정산하여 금전 스트레스를 제로로 만듭니다.',
                icon: 'receipt_long',
                sectionId: 'budget'
            }
        ],
        painPoints: [
            {
                id: 'pain-friends-female-luggage',
                riskTitleKo: '쇼핑으로 인한 수하물 무게 초과 및 캐리어 부족',
                riskDescriptionKo: '귀국 날 공항에서 오버차지(초과 요금) 폭탄을 맞거나 짐 정리가 지체될 수 있습니다.',
                severity: 'warning',
                solutionTitleKo: '사전 수하물 무게 추가 & 휴대용 캐리어 저울',
                solutionActionKo: '저가항공(LCC) 수하물 옵션을 사전 구매하고 저울로 미리 체크하세요.',
                suggestedCheckItem: {
                    title: '항공사 위탁 수하물 무게 사전 추가 및 휴대용 디지털 캐리어 저울 지참',
                    sectionId: 'checklist',
                    cardId: 'shopping',
                    tagKo: '수하물 대비'
                }
            }
        ]
    },

    friends_male: {
        delights: [
            {
                id: 'delight-friends-male-activity',
                titleKo: '스릴 넘치는 액티비티 & 로컬 야시장/주류 동선',
                descriptionKo: '렌터카 드라이브, 스포츠/레저, 가성비 주류 투어 동선을 시원시원하게 제안합니다.',
                icon: 'sports_bar',
                sectionId: 'timeline'
            }
        ],
        painPoints: [
            {
                id: 'pain-friends-male-oversleep',
                riskTitleKo: '늦잠 및 예약 필수 스팟(테마파크/오픈런) 노쇼 위험',
                riskDescriptionKo: '음주나 늦은 취침으로 오전 9시 이전 주요 예약 일정을 놓칠 위험이 높습니다.',
                severity: 'warning',
                solutionTitleKo: '오전 일정 여유 배치 & 체크아웃 알림',
                solutionActionKo: '핵심 유료 예약은 오후로 분산하고 오전은 브런치/자유 시간으로 구성하세요.',
                suggestedCheckItem: {
                    title: '오전 11시 이전 예약 지양 및 오후 시간대 주요 액티비티 배치',
                    sectionId: 'timeline',
                    cardId: 'activity',
                    tagKo: '일정 조율'
                }
            }
        ]
    },

    friends_mixed: {
        delights: [
            {
                id: 'delight-friends-mixed-rooms',
                titleKo: '성별 분리 객실 / 다인원 복층 독채 구성 점검',
                descriptionKo: '남/여 분리 침실 구성 및 2개 이상의 화장실을 갖춘 숙소를 최우선으로 검증합니다.',
                icon: 'apartment',
                sectionId: 'accommodation'
            }
        ],
        painPoints: [
            {
                id: 'pain-friends-mixed-bathroom',
                riskTitleKo: '단일 화장실로 인한 아침 외출 준비 병목 지체',
                riskDescriptionKo: '4인 이상 혼성 그룹에서 화장실 1개는 아침 준비 시간을 1시간 이상 지연시킵니다.',
                severity: 'warning',
                solutionTitleKo: '화장실 2개 이상 구비 숙소 또는 분리형 욕실 선택',
                solutionActionKo: '욕실과 파우더룸, 변기가 분리된 구조의 숙소를 선택하세요.',
                suggestedCheckItem: {
                    title: '화장실/세면대 2개 이상 구비된 숙소 또는 복층 독채 예약 확인',
                    sectionId: 'accommodation',
                    cardId: 'custom',
                    tagKo: '숙소 위생'
                }
            }
        ]
    },

    family_infant: {
        delights: [
            {
                id: 'delight-infant-crib',
                titleKo: '유아용 침대 가드 & 아기 침대(Crib) 자동 요청',
                descriptionKo: '숙소 예약 메모에 유아 동반 및 침대 가드/온돌 방 배정 요청문을 자동으로 작성해 줍니다.',
                icon: 'crib',
                sectionId: 'accommodation'
            },
            {
                id: 'delight-infant-stroller',
                titleKo: '기내 반입 휴대용 유모차 & 배리어프리 엘리베이터 동선',
                descriptionKo: '계단이 많은 역사를 피해 엘리베이터 중심의 평지 동선을 안내합니다.',
                icon: 'stroller',
                sectionId: 'transport'
            }
        ],
        painPoints: [
            {
                id: 'pain-infant-water-fever',
                riskTitleKo: '영유아 물갈이(석회수 장염) 및 갑작스러운 고열',
                riskDescriptionKo: '면역력이 약한 아기들은 현지 수질이나 기온 변화로 밤사이 열이 날 수 있습니다.',
                severity: 'critical',
                solutionTitleKo: '여행용 샤워필터 지참, 영유아 해열제(아세트아미노펜/이부프로펜 교차복용)',
                solutionActionKo: '분유물은 반드시 끓인 생수를 쓰고 체온계와 해열제를 캐리어에 챙기세요.',
                suggestedCheckItem: {
                    title: '영유아 해열제(시럽 2종), 체온계, 보습크림, 여행용 샤워필터 지참',
                    sectionId: 'checklist',
                    cardId: 'health',
                    tagKo: '아기 건강'
                }
            }
        ]
    },

    family_kids: {
        delights: [
            {
                id: 'delight-kids-parks',
                titleKo: '테마파크(디즈니/유니버설) & 체험형 과학관 우선 추천',
                descriptionKo: '아이들의 호기심을 자극하는 인기 명소 패스트패스 및 사전 티켓 예매를 지원합니다.',
                icon: 'attractions',
                sectionId: 'reservations'
            }
        ],
        painPoints: [
            {
                id: 'pain-kids-waiting',
                riskTitleKo: '긴 대기 시간으로 인한 아이들의 칭얼거림/짜증',
                riskDescriptionKo: '1시간 이상의 맛집/놀이기구 줄서기는 아이들의 체력을 급격히 방전시킵니다.',
                severity: 'warning',
                solutionTitleKo: '식당 사전 예약(테이블링/캐치테이블/구글예약) 및 모바일 간식 준비',
                solutionActionKo: '줄 서지 않는 예약제 식당을 우선 확보하고 비상 간식을 챙기세요.',
                suggestedCheckItem: {
                    title: '주요 식당 사전 테이블 예약 및 대기용 간식/소형 장난감 준비',
                    sectionId: 'reservations',
                    cardId: 'activity',
                    tagKo: '아이 케어'
                }
            }
        ]
    },

    family_seniors: {
        delights: [
            {
                id: 'delight-seniors-pacing',
                titleKo: '하루 8천보 이하 완만한 효도 페이싱',
                descriptionKo: '가파른 오르막과 계단을 최소화하고, 식사 후 충분한 휴식이 보장되는 동선을 설계합니다.',
                icon: 'elderly',
                sectionId: 'timeline'
            },
            {
                id: 'delight-seniors-dining',
                titleKo: '자극적이지 않은 정갈한 식당 & 입식 테이블 확보',
                descriptionKo: '무릎 관절이 불편한 어르신을 위해 좌식 방 대신 의자가 있는 입식 식당을 제안합니다.',
                icon: 'restaurant',
                sectionId: 'reservations'
            }
        ],
        painPoints: [
            {
                id: 'pain-seniors-walking',
                riskTitleKo: '지하철 환승 장거리 도보로 인한 무릎/체력 한계',
                riskDescriptionKo: '해외 대형 환승역(도쿄역, 파리 메트로 등)은 어르신에게 극심한 피로를 줍니다.',
                severity: 'critical',
                solutionTitleKo: '택시/우버 호출 적극 활용 & 1일 렌터카/일일투어 대절',
                solutionActionKo: '주요 관광지 간 이동은 대중교통 대신 택시나 픽업 서비스를 활용하세요.',
                suggestedCheckItem: {
                    title: '주요 구간 택시/프라이빗 픽업 투어 활용 및 어르신 평소 복용 처방약 넉넉히 지참',
                    sectionId: 'transport',
                    cardId: 'health',
                    tagKo: '효도 배려'
                }
            }
        ]
    },

    multi_gen_family: {
        delights: [
            {
                id: 'delight-multi-gen-villa',
                titleKo: '3대 가족 전용 대형 독채 빌라/패밀리 스위트 제안',
                descriptionKo: '거실에서 함께 모이고 독립된 방에서 쉴 수 있는 다인원 최적 숙소를 점검합니다.',
                icon: 'villa',
                sectionId: 'accommodation'
            },
            {
                id: 'delight-multi-gen-van',
                titleKo: '대형 7~9인승 밴 렌트 & 짐 수용 공간 점검',
                descriptionKo: '사람 6명 이상과 대형 캐리어 4~5개가 한 번에 실리는 승합차 옵션을 가이드합니다.',
                icon: 'airport_shuttle',
                sectionId: 'transport'
            }
        ],
        painPoints: [
            {
                id: 'pain-multi-gen-opinions',
                riskTitleKo: '연령대별 선호 차이(아이 vs 어르신)로 인한 일정 갈등',
                riskDescriptionKo: '모두를 만족시키려다 보면 일정이 과도하게 늘어지고 모두가 지칩니다.',
                severity: 'warning',
                solutionTitleKo: '오후 반나절 자유 분리 일정(어르신 온천/휴식 vs 아이 테마파크/쇼핑)',
                solutionActionKo: '하루 중 일정 시간을 그룹별로 나누어 각자 취향에 맞게 시간을 보내세요.',
                suggestedCheckItem: {
                    title: '오후 분리 자유 일정 블록 구성 및 대형 밴(7~9인승) 렌터카 예약',
                    sectionId: 'transport',
                    cardId: 'transport',
                    tagKo: '가족 조율'
                }
            }
        ]
    }
};

// ─── 2. 기간 및 템포 기반 룰베이스 ──────────────────────────────────

export const DURATION_MATRIX_RULES: Record<DurationTier, {
    delights: PersonaDelight[];
    painPoints: PersonaPainPoint[];
}> = {
    night_owl_1_2: {
        delights: [
            {
                id: 'delight-duration-nightowl',
                titleKo: '초밀착 핵심 랜드마크 퀵스캔',
                descriptionKo: '이동 시간을 최소화한 시내 중심가 초밀착 동선과 24시 맛집을 추천합니다.',
                icon: 'bolt',
                sectionId: 'timeline'
            }
        ],
        painPoints: [
            {
                id: 'pain-duration-nightowl-luggage',
                riskTitleKo: '얼리체크인 전 & 레이트체크아웃 후 짐 보관 곤란',
                riskDescriptionKo: '1박 2일 여행에서 캐리어를 끌고 다니면 기동력이 70% 이상 저하됩니다.',
                severity: 'warning',
                solutionTitleKo: '주요 기차역 코인라커 앱 사전 파악 & 호텔 무료 짐보관 활용',
                solutionActionKo: '체크인 전/체크아웃 후 프론트에 짐을 맡기거나 역 라커를 선점하세요.',
                suggestedCheckItem: {
                    title: '주요 역 코인라커 위치 확인 및 숙소 짐보관(러기지) 서비스 이용',
                    sectionId: 'checklist',
                    cardId: 'custom',
                    tagKo: '짐 기동력'
                }
            }
        ]
    },

    short_vacation_3_5: {
        delights: [
            {
                id: 'delight-duration-short',
                titleKo: '황금 3박 4일 최적 밸런스 페이싱',
                descriptionKo: '도착일 가벼운 적응 ➔ 2/3일차 핵심 관광 및 쇼핑 ➔ 마지막 날 공항 정리를 완성합니다.',
                icon: 'calendar_view_week',
                sectionId: 'timeline'
            }
        ],
        painPoints: [
            {
                id: 'pain-duration-short-rushing',
                riskTitleKo: '무리한 근교 도시 당일치기로 인한 이동 피로',
                riskDescriptionKo: '3박 4일 일정에 2개 이상의 외곽 도시를 넣으면 기차 안에서 하루를 다 보냅니다.',
                severity: 'info',
                solutionTitleKo: '메인 도시 1곳 집중 + 근교는 반나절 1곳 이하로 제한',
                solutionActionKo: '이동 시간을 편도 1시간 이내로 압축하세요.',
                suggestedCheckItem: {
                    title: '외곽 이동 편도 1시간 이내로 제한 및 메인 도시 집중 동선',
                    sectionId: 'timeline',
                    cardId: 'activity',
                    tagKo: '동선 최적화'
                }
            }
        ]
    },

    medium_trip_6_10: {
        delights: [
            {
                id: 'delight-duration-medium',
                titleKo: '2~3개 거점 도시 연계 & 중간 세탁/재정비 팁',
                descriptionKo: '도시 간 고속열차(신칸센/TGV/유로스타) 최적 예매 시점 및 코인세탁소 정보를 제공합니다.',
                icon: 'train',
                sectionId: 'transport'
            }
        ],
        painPoints: [
            {
                id: 'pain-duration-medium-burnout',
                riskTitleKo: '여행 5~6일차 누적 피로로 인한 컨디션 난조',
                riskDescriptionKo: '1주일 연속 관광 시 체력이 방전되어 후반부 일정이 무너질 수 있습니다.',
                severity: 'warning',
                solutionTitleKo: '5일차 오후 완전 휴식 / 스파 / 호캉스 하프데이 지정',
                solutionActionKo: '중간에 알람 없이 푹 자고 여유를 즐기는 하프데이를 두세요.',
                suggestedCheckItem: {
                    title: '여행 5~6일차 오후 무계획 힐링 하프데이(Half-day) 확보',
                    sectionId: 'timeline',
                    cardId: 'activity',
                    tagKo: '체력 안배'
                }
            }
        ]
    },

    long_trip_11_20: {
        delights: [
            {
                id: 'delight-duration-long',
                titleKo: '장기 배낭/유럽 횡단 스마트 짐 압축 & 다구간 교통',
                descriptionKo: '세탁이 용이한 기능성 의류 패킹과 철도 패스/국내선 항공 조합을 최적화합니다.',
                icon: 'luggage',
                sectionId: 'checklist'
            }
        ],
        painPoints: [
            {
                id: 'pain-duration-long-finance',
                riskTitleKo: '해외 결제 카드 한도 초과 및 현지 분실/복제 사고',
                riskDescriptionKo: '장기 여행 중 카드 1장이 마그네틱 손상되거나 복제 차단되면 큰 낭패를 봅니다.',
                severity: 'critical',
                solutionTitleKo: '해외 결제 수수료 무료 카드 2개 이상(트래블로그+트래블월렛) 분산 소지',
                solutionActionKo: '마스터/비자 브랜드를 다르게 2장 이상 준비하고 해외원화결제(DCC)를 차단하세요.',
                suggestedCheckItem: {
                    title: '해외 체크카드 2종 이상(Visa/Master 분산) 준비 및 해외결제 차단 해제 확인',
                    sectionId: 'budget',
                    cardId: 'money',
                    tagKo: '금융 안전'
                }
            }
        ]
    },

    stay_month_21_plus: {
        delights: [
            {
                id: 'delight-duration-month',
                titleKo: '한달살기 레지던스/에어비앤비 주방 & 정기권 혜택',
                descriptionKo: '조리가 가능한 숙소 주방 설비와 대중교통 1개월 정기권, 로컬 마트 팁을 제공합니다.',
                icon: 'kitchen',
                sectionId: 'accommodation'
            }
        ],
        painPoints: [
            {
                id: 'pain-duration-month-visa',
                riskTitleKo: '무비자 체류 가능 일수(30일/90일) 초과(오버스테이) 리스크',
                riskDescriptionKo: '귀국 항공권 날짜가 무비자 기한을 단 하루라도 넘기면 벌금 및 입국 금지 처분을 받습니다.',
                severity: 'critical',
                solutionTitleKo: '출입국 관리법 기준 체류 일수 카운트 & 비자 연장 사전 확인',
                solutionActionKo: '입국일 포함 정확한 출국 일자를 대조 점검하세요.',
                suggestedCheckItem: {
                    title: '목적지 국가 무비자 체류 허용 일수 계산 및 비자런/연장 규정 확인',
                    sectionId: 'basics',
                    cardId: 'documents',
                    tagKo: '비자/체류'
                }
            }
        ]
    }
};

// ─── 3. 목적지 성격 기반 룰베이스 ──────────────────────────────────

export const DESTINATION_CONTEXT_RULES: Record<DestinationContextType, {
    delights: PersonaDelight[];
    painPoints: PersonaPainPoint[];
}> = {
    developed_metro: {
        delights: [
            {
                id: 'delight-dest-metro',
                titleKo: '대중교통 지하철 패스 & 모바일 카드 탑재',
                descriptionKo: '애플월렛/구글페이에 현지 교통카드(스이카, 파스모, 옥토퍼스 등)를 즉시 추가하도록 가이드합니다.',
                icon: 'contactless',
                sectionId: 'transport'
            }
        ],
        painPoints: [
            {
                id: 'pain-dest-metro-complex',
                riskTitleKo: '복잡한 민영 철도 노선 환승 및 출구 미로',
                riskDescriptionKo: '도쿄/오사카/런던 등은 노선별 회사가 달라 환승 추가 요금이 발생하거나 출구를 찾기 어렵습니다.',
                severity: 'info',
                solutionTitleKo: '구글 맵 환승 노선 색상 & 플랫폼 번호 확인 습관',
                solutionActionKo: '출구 번호를 미리 메모해두세요.',
                suggestedCheckItem: {
                    title: '현지 모바일 교통카드 충전 및 주요 환승역 출구 번호 사전 확인',
                    sectionId: 'transport',
                    cardId: 'transport',
                    tagKo: '교통 팁'
                }
            }
        ]
    },

    tropical_island: {
        delights: [
            {
                id: 'delight-dest-tropical',
                titleKo: '열대 휴양지 선셋 & 비치 액티비티 패키지',
                descriptionKo: '호핑투어, 스노클링, 선셋 마사지 예약 및 오프라인 바우처 관리를 지원합니다.',
                icon: 'surfing',
                sectionId: 'reservations'
            }
        ],
        painPoints: [
            {
                id: 'pain-dest-tropical-mosquito',
                riskTitleKo: '열대 모기(뎅기열) 및 강한 자외선 피부 화상',
                riskDescriptionKo: '동남아/열대 지역 모기에 물릴 경우 고열과 관절통을 동반하는 뎅기열 위험이 있습니다.',
                severity: 'warning',
                solutionTitleKo: 'DEET 성분 모기 기피제 & 고차단 선크림 지참',
                solutionActionKo: '현지 약국 또는 출국 전 강력 모기 기피제를 챙기세요.',
                suggestedCheckItem: {
                    title: '모기 기피제(DEET 15%+), 버물리/물파스, 자외선 차단제 지참',
                    sectionId: 'checklist',
                    cardId: 'health',
                    tagKo: '방충/피부'
                }
            }
        ]
    },

    historic_cultural: {
        delights: [
            {
                id: 'delight-dest-historic',
                titleKo: '유네스코 세계문화유산 & 박물관 패스 우선권',
                descriptionKo: '줄 서지 않는 통합 뮤지엄 패스 및 한국어 오디오 가이드 사전 확보를 지원합니다.',
                icon: 'account_balance',
                sectionId: 'reservations'
            }
        ],
        painPoints: [
            {
                id: 'pain-dest-historic-pickpocket',
                riskTitleKo: '유럽/관광 명소 소매치기 및 집시 강매 수법',
                riskDescriptionKo: '루브르, 콜로세움, 사그라다 파밀리아 주변은 스마트폰 날치기와 가방 지퍼 털이가 빈번합니다.',
                severity: 'critical',
                solutionTitleKo: '스마트폰 도난방지 스프링 스트랩 & 가방 옷핀/자물쇠 체결',
                solutionActionKo: '식당 야외 테라스에 폰을 올려두지 말고 가방은 항상 앞으로 메세요.',
                suggestedCheckItem: {
                    title: '스마트폰 분실방지 손목 스트랩 및 캐리어 와이어 자물쇠 준비',
                    sectionId: 'checklist',
                    cardId: 'general',
                    tagKo: '도난 방지'
                }
            }
        ]
    },

    nature_roadtrip: {
        delights: [
            {
                id: 'delight-dest-nature',
                titleKo: '로드트립 환상 뷰포인트 & 오프라인 지도 내비',
                descriptionKo: '데이터가 터지지 않는 산악/황야 지역에서도 동작하는 오프라인 맵 다운로드를 안내합니다.',
                icon: 'terrain',
                sectionId: 'timeline'
            }
        ],
        painPoints: [
            {
                id: 'pain-dest-nature-car-breakdown',
                riskTitleKo: '외곽 산악도로 차량 고장/타이어 펑크 & 긴급출동 지연',
                riskDescriptionKo: '사막이나 빙하지대에서는 긴급 견인차가 오기까지 수 시간이 걸릴 수 있습니다.',
                severity: 'critical',
                solutionTitleKo: '렌터카 완전 자차(Super CDW / Zero Excess) 가입 & 비상 보온 의류',
                solutionActionKo: '주유소 보일 때마다 가득 채우고 스페어 타이어를 점검하세요.',
                suggestedCheckItem: {
                    title: '렌터카 완전 자차(Zero Excess) 풀커버 보험 가입 및 오프라인 구글맵 다운로드',
                    sectionId: 'transport',
                    cardId: 'transport',
                    tagKo: '차량 안전'
                }
            }
        ]
    },

    visa_strict: {
        delights: [
            {
                id: 'delight-dest-visa',
                titleKo: '전자여행허가(ESTA/ETA/비자) 신청 상태 사전 자동 검증',
                descriptionKo: '비자 승인 번호와 유효기간을 내 여행 서류함에 안전하게 동기화합니다.',
                icon: 'fact_check',
                sectionId: 'basics'
            }
        ],
        painPoints: [
            {
                id: 'pain-dest-visa-denial',
                riskTitleKo: '전자여행허가(ESTA 등) 미승인으로 인한 공항 탑승 거부',
                riskDescriptionKo: '출발 당일 공항에서 비자가 없어 비행기를 타지 못하는 사고가 매일 발생합니다.',
                severity: 'critical',
                solutionTitleKo: '출국 최소 72시간 전 전자여행허가 승인 상태 출력',
                solutionActionKo: '비자 영문 이름 스펠링과 여권 번호 일치를 2회 이상 대조하세요.',
                suggestedCheckItem: {
                    title: '전자여행허가(ESTA/ETA/비자) 승인 확인서 종이 출력 및 여권 일치 대조',
                    sectionId: 'basics',
                    cardId: 'documents',
                    tagKo: '입국 비자'
                }
            }
        ]
    }
};
