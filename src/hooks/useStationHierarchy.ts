import { useState, useEffect } from 'react';

// 카테고리 정의 (신칸센은 별도 카테고리 '0'으로 관리)
export const CATEGORY_MAP: Record<number, { name: string; name_en: string }> = {
    0: { name: '新幹線', name_en: 'Shinkansen' },
    1: { name: 'JR 그룹', name_en: 'JR Group' },
    2: { name: '주요 사철', name_en: 'Major Private Railways' },
    3: { name: '지방/중소 사철', name_en: 'Local/Minor Private Railways' },
    4: { name: '제3섹터 철도', name_en: 'Third-Sector Railways' },
    5: { name: '공영/시영 교통', name_en: 'Public/Municipal Transport' },
    6: { name: '특수/기타 운송', name_en: 'Specialized/Other Transport' },
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
                const company = railData.companies[line.corp_id];
                const companyName = company ? company.name : line.corp_id;
                const lineName = line.name;
                if (companyName && lineName) {
                    const normalizedLineName = lineName.replace(/(線| Line| 선)$/, "").trim();
                    lengths[`${companyName}::${normalizedLineName}`] = line.total_length || 0;
                }
            });
        }
        setLineLengths(lengths);

        const groups: GroupedHierarchy = {};

        Object.entries(data).forEach(([companyId, lines]: [string, any]) => {
            const companyInfo = railData.companies?.[companyId];
            
            // 회사 정보가 없는 경우 '지방/중소 사철' (3)을 기본값으로 사용
            const companyCategoryId = companyInfo?.category_id ?? 3;

            Object.entries(lines).forEach(([lineId, stations]) => {
                const lineInfo = railData.lines?.[lineId];
                const lineName = lineInfo?.name || "";

                // 신칸센 노선은 별도 최상위 그룹으로 분류
                const isShinkansen = lineName.includes('新幹線');
                const targetCategoryId = isShinkansen ? '0' : String(companyCategoryId);

                if (!groups[targetCategoryId]) {
                    groups[targetCategoryId] = {};
                }
                if (!groups[targetCategoryId][companyId]) {
                    groups[targetCategoryId][companyId] = {};
                }
                groups[targetCategoryId][companyId][lineId] = stations;
            });
        });

        setGroupedHierarchy(groups);
    }, [railData]);

    return { hierarchy, groupedHierarchy, companyNames, lineNames, lineLengths, CATEGORY_MAP };
};
