import { useMemo } from 'react';
import { RailData, HierarchyCompany, HierarchyLine } from '../types/railData';

// 카테고리 정의 (신칸센은 별도 카테고리 '0'으로 관리)
export const CATEGORY_MAP: Record<number, { name: string; name_en: string; name_kr: string }> = {
    0: { name: 'SHINKANSEN', name_en: 'Shinkansen', name_kr: '신칸센' },
    1: { name: 'JR', name_en: 'JR', name_kr: 'JR' },
    2: { name: 'Major Private', name_en: 'Major Railways', name_kr: '주요 사철' },
    3: { name: 'Local Private', name_en: 'Local Railways', name_kr: '로컬 사철' },
    4: { name: 'Third-Sector', name_en: 'Third-Sector', name_kr: '제3섹터' },
    5: { name: 'Public/Municipal', name_en: 'Public/Municipal', name_kr: '공영/시영' },
    6: { name: 'Specialized/Other', name_en: 'Others', name_kr: '기타' },
};

// 카테고리 ID를 키로 사용하는 동적 계층 구조 타입
export type GroupedHierarchy = Record<string, Record<string, Record<string, { stations: string[]; name: string; name_en: string; name_kr?: string }>>>;

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

        // 노선 길이 미리 계산 (Accuracy update: Summing sections instead of relying on total_length)
        const lineLengths: Record<string, number> = {};
        if (railData.sections?.sections) {
            const linePhysicalConnections = new Map<string, Set<string>>();
            railData.sections.sections.forEach((section) => {
                const lineId = `${section.company_id}::${section.line_id}`;
                if (!linePhysicalConnections.has(lineId)) linePhysicalConnections.set(lineId, new Set());

                const connectionKey = [section.start, section.end].sort().join('<->');
                if (!linePhysicalConnections.get(lineId)!.has(connectionKey)) {
                    lineLengths[lineId] = (lineLengths[lineId] || 0) + (section.length / 1000);
                    linePhysicalConnections.get(lineId)!.add(connectionKey);
                }
            });
        } else if (railData.lines) {
            Object.values(railData.lines).forEach((line) => {
                // If section data is not available, fall back to total_length (convert meters to km)
                lineLengths[`${line.corp_id}::${line.id}`] = (line.total_length || 0) / 1000;
            });
        }

        const groupedHierarchy: GroupedHierarchy = {};

        const hierarchyData = (hierarchy as { companies: Record<string, HierarchyCompany> }).companies || hierarchy;

        Object.entries(hierarchyData).forEach(([companyId, companyObj]) => {
            const companyInfo = railData.companies?.[companyId];
            const companyCategoryId = companyInfo?.category_id ?? 3;

            // Handle nested 'lines' if it exists, otherwise use companyObj directly
            const lines = (companyObj as HierarchyCompany).lines || companyObj;

            Object.entries(lines as Record<string, string[] | HierarchyLine>).forEach(([lineId, lineDataOrStations]) => {
                let stations: string[] = [];
                if (Array.isArray(lineDataOrStations)) {
                    stations = lineDataOrStations;
                } else if (lineDataOrStations && lineDataOrStations.platforms) {
                    stations = lineDataOrStations.platforms.map((p: any) => p.station_id);
                }

                const lineInfo = railData.lines?.[lineId];
                const lineName = lineInfo?.name || "";
                const lineNameEn = lineInfo?.name_en || "";
                const lineNameKr = lineInfo?.name_kr;

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
                    name_en: lineNameEn,
                    name_kr: lineNameKr
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
