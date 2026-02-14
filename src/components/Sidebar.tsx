"use client";

import React, { useState, useEffect, useCallback, memo } from 'react';

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

const Sidebar: React.FC<SidebarProps> = ({ selectedLines, onToggleLine, onSetSelectedLines, lineLengths = {}, visitedLineLengths = {}, activeLine }) => {
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
    const lineRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

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

    const toggleGroup = useCallback((group: keyof GroupedHierarchy) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    }, []);

    const handleCompanyToggle = useCallback((company: string, lines: Record<string, any>) => {
        const lineNames = Object.keys(lines);
        const compositeKeys = lineNames.map(line => `${company}::${line}`);
        const allSelected = compositeKeys.every(key => selectedLines.includes(key));
        const newSelected = allSelected
            ? selectedLines.filter(l => !compositeKeys.includes(l))
            : [...selectedLines, ...compositeKeys.filter(key => !selectedLines.includes(key))];
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

    if (!groupedHierarchy) return <div className="p-4">Loading...</div>;

    const renderGroup = (title: string, groupKey: keyof GroupedHierarchy) => {
        const companies = groupedHierarchy[groupKey];
        const isEmpty = Object.keys(companies).length === 0;
        if (isEmpty) return null;

        return (
            <div style={{ marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                <div
                    onClick={() => toggleGroup(groupKey)}
                    style={{
                        padding: '10px',
                        background: '#f0f0f0',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <span>{title}</span>
                    <span>{expandedGroups[groupKey] ? '▼' : '▶'}</span>
                </div>
                {expandedGroups[groupKey] && (
                    <div style={{ padding: '0 10px 10px 10px' }}>
                        {Object.entries(companies).sort((a, b) => a[0].localeCompare(b[0], 'ja')).map(([company, lines]) => {
                            const isExpanded = expandedCompanies[company];
                            const lineNames = Object.keys(lines);
                            const allLinesSelected = lineNames.every(l => selectedLines.includes(`${company}::${l}`));
                            const someLinesSelected = lineNames.some(l => selectedLines.includes(`${company}::${l}`));

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
                                            style={{ marginRight: '8px' }}
                                        />
                                        <span
                                            onClick={() => toggleCompany(company)}
                                            style={{ cursor: 'pointer', flex: 1, fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}
                                        >
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' }}>
                                                {company} ({lineNames.length}) {isExpanded ? '▼' : '▶'}
                                            </span>
                                            {(() => {
                                                const companyTotal = lineNames.reduce((sum, l) => sum + (lineLengths[`${company}::${l}`] || 0), 0);
                                                const companyVisited = lineNames.reduce((sum, l) => sum + (visitedLineLengths[`${company}::${l}`] || 0), 0);
                                                const companyPercent = companyTotal > 0 ? (companyVisited / companyTotal) * 100 : 0;
                                                const colors = getProgressColor(companyPercent);
                                                return (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        color: colors.text,
                                                        flexShrink: 0,
                                                        backgroundColor: colors.bg,
                                                        padding: '2px 8px',
                                                        borderRadius: '10px',
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
                                        <div style={{ marginLeft: '24px' }}>
                                            {lineNames.sort((a, b) => a.localeCompare(b, 'ja')).map(line => {
                                                const key = `${company}::${line}`;
                                                const isSelected = selectedLines.includes(key);
                                                const isActive = activeLine === key;
                                                const percent = lineLengths[key] ? ((visitedLineLengths?.[key] || 0) / lineLengths[key] * 100) : 0;
                                                const isCompleted = percent >= 99.9;

                                                return (
                                                    <div
                                                        key={line}
                                                        ref={el => { lineRefs.current[key] = el; }}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            padding: '6px 0',
                                                            backgroundColor: isActive ? '#e6f7ff' : 'transparent',
                                                            borderRadius: '4px',
                                                            borderBottom: '1px solid #f0f0f0'
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => onToggleLine(key)}
                                                            style={{ marginRight: '10px', flexShrink: 0 }}
                                                        />
                                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                                                <span style={{
                                                                    fontSize: '12px',
                                                                    color: isCompleted ? '#186A3B' : '#333',
                                                                    fontWeight: (isSelected || isCompleted) ? 'bold' : 'normal',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    flex: 1
                                                                }}>
                                                                    {line}
                                                                </span>
                                                                {(() => {
                                                                    const colors = getProgressColor(percent);
                                                                    return (
                                                                        <span style={{
                                                                            fontSize: '10px',
                                                                            color: colors.text,
                                                                            flexShrink: 0,
                                                                            marginLeft: '8px',
                                                                            fontWeight: '800',
                                                                            backgroundColor: colors.bg,
                                                                            padding: '1px 6px',
                                                                            borderRadius: '8px',
                                                                            transition: 'all 0.3s ease'
                                                                        }}>
                                                                            {percent.toFixed(percent >= 100 ? 0 : 1)}%
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>
                                                            {lineLengths[key] > 0 && (
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <div style={{ fontSize: '9px', color: '#999', marginBottom: '2px' }}>
                                                                        {(visitedLineLengths?.[key] || 0).toFixed(1)} / {lineLengths[key].toFixed(1)} km
                                                                    </div>
                                                                    <div style={{ width: '100%', height: '3px', backgroundColor: '#f0f0f0', borderRadius: '1.5px', overflow: 'hidden' }}>
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
        <div className="sidebar-content" style={{ padding: '20px', fontFamily: 'Pretendard, sans-serif' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Railroad Filter</h2>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button onClick={handleSelectAll} style={{ flex: 1, padding: '5px', fontSize: '12px', cursor: 'pointer' }}>
                    Select All
                </button>
                <button onClick={handleDeselectAll} style={{ flex: 1, padding: '5px', fontSize: '12px', cursor: 'pointer' }}>
                    Deselect All
                </button>
            </div>

            {renderGroup('Shinkansen (新幹線)', 'shinkansen')}
            {renderGroup('JR Lines', 'jr')}
            {renderGroup('Major Private (16社)', 'majorPrivate')}
            {renderGroup('Other Private Railways', 'otherPrivate')}
            {renderGroup('Non-Rail / Cable Cars', 'nonRail')}
        </div>
    );
};

export default memo(Sidebar);
