/**
 * 여행 스타일 & 동행 궁합 분석 엔진 (Travel Chemistry & Compatibility Engine)
 * 
 * 나와 동행자의 여행 스타일을 바탕으로 이번 여행(기간, 목적지, 테마)과의 궁합 지수,
 * 상호 시너지 포인트, 갈등 예방 및 속도 조절 팁, 그리고 맞춤 필수 체크포인트를 산출합니다.
 */

export type TravelerStyleId = 
    | 'planner'       // 계획형 설계자 (분 단위 철저한 동선, 사전 예약 필수)
    | 'explorer'      // 자유로운 탐험가 (현지 분위기, 골목 탐방, 즉흥적 발견)
    | 'gourmet'       // 미식 & 힐링러 (유명 맛집 웨이팅 감수, 여유로운 카페 및 스파)
    | 'shopper'       // 감성 & 쇼핑 러버 (로컬 셀렉트숍, 면세점, 트렌디 핫플 및 기념품)
    | 'photographer'  // 비주얼 기록가 (포토 스팟, 골든 아워 촬영, SNS 감성 명소)
    | 'budget';       // 실속 가성비러 (최소 경비, 대중교통, 실속형 숙소)

export interface TravelerStyleDef {
    id: TravelerStyleId;
    titleKo: string;
    subtitleKo: string;
    descriptionKo: string;
    icon: string;
    color: string;
    strengths: string[];
    weaknesses: string[];
}

export const TRAVELER_STYLES: Record<TravelerStyleId, TravelerStyleDef> = {
    planner: {
        id: 'planner',
        titleKo: '계획형 설계자',
        subtitleKo: '철저한 동선 & 사전 예약 필수',
        descriptionKo: '출발 전 분 단위 동선과 예약 완료에서 안정감을 느끼는 파워 플래너입니다.',
        icon: 'fact_check',
        color: '#4f46e5',
        strengths: ['시간 낭비 없는 효율적 동선', '예약 실패 없는 안정적 일정'],
        weaknesses: ['예상치 못한 변수에 대한 스트레스', '빡빡한 일정으로 인한 피로감']
    },
    explorer: {
        id: 'explorer',
        titleKo: '자유로운 탐험가',
        subtitleKo: '발길 닿는 대로 즉흥 탐방',
        descriptionKo: '정해진 틀에 얽매이지 않고 현지 골목과 예상치 못한 순간을 즐깁니다.',
        icon: 'explore',
        color: '#0284c7',
        strengths: ['현지 매력에 대한 높은 몰입도', '유연한 상황 대처와 개방성'],
        weaknesses: ['사전 예약 미비로 인한 허탕', '비효율적인 이동 동선']
    },
    gourmet: {
        id: 'gourmet',
        titleKo: '미식 & 힐링러',
        subtitleKo: '현지 맛집 & 여유로운 휴식',
        descriptionKo: '음식과 편안한 휴식이 여행의 중심이며, 웨이팅도 기꺼이 감수합니다.',
        icon: 'restaurant',
        color: '#ea580c',
        strengths: ['실패 없는 현지 미식 경험', '여유롭고 만족도 높은 페이스'],
        weaknesses: ['웨이팅으로 인한 다른 일정 지연', '식비 지출 비중 증가']
    },
    shopper: {
        id: 'shopper',
        titleKo: '감성 & 쇼핑 러버',
        subtitleKo: '트렌디 핫플 & 로컬 쇼핑',
        descriptionKo: '로컬 브랜드 셀렉트숍, 면세점, 트렌디한 편집숍 탐방을 사랑합니다.',
        icon: 'shopping_bag',
        color: '#db2777',
        strengths: ['트렌디하고 감각적인 명소 발견', '알찬 쇼핑 리스트 완성'],
        weaknesses: ['쇼핑 시간 초과로 인한 동선 지연', '수하물 무게 초과 위험']
    },
    photographer: {
        id: 'photographer',
        titleKo: '비주얼 기록가',
        subtitleKo: '인생샷 스팟 & 감성 아카이빙',
        descriptionKo: '아름다운 풍경과 인생샷을 담아내는 순간에서 가장 큰 성취를 느낍니다.',
        icon: 'photo_camera',
        color: '#7c3aed',
        strengths: ['소중한 순간의 고화질 기록', '숨겨진 뷰포인트 탐색 능력'],
        weaknesses: ['촬영 대기 시간으로 인한 일정 지체', '동행자의 사진 피로도']
    },
    budget: {
        id: 'budget',
        titleKo: '실속 가성비러',
        subtitleKo: '합리적 경비 & 로컬 교통',
        descriptionKo: '최소한의 비용으로 현지 대중교통과 알짜 혜택을 극대화합니다.',
        icon: 'savings',
        color: '#059669',
        strengths: ['알뜰한 예산 관리와 경제성', '로컬 대중교통 마스터'],
        weaknesses: ['편의시설 부족으로 인한 체력 소모', '무료 명소 위주의 제한적 선택']
    }
};

export interface ChemistryCheckItem {
    id: string;
    title: string;
    description: string;
    category: string;
    cardId: string;
    priority: 'essential' | 'recommended';
}

export interface TravelChemistryResult {
    myStyle: TravelerStyleDef;
    companionStyle: TravelerStyleDef | null;
    isSolo: boolean;
    score: number; // 60 ~ 98
    gradeTitle: string;
    gradeSubtitle: string;
    synergyHeadline: string;
    synergies: { title: string; desc: string }[];
    pacingTips: { title: string; desc: string }[];
    recommendedChecklist: ChemistryCheckItem[];
}

interface ChemistryInputParams {
    myStyleId: TravelerStyleId;
    companionStyleId?: TravelerStyleId | null;
    isSolo?: boolean;
    destinationName?: string;
    durationDays?: number;
    theme?: string;
}

export function evaluateTravelChemistry(params: ChemistryInputParams): TravelChemistryResult {
    const myStyle = TRAVELER_STYLES[params.myStyleId] || TRAVELER_STYLES.planner;
    const isSolo = params.isSolo || !params.companionStyleId;
    const companionStyle = !isSolo && params.companionStyleId ? (TRAVELER_STYLES[params.companionStyleId] || null) : null;
    const duration = params.durationDays || 3;
    const dest = params.destinationName || '여행지';

    if (isSolo) {
        // ─── 1인 나홀로 여행 특화 분석 ─────────────────────────────────────
        return {
            myStyle,
            companionStyle: null,
            isSolo: true,
            score: 95,
            gradeTitle: '완벽한 자기주도형 여정',
            gradeSubtitle: '동행자와의 조율 스트레스 제로',
            synergyHeadline: `${myStyle.titleKo} 성향에 100% 최적화된 온전한 몰입 여행입니다.`,
            synergies: [
                {
                    title: '온전한 시간과 페이스 통제권',
                    desc: '누구의 눈치도 보지 않고 원하는 시간대에 원하는 장소에 머무를 수 있습니다.'
                },
                {
                    title: `${myStyle.strengths[0]}의 극대화`,
                    desc: `${myStyle.descriptionKo}`
                }
            ],
            pacingTips: [
                {
                    title: '1인 식사 및 이동 동선 사전 확인',
                    desc: '혼밥 가능 여부 및 야간 이동 시 안전한 대중교통 노선을 미리 확인하세요.'
                },
                {
                    title: '상비약 및 비상 연락망 준비',
                    desc: '몸이 아플 때를 대비해 기본 상비약과 카드/신분증 사본을 클라우드에 백업해두세요.'
                }
            ],
            recommendedChecklist: [
                {
                    id: 'solo-safety-backup',
                    title: '비상 연락망 및 신분증 사본 클라우드 백업',
                    description: '여권, 신분증, 항공권 바우처를 모바일 및 클라우드에 저장해두기',
                    category: '기본 서류',
                    cardId: 'documents',
                    priority: 'essential'
                },
                {
                    id: 'solo-first-aid',
                    title: '1인 맞춤 상비약 키트 (소화제/진통제/지사제/밴드)',
                    description: '혼자 있을 때 갑작스러운 컨디션 난조를 대비한 필수 비상약',
                    category: '상비약',
                    cardId: 'custom',
                    priority: 'essential'
                },
                {
                    id: 'solo-power-bank',
                    title: '고속 충전 보조배터리 및 충전 케이블',
                    description: '지도 및 번역기 사용량이 많은 1인 여행 필수 장비',
                    category: '전자기기',
                    cardId: 'power',
                    priority: 'recommended'
                }
            ]
        };
    }

    // ─── 2인 이상 동행 궁합 분석 ─────────────────────────────────────────
    const cStyle = companionStyle!;
    let baseScore = 80;
    const same = myStyle.id === cStyle.id;

    if (same) {
        baseScore = 88;
    } else if (
        (myStyle.id === 'planner' && cStyle.id === 'explorer') ||
        (myStyle.id === 'explorer' && cStyle.id === 'planner')
    ) {
        baseScore = 94; // 완벽한 상호보완
    } else if (
        (myStyle.id === 'gourmet' && cStyle.id === 'shopper') ||
        (myStyle.id === 'shopper' && cStyle.id === 'gourmet')
    ) {
        baseScore = 92; // 핫플 & 미식 환상의 조합
    } else if (
        (myStyle.id === 'planner' && cStyle.id === 'budget') ||
        (myStyle.id === 'budget' && cStyle.id === 'planner')
    ) {
        baseScore = 90; // 효율과 알뜰의 조합
    } else if (
        (myStyle.id === 'shopper' && cStyle.id === 'budget') ||
        (myStyle.id === 'budget' && cStyle.id === 'shopper')
    ) {
        baseScore = 74; // 지출 성향 차이 조율 필요
    } else if (
        (myStyle.id === 'photographer' && cStyle.id === 'budget') ||
        (myStyle.id === 'budget' && cStyle.id === 'photographer')
    ) {
        baseScore = 78; // 이동 및 카페 지출 속도 조율 필요
    }

    let gradeTitle = '상호보완 시너지형';
    let gradeSubtitle = '서로의 강점을 채워주는 균형 잡힌 조합';

    if (baseScore >= 92) {
        gradeTitle = '환상의 찰떡 궁합';
        gradeSubtitle = '시너지와 만족도가 극대화되는 최고의 호흡';
    } else if (baseScore < 76) {
        gradeTitle = '역할 분담 & 배려형';
        gradeSubtitle = '출발 전 선호도 조율과 명확한 역할 분담 추천';
    }

    const synergyHeadline = same
        ? `서로의 여행 호흡과 가치관이 일치하여 의사결정이 매우 빠른 조합입니다.`
        : `${myStyle.titleKo}의 ${myStyle.strengths[0]}과(와) ${cStyle.titleKo}의 ${cStyle.strengths[0]}이(가) 만나 풍성한 여정이 완성됩니다.`;

    const synergies = [
        {
            title: same ? '동일한 여행 취향과 빠른 결정' : `${myStyle.titleKo} × ${cStyle.titleKo}의 장점 결합`,
            desc: same 
                ? `두 사람 모두 ${myStyle.subtitleKo}을(를) 선호하므로 식사, 이동, 일정 선택 시 마찰이 적습니다.`
                : `${myStyle.titleKo}의 장점(${myStyle.strengths[0]})과 ${cStyle.titleKo}의 매력(${cStyle.strengths[0]})이 조화를 이룹니다.`
        },
        {
            title: `${duration}일 여정에 최적화된 시너지`,
            desc: `${dest}에서 각자의 전문 영역(길찾기/예약/맛집 탐색)을 나누어 담당하면 여행 피로도가 절반으로 줄어듭니다.`
        }
    ];

    const pacingTips = [
        {
            title: '식사 및 휴식 타이밍 사전 합의',
            desc: `${myStyle.weaknesses[0] || '지나친 일정 빡빡함'}을 예방하기 위해 하루 1~2회 여유로운 카페 타임을 배치하세요.`
        },
        {
            title: '공용 경비 및 정산 방식 조율',
            desc: '현지 식비와 교통비는 공용 지갑이나 트래블 카드로 묶어 결제하고 1/N 정산하면 깔끔합니다.'
        }
    ];

    const recommendedChecklist: ChemistryCheckItem[] = [
        {
            id: 'chem-joint-card',
            title: '동행자 간 공용 경비 정산용 트래블 카드 준비',
            description: '식비 및 공동 입장료를 한 번에 결제하고 분할 정산하기 위한 공용 결제 수단',
            category: '예산 및 결제',
            cardId: 'money',
            priority: 'essential'
        },
        {
            id: 'chem-daily-charger',
            title: '동행 인원용 멀티포트 고속 충전기 및 케이블',
            description: '숙소에서 여러 대의 스마트폰과 보조배터리를 동시에 충전할 수 있는 멀티 충전기',
            category: '전자기기',
            cardId: 'power',
            priority: 'essential'
        },
        {
            id: 'chem-shared-medicine',
            title: '동행 공용 비상 상비약 (소화제/진통제/알러지약/밴드)',
            description: '서로 다른 체질과 갑작스러운 컨디션 난조를 대비한 공용 비상약',
            category: '상비약',
            cardId: 'custom',
            priority: 'recommended'
        }
    ];

    return {
        myStyle,
        companionStyle: cStyle,
        isSolo: false,
        score: baseScore,
        gradeTitle,
        gradeSubtitle,
        synergyHeadline,
        synergies,
        pacingTips,
        recommendedChecklist
    };
}
