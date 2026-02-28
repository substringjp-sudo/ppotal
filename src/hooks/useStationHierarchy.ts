import { useMemo } from 'react';
import { RailData, HierarchyCompany } from '../types/railData';

// 카테고리 정의 (신칸센은 별도 카테고리 '0'으로 관리)
export const CATEGORY_MAP: Record<number, { name: string; name_en: string }> = {
    0: { name: 'Shinkansen', name_en: 'Shinkansen' },
    1: { name: 'JR', name_en: 'JR' },
    2: { name: 'Major Private', name_en: 'Major Private' },
    3: { name: 'Local Private', name_en: 'Local Private' },
    4: { name: 'Third-Sector', name_en: 'Third-Sector' },
    5: { name: 'Public/Municipal', name_en: 'Public/Municipal' },
    6: { name: 'Specialized/Other', name_en: 'Specialized/Other' },
};

// 카테고리 ID를 키로 사용하는 동적 계층 구조 타입
export type GroupedHierarchy = Record<string, Record<string, Record<string, { stations: string[]; name: string; name_en: string }>>>;

export const useStationHierarchy = (railData: RailData | null) => {
    const memoizedData = useMemo(() => {
        if (!railData || !railData.hierarchy || !railData.companies) {
            return {
                hierarchy: null,
                groupedHierarchy: null,
                companyNames: {},
                lineNames: {},
                lineLengths: {},
            };
        }

        const hierarchy = railData.hierarchy;
        const companyNames = railData.companies || {};
        const lineNames = railData.lines || {};

        // 노선 길이 미리 계산
        const lineLengths: Record<string, number> = {};
        if (railData.lines) {
            Object.values(railData.lines).forEach((line) => {
                lineLengths[`${line.corp_id}::${line.id}`] = line.total_length || 0;
            });
        }

        const groupedHierarchy: GroupedHierarchy = {};

        const hierarchyData = (hierarchy as { companies: Record<string, HierarchyCompany> }).companies || hierarchy;

        Object.entries(hierarchyData).forEach(([companyId, companyObj]) => {
            const companyInfo = railData.companies?.[companyId];
            const companyCategoryId = companyInfo?.category_id ?? 3;

            // Handle nested 'lines' if it exists, otherwise use companyObj directly
            const lines = (companyObj as HierarchyCompany).lines || companyObj;

            Object.entries(lines as Record<string, string[]>).forEach(([lineId, stations]) => {
                const lineInfo = railData.lines?.[lineId];
                const lineName = lineInfo?.name || "";
                const lineNameEn = lineInfo?.name_en || "";

                // 신칸센 노선 판별 (이름에 '新幹線' 포함 여부)
                const isShinkansen = lineName.includes('新幹線');
                const targetCategoryId = isShinkansen ? '0' : String(companyCategoryId);

                if (!groupedHierarchy[targetCategoryId]) {
                    groupedHierarchy[targetCategoryId] = {};
                }
                if (!groupedHierarchy[targetCategoryId][companyId]) {
                    groupedHierarchy[targetCategoryId][companyId] = {};
                }

                // 번역을 위해 단순 배열이 아닌 객체로 저장
                groupedHierarchy[targetCategoryId][companyId][lineId] = {
                    stations,
                    name: lineName,
                    name_en: lineNameEn
                };
            });
        });

        return {
            hierarchy,
            groupedHierarchy,
            companyNames,
            lineNames,
            lineLengths,
        };
    }, [railData]);

    return { ...memoizedData, CATEGORY_MAP };
};
