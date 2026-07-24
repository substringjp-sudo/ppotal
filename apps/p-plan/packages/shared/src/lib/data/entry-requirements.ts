/**
 * 거주국(여권) ↔ 목적지국 양자 입국 요건 데이터셋.
 *
 * ⚠️ 매우 중요: 비자·입국 정책은 국가 간 협정과 정세에 따라 수시로 바뀐다.
 * 이 데이터는 "일반적인 단기 관광 목적" 기준의 참고 안내이며, 법적 효력이 없다.
 * 실제 요건은 반드시 출발 전 여행 목적지의 대사관·공식 이민국 사이트에서 재확인해야 한다.
 * 정책 변동이 잦은 조합(예: 중국)은 의도적으로 보수적으로(비자 필요) 표기했다 —
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
    | 'visa-required'; // 비자 사전 발급 필요

export interface EntryRequirement {
    tier: EntryRequirementTier;
    program?: string; // ESTA / UK ETA / ETIAS / Visit Japan Web 등
    note: string;      // 체류기간 등 요약 + 확인 필요 문구 포함
}

/** 모든 항목에 공통으로 덧붙이는 안전 문구 */
export const ENTRY_REQUIREMENT_DISCLAIMER =
    '입국 정책은 자주 바뀔 수 있어요. 출발 전 목적지 대사관·공식 이민국 사이트에서 반드시 최신 요건을 재확인하세요.';

/**
 * 거주국 key -> 목적지국 key -> 요건.
 * 우선 가장 이용이 많은 한국(KR) 거주자 기준부터 정교하게 채웠다.
 * 다른 거주국은 아직 데이터가 없으므로, 사용하는 쪽(preparation-service)에서
 * country-profiles의 목적지 단독 entryAuth 정보로 폴백해야 한다.
 */
export const ENTRY_REQUIREMENTS: Record<string, Record<string, EntryRequirement>> = {
    KR: {
        JP: { tier: 'eta-optional', program: 'Visit Japan Web', note: '무비자 90일 체류 가능. Visit Japan Web은 필수는 아니지만 등록하면 입국 수속이 빨라져요.' },
        CN: { tier: 'visa-required', note: '한중 간 단기 무비자 시범정책이 시행/중단을 반복해온 구간이에요. 출발 전 반드시 최신 정책을 확인하세요(시범정책 미적용 시 비자 필요).' },
        TW: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        HK: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        US: { tier: 'eta-required', program: 'ESTA', note: '비자면제프로그램(VWP) 대상국이지만, 출발 최소 72시간 전 ESTA 승인이 필수예요.' },
        CA: { tier: 'eta-required', program: 'eTA', note: '항공편으로 입국 시 eTA 승인이 필수예요.' },
        GB: { tier: 'eta-required', program: 'UK ETA', note: '무비자 단기체류 대상이지만, 출발 전 UK ETA 신청이 필수예요.' },
        FR: { tier: 'eta-required', program: 'ETIAS', note: '솅겐 지역 무비자 90일(180일 중). ETIAS 시행 이후엔 사전 신청이 필요해요.' },
        DE: { tier: 'eta-required', program: 'ETIAS', note: '솅겐 지역 무비자 90일(180일 중). ETIAS 시행 이후엔 사전 신청이 필요해요.' },
        IT: { tier: 'eta-required', program: 'ETIAS', note: '솅겐 지역 무비자 90일(180일 중). ETIAS 시행 이후엔 사전 신청이 필요해요.' },
        ES: { tier: 'eta-required', program: 'ETIAS', note: '솅겐 지역 무비자 90일(180일 중). ETIAS 시행 이후엔 사전 신청이 필요해요.' },
        CH: { tier: 'eta-required', program: 'ETIAS', note: '솅겐 준회원국으로 동일하게 적용돼요. ETIAS 시행 이후엔 사전 신청이 필요해요.' },
        AU: { tier: 'eta-required', program: 'ETA(subclass 601)', note: '무비자 대상이지만 전자여행허가(ETA) 신청이 필수예요.' },
        NZ: { tier: 'eta-required', program: 'NZeTA', note: '무비자 대상이지만 NZeTA 신청과 관광세(IVL) 납부가 필요해요.' },
        TH: { tier: 'visa-free', note: '무비자 체류 가능(협정 기준, 체류기간은 최신 공지 확인).' },
        VN: { tier: 'visa-free', note: '무비자 체류 가능(협정 기준, 체류기간은 최신 공지 확인).' },
        SG: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        MY: { tier: 'visa-free', note: '무비자 90일 체류 가능.' },
        ID: { tier: 'visa-free', note: '단기 관광 목적 무비자 체류 가능(공항 입국세/조건 변동 가능).' },
        PH: { tier: 'visa-free', note: '무비자 30일 체류 가능.' },
    },
};

export function resolveEntryRequirement(homeKey: string, destKey: string): EntryRequirement | undefined {
    if (homeKey === destKey) return undefined;
    return ENTRY_REQUIREMENTS[homeKey]?.[destKey];
}
