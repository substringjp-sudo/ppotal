"use client";

import React, { useState, useEffect, useCallback, memo } from 'react';
import { normalizeKey } from '../lib/lineUtils';

// Group definitions
const JR_COMPANIES = [
    '北海道旅客鉄道', '東日本旅客鉄道', '東海旅客鉄道', '西日本旅客鉄道', '四国旅客鉄道', '九州旅客鉄道', '日本貨物鉄道'
];

const MAJOR_PRIVATE_COMPANIES = [
    '東武鉄道', '西武鉄道', '京成電鉄', '京王電鉄', '小田急電鉄', '東急電鉄', '京浜急行電鉄', '相模鉄道',
    '東京地下鉄', '名古屋鉄道', '近畿日本鉄道', '南海電気鉄道', '京阪電気鉄道', '阪急電鉄', '阪神電気鉄道', '西日本鉄道'
];

const STRICT_NON_RAIL_KEYWORDS = ['ケーブル', 'ロープウェイ', 'リフト', '鋼索', 'トロリー'];

interface SidebarProps {
    selectedLines: string[];
    onToggleLine: (line: string) => void;
    onSetSelectedLines: (lines: string[]) => void;
    lineLengths?: Record<string, number>;
    visitedLineLengths?: Record<string, number>;
    activeLine?: string | null;
    onResetTrips?: () => void;
    onZoomToLine?: (lineKey: string) => void;
}

const getProgressColor = (percent: number) => {
    if (percent >= 99.9) return { bg: '#27ae60', text: '#fff' };
    if (percent <= 0) return { bg: '#f5f5f5', text: '#666' };
    // Mix between light gray and theme green
    // Start with light green bg
    const saturation = 30 + (percent * 0.4); // 30% -> 70%
    const lightness = 96 - (percent * 0.4); // 96% -> 56%
    return {
        bg: `hsl(145, ${saturation}%, ${lightness}%)`,
        text: percent > 50 ? '#fff' : '#186A3B'
    };
};

type GroupedHierarchy = {
    shinkansen: Record<string, Record<string, any>>;
    jr: Record<string, Record<string, any>>;
    majorPrivate: Record<string, Record<string, any>>;
    otherPrivate: Record<string, Record<string, any>>;
    nonRail: Record<string, Record<string, any>>;
};

type SortOption = 'ja' | 'en' | 'ko' | 'usage';

const Sidebar: React.FC<SidebarProps> = ({ selectedLines, onToggleLine, onSetSelectedLines, lineLengths = {}, visitedLineLengths = {}, activeLine, onResetTrips, onZoomToLine }) => {
    const [hierarchy, setHierarchy] = useState<Record<string, Record<string, any>> | null>(null);
    const [groupedHierarchy, setGroupedHierarchy] = useState<GroupedHierarchy | null>(null);
    const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
    const [expandedGroups, setExpandedGroups] = useState<Record<keyof GroupedHierarchy, boolean>>({
        shinkansen: true,
        jr: true,
        majorPrivate: true,
        otherPrivate: false,
        nonRail: false,
    });
    const [sortBy, setSortBy] = useState<SortOption>('ja');
    const lineRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

    // Simple Korean mapping for sorting (can be expanded)
    const KO_MAP: Record<string, string> = {
        '北海道旅客鉄道': '홋카이도 여객철도',
        '東日本旅客鉄道': '동일본 여객철도',
        '東海旅客鉄道': '도카이 여객철도',
        '西日本旅客鉄道': '서일본 여객철도',
        '四国旅客鉄道': '시코쿠 여객철도',
        '九州旅客鉄道': '큐슈 여객철도',
        '日本貨物鉄道': '일본 화물철도',
        '東京地下鉄': '도쿄 메트로',
        '東武鉄道': '토부 철도',
        '西武鉄道': '세이부 철도',
        '京成電鉄': '케이세이 전철',
        '京王電鉄': '케이오 전철',
        '小田急電鉄': '오다큐 전철',
        '東急電鉄': '토큐 전철',
        '京浜急行電鉄': '케이힌 급행전철',
        '相模鉄道': '사가미 철도',
        '名古屋鉄道': '나고야 철도',
        '近畿日本鉄道': '긴키 일본철도',
        '南海電気鉄道': '난카이 전기철도',
        '京阪電気鉄道': '케이한 전기철도',
        '阪急電鉄': '한큐 전철',
        '阪神電気鉄道': '한신 전기철도',
        '西日本鉄道': '서일본 철도',
        '新幹線': '신칸센',
    };

    const getKoName = (name: string) => KO_MAP[name] || name;

    useEffect(() => {
        fetch('/station_hierarchy.json')
            .then(res => res.json())
            .then((data: Record<string, Record<string, any>>) => {
                setHierarchy(data);

                // Process grouping
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

    // Scroll active line into view and expand company if needed
    useEffect(() => {
        if (activeLine && groupedHierarchy) {
            let foundGroup: keyof GroupedHierarchy | null = null;
            let foundCompany: string | null = null;

            // Search for the active line in groups
            for (const group of Object.keys(groupedHierarchy) as (keyof GroupedHierarchy)[]) {
                for (const company of Object.keys(groupedHierarchy[group])) {
                    if (Object.keys(groupedHierarchy[group][company]).some(line => `${company}::${line}` === activeLine)) {
                        foundGroup = group;
                        foundCompany = company;
                        break;
                    }
                }
                if (foundGroup) break;
            }

            if (foundGroup && foundCompany) {
                setExpandedGroups(prev => ({ ...prev, [foundGroup!]: true }));
                setExpandedCompanies(prev => ({ ...prev, [foundCompany!]: true }));
                setTimeout(() => {
                    const el = lineRefs.current[activeLine];
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }, [activeLine, groupedHierarchy]);

    const toggleCompany = useCallback((company: string) => {
        setExpandedCompanies(prev => ({ ...prev, [company]: !prev[company] }));
    }, []);

    const toggleGroupExpand = useCallback((group: keyof GroupedHierarchy) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    }, []);

    const handleGroupToggle = useCallback((groupKey: keyof GroupedHierarchy) => {
        if (!groupedHierarchy) return;
        const companies = groupedHierarchy[groupKey];
        const allKeys: string[] = [];
        Object.entries(companies).forEach(([comp, lines]) => {
            Object.keys(lines).forEach(line => allKeys.push(`${comp}::${line}`));
        });

        const allSelected = allKeys.every(key => selectedLines.includes(key));
        const newSelected = allSelected
            ? selectedLines.filter(l => !allKeys.includes(l))
            : Array.from(new Set([...selectedLines, ...allKeys]));
        onSetSelectedLines(newSelected);
    }, [groupedHierarchy, selectedLines, onSetSelectedLines]);

    const handleCompanyToggle = useCallback((company: string, lines: Record<string, any>) => {
        const lineNames = Object.keys(lines);
        const compositeKeys = lineNames.map(line => `${company}::${line}`);
        const allSelected = compositeKeys.every(key => selectedLines.includes(key));
        const newSelected = allSelected
            ? selectedLines.filter(l => !compositeKeys.includes(l))
            : Array.from(new Set([...selectedLines, ...compositeKeys]));
        onSetSelectedLines(newSelected);
    }, [selectedLines, onSetSelectedLines]);

    const handleSelectAll = useCallback(() => {
        if (!hierarchy) return;
        const allKeys: string[] = [];
        Object.entries(hierarchy).forEach(([comp, lines]) => {
            Object.keys(lines).forEach(line => allKeys.push(`${comp}::${line}`));
        });
        onSetSelectedLines(allKeys);
    }, [hierarchy, onSetSelectedLines]);

    const handleDeselectAll = useCallback(() => onSetSelectedLines([]), [onSetSelectedLines]);

    const handleExpandAll = useCallback(() => {
        if (!groupedHierarchy) return;
        const allCompanies: Record<string, boolean> = {};
        Object.values(groupedHierarchy).forEach(group => {
            Object.keys(group).forEach(comp => {
                allCompanies[comp] = true;
            });
        });
        setExpandedCompanies(allCompanies);
        setExpandedGroups({
            shinkansen: true,
            jr: true,
            majorPrivate: true,
            otherPrivate: true,
            nonRail: true,
        });
    }, [groupedHierarchy]);

    const handleCollapseAll = useCallback(() => {
        setExpandedCompanies({});
        setExpandedGroups({
            shinkansen: false,
            jr: false,
            majorPrivate: false,
            otherPrivate: false,
            nonRail: false,
        });
    }, []);

    if (!groupedHierarchy) return <div className="p-4">Loading...</div>;

    const sortLines = (lineNames: string[], company: string) => {
        const getLineUsage = (line: string) => {
            const key = normalizeKey(`${company}::${line}`);
            return lineLengths[key] ? ((visitedLineLengths?.[key] || 0) / lineLengths[key]) : 0;
        };

        return [...lineNames].sort((a, b) => {
            if (sortBy === 'ja') return a.localeCompare(b, 'ja');
            if (sortBy === 'en') return a.localeCompare(b, 'en');
            if (sortBy === 'ko') return getKoName(a).localeCompare(getKoName(b), 'ko');
            if (sortBy === 'usage') return getLineUsage(b) - getLineUsage(a);
            return 0;
        });
    };

    const sortCompanies = (companyEntries: [string, Record<string, any>][]) => {
        const getCompanyUsage = (comp: string, lines: Record<string, any>) => {
            const names = Object.keys(lines);
            const total = names.reduce((sum, l) => sum + (lineLengths[normalizeKey(`${comp}::${l}`)] || 0), 0);
            const visited = names.reduce((sum, l) => sum + (visitedLineLengths[normalizeKey(`${comp}::${l}`)] || 0), 0);
            return total > 0 ? (visited / total) : 0;
        };

        return [...companyEntries].sort((a, b) => {
            if (sortBy === 'ja') return a[0].localeCompare(b[0], 'ja');
            if (sortBy === 'en') return a[0].localeCompare(b[0], 'en');
            if (sortBy === 'ko') return getKoName(a[0]).localeCompare(getKoName(b[0]), 'ko');
            if (sortBy === 'usage') return getCompanyUsage(b[0], b[1]) - getCompanyUsage(a[0], a[1]);
            return 0;
        });
    };

    const renderGroup = (title: string, groupKey: keyof GroupedHierarchy) => {
        const companies = groupedHierarchy[groupKey];
        const isEmpty = Object.keys(companies).length === 0;
        if (isEmpty) return null;

        const allGroupKeys: string[] = [];
        Object.entries(companies).forEach(([comp, lines]) => {
            Object.keys(lines).forEach(l => allGroupKeys.push(`${comp}::${l}`));
        });

        const allGroupSelected = allGroupKeys.every(k => selectedLines.includes(k));
        const someGroupSelected = allGroupKeys.some(k => selectedLines.includes(k));

        return (
            <div style={{ marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                    style={{
                        padding: '10px',
                        background: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #ddd'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <input
                            type="checkbox"
                            checked={allGroupSelected}
                            ref={input => {
                                if (input) {
                                    input.indeterminate = someGroupSelected && !allGroupSelected;
                                }
                            }}
                            onChange={() => handleGroupToggle(groupKey)}
                            style={{ cursor: 'pointer' }}
                        />
                        <div
                            onClick={() => toggleGroupExpand(groupKey)}
                            style={{ cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}
                        >
                            <span>{title}</span>
                            {(() => {
                                let total = 0;
                                let visited = 0;
                                Object.entries(companies).forEach(([comp, lines]) => {
                                    Object.keys(lines).forEach(l => {
                                        total++;
                                        if ((visitedLineLengths[normalizeKey(`${comp}::${l}`)] || 0) > 0) visited++;
                                    });
                                });
                                return (
                                    <span style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
                                        ({visited}/{total})
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                    <span onClick={() => toggleGroupExpand(groupKey)} style={{ cursor: 'pointer', padding: '0 5px' }}>
                        {expandedGroups[groupKey] ? '▼' : '▶'}
                    </span>
                </div>
                {expandedGroups[groupKey] && (
                    <div style={{ padding: '0 10px 10px 10px' }}>
                        {sortCompanies(Object.entries(companies)).map(([company, lines]) => {
                            const isExpanded = expandedCompanies[company];
                            const lineNames = Object.keys(lines);
                            const allLinesSelected = lineNames.every(l => selectedLines.includes(`${company}::${l}`));
                            const someLinesSelected = lineNames.some(l => selectedLines.includes(`${company}::${l}`));

                            const companyTotalLines = lineNames.length;
                            const companyVisitedCount = lineNames.filter(l => (visitedLineLengths[normalizeKey(`${company}::${l}`)] || 0) > 0).length;

                            return (
                                <div key={company} style={{ marginTop: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                                        <input
                                            type="checkbox"
                                            checked={allLinesSelected}
                                            ref={input => {
                                                if (input) {
                                                    input.indeterminate = someLinesSelected && !allLinesSelected;
                                                }
                                            }}
                                            onChange={() => handleCompanyToggle(company, lines)}
                                            style={{ marginRight: '8px', cursor: 'pointer' }}
                                        />
                                        <span
                                            onClick={() => toggleCompany(company)}
                                            style={{ cursor: 'pointer', flex: 1, fontWeight: 'bold', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {company}
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#666', fontWeight: 'normal', flexShrink: 0 }}>
                                                    ({companyVisitedCount}/{companyTotalLines})
                                                </span>
                                                <span style={{ flexShrink: 0, fontSize: '10px' }}>
                                                    {isExpanded ? '▼' : '▶'}
                                                </span>
                                            </span>
                                            {(() => {
                                                const totalLen = lineNames.reduce((sum, l) => sum + (lineLengths[normalizeKey(`${company}::${l}`)] || 0), 0);
                                                const visitedLen = lineNames.reduce((sum, l) => sum + (visitedLineLengths[normalizeKey(`${company}::${l}`)] || 0), 0);
                                                const companyPercent = totalLen > 0 ? (visitedLen / totalLen) * 100 : 0;
                                                const colors = getProgressColor(companyPercent);
                                                return (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        color: colors.text,
                                                        flexShrink: 0,
                                                        backgroundColor: colors.bg,
                                                        padding: '1px 6px',
                                                        borderRadius: '8px',
                                                        fontWeight: '800',
                                                        transition: 'all 0.3s ease'
                                                    }}>
                                                        {companyPercent.toFixed(1)}%
                                                    </span>
                                                );
                                            })()}
                                        </span>
                                    </div>
                                    {isExpanded && (
                                        <div style={{ marginLeft: '22px' }}>
                                            {sortLines(lineNames, company).map(line => {
                                                const key = `${company}::${line}`;
                                                const normalizedKey = normalizeKey(key);
                                                const isSelected = selectedLines.some(sl => normalizeKey(sl) === normalizedKey);
                                                const isActive = activeLine ? normalizeKey(activeLine) === normalizedKey : false;
                                                const percent = lineLengths[normalizedKey] ? ((visitedLineLengths?.[normalizedKey] || 0) / lineLengths[normalizedKey] * 100) : 0;
                                                const isCompleted = percent >= 99.9;

                                                return (
                                                    <div
                                                        key={line}
                                                        ref={el => { lineRefs.current[key] = el; }}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            padding: '4px 0',
                                                            backgroundColor: isActive ? '#e6f7ff' : 'transparent',
                                                            borderRadius: '4px',
                                                            borderBottom: '1px solid #f9f9f9'
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => onToggleLine(key)}
                                                            style={{ marginRight: '8px', flexShrink: 0, cursor: 'pointer' }}
                                                        />
                                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1px' }}>
                                                                <span
                                                                    onClick={() => onZoomToLine?.(key)}
                                                                    style={{
                                                                        fontSize: '12px',
                                                                        color: isCompleted ? '#186A3B' : (isActive ? '#0050b3' : '#333'),
                                                                        fontWeight: (isSelected || isCompleted || isActive) ? 'bold' : 'normal',
                                                                        whiteSpace: 'nowrap',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        flex: 1,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {line}
                                                                </span>
                                                                {(() => {
                                                                    const colors = getProgressColor(percent);
                                                                    return (
                                                                        <span style={{
                                                                            fontSize: '9px',
                                                                            color: colors.text,
                                                                            flexShrink: 0,
                                                                            marginLeft: '6px',
                                                                            fontWeight: '800',
                                                                            backgroundColor: colors.bg,
                                                                            padding: '0px 5px',
                                                                            borderRadius: '6px',
                                                                            transition: 'all 0.3s ease'
                                                                        }}>
                                                                            {percent.toFixed(percent >= 100 ? 0 : 1)}%
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>
                                                            {lineLengths[key] > 0 && (
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <div style={{ fontSize: '9px', color: '#999', marginBottom: '1px' }}>
                                                                        {(visitedLineLengths?.[key] || 0).toFixed(1)} / {lineLengths[key].toFixed(1)} km
                                                                    </div>
                                                                    <div style={{ width: '100%', height: '2px', backgroundColor: '#f0f0f0', borderRadius: '1px', overflow: 'hidden' }}>
                                                                        <div style={{
                                                                            width: `${Math.min(100, percent)}%`,
                                                                            height: '100%',
                                                                            backgroundColor: isCompleted ? '#27ae60' : '#3498db',
                                                                            transition: 'width 0.4s ease-out'
                                                                        }} />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="sidebar-content" style={{ padding: '16px', fontFamily: 'Pretendard, sans-serif', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Railroad Filter</h2>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                        <option value="ja">JP Name</option>
                        <option value="en">Alphabet</option>
                        <option value="ko">KR Name</option>
                        <option value="usage">Usage %</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <button onClick={handleSelectAll} style={{ flex: 1, padding: '6px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ddd', background: '#fff' }}>
                        All
                    </button>
                    <button onClick={handleDeselectAll} style={{ flex: 1, padding: '6px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ddd', background: '#fff' }}>
                        None
                    </button>
                    <button onClick={handleExpandAll} style={{ flex: 1.2, padding: '6px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ddd', background: '#fff' }}>
                        Expand All
                    </button>
                    <button onClick={handleCollapseAll} style={{ flex: 1.2, padding: '6px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ddd', background: '#fff' }}>
                        Collapse All
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {renderGroup('Shinkansen (新幹線)', 'shinkansen')}
                {renderGroup('JR Lines', 'jr')}
                {renderGroup('Major Private (16社)', 'majorPrivate')}
                {renderGroup('Other Private Railways', 'otherPrivate')}
                {renderGroup('Non-Rail / Cable Cars', 'nonRail')}
            </div>
        </div>
    );
};

export default memo(Sidebar);
