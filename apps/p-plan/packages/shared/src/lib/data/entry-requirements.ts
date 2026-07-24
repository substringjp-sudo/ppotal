/**
 * 거주국(여권) ↔ 목적지국 양자 입국 요건 데이터셋.
 *
 * ⚠️ 매우 중요: 비자·입국 정책은 국가 간 협정과 정세에 따라 수시로 바뀐다.
 * 이 데이터는 "일반적인 단기 관광 목적" 기준의 참고 안내이며, 법적 효력이 없다.
 * 실제 요건은 반드시 출발 전 여행 목적지의 대사관·공식 이민국 사이트에서 재확인해야 한다.
 * 정책 변동이 잦거나 확신이 낮은 조합은 의도적으로 보수적으로(비자 필요) 표기했다 —
 * "필요 없다고 안내했는데 실제로는 필요했던" 상황이 반대의 경우보다 훨씬 위험하기 때문이다.
 *
 * country-profiles.ts의 entryAuth(목적지 단독 전자여행허가 정보)보다 더 정밀한
 * "거주국별" 판단이 필요할 때 이 데이터를 사용한다. 거주국이 여기 없으면
 * country-profiles.ts의 목적지 단독 정보로 안전하게 폴백한다.
 */

export type EntryRequirementTier =
    | 'visa-free'      // 무비자, 사전 전자 등록도 불필요
    | 'eta-optional'   // 무비자, 전자 사전등록이 있지만 법적 의무는 아님(입국 수속 단축용)
    | 'eta-required'   // 무비자지만 탑승 전 전자여행허가가 법적으로 필수(미신청 시 탑승 거부 가능)
    | 'visa-required'; // 비자(또는 도착비자·전자비자 등 사전 신청/발급) 필요

export interface EntryRequirement {
    tier: EntryRequirementTier;
    program?: string; // ESTA / UK ETA / ETIAS / Visit Japan Web 등
    note: string;      // 체류기간 등 요약 + 확인 필요 문구 포함
    /**
     * 'medium'은 정책 변동이 잦거나(중국 관련, 베트남 전자비자 등) 확신이 낮은 조합.
     * 생략(high 취급)은 장기간 안정적으로 유지돼 온 협정(솅겐, VWP, 오랜 상호면제 등).
     */
    confidence?: 'high' | 'medium';
}

/** 모든 항목에 공통으로 덧붙이는 안전 문구 */
export const ENTRY_REQUIREMENT_DISCLAIMER =
    '입국 정책은 자주 바뀔 수 있어요. 출발 전 목적지 대사관·공식 이민국 사이트에서 반드시 최신 요건을 재확인하세요.';

const SCHENGEN_ETIAS_NOTE = '솅겐 지역 무비자 단기체류 대상. ETIAS 시행 이후엔 사전 신청이 필요해요.';
const VOA_NOTE = '도착비자(Visa on Arrival)로 공항에서 발급 가능하거나 사전 온라인 신청도 가능해요. 국적별 최신 대상 여부를 꼭 확인하세요.';
const CHINA_VOLATILE_NOTE = '중국의 자국민 대상 무비자 시범정책은 국가별로 수시로 추가·중단돼요. 출발 전 반드시 최신 정책을 확인하세요.';

/**
 * 거주국 key -> 목적지국 key -> 요건.
 * 6개 거주국(KR/US/GB/CN/JP/AU — traveler-simulation.ts의 페르소나 거주국과 동일)에
 * 대해 채웠다. 그 외 거주국은 아직 데이터가 없으므로, 사용하는 쪽(preparation-service)에서
 * country-profiles의 목적지 단독 entryAuth 정보로 안전하게 폴백해야 한다.
 */
export const ENTRY_REQUIREMENTS: Record<string, Record<string, EntryRequirement>> = {
    KR: {
        JP: { tier: 'eta-optional', program: 'Visit Japan Web', note: '무비자 90일 체류 가능. Visit Japan Web은 필수는 아니지만 등록하면 입국 수속이 빨라져요.' },
        CN: { tier: 'visa-required', note: `한중 간 단기 무비자 시범정책이 시행/중단을 반복해온 구간이에요. ${CHINA_VOLATILE_NOTE}`, confidence: 'medium' },
        TW: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        HK: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        US: { tier: 'eta-required', program: 'ESTA', note: '비자면제프로그램(VWP) 대상국이지만, 출발 최소 72시간 전 ESTA 승인이 필수예요.' },
        CA: { tier: 'eta-required', program: 'eTA', note: '항공편으로 입국 시 eTA 승인이 필수예요.' },
        GB: { tier: 'eta-required', program: 'UK ETA', note: '무비자 단기체류 대상이지만, 출발 전 UK ETA 신청이 필수예요.' },
        FR: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        DE: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        IT: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        ES: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        CH: { tier: 'eta-required', program: 'ETIAS', note: `솅겐 준회원국으로 동일하게 적용돼요. ${SCHENGEN_ETIAS_NOTE}` },
        AU: { tier: 'eta-required', program: 'ETA(subclass 601)', note: '무비자 대상이지만 전자여행허가(ETA) 신청이 필수예요.' },
        NZ: { tier: 'eta-required', program: 'NZeTA', note: '무비자 대상이지만 NZeTA 신청과 관광세(IVL) 납부가 필요해요.' },
        TH: { tier: 'visa-free', note: '무비자 체류 가능(협정 기준, 체류기간은 최신 공지 확인).' },
        VN: { tier: 'visa-free', note: '무비자 체류 가능(협정 기준, 체류기간은 최신 공지 확인).' },
        SG: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        MY: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        ID: { tier: 'visa-free', note: '단기 관광 목적 무비자 체류 가능(공항 입국세/조건 변동 가능).' },
        PH: { tier: 'visa-free', note: '무비자 30일 체류 가능.' },
    },

    US: {
        JP: { tier: 'eta-optional', program: 'Visit Japan Web', note: '무비자 90일 체류 가능. Visit Japan Web은 필수는 아니지만 등록하면 입국 수속이 빨라져요.' },
        CN: { tier: 'visa-required', note: `중국의 최근 단기 무비자 시범정책 대상국에 미국은 포함되지 않는 경우가 많아요. ${CHINA_VOLATILE_NOTE}`, confidence: 'medium' },
        TW: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        HK: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        KR: { tier: 'eta-required', program: 'K-ETA', note: '무비자 90일 체류 대상이지만 K-ETA 승인이 필요해요(국적별 한시 면제가 있을 수 있으니 최신 공지 확인).', confidence: 'medium' },
        CA: { tier: 'visa-free', note: '무비자 입국 가능. 미국 시민은 캐나다 eTA 대상에서 제외돼요.' },
        GB: { tier: 'eta-required', program: 'UK ETA', note: '무비자 단기체류 대상이지만, 출발 전 UK ETA 신청이 필수예요.' },
        FR: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        DE: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        IT: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        ES: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        CH: { tier: 'eta-required', program: 'ETIAS', note: `솅겐 준회원국으로 동일하게 적용돼요. ${SCHENGEN_ETIAS_NOTE}` },
        AU: { tier: 'eta-required', program: 'ETA(subclass 601)', note: '무비자 대상이지만 전자여행허가(ETA) 신청이 필수예요.' },
        NZ: { tier: 'eta-required', program: 'NZeTA', note: '무비자 대상이지만 NZeTA 신청과 관광세(IVL) 납부가 필요해요.' },
        TH: { tier: 'visa-free', note: '무비자 체류 가능(협정 기준, 체류기간은 최신 공지 확인).' },
        VN: { tier: 'visa-required', note: `전자비자(e-Visa)로 온라인 사전 신청이 가능해요(오프라인 영사관 방문 불필요). ${ENTRY_REQUIREMENT_DISCLAIMER}` },
        SG: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        MY: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        ID: { tier: 'visa-required', note: VOA_NOTE, confidence: 'medium' },
        PH: { tier: 'visa-free', note: '무비자 30일 체류 가능.' },
    },

    GB: {
        JP: { tier: 'eta-optional', program: 'Visit Japan Web', note: '무비자 90일 체류 가능. Visit Japan Web은 필수는 아니지만 등록하면 입국 수속이 빨라져요.' },
        CN: { tier: 'visa-required', note: `영국은 중국의 최근 단기 무비자 시범정책 대상에서 자주 빠지는 편이에요. ${CHINA_VOLATILE_NOTE}`, confidence: 'medium' },
        TW: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        HK: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        KR: { tier: 'eta-required', program: 'K-ETA', note: '무비자 90일 체류 대상이지만 K-ETA 승인이 필요해요(국적별 한시 면제가 있을 수 있으니 최신 공지 확인).', confidence: 'medium' },
        US: { tier: 'eta-required', program: 'ESTA', note: '비자면제프로그램(VWP) 대상국이지만, 출발 최소 72시간 전 ESTA 승인이 필수예요.' },
        CA: { tier: 'eta-required', program: 'eTA', note: '항공편으로 입국 시 eTA 승인이 필수예요.' },
        FR: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        DE: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        IT: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        ES: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        CH: { tier: 'eta-required', program: 'ETIAS', note: `솅겐 준회원국으로 동일하게 적용돼요. ${SCHENGEN_ETIAS_NOTE}` },
        AU: { tier: 'eta-required', program: 'ETA(subclass 601)', note: '무비자 대상이지만 전자여행허가(ETA) 신청이 필수예요.' },
        NZ: { tier: 'eta-required', program: 'NZeTA', note: '무비자 대상이지만 NZeTA 신청과 관광세(IVL) 납부가 필요해요.' },
        TH: { tier: 'visa-free', note: '무비자 체류 가능(협정 기준, 체류기간은 최신 공지 확인).' },
        VN: { tier: 'visa-required', note: `전자비자(e-Visa)로 온라인 사전 신청이 가능해요(오프라인 영사관 방문 불필요). ${ENTRY_REQUIREMENT_DISCLAIMER}` },
        SG: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        MY: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        ID: { tier: 'visa-required', note: VOA_NOTE, confidence: 'medium' },
        PH: { tier: 'visa-free', note: '무비자 30일 체류 가능.' },
    },

    // 중국(CN) 여권은 전반적으로 비자 요건 국가가 많다. 최근 상호 무비자 협정을 맺은
    // 일부 국가(태국·싱가포르 등)를 제외하면 대부분 보수적으로 '비자 필요'로 표기했다.
    CN: {
        JP: { tier: 'visa-required', note: `일본은 중국 국적 단체/개인 관광비자 발급이 일반적이며 무비자는 아니에요. ${ENTRY_REQUIREMENT_DISCLAIMER}` },
        TW: { tier: 'visa-required', note: '일반 비자가 아닌 대만 입경증(입도허가) 별도 신청이 필요해요. 양안 관계에 따라 절차가 달라질 수 있어요.', confidence: 'medium' },
        HK: { tier: 'visa-required', note: '일반 여권이 아닌 통행증(예: 왕래통행증) 및 별도 사증이 필요할 수 있어요. 거주 지역별 개인여행 허가 대상 여부를 확인하세요.', confidence: 'medium' },
        KR: { tier: 'visa-required', note: '한국은 중국 국적에 일반적으로 관광비자를 요구해요(제주 등 일부 지역 단체 무비자 프로그램은 예외).', confidence: 'medium' },
        US: { tier: 'visa-required', note: `미국 방문비자(B1/B2) 사전 발급 및 인터뷰가 필요해요. ${ENTRY_REQUIREMENT_DISCLAIMER}` },
        CA: { tier: 'visa-required', note: `캐나다 방문비자 사전 발급이 필요해요. ${ENTRY_REQUIREMENT_DISCLAIMER}` },
        GB: { tier: 'visa-required', note: `영국 방문비자 사전 발급이 필요해요. ${ENTRY_REQUIREMENT_DISCLAIMER}` },
        FR: { tier: 'visa-required', note: `솅겐 비자 사전 발급이 필요해요. ${ENTRY_REQUIREMENT_DISCLAIMER}` },
        DE: { tier: 'visa-required', note: `솅겐 비자 사전 발급이 필요해요. ${ENTRY_REQUIREMENT_DISCLAIMER}` },
        IT: { tier: 'visa-required', note: `솅겐 비자 사전 발급이 필요해요. ${ENTRY_REQUIREMENT_DISCLAIMER}` },
        ES: { tier: 'visa-required', note: `솅겐 비자 사전 발급이 필요해요. ${ENTRY_REQUIREMENT_DISCLAIMER}` },
        CH: { tier: 'visa-required', note: `솅겐 비자 사전 발급이 필요해요. ${ENTRY_REQUIREMENT_DISCLAIMER}` },
        AU: { tier: 'visa-required', note: `호주 방문비자(subclass 600) 사전 발급이 필요해요. ${ENTRY_REQUIREMENT_DISCLAIMER}` },
        NZ: { tier: 'visa-required', note: `뉴질랜드 방문비자 사전 발급이 필요해요. ${ENTRY_REQUIREMENT_DISCLAIMER}` },
        TH: { tier: 'visa-free', note: '중-태 상호 무비자 협정(2024년 시행) 대상이에요. 시행 지속 여부를 출발 전 확인하세요.', confidence: 'medium' },
        VN: { tier: 'visa-required', note: '전자비자(e-Visa) 온라인 사전 신청이 가능해요.', confidence: 'medium' },
        SG: { tier: 'visa-free', note: '중-싱가포르 상호 무비자 협정(2024년 시행) 대상이에요. 시행 지속 여부를 출발 전 확인하세요.', confidence: 'medium' },
        MY: { tier: 'visa-free', note: '말레이시아의 중국 국적 무비자 정책 대상이에요. 지속 여부를 출발 전 확인하세요.', confidence: 'medium' },
        ID: { tier: 'visa-required', note: VOA_NOTE, confidence: 'medium' },
        PH: { tier: 'visa-required', note: `필리핀 방문비자 사전 발급이 일반적으로 필요해요. ${ENTRY_REQUIREMENT_DISCLAIMER}`, confidence: 'medium' },
    },

    JP: {
        CN: { tier: 'visa-required', note: `중국의 일본 국적 대상 단기 무비자 시범정책은 시행/중단이 반복돼요. ${CHINA_VOLATILE_NOTE}`, confidence: 'medium' },
        TW: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        HK: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        KR: { tier: 'eta-required', program: 'K-ETA', note: '무비자 90일 체류 대상이지만 K-ETA 승인이 필요해요(국적별 한시 면제가 있을 수 있으니 최신 공지 확인).', confidence: 'medium' },
        US: { tier: 'eta-required', program: 'ESTA', note: '비자면제프로그램(VWP) 대상국이지만, 출발 최소 72시간 전 ESTA 승인이 필수예요.' },
        CA: { tier: 'eta-required', program: 'eTA', note: '항공편으로 입국 시 eTA 승인이 필수예요.' },
        GB: { tier: 'eta-required', program: 'UK ETA', note: '무비자 단기체류 대상이지만, 출발 전 UK ETA 신청이 필수예요.' },
        FR: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        DE: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        IT: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        ES: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        CH: { tier: 'eta-required', program: 'ETIAS', note: `솅겐 준회원국으로 동일하게 적용돼요. ${SCHENGEN_ETIAS_NOTE}` },
        AU: { tier: 'eta-required', program: 'ETA(subclass 601)', note: '무비자 대상이지만 전자여행허가(ETA) 신청이 필수예요.' },
        NZ: { tier: 'eta-required', program: 'NZeTA', note: '무비자 대상이지만 NZeTA 신청과 관광세(IVL) 납부가 필요해요.' },
        TH: { tier: 'visa-free', note: '무비자 30일 체류 가능(오랜 상호 협정 기준).' },
        VN: { tier: 'visa-free', note: '무비자 15일 체류 가능(오랜 상호 협정 기준, 연장 시 별도 절차).' },
        SG: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        MY: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        ID: { tier: 'visa-required', note: VOA_NOTE, confidence: 'medium' },
        PH: { tier: 'visa-free', note: '무비자 30일 체류 가능.' },
    },

    AU: {
        JP: { tier: 'eta-optional', program: 'Visit Japan Web', note: '무비자 90일 체류 가능. Visit Japan Web은 필수는 아니지만 등록하면 입국 수속이 빨라져요.' },
        CN: { tier: 'visa-required', note: `중국의 호주 국적 대상 단기 무비자 시범정책은 시행/중단이 반복돼요. ${CHINA_VOLATILE_NOTE}`, confidence: 'medium' },
        TW: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        HK: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        KR: { tier: 'eta-required', program: 'K-ETA', note: '무비자 90일 체류 대상이지만 K-ETA 승인이 필요해요(국적별 한시 면제가 있을 수 있으니 최신 공지 확인).', confidence: 'medium' },
        US: { tier: 'eta-required', program: 'ESTA', note: '비자면제프로그램(VWP) 대상국이지만, 출발 최소 72시간 전 ESTA 승인이 필수예요.' },
        CA: { tier: 'eta-required', program: 'eTA', note: '항공편으로 입국 시 eTA 승인이 필수예요.' },
        GB: { tier: 'eta-required', program: 'UK ETA', note: '무비자 단기체류 대상이지만, 출발 전 UK ETA 신청이 필수예요.' },
        FR: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        DE: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        IT: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        ES: { tier: 'eta-required', program: 'ETIAS', note: SCHENGEN_ETIAS_NOTE },
        CH: { tier: 'eta-required', program: 'ETIAS', note: `솅겐 준회원국으로 동일하게 적용돼요. ${SCHENGEN_ETIAS_NOTE}` },
        NZ: { tier: 'visa-free', note: '호주-뉴질랜드 특별협정(Trans-Tasman)으로 호주 시민은 입국 시 특례비자(SCV)가 자동 부여돼요. 일반 NZeTA 대상이 아니에요(영주권자 등은 별도 확인).', confidence: 'medium' },
        TH: { tier: 'visa-free', note: '무비자 체류 가능(협정 기준, 체류기간은 최신 공지 확인).' },
        VN: { tier: 'visa-required', note: `전자비자(e-Visa)로 온라인 사전 신청이 가능해요(오프라인 영사관 방문 불필요). ${ENTRY_REQUIREMENT_DISCLAIMER}` },
        SG: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        MY: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        ID: { tier: 'visa-required', note: VOA_NOTE, confidence: 'medium' },
        PH: { tier: 'visa-free', note: '무비자 30일 체류 가능.' },
    },
};

export function resolveEntryRequirement(homeKey: string, destKey: string): EntryRequirement | undefined {
    if (homeKey === destKey) return undefined;
    return ENTRY_REQUIREMENTS[homeKey]?.[destKey];
}
