import { NextResponse } from 'next/server';
import { 
    evaluateTravelPersona, 
    TRAVEL_PURPOSES 
} from '@pplaner/shared';

export const dynamic = 'force-static';

const sampleDestinations = [
    { key: 'jp_tokyo', name: '일본 도쿄', context: 'developed_metro' },
    { key: 'kr_seoul', name: '한국 서울', context: 'developed_metro' },
    { key: 'us_newyork', name: '미국 뉴욕', context: 'visa_strict' },
    { key: 'vn_danang', name: '베트남 다낭', context: 'tropical_island' },
    { key: 'th_bangkok', name: '태국 방콕', context: 'tropical_island' },
    { key: 'id_bali', name: '인도네시아 발리', context: 'tropical_island' },
    { key: 'fr_paris', name: '프랑스 파리', context: 'historic_cultural' },
    { key: 'it_rome', name: '이탈리아 로마', context: 'historic_cultural' },
    { key: 'es_barcelona', name: '스페인 바르셀로나', context: 'historic_cultural' },
    { key: 'ch_interlaken', name: '스위스 인터라켄', context: 'nature_roadtrip' },
    { key: 'is_reykjavik', name: '아이슬란드 레이캬비크', context: 'nature_roadtrip' },
    { key: 'mn_ulaanbaatar', name: '몽골 울란바토르', context: 'nature_roadtrip' },
    { key: 'cn_shanghai', name: '중국 상하이', context: 'visa_strict' }
];

const sampleDurations = [
    { start: '2026-09-01', end: '2026-09-02', label: '1박 2일', tier: 'night_owl_1_2' },
    { start: '2026-09-01', end: '2026-09-05', label: '4박 5일', tier: 'short_vacation_3_5' },
    { start: '2026-09-01', end: '2026-09-08', label: '7박 8일', tier: 'medium_trip_6_10' },
    { start: '2026-09-01', end: '2026-09-15', label: '14박 15일', tier: 'long_trip_11_20' },
    { start: '2026-09-01', end: '2026-09-30', label: '29박 30일', tier: 'stay_month_21_plus' }
];

const sampleCompanions = [
    { group: 'solo_female', label: '1인 여성', participants: [{ type: '나', count: 1 }] },
    { group: 'solo_male', label: '1인 남성', participants: [{ type: '나', count: 1 }] },
    { group: 'couple_romantic', label: '커플/부부 2인', participants: [{ type: '나', count: 1 }, { type: '파트너', count: 1 }] },
    { group: 'friends_female', label: '친구(여성) 3인', participants: [{ type: '나', count: 1 }, { type: '친구', count: 2 }] },
    { group: 'friends_male', label: '친구(남성) 4인', participants: [{ type: '나', count: 1 }, { type: '친구', count: 3 }] },
    { group: 'friends_mixed', label: '친구(혼성) 6인', participants: [{ type: '나', count: 1 }, { type: '친구', count: 5 }] },
    { group: 'family_infant', label: '영유아 동반 가족 3인', participants: [{ type: '나', count: 1 }, { type: '파트너', count: 1 }, { type: '가족', count: 1 }] },
    { group: 'family_kids', label: '어린이 동반 가족 4인', participants: [{ type: '나', count: 1 }, { type: '파트너', count: 1 }, { type: '가족', count: 2 }] },
    { group: 'family_seniors', label: '부모님 효도 여행 4인', participants: [{ type: '나', count: 1 }, { type: '가족', count: 3 }] },
    { group: 'multi_gen_family', label: '3세대 대가족 8인', participants: [{ type: '나', count: 1 }, { type: '파트너', count: 1 }, { type: '가족', count: 6 }] }
];

export async function GET() {
    const startTime = performance.now();
    let totalCombinations = 0;
    let successfulRuns = 0;
    let failedRuns = 0;

    const severityCounts = { critical: 0, warning: 0, info: 0 };
    const personaMap = new Map<string, {
        code: string;
        name: string;
        headline: string;
        theme: string;
        destination: string;
        duration: string;
        companion: string;
        delights: number;
        painPoints: number;
        topRisk: string;
        topSolution: string;
    }>();

    // 7,800 전수 시뮬레이션
    for (const theme of TRAVEL_PURPOSES) {
        for (const companion of sampleCompanions) {
            for (const duration of sampleDurations) {
                for (const destination of sampleDestinations) {
                    totalCombinations++;

                    try {
                        const report = evaluateTravelPersona({
                            countryKey: destination.key,
                            countryName: destination.name,
                            startDate: duration.start,
                            endDate: duration.end,
                            participants: companion.participants,
                            theme: theme.id
                        });

                        if (report && report.persona && report.delights.length > 0 && report.painPoints.length > 0) {
                            successfulRuns++;

                            report.painPoints.forEach(p => {
                                severityCounts[p.severity]++;
                            });

                            if (!personaMap.has(report.persona.code)) {
                                personaMap.set(report.persona.code, {
                                    code: report.persona.code,
                                    name: report.persona.nameKo,
                                    headline: report.persona.headlineKo,
                                    theme: theme.label,
                                    destination: destination.name,
                                    duration: duration.label,
                                    companion: companion.label,
                                    delights: report.delights.length,
                                    painPoints: report.painPoints.length,
                                    topRisk: report.painPoints[0]?.riskTitleKo || '',
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
            }
        }
    }

    const durationMs = performance.now() - startTime;
    const allSynthesized = Array.from(personaMap.values());

    return NextResponse.json({
        totalCombinations,
        successfulRuns,
        failedRuns,
        passRate: ((successfulRuns / totalCombinations) * 100).toFixed(2) + '%',
        distinctArchetypes: allSynthesized.length,
        durationMs: Number(durationMs.toFixed(2)),
        severityDistribution: severityCounts,
        sampleArchetypes: allSynthesized.slice(0, 10),
        extremeArchetypes: [
            allSynthesized.find(p => p.companion.includes('3세대 대가족') && p.duration.includes('1박 2일')),
            allSynthesized.find(p => p.companion.includes('1인') && p.duration.includes('30일')),
            allSynthesized.find(p => p.companion.includes('영유아') && p.destination.includes('미국')),
            allSynthesized.find(p => p.companion.includes('효도') && p.destination.includes('로마')),
            allSynthesized.find(p => p.companion.includes('친구(남성)') && p.theme.includes('휴양'))
        ].filter(Boolean)
    });
}
