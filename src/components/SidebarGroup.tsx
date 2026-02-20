import React, { memo } from 'react';
import { Language } from '../lib/translations';
import { trackEvent } from '../lib/gtag';
import { getProgressColor } from '../lib/uiUtils';

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
    companyNames: Record<string, any>;
    lineNames: Record<string, any>;
}

const SidebarLineItem: React.FC<{
    lineId: string;
    companyId: string;
    lineData: any;
    language: Language;
    registerLineRef: (key: string, el: HTMLDivElement | null) => void;
    onLineClick?: (line: string) => void;
    onToggleLine: (lineKey: string) => void;
    selectedLines: string[];
    activeLine?: string | null;
    lineLengths: Record<string, number>;
    visitedLineLengths: Record<string, number>;
}> = memo(({ lineId, companyId, lineData, language, registerLineRef, onLineClick, onToggleLine, selectedLines, activeLine, lineLengths, visitedLineLengths }) => {
    const lName = lineData.name;
    const key = `${companyId}::${lineId}`;
    const isActive = activeLine === key;
    const isSelected = selectedLines.includes(key) || isActive;
    const percent = lineLengths[key] ? ((visitedLineLengths?.[key] || 0) / lineLengths[key] * 100) : 0;
    const isCompleted = percent >= 99.9;

    return (
        <div
            ref={el => registerLineRef(key, el)}
            onClick={() => onLineClick?.(key)}
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
                                fontSize: '12px',
                                color: isCompleted ? '#186A3B' : '#333',
                                fontWeight: (isSelected || isCompleted) ? 'bold' : 'normal',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                            {language === 'en' ? (lineData.name_en || lName) : lName}
                        </span>
                        {(language !== 'en' && lineData.name_en && lineData.name_en !== lName) && (
                            <span style={{
                                fontSize: '9px',
                                fontWeight: '400',
                                color: '#666',
                                marginTop: '-1px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {lineData.name_en}
                            </span>
                        )}
                        {(language === 'en' && lName && lName !== (lineData.name_en || lName)) && (
                            <span style={{
                                fontSize: '9px',
                                fontWeight: '400',
                                color: '#666',
                                marginTop: '-1px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {lName}
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

const SidebarGroup: React.FC<SidebarGroupProps> = ({
    title, groupKey, companies, expanded, onToggleExpanded, onToggleSelection,
    selectedLines, onToggleLine, onToggleCompany, expandedCompanies,
    toggleCompany, lineLengths, visitedLineLengths, sortMode,
    activeLine, onLineClick, language, registerLineRef,
    companyNames, lineNames
}) => {
    if (Object.keys(companies).length === 0) return null;

    const getCompanyName = (id: string) => companyNames[id]?.name || id;
    const getLineName = (id: string, lineData?: any) => lineData?.name || lineNames[id]?.name || id;

    const sortLines = (lineIds: string[]) => {
        if (sortMode === 'usage') {
            const getLineUsage = (lineId: string, companyId: string) => {
                const key = `${companyId}::${lineId}`;
                return lineLengths[key] ? ((visitedLineLengths?.[key] || 0) / lineLengths[key]) : 0;
            };
            // This is slightly complex because we need companyId. Let's assume companyId is available in scope or passed.
            // Actually, sortLines is called within sortedCompanies.map.
            // Let's refactor sortLines to take companyId.
        }
        return [...lineIds].sort((a, b) => getLineName(a).localeCompare(getLineName(b), 'ja'));
    };

    const sortedCompanies = Object.entries(companies).sort((a, b) => {
        if (sortMode === 'usage') {
            const getCompanyUsage = ([compId, lines]: [string, Record<string, any>]) => {
                const total = Object.keys(lines).reduce((sum, lineId) => sum + (lineLengths[`${compId}::${lineId}`] || 0), 0);
                const visited = Object.keys(lines).reduce((sum, lineId) => sum + (visitedLineLengths[`${compId}::${lineId}`] || 0), 0);
                return total > 0 ? visited / total : 0;
            };
            return getCompanyUsage(b) - getCompanyUsage(a);
        }
        return getCompanyName(a[0]).localeCompare(getCompanyName(b[0]), 'ja');
    });

    return (
        <div style={{ marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
            <div
                style={{
                    padding: '10px',
                    background: '#f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                }}
                onClick={() => onToggleExpanded(groupKey)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{title}</span>
                    {(() => {
                        let total = 0;
                        let visited = 0;
                        Object.entries(companies).forEach(([compId, lines]) => {
                            Object.entries(lines).forEach(([lineId, lineData]) => {
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
                        const cName = companyData?.name || companyId;
                        const cNameEn = companyData?.name_en || "";

                        const allLinesSelected = Object.keys(lines).every(lineId => selectedLines.includes(`${companyId}::${lineId}`));
                        const someLinesSelected = Object.keys(lines).some(lineId => selectedLines.includes(`${companyId}::${lineId}`));

                        const companyTotalLines = Object.keys(lines).length;
                        const companyVisitedCount = Object.keys(lines).filter(lineId => (visitedLineLengths[`${companyId}::${lineId}`] || 0) > 0).length;

                        // Local sort with companyId
                        const companySortedLines = [...lineIds].sort((a, b) => {
                            if (sortMode === 'usage') {
                                const getUsage = (lId: string) => {
                                    const k = `${companyId}::${lId}`;
                                    return lineLengths[k] ? (visitedLineLengths[k] || 0) / lineLengths[k] : 0;
                                };
                                return getUsage(b) - getUsage(a);
                            }
                            return getLineName(a).localeCompare(getLineName(b), 'ja');
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
                                                {language === 'en' ? (cNameEn || cName) : cName}
                                            </span>
                                            {(language !== 'en' && cNameEn && cNameEn !== cName) && (
                                                <span style={{
                                                    fontSize: '10px',
                                                    color: '#888',
                                                    marginTop: '-2px',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {cNameEn}
                                                </span>
                                            )}
                                            {(language === 'en' && cName && cName !== cNameEn) && (
                                                <span style={{
                                                    fontSize: '10px',
                                                    color: '#888',
                                                    marginTop: '-2px',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {cName}
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '11px', color: '#666', fontWeight: 'normal', flexShrink: 0 }}>
                                            ({companyVisitedCount}/{companyTotalLines})
                                        </span>
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
                                                language={language}
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

export default memo(SidebarGroup);
