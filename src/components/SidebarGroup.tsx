import React, { memo } from 'react';
import { normalizeKey, translateName } from '../lib/lineUtils';
import { Language } from '../lib/translations';
import { trackEvent } from '../lib/gtag';
import { getProgressColor } from '../lib/uiUtils';
import { COMPANY_EN_NAMES, LINE_EN_NAMES } from '../lib/railwayData';

interface SidebarGroupProps {
    title: string;
    groupKey: string;
    companies: Record<string, Record<string, any>>;
    expanded: boolean;
    onToggleExpanded: (groupKey: string) => void;
    onToggleSelection: (groupKey: string) => void;
    selectedLines: string[];
    onToggleLine: (lineKey: string) => void;
    onToggleCompany: (company: string, lines: Record<string, any>) => void;
    expandedCompanies: Record<string, boolean>;
    toggleCompany: (company: string) => void;
    lineLengths: Record<string, number>;
    visitedLineLengths: Record<string, number>;
    sortMode: 'ja' | 'usage';
    activeLine?: string | null;
    onLineClick?: (line: string) => void;
    language: Language;
    registerLineRef: (key: string, el: HTMLDivElement | null) => void;
    companyNames?: Record<string, any>;
    lineNames?: Record<string, any>;
}

const SidebarLineItem: React.FC<{
    lineId: string;
    cName: string;
    getLineName: (id: string | any) => string;
    getLineEnName: (id: string | any) => string;
    registerLineRef: (key: string, el: HTMLDivElement | null) => void;
    onLineClick?: (line: string) => void;
    onToggleLine: (lineKey: string) => void;
    selectedLines: string[];
    activeLine?: string | null;
    lineLengths: Record<string, number>;
    visitedLineLengths: Record<string, number>;
}> = ({ lineId, cName, getLineName, getLineEnName, registerLineRef, onLineClick, onToggleLine, selectedLines, activeLine, lineLengths, visitedLineLengths }) => {
    const lName = getLineName(lineId);
    const key = `${cName}::${lName}`;
    const normalizedKey = normalizeKey(key);
    const isActive = activeLine ? normalizeKey(activeLine) === normalizedKey : false;
    const isSelected = selectedLines.some(sl => normalizeKey(sl) === normalizedKey) || isActive;
    const percent = lineLengths[normalizedKey] ? ((visitedLineLengths?.[normalizedKey] || 0) / lineLengths[normalizedKey] * 100) : 0;
    const isCompleted = percent >= 99.9;

    const [itemHovered, setItemHovered] = React.useState(false);
    const itemHoverTimeout = React.useRef<NodeJS.Timeout | null>(null);

    return (
        <div
            ref={el => registerLineRef(key, el)}
            onClick={() => onLineClick?.(key)}
            onMouseEnter={() => {
                if (itemHoverTimeout.current) clearTimeout(itemHoverTimeout.current);
                itemHoverTimeout.current = setTimeout(() => {
                    setItemHovered(true);
                }, 1000);
            }}
            onMouseLeave={() => {
                if (itemHoverTimeout.current) clearTimeout(itemHoverTimeout.current);
                setItemHovered(false);
            }}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 0',
                backgroundColor: isActive ? '#e6f7ff' : (itemHovered ? '#f5f5f5' : 'transparent'),
                borderRadius: '4px',
                borderBottom: '1px solid #f9f9f9',
                cursor: 'pointer'
            }}
        >
            <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                    e.stopPropagation();
                    onToggleLine(key);
                    trackEvent('line_toggle', 'interaction', key);
                }}
                style={{ marginRight: '8px', flexShrink: 0, cursor: 'pointer' }}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <span
                            style={{
                                fontSize: '12px',
                                color: isCompleted ? '#186A3B' : '#333',
                                fontWeight: (isSelected || isCompleted) ? 'bold' : 'normal',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                cursor: 'pointer'
                            }}>
                            {lName}
                        </span>
                        <span style={{
                            fontSize: '9px',
                            fontWeight: '400',
                            color: '#666',
                            marginTop: '-1px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {getLineEnName(lineId)}
                        </span>
                    </div>
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
                {lineLengths[normalizedKey] > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: '9px', color: '#999', marginBottom: '1px' }}>
                            {(visitedLineLengths?.[normalizedKey] || 0).toFixed(1)} / {lineLengths[normalizedKey].toFixed(1)} km
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
};

const SidebarGroup: React.FC<SidebarGroupProps> = ({
    title, groupKey, companies, expanded, onToggleExpanded, onToggleSelection,
    selectedLines, onToggleLine, onToggleCompany, expandedCompanies,
    toggleCompany, lineLengths, visitedLineLengths, sortMode,
    activeLine, onLineClick, language, registerLineRef,
    companyNames = {}, lineNames = {}
}) => {
    const isEmpty = Object.keys(companies).length === 0;
    if (isEmpty) return null;

    const getCompanyName = (id: string) => {
        const name = companyNames[id]?.name || id;
        return name;
    }

    const getCompanyEnName = (id: string) => {
        return companyNames[id]?.name_en || COMPANY_EN_NAMES[companyNames[id]?.name] || id;
    }

    const getLineName = (id: string) => {
        const name = lineNames[id]?.name || id;
        return name;
    }

    const getLineEnName = (id: string) => {
        return lineNames[id]?.name_en || LINE_EN_NAMES[lineNames[id]?.name] || id;
    }

    const sortLines = (lineIds: string[], companyId: string) => {
        if (sortMode === 'usage') {
            const getLineUsage = (lineId: string) => {
                const key = normalizeKey(`${companyId}::${lineId}`);
                return lineLengths[key] ? ((visitedLineLengths?.[key] || 0) / lineLengths[key]) : 0;
            };
            return [...lineIds].sort((a, b) => getLineUsage(b) - getLineUsage(a));
        }
        return [...lineIds].sort((a, b) => getLineName(a).localeCompare(getLineName(b), 'ja'));
    };

    const sortCompaniesForRender = (companyEntries: [string, Record<string, any>][]) => {
        if (sortMode === 'usage') {
            const getCompanyUsage = (comp: string, lines: Record<string, any>) => {
                const names = Object.keys(lines);
                const total = names.reduce((sum, l) => sum + (lineLengths[normalizeKey(`${comp}::${l}`)] || 0), 0);
                const visited = names.reduce((sum, l) => sum + (visitedLineLengths[normalizeKey(`${comp}::${l}`)] || 0), 0);
                return total > 0 ? (visited / total) : 0;
            };
            return [...companyEntries].sort((a, b) => getCompanyUsage(b[0], b[1]) - getCompanyUsage(a[0], a[1]));
        }
        return [...companyEntries].sort((a, b) => getCompanyName(a[0]).localeCompare(getCompanyName(b[0]), 'ja'));
    };

    return (
        <div style={{ marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
            <div
                style={{
                    padding: '10px',
                    background: '#f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => onToggleExpanded(groupKey)}>
                    <span>{title}</span>
                    {(() => {
                        let total = 0;
                        let visited = 0;
                        Object.entries(companies).forEach(([compId, lines]) => {
                            Object.keys(lines).forEach(lineId => {
                                total++;
                                const cName = getCompanyName(compId);
                                const lName = getLineName(lineId);
                                const key = normalizeKey(`${cName}::${lName}`);
                                if ((visitedLineLengths[key] || 0) > 0) visited++;
                            });
                        });
                        return (
                            <span style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
                                ({visited}/{total})
                            </span>
                        );
                    })()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                        type="checkbox"
                        checked={(() => {
                            let all = true;
                            Object.entries(companies).forEach(([c, ls]) => {
                                const cName = getCompanyName(c);
                                if (!Object.keys(ls).every(l => {
                                    const lName = getLineName(l);
                                    return selectedLines.includes(`${cName}::${lName}`);
                                })) all = false;
                            });
                            return all;
                        })()}
                        onChange={(e) => {
                            e.stopPropagation();
                            onToggleSelection(groupKey);
                        }}
                        title="Toggle Category"
                        style={{ cursor: 'pointer' }}
                    />
                    <span onClick={() => onToggleExpanded(groupKey)} style={{ cursor: 'pointer' }}>{expanded ? '▼' : '▶'}</span>
                </div>
            </div>
            {expanded && (
                <div style={{ padding: '0 10px 10px 10px' }}>
                    {groupKey === 'shinkansen' ? (
                        // Special handling for Shinkansen: Flatten companies and just show lines
                        (() => {
                            // Flatten all Shinkansen lines
                            const allShinkansenLines: { id: string, companyId: string }[] = [];
                            Object.entries(companies).forEach(([companyId, lines]) => {
                                Object.keys(lines).forEach(lineId => {
                                    allShinkansenLines.push({ id: lineId, companyId });
                                });
                            });

                            // Sort lines
                            const sortedLines = sortMode === 'usage'
                                ? allShinkansenLines.sort((a, b) => {
                                    const getUsage = (l: { id: string, companyId: string }) => {
                                        const key = normalizeKey(`${getCompanyName(l.companyId)}::${getLineName(l.id)}`);
                                        return lineLengths[key] ? ((visitedLineLengths?.[key] || 0) / lineLengths[key]) : 0;
                                    };
                                    return getUsage(b) - getUsage(a);
                                })
                                : allShinkansenLines.sort((a, b) => getLineName(a.id).localeCompare(getLineName(b.id), 'ja'));

                            return (
                                <div style={{ marginTop: '8px', marginLeft: '4px' }}>
                                    {sortedLines.map(l => (
                                        <SidebarLineItem
                                            key={`${l.companyId}-${l.id}`}
                                            lineId={l.id}
                                            cName={getCompanyName(l.companyId)}
                                            getLineName={getLineName}
                                            getLineEnName={getLineEnName}
                                            registerLineRef={registerLineRef}
                                            onLineClick={onLineClick}
                                            onToggleLine={onToggleLine}
                                            selectedLines={selectedLines}
                                            activeLine={activeLine}
                                            lineLengths={lineLengths}
                                            visitedLineLengths={visitedLineLengths}
                                        />
                                    ))}
                                </div>
                            );
                        })()
                    ) : (
                        sortCompaniesForRender(Object.entries(companies)).map(([companyId, lines]) => {
                            const isExpanded = expandedCompanies[companyId];
                            const lineIds = Object.keys(lines);
                            const cName = getCompanyName(companyId);
                            const compositeKeys = lineIds.map(l => `${cName}::${getLineName(l)}`);
                            const allLinesSelected = compositeKeys.every(k => selectedLines.includes(k));
                            const someLinesSelected = compositeKeys.some(k => selectedLines.includes(k));

                            const companyTotalLines = lineIds.length;
                            const companyVisitedCount = lineIds.filter(l => {
                                const key = normalizeKey(`${cName}::${getLineName(l)}`);
                                return (visitedLineLengths[key] || 0) > 0;
                            }).length;

                            return (
                                <div key={companyId} style={{ marginTop: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                                        <input
                                            type="checkbox"
                                            checked={allLinesSelected}
                                            ref={input => {
                                                if (input) {
                                                    input.indeterminate = someLinesSelected && !allLinesSelected;
                                                }
                                            }}
                                            onChange={() => onToggleCompany(companyId, lines)}
                                            style={{ marginRight: '8px', cursor: 'pointer' }}
                                        />
                                        <span
                                            onClick={() => toggleCompany(companyId)}
                                            style={{ cursor: 'pointer', flex: 1, fontWeight: 'bold', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {getCompanyName(companyId)}
                                                </span>
                                                <span style={{
                                                    fontSize: '10px',
                                                    fontWeight: '400',
                                                    color: '#555',
                                                    marginTop: '-2px',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {getCompanyEnName(companyId)}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#666', fontWeight: 'normal', flexShrink: 0 }}>
                                                ({companyVisitedCount}/{companyTotalLines})
                                            </span>
                                            <span style={{ flexShrink: 0, fontSize: '10px' }}>
                                                {isExpanded ? '▼' : '▶'}
                                            </span>
                                            {(() => {
                                                const totalLen = lineIds.reduce((sum, l) => {
                                                    const key = normalizeKey(`${cName}::${getLineName(l)}`);
                                                    return sum + (lineLengths[key] || 0);
                                                }, 0);
                                                const visitedLen = lineIds.reduce((sum, l) => {
                                                    const key = normalizeKey(`${cName}::${getLineName(l)}`);
                                                    return sum + (visitedLineLengths[key] || 0);
                                                }, 0);
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
                                            {sortLines(lineIds, companyId).map(lId => (
                                                <SidebarLineItem
                                                    key={lId}
                                                    lineId={lId}
                                                    cName={cName}
                                                    getLineName={getLineName}
                                                    getLineEnName={getLineEnName}
                                                    registerLineRef={registerLineRef}
                                                    onLineClick={onLineClick}
                                                    onToggleLine={onToggleLine}
                                                    selectedLines={selectedLines}
                                                    activeLine={activeLine}
                                                    lineLengths={lineLengths}
                                                    visitedLineLengths={visitedLineLengths}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default memo(SidebarGroup);
