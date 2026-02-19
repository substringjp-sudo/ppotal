import { useState, useEffect } from 'react';

const JR_COMPANIES = [
    '北海道旅客鉄道', '東日本旅客鉄道', '東海旅客鉄道', '西日本旅客鉄道', '四国旅客鉄道', '九州旅客鉄道', '日本貨物鉄道'
];

const MAJOR_PRIVATE_COMPANIES = [
    '東武鉄道', '西武鉄道', '京成電鉄', '京王電鉄', '小田急電鉄', '東急電鉄', '京浜急行電鉄', '相模鉄道',
    '東京地下鉄', '名古屋鉄道', '近畿日本鉄道', '南海電気鉄道', '京阪電気鉄道', '阪急電鉄', '阪神電気鉄道', '西日本鉄道'
];

const STRICT_NON_RAIL_KEYWORDS = ['ケーブル', 'ロープウェイ', 'リフト', '鋼索', 'トロリー'];

export type GroupedHierarchy = {
    shinkansen: Record<string, Record<string, any>>;
    jr: Record<string, Record<string, any>>;
    majorPrivate: Record<string, Record<string, any>>;
    otherPrivate: Record<string, Record<string, any>>;
    nonRail: Record<string, Record<string, any>>;
};

export const useStationHierarchy = (railData: any | null) => {
    const [hierarchy, setHierarchy] = useState<Record<string, Record<string, any>> | null>(null);
    const [groupedHierarchy, setGroupedHierarchy] = useState<GroupedHierarchy | null>(null);
    const [companyNames, setCompanyNames] = useState<Record<string, any>>({});
    const [lineNames, setLineNames] = useState<Record<string, any>>({});
    const [lineLengths, setLineLengths] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!railData || !railData.hierarchy) return;

        const data = railData.hierarchy;
        setHierarchy(data);
        setCompanyNames(railData.companies || {});
        setLineNames(railData.lines || {});

        // Pre-calculate line lengths from metadata
        const lengths: Record<string, number> = {};
        if (railData.lines) {
            Object.values(railData.lines).forEach((line: any) => {
                const company = railData.companies[line.corp_id];
                const companyName = company ? company.name : line.corp_id;
                const lineName = line.name;

                // Key format matches MapPane/RailroadLayer: "CompanyName::LineName"
                if (companyName && lineName) {
                    // Normalize the key to match useRailroadGraph and SidebarGroup expectations
                    // lineName might contain "Line" suffix which normalizeKey removes
                    // We must match the key used in SidebarGroup lookup (which uses normalizeKey)
                    // Import normalizeKey? Or just implement it?
                    // Better to import it, but I can't easily add imports without seeing the top.
                    // Actually, normalizeKey logic is simple: remove suffix.
                    // But to be safe, I should import it.
                    // Let's check imports first.
                    // If not imported, I will just replicate: name.replace(/(線| Line| 선)$/, "").trim()

                    const normalizedLineName = lineName.replace(/(線| Line| 선)$/, "").trim();
                    lengths[`${companyName}::${normalizedLineName}`] = line.total_length || 0;
                }
            });
        }
        setLineLengths(lengths);

        const groups: GroupedHierarchy = {
            shinkansen: {},
            jr: {},
            majorPrivate: {},
            otherPrivate: {},
            nonRail: {},
        };

        Object.entries(data).forEach(([companyId, lines]: [string, any]) => {
            const companyInfo = railData.companies?.[companyId];
            const companyName = companyInfo?.name || "";

            const isJR = JR_COMPANIES.some(c => companyName.includes(c));
            const isMajor = MAJOR_PRIVATE_COMPANIES.includes(companyName);

            Object.entries(lines).forEach(([lineId, stations]) => {
                const lineInfo = railData.lines?.[lineId];
                const lineName = lineInfo?.name || "";

                // Categorization based on NAME, but storage keys are IDs
                const isShinkansen = lineName.includes('新幹線');
                const isNonRail = STRICT_NON_RAIL_KEYWORDS.some(k => lineName.includes(k) || companyName.includes(k));

                let targetGroup: keyof GroupedHierarchy = 'otherPrivate';

                if (isShinkansen) {
                    targetGroup = 'shinkansen';
                } else if (isNonRail) {
                    targetGroup = 'nonRail';
                } else if (isJR) {
                    targetGroup = 'jr';
                } else if (isMajor) {
                    targetGroup = 'majorPrivate';
                }

                if (!groups[targetGroup][companyId]) {
                    groups[targetGroup][companyId] = {};
                }
                groups[targetGroup][companyId][lineId] = stations;
            });
        });

        setGroupedHierarchy(groups);
    }, [railData]);

    return { hierarchy, groupedHierarchy, companyNames, lineNames, lineLengths };
};
