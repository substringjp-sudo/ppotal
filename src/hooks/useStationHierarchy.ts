import { useState, useEffect } from 'react';

// 카테고리 정의 (신칸센은 별도 카테고리 '0'으로 관리)
export const CATEGORY_MAP: Record<number, { name: string; name_en: string }> = {
    0: { name: '신칸센', name_en: 'Shinkansen' },
    1: { name: 'JR', name_en: 'JR' },
    2: { name: '대형사철', name_en: 'Major Private' },
    3: { name: '일반사철', name_en: 'Local Private' },
    4: { name: '3섹터', name_en: 'Third-Sector' },
    5: { name: '공영교통', name_en: 'Public/Municipal' },
    6: { name: '기타철도', name_en: 'Specialized/Other' },
};

// 카테고리 ID를 키로 사용하는 동적 계층 구조 타입
export type GroupedHierarchy = Record<string, Record<string, Record<string, any>>>;

export const useStationHierarchy = (railData: any | null) => {
    const [hierarchy, setHierarchy] = useState<Record<string, Record<string, any>> | null>(null);
    const [groupedHierarchy, setGroupedHierarchy] = useState<GroupedHierarchy | null>(null);
    const [companyNames, setCompanyNames] = useState<Record<string, any>>({});
    const [lineNames, setLineNames] = useState<Record<string, any>>({});
    const [lineLengths, setLineLengths] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!railData || !railData.hierarchy || !railData.companies) return;

        const data = railData.hierarchy;
        setHierarchy(data);
        setCompanyNames(railData.companies || {});
        setLineNames(railData.lines || {});

        // 노선 길이 미리 계산
        const lengths: Record<string, number> = {};
        if (railData.lines) {
            Object.values(railData.lines).forEach((line: any) => {
                lengths[`${line.corp_id}::${line.id}`] = line.total_length || 0;
            });
        }
        setLineLengths(lengths);

        const groups: GroupedHierarchy = {};

        const hierarchyData = data.companies || data;

        Object.entries(hierarchyData).forEach(([companyId, companyObj]: [string, any]) => {
            const companyInfo = railData.companies?.[companyId];
            const companyCategoryId = companyInfo?.category_id ?? 3;

            // Handle nested 'lines' if it exists, otherwise use companyObj directly
            const lines = companyObj.lines || companyObj;

            Object.entries(lines).forEach(([lineId, stations]) => {
                const lineInfo = railData.lines?.[lineId];
                const lineName = lineInfo?.name || "";
                const lineNameEn = lineInfo?.name_en || "";

                // 신칸센 노선 판별 (이름에 '新幹線' 포함 여부)
                const isShinkansen = lineName.includes('新幹線');
                const targetCategoryId = isShinkansen ? '0' : String(companyCategoryId);

                if (!groups[targetCategoryId]) {
                    groups[targetCategoryId] = {};
                }
                if (!groups[targetCategoryId][companyId]) {
                    groups[targetCategoryId][companyId] = {};
                }

                // 번역을 위해 단순 배열이 아닌 객체로 저장
                groups[targetCategoryId][companyId][lineId] = {
                    stations,
                    name: lineName,
                    name_en: lineNameEn
                };
            });
        });

        setGroupedHierarchy(groups);
    }, [railData]);

    return { hierarchy, groupedHierarchy, companyNames, lineNames, lineLengths, CATEGORY_MAP };
};
