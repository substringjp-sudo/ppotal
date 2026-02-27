import React, { memo } from 'react';
import { trackEvent } from '../lib/gtag';
import { getProgressColor } from '../lib/uiUtils';

interface SidebarGroupProps {
    title: string;
    groupKey: string;
    companies: Record<string, Record<string, { name: string; name_en?: string; stations?: string[] }>>;
    expanded: boolean;
    onToggleExpanded: (groupKey: string) => void;
    onToggleSelection: (groupKey: string) => void;
    selectedLines: string[];
    onToggleLine: (lineKey: string) => void;
    onToggleCompany: (company: string, lines: Record<string, { name: string; name_en?: string; stations?: string[] }>) => void;
    expandedCompanies: Record<string, boolean>;
    toggleCompany: (company: string) => void;
    lineLengths: Record<string, number>;
    visitedLineLengths: Record<string, number>;
    sortMode: 'ja' | 'usage';
    activeLine?: string | null;
    onLineClick?: (line: string) => void;
    registerLineRef: (key: string, el: HTMLDivElement | null) => void;
    companyNames: Record<string, { name: string; name_en?: string }>;
    lineNames: Record<string, { name: string; name_en?: string }>;
}

const SidebarLineItem: React.FC<{
    lineId: string;
    companyId: string;
    lineData: { name: string; name_en?: string };
    registerLineRef: (key: string, el: HTMLDivElement | null) => void;
    onLineClick?: (line: string) => void;
    onToggleLine: (lineKey: string) => void;
    selectedLines: string[];
    activeLine?: string | null;
    lineLengths: Record<string, number>;
    visitedLineLengths: Record<string, number>;
}> = memo(({ lineId, companyId, lineData, registerLineRef, onLineClick, onToggleLine, selectedLines, activeLine, lineLengths, visitedLineLengths }) => {
    const lName = lineData.name_en || lineData.name;
    const key = `${companyId}::${lineId}`;
    const isActive = activeLine === key;
    const isSelected = selectedLines.includes(key) || isActive;
    const percent = lineLengths[key] ? ((visitedLineLengths?.[key] || 0) / lineLengths[key] * 100) : 0;
    const isCompleted = percent >= 99.9;

    return (
        <div
            ref={el => registerLineRef(key, el)}
            onClick={() => onLineClick?.(key)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onLineClick?.(key);
                }
            }}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 0',
                backgroundColor: isActive ? '#e6f7ff' : 'transparent',
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
                                fontSize: '13px',
                                color: isCompleted ? '#186A3B' : '#333',
                                fontWeight: (isSelected || isCompleted) ? 'bold' : '800',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                            {lName}
                        </span>
                        {lineData.name_en && lineData.name_en !== lName && (
                            <span style={{
                                fontSize: '10px',
                                fontWeight: '500',
                                color: '#718096',
                                marginTop: '-1px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                opacity: 0.8
                            }}>
                                {lineData.name}
                            </span>
                        )}
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
        </div >
    );
});

SidebarLineItem.displayName = 'SidebarLineItem';

const SidebarGroup: React.FC<SidebarGroupProps> = (props) => {
    const {
        title, groupKey, companies, expanded, onToggleExpanded, onToggleSelection,
        selectedLines, onToggleLine, onToggleCompany, expandedCompanies, toggleCompany,
        lineLengths, visitedLineLengths, sortMode, activeLine, onLineClick,
        registerLineRef, companyNames, lineNames
    } = props;

    if (Object.keys(companies).length === 0) return null;

    const getCompanyName = (id: string) => companyNames[id]?.name_en || companyNames[id]?.name || id;
    const getLineName = (id: string, lineData?: { name: string; name_en?: string }) => lineData?.name_en || lineData?.name || lineNames[id]?.name_en || lineNames[id]?.name || id;


    const sortedCompanies = Object.entries(companies).sort((a, b) => {
        if (sortMode === 'usage') {
            const getCompanyUsage = ([compId, lines]: [string, Record<string, { name: string; name_en?: string; stations?: string[] }>]) => {
                const total = Object.keys(lines).reduce((sum, lineId) => sum + (lineLengths[`${compId}::${lineId}`] || 0), 0);
                const visited = Object.keys(lines).reduce((sum, lineId) => sum + (visitedLineLengths[`${compId}::${lineId}`] || 0), 0);
                return total > 0 ? visited / total : 0;
            };
            return getCompanyUsage(b) - getCompanyUsage(a);
        }
        return getCompanyName(a[0]).localeCompare(getCompanyName(b[0]), 'en');
    });

    return (
        <div style={{ marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
            <div
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                style={{
                    padding: '10px',
                    background: '#f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                }}
                onClick={() => onToggleExpanded(groupKey)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onToggleExpanded(groupKey);
                    }
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{title}</span>
                    {(() => {
                        let total = 0;
                        let visited = 0;
                        Object.entries(companies).forEach(([compId, lines]) => {
                            Object.keys(lines).forEach((lineId) => {
                                total++;
                                const key = `${compId}::${lineId}`;
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
                        checked={Object.entries(companies).every(([compId, lines]) => {
                            return Object.keys(lines).every(lineId => selectedLines.includes(`${compId}::${lineId}`));
                        })}
                        onChange={(e) => {
                            e.stopPropagation();
                            onToggleSelection(groupKey);
                        }}
                        title="Toggle Category"
                        style={{ cursor: 'pointer' }}
                    />
                    <span>{expanded ? '▼' : '▶'}</span>
                </div>
            </div>
            {expanded && (
                <div style={{ padding: '0 10px 10px 10px' }}>
                    {sortedCompanies.map(([companyId, lines]) => {
                        const isExpanded = expandedCompanies[companyId];
                        const lineIds = Object.keys(lines);
                        const companyData = companyNames[companyId];
                        const cName = companyData?.name_en || companyData?.name || companyId;
                        const cNameEn = companyData?.name || "";

                        const allLinesSelected = Object.keys(lines).every(lineId => selectedLines.includes(`${companyId}::${lineId}`));
                        const someLinesSelected = Object.keys(lines).some(lineId => selectedLines.includes(`${companyId}::${lineId}`));

                        const companyTotalLines = Object.keys(lines).length;
                        const companyVisitedCount = Object.keys(lines).filter(lineId => (visitedLineLengths[`${companyId}::${lineId}`] || 0) > 0).length;

                        const companySortedLines = [...lineIds].sort((a, b) => {
                            if (sortMode === 'usage') {
                                const getUsage = (lId: string) => {
                                    const k = `${companyId}::${lId}`;
                                    return lineLengths[k] ? (visitedLineLengths[k] || 0) / lineLengths[k] : 0;
                                };
                                return getUsage(b) - getUsage(a);
                            }
                            return getLineName(a).localeCompare(getLineName(b), 'en');
                        });

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
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                toggleCompany(companyId);
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        aria-expanded={isExpanded}
                                        style={{ cursor: 'pointer', flex: 1, fontWeight: 'bold', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                            <span style={{
                                                fontSize: '13px',
                                                fontWeight: '800',
                                                color: '#333',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {cName}
                                            </span>
                                            {cNameEn && cNameEn !== cName && (
                                                <span style={{
                                                    fontSize: '10px',
                                                    color: '#718096',
                                                    marginTop: '-2px',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    opacity: 0.8
                                                }}>
                                                    {cNameEn}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {(() => {
                                                let totalDist = 0;
                                                let visitedDist = 0;
                                                Object.keys(lines).forEach(lId => {
                                                    const key = `${companyId}::${lId}`;
                                                    totalDist += lineLengths[key] || 0;
                                                    visitedDist += visitedLineLengths[key] || 0;
                                                });
                                                if (totalDist === 0) return null;
                                                const companyPercent = (visitedDist / totalDist) * 100;
                                                const colors = getProgressColor(companyPercent);
                                                return (
                                                    <span style={{
                                                        fontSize: '9px',
                                                        fontWeight: '800',
                                                        backgroundColor: colors.bg,
                                                        color: colors.text,
                                                        padding: '0px 4px',
                                                        borderRadius: '4px',
                                                        transition: 'all 0.3s'
                                                    }}>
                                                        {companyPercent.toFixed(companyPercent >= 100 ? 0 : 1)}%
                                                    </span>
                                                );
                                            })()}
                                            <span style={{ fontSize: '11px', color: '#666', fontWeight: 'normal', flexShrink: 0 }}>
                                                ({companyVisitedCount}/{companyTotalLines})
                                            </span>
                                        </div>
                                    </span>
                                </div>
                                {isExpanded && (
                                    <div style={{ marginLeft: '22px' }}>
                                        {companySortedLines.map(lId => (
                                            <SidebarLineItem
                                                key={lId}
                                                lineId={lId}
                                                companyId={companyId}
                                                lineData={lineNames[lId]}
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
                    })}
                </div>
            )}
        </div>
    );
};

SidebarGroup.displayName = 'SidebarGroup';
export default memo(SidebarGroup);
