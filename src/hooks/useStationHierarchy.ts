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

export const useStationHierarchy = () => {
    const [hierarchy, setHierarchy] = useState<Record<string, Record<string, any>> | null>(null);
    const [groupedHierarchy, setGroupedHierarchy] = useState<GroupedHierarchy | null>(null);

    useEffect(() => {
        fetch('/data/station_hierarchy.json')
            .then(res => res.json())
            .then((data: Record<string, Record<string, any>>) => {
                setHierarchy(data);

                const groups: GroupedHierarchy = {
                    shinkansen: {},
                    jr: {},
                    majorPrivate: {},
                    otherPrivate: {},
                    nonRail: {},
                };

                Object.entries(data).forEach(([company, lines]) => {
                    const isJR = JR_COMPANIES.some(c => company.includes(c));
                    const isMajor = MAJOR_PRIVATE_COMPANIES.includes(company);

                    Object.entries(lines).forEach(([lineName, stations]) => {
                        const isShinkansen = lineName.includes('新幹線');
                        const isNonRail = STRICT_NON_RAIL_KEYWORDS.some(k => lineName.includes(k) || company.includes(k));

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

                        if (!groups[targetGroup][company]) {
                            groups[targetGroup][company] = {};
                        }
                        groups[targetGroup][company][lineName] = stations;
                    });
                });

                setGroupedHierarchy(groups);
            })
            .catch(console.error);
    }, []);

    return { hierarchy, groupedHierarchy };
};
