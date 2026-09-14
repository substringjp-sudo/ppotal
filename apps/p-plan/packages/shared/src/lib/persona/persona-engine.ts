/**
 * 다차원 여행 페르소나 분석 & 지능형 시뮬레이션 엔진 (Persona Engine)
 * 
 * 임의의 무작위 여행 파라미터가 주어져도 다차원 매트릭스를 통해 페르소나를 합성하고,
 * 감동 만족 포인트(Delights)와 놓치기 쉬운 치명적 함정(Pain Points) 및 해결책을 산출합니다.
 */

import { differenceInDays, parseISO } from 'date-fns';
import { 
    AgeGroup, 
    CompanionGroup, 
    PartySizeTier, 
    DurationTier, 
    BudgetTier, 
    DestinationContextType, 
    TravelPersonaProfile, 
    PersonaInsightReport, 
    PersonaInputParams,
    PersonaDelight,
    PersonaPainPoint
} from './persona-types';
import { 
    COMPANION_MATRIX_RULES, 
    DURATION_MATRIX_RULES, 
    DESTINATION_CONTEXT_RULES 
} from './persona-matrix-db';
import { resolveTravelPurpose } from '../data/travel-purposes';

// ─── 1. 속성별 매핑 헬퍼 함수들 ─────────────────────────────────────

export function resolveCompanionGroup(
    participants?: { type: string; count: number }[],
    theme?: string | null
): CompanionGroup {
    if (!participants || participants.length === 0) {
        if (theme?.includes('신혼') || theme?.includes('커플')) return 'couple_romantic';
        if (theme?.includes('가족') || theme?.includes('효도')) return 'family_seniors';
        return 'solo_female';
    }

    const partnerCount = participants.find(p => p.type === '파트너')?.count || 0;
    const familyCount = participants.find(p => p.type === '가족')?.count || 0;
    const friendCount = participants.find(p => p.type === '친구')?.count || 0;
    const totalCount = participants.reduce((acc, p) => acc + p.count, 0);

    if (totalCount === 1) {
        return theme?.includes('쇼핑') || theme?.includes('카페') ? 'solo_female' : 'solo_male';
    }

    if (partnerCount > 0 && totalCount === 2) {
        return 'couple_romantic';
    }

    if (familyCount > 0) {
        if (theme?.includes('효도') || theme?.includes('온천')) return 'family_seniors';
        if (familyCount >= 4 && totalCount >= 6) return 'multi_gen_family';
        if (theme?.includes('휴양') || theme?.includes('호캉스')) return 'family_infant';
        return 'family_kids';
    }

    if (friendCount > 0) {
        if (theme?.includes('쇼핑') || theme?.includes('미식')) return 'friends_female';
        if (theme?.includes('액티비티') || theme?.includes('스포츠')) return 'friends_male';
        return 'friends_mixed';
    }

    return 'couple_romantic';
}

export function resolvePartySizeTier(totalCount: number): PartySizeTier {
    if (totalCount <= 1) return 'solo_1';
    if (totalCount === 2) return 'pair_2';
    if (totalCount <= 4) return 'small_3_4';
    if (totalCount <= 8) return 'medium_5_8';
    return 'large_9_plus';
}

export function resolveDurationTier(startDate?: string | null, endDate?: string | null): DurationTier {
    if (!startDate || !endDate) return 'short_vacation_3_5';
    try {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        const days = differenceInDays(end, start) + 1;

        if (days <= 3) return 'night_owl_1_2';
        if (days <= 5) return 'short_vacation_3_5';
        if (days <= 10) return 'medium_trip_6_10';
        if (days <= 20) return 'long_trip_11_20';
        return 'stay_month_21_plus';
    } catch {
        return 'short_vacation_3_5';
    }
}

export function resolveDestinationContext(countryKey?: string | null, countryName?: string | null): DestinationContextType {
    const key = (countryKey || countryName || '').toLowerCase();

    // 1. Tropical / Resort
    if (key.includes('vietnam') || key.includes('베트남') || key.includes('다낭') || key.includes('태국') || key.includes('방콕') || key.includes('발리') || key.includes('괌') || key.includes('푸켓') || key.includes('하와이') || key.includes('philippines') || key.includes('세부') || key.includes('오키나와')) {
        return 'tropical_island';
    }
    // 2. Historic / Cultural
    if (key.includes('france') || key.includes('프랑스') || key.includes('파리') || key.includes('italy') || key.includes('이탈리아') || key.includes('로마') || key.includes('spain') || key.includes('스페인') || key.includes('바르셀로나') || key.includes('영국') || key.includes('런던') || key.includes('교토')) {
        return 'historic_cultural';
    }
    // 3. Nature / Roadtrip
    if (key.includes('switzerland') || key.includes('스위스') || key.includes('iceland') || key.includes('아이슬란드') || key.includes('mongolia') || key.includes('몽골') || key.includes('new zealand') || key.includes('뉴질랜드') || key.includes('홋카이도') || key.includes('노르웨이')) {
        return 'nature_roadtrip';
    }
    // 4. Visa Strict / Entry Permission
    if (key === 'us' || key.includes('미국') || key.includes('usa') || key.includes('china') || key.includes('중국') || key.includes('상하이') || key.includes('인도') || key.includes('india')) {
        return 'visa_strict';
    }

    return 'developed_metro'; // Default (Tokyo, Seoul, Osaka, Singapore etc.)
}

export function resolveBudgetTier(theme?: string | null, companion?: CompanionGroup): BudgetTier {
    const clean = (theme || '').toLowerCase();
    if (clean.includes('쇼핑') || clean.includes('호캉스') || clean.includes('신혼') || clean.includes('럭셔리')) {
        return 'luxury_premium';
    }
    if (clean.includes('성지순례') || clean.includes('액티비티') || companion === 'solo_male') {
        return 'budget_backpacker';
    }
    return 'balanced_comfort';
}

export function resolveAgeGroup(companion: CompanionGroup, theme?: string | null): AgeGroup {
    if (companion === 'family_seniors') return 'senior_60s_plus';
    if (companion === 'family_kids' || companion === 'family_infant' || companion === 'multi_gen_family') return 'family_age_30s_40s';
    if (companion === 'solo_female' || companion === 'solo_male') {
        return theme?.includes('워케이션') ? 'young_adult_20s_late' : 'gen_z_20s_early';
    }
    if (companion === 'couple_romantic') return 'young_adult_20s_late';
    return 'gen_z_20s_early';
}

// ─── 2. 페르소나 프로필 및 종합 리포트 생성기 ────────────────────────

export function evaluateTravelPersona(params: PersonaInputParams): PersonaInsightReport {
    const totalParticipants = params.isParticipantsUndecided 
        ? 2 
        : (params.participants?.reduce((acc, p) => acc + p.count, 0) || 1);

    const companionGroup = resolveCompanionGroup(params.participants, params.theme);
    const partySizeTier = resolvePartySizeTier(totalParticipants);
    const durationTier = resolveDurationTier(params.startDate, params.endDate);
    const destinationContext = resolveDestinationContext(params.countryKey, params.countryName);
    const budgetTier = resolveBudgetTier(params.theme, companionGroup);
    const ageGroup = resolveAgeGroup(companionGroup, params.theme);
    const purpose = resolveTravelPurpose(params.theme);

    // 페르소나 명칭 합성
    const ageLabelMap: Record<AgeGroup, string> = {
        gen_z_20s_early: '20대 초반 청춘',
        young_adult_20s_late: '2030 직장인',
        family_age_30s_40s: '3040 패밀리',
        middle_age_50s: '50대 힐링',
        senior_60s_plus: '시니어 효도'
    };

    const companionLabelMap: Record<CompanionGroup, string> = {
        solo_female: '나홀로 감성',
        solo_male: '자유로운 1인',
        couple_romantic: '커플/신혼 2인',
        friends_female: '절친 우정',
        friends_male: '남성 크루',
        friends_mixed: '혼성 친구 모임',
        family_infant: '영유아 동반 부부',
        family_kids: '아이 동반 패밀리',
        family_seniors: '부모님 효도 여행단',
        multi_gen_family: '3대 대가족'
    };

    const durationLabelMap: Record<DurationTier, string> = {
        night_owl_1_2: '초단기 밤도깨비',
        short_vacation_3_5: '알찬 단기 휴가',
        medium_trip_6_10: '여유로운 중기',
        long_trip_11_20: '장기 대장정',
        stay_month_21_plus: '한달살기'
    };

    const personaName = `${ageLabelMap[ageGroup]} ${companionLabelMap[companionGroup]} ${purpose.label} 투어`;
    const headline = `[${durationLabelMap[durationTier]} ${totalParticipants}인] ${personaName}`;

    const profile: TravelPersonaProfile = {
        code: `${companionGroup}_${partySizeTier}_${durationTier}_${destinationContext}`,
        nameKo: personaName,
        headlineKo: headline,
        summaryKo: `${totalParticipants}명이 함께 떠나는 ${purpose.label} 컨셉의 ${durationLabelMap[durationTier]} 여행입니다. 동행 구성과 체류 기간에 맞춰 꼭 필요한 안심 체크포인트와 스마트 팁을 제안합니다.`,
        ageGroup,
        companionGroup,
        partySizeTier,
        durationTier,
        budgetTier,
        destinationContext,
        conceptTheme: purpose.label,
        badgeEmoji: purpose.emoji,
        badgeColor: purpose.color
    };

    // Delights 및 PainPoints 취합
    const delights: PersonaDelight[] = [];
    const painPoints: PersonaPainPoint[] = [];

    // 1) Companion Rules
    const compRule = COMPANION_MATRIX_RULES[companionGroup];
    if (compRule) {
        delights.push(...compRule.delights);
        painPoints.push(...compRule.painPoints);
    }

    // 2) Duration Rules
    const durRule = DURATION_MATRIX_RULES[durationTier];
    if (durRule) {
        delights.push(...durRule.delights);
        painPoints.push(...durRule.painPoints);
    }

    // 3) Destination Context Rules
    const destRule = DESTINATION_CONTEXT_RULES[destinationContext];
    if (destRule) {
        delights.push(...destRule.delights);
        painPoints.push(...destRule.painPoints);
    }

    // Actionable Checkpoints 추출
    const essentialActionables = painPoints
        .filter(p => p.suggestedCheckItem)
        .map(p => {
            const item = p.suggestedCheckItem!;
            return {
                id: `actionable-${p.id}`,
                title: item.title,
                description: `${p.solutionTitleKo} - ${p.solutionActionKo}`,
                sectionId: item.sectionId,
                cardId: item.cardId,
                priority: (p.severity === 'critical' ? 'essential' : 'recommended') as 'essential' | 'recommended',
                tag: item.tagKo
            };
        });

    const customTip = `${headline}: ${painPoints[0]?.riskTitleKo || '즐거운 여행 되세요!'}에 대비해 [${painPoints[0]?.solutionTitleKo || '체크포인트'}]를 미리 확인하세요.`;

    return {
        persona: profile,
        delights,
        painPoints,
        essentialActionables,
        customTipKo: customTip
    };
}

// ─── 3. 무작위 여행 시뮬레이터 (Random Simulation Test Engine) ────────

export function simulateRandomTripPersona(): PersonaInsightReport {
    const sampleCountries = [
        { key: 'jp', name: '일본' },
        { key: 'vn', name: '베트남' },
        { key: 'fr', name: '프랑스' },
        { key: 'ch', name: '스위스' },
        { key: 'us', name: '미국' },
        { key: 'th', name: '태국' }
    ];
    const sampleThemes = ['쇼핑', '콘서트', '성지순례', '액티비티', '호캉스', '신혼여행', '답사', '미식', '가족', '워케이션'];
    const sampleCompanions = [
        [{ type: '나', count: 1 }],
        [{ type: '나', count: 1 }, { type: '파트너', count: 1 }],
        [{ type: '나', count: 1 }, { type: '친구', count: 3 }],
        [{ type: '나', count: 1 }, { type: '가족', count: 3 }],
        [{ type: '나', count: 1 }, { type: '가족', count: 6 }]
    ];
    const sampleDurations = [
        { start: '2026-10-01', end: '2026-10-03' }, // 2박 3일
        { start: '2026-10-01', end: '2026-10-05' }, // 4박 5일
        { start: '2026-10-01', end: '2026-10-09' }, // 8박 9일
        { start: '2026-10-01', end: '2026-10-25' }  // 24박 25일
    ];

    const randomCountry = sampleCountries[Math.floor(Math.random() * sampleCountries.length)];
    const randomTheme = sampleThemes[Math.floor(Math.random() * sampleThemes.length)];
    const randomCompanion = sampleCompanions[Math.floor(Math.random() * sampleCompanions.length)];
    const randomDuration = sampleDurations[Math.floor(Math.random() * sampleDurations.length)];

    return evaluateTravelPersona({
        countryKey: randomCountry.key,
        countryName: randomCountry.name,
        startDate: randomDuration.start,
        endDate: randomDuration.end,
        participants: randomCompanion,
        theme: randomTheme
    });
}
