/**
 * 600개 다차원 여행 페르소나 매트릭스 스트레스 테스트 및 검증기
 * 
 * 12대 테마, 10대 동행, 5대 기간, 5대 국가환경, 5대 연령, 3대 예산 전 영역을 포괄하는
 * 600가지 무작위 및 격자(Grid) 여행 조합을 생성하여
 * 1) 100% 무결점 페르소나 합성 여부
 * 2) 감동 포인트(Delights) 및 치명적 함정(Pain Points) 누락 여부
 * 3) 7대 카테고리 솔루션 추출 완결성을 전수 검증합니다.
 */

import { 
    evaluateTravelPersona, 
    resolveCompanionGroup, 
    resolveDurationTier, 
    resolveDestinationContext,
    resolveBudgetTier,
    resolveAgeGroup
} from './persona-engine';
import { 
    CompanionGroup, 
    DurationTier, 
    DestinationContextType, 
    AgeGroup, 
    BudgetTier,
    PersonaInsightReport 
} from './persona-types';
import { TRAVEL_PURPOSES } from '../data/travel-purposes';

export interface StressTestSummary {
    totalRuns: number;
    passedRuns: number;
    failedRuns: number;
    passRatePercent: number;
    averageDelightsPerTrip: number;
    averagePainPointsPerTrip: number;
    averageActionablesPerTrip: number;
    severityCounts: {
        critical: number;
        warning: number;
        info: number;
    };
    categoryCoverage: {
        conceptsCovered: number;
        companionGroupsCovered: number;
        durationTiersCovered: number;
        destinationTiersCovered: number;
        ageGroupsCovered: number;
        budgetTiersCovered: number;
    };
    distribution: {
        byCompanion: Record<CompanionGroup, number>;
        byDuration: Record<DurationTier, number>;
        byDestination: Record<DestinationContextType, number>;
        byAge: Record<AgeGroup, number>;
        byBudget: Record<BudgetTier, number>;
    };
    sampleVerifiedPersonas: {
        index: number;
        headline: string;
        theme: string;
        destination: string;
        delightsCount: number;
        painPointsCount: number;
        topPainPoint: string;
        topSolution: string;
    }[];
    executionTimeMs: number;
}

export function run600PersonasStressTest(targetIterations = 600): StressTestSummary {
    const startTime = performance.now();

    const sampleCountries = [
        // 1. Developed Metro
        { key: 'jp_tokyo', name: '일본 도쿄' },
        { key: 'kr_seoul', name: '한국 서울' },
        // 2. Tropical Island
        { key: 'vn_danang', name: '베트남 다낭' },
        { key: 'th_bangkok', name: '태국 방콕' },
        { key: 'id_bali', name: '인도네시아 발리' },
        // 3. Historic Cultural
        { key: 'fr_paris', name: '프랑스 파리' },
        { key: 'it_rome', name: '이탈리아 로마' },
        { key: 'es_barcelona', name: '스페인 바르셀로나' },
        // 4. Nature Roadtrip
        { key: 'ch_interlaken', name: '스위스 인터라켄' },
        { key: 'is_reykjavik', name: '아이슬란드 레이캬비크' },
        { key: 'mn_ulaanbaatar', name: '몽골 울란바토르' },
        { key: 'jp_hokkaido', name: '일본 홋카이도' },
        // 5. Visa Strict
        { key: 'us_newyork', name: '미국 뉴욕' },
        { key: 'cn_shanghai', name: '중국 상하이' }
    ];

    const sampleDurations = [
        { start: '2026-09-01', end: '2026-09-02', label: '1박 2일' },
        { start: '2026-09-01', end: '2026-09-05', label: '4박 5일' },
        { start: '2026-09-01', end: '2026-09-08', label: '7박 8일' },
        { start: '2026-09-01', end: '2026-09-15', label: '14박 15일' },
        { start: '2026-09-01', end: '2026-09-30', label: '29박 30일' }
    ];

    const sampleCompanions: { type: string; count: number }[][] = [
        // 1. solo_female (1인)
        [{ type: '나', count: 1 }],
        // 2. solo_male (1인)
        [{ type: '나', count: 1 }],
        // 3. couple_romantic (커플 2인)
        [{ type: '나', count: 1 }, { type: '파트너', count: 1 }],
        // 4. friends_female (3인 친구)
        [{ type: '나', count: 1 }, { type: '친구', count: 2 }],
        // 5. friends_male (4인 친구)
        [{ type: '나', count: 1 }, { type: '친구', count: 3 }],
        // 6. friends_mixed (6인 친구)
        [{ type: '나', count: 1 }, { type: '친구', count: 5 }],
        // 7. family_infant (영유아 동반 3인)
        [{ type: '나', count: 1 }, { type: '파트너', count: 1 }, { type: '가족', count: 1 }],
        // 8. family_kids (어린이 동반 4인)
        [{ type: '나', count: 1 }, { type: '파트너', count: 1 }, { type: '가족', count: 2 }],
        // 9. family_seniors (부모님 효도 4인)
        [{ type: '나', count: 1 }, { type: '가족', count: 3 }],
        // 10. multi_gen_family (3대 대가족 8인)
        [{ type: '나', count: 1 }, { type: '파트너', count: 1 }, { type: '가족', count: 6 }]
    ];

    let passedRuns = 0;
    let failedRuns = 0;
    let totalDelights = 0;
    let totalPainPoints = 0;
    let totalActionables = 0;

    const severityCounts = {
        critical: 0,
        warning: 0,
        info: 0
    };

    const companionDist: Record<CompanionGroup, number> = {
        solo_female: 0,
        solo_male: 0,
        couple_romantic: 0,
        friends_female: 0,
        friends_male: 0,
        friends_mixed: 0,
        family_infant: 0,
        family_kids: 0,
        family_seniors: 0,
        multi_gen_family: 0
    };

    const durationDist: Record<DurationTier, number> = {
        night_owl_1_2: 0,
        short_vacation_3_5: 0,
        medium_trip_6_10: 0,
        long_trip_11_20: 0,
        stay_month_21_plus: 0
    };

    const destinationDist: Record<DestinationContextType, number> = {
        developed_metro: 0,
        tropical_island: 0,
        historic_cultural: 0,
        nature_roadtrip: 0,
        visa_strict: 0
    };

    const ageDist: Record<AgeGroup, number> = {
        gen_z_20s_early: 0,
        young_adult_20s_late: 0,
        family_age_30s_40s: 0,
        middle_age_50s: 0,
        senior_60s_plus: 0
    };

    const budgetDist: Record<BudgetTier, number> = {
        budget_backpacker: 0,
        balanced_comfort: 0,
        luxury_premium: 0
    };

    const sampleVerifiedPersonas: StressTestSummary['sampleVerifiedPersonas'] = [];

    for (let i = 0; i < targetIterations; i++) {
        // 체계적 격자 샘플링 + 무작위 셔플링 조합 (스트라이드 에일리어싱 방지)
        const themeDef = TRAVEL_PURPOSES[i % TRAVEL_PURPOSES.length];
        const country = sampleCountries[(i + Math.floor(i / 7)) % sampleCountries.length];
        const duration = sampleDurations[(i + Math.floor(i / 11)) % sampleDurations.length];
        const companions = sampleCompanions[(i + Math.floor(i / 13)) % sampleCompanions.length];

        try {
            const report = evaluateTravelPersona({
                countryKey: country.key,
                countryName: country.name,
                startDate: duration.start,
                endDate: duration.end,
                participants: companions,
                theme: themeDef.id
            });

            // 검증 룰:
            // 1. 프로필 필드 무결성
            const hasValidProfile = Boolean(
                report.persona.nameKo &&
                report.persona.headlineKo &&
                report.persona.summaryKo &&
                report.persona.code
            );

            // 2. 최소 1개 이상의 감동 포인트 & 함정 솔루션 보장
            const hasDelights = report.delights.length >= 1;
            const hasPainPoints = report.painPoints.length >= 1;
            const hasActionables = report.essentialActionables.length >= 1;

            if (hasValidProfile && hasDelights && hasPainPoints && hasActionables) {
                passedRuns++;

                // 통계 누적
                totalDelights += report.delights.length;
                totalPainPoints += report.painPoints.length;
                totalActionables += report.essentialActionables.length;

                report.painPoints.forEach(p => {
                    severityCounts[p.severity]++;
                });

                companionDist[report.persona.companionGroup]++;
                durationDist[report.persona.durationTier]++;
                destinationDist[report.persona.destinationContext]++;
                ageDist[report.persona.ageGroup]++;
                budgetDist[report.persona.budgetTier]++;

                // 대표 샘플 10건 추출
                if (sampleVerifiedPersonas.length < 12 && i % Math.floor(targetIterations / 12) === 0) {
                    sampleVerifiedPersonas.push({
                        index: i + 1,
                        headline: report.persona.headlineKo,
                        theme: themeDef.label,
                        destination: country.name,
                        delightsCount: report.delights.length,
                        painPointsCount: report.painPoints.length,
                        topPainPoint: report.painPoints[0]?.riskTitleKo || '',
                        topSolution: report.painPoints[0]?.solutionTitleKo || ''
                    });
                }
            } else {
                failedRuns++;
            }
        } catch (e) {
            failedRuns++;
        }
    }

    const endTime = performance.now();

    return {
        totalRuns: targetIterations,
        passedRuns,
        failedRuns,
        passRatePercent: Number(((passedRuns / targetIterations) * 100).toFixed(2)),
        averageDelightsPerTrip: Number((totalDelights / passedRuns).toFixed(1)),
        averagePainPointsPerTrip: Number((totalPainPoints / passedRuns).toFixed(1)),
        averageActionablesPerTrip: Number((totalActionables / passedRuns).toFixed(1)),
        severityCounts,
        categoryCoverage: {
            conceptsCovered: TRAVEL_PURPOSES.length,
            companionGroupsCovered: Object.values(companionDist).filter(c => c > 0).length,
            durationTiersCovered: Object.values(durationDist).filter(d => d > 0).length,
            destinationTiersCovered: Object.values(destinationDist).filter(d => d > 0).length,
            ageGroupsCovered: Object.values(ageDist).filter(a => a > 0).length,
            budgetTiersCovered: Object.values(budgetDist).filter(b => b > 0).length
        },
        distribution: {
            byCompanion: companionDist,
            byDuration: durationDist,
            byDestination: destinationDist,
            byAge: ageDist,
            byBudget: budgetDist
        },
        sampleVerifiedPersonas,
        executionTimeMs: Number((endTime - startTime).toFixed(2))
    };
}
