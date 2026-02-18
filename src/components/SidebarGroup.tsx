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
}

const SidebarGroup: React.FC<SidebarGroupProps> = ({
    title, groupKey, companies, expanded, onToggleExpanded, onToggleSelection,
    selectedLines, onToggleLine, onToggleCompany, expandedCompanies,
    toggleCompany, lineLengths, visitedLineLengths, sortMode,
    activeLine, onLineClick, language, registerLineRef
}) => {
    const isEmpty = Object.keys(companies).length === 0;
    if (isEmpty) return null;

    const getLocalizedName = (name: string, type: 'company' | 'line' | 'station' = 'station') => {
        if (language === 'ja') return name;
        return translateName(name, language, type);
    };

    const sortLines = (lineNames: string[], company: string) => {
        if (sortMode === 'usage') {
            const getLineUsage = (line: string) => {
                const key = normalizeKey(`${company}::${line}`);
                return lineLengths[key] ? ((visitedLineLengths?.[key] || 0) / lineLengths[key]) : 0;
            };
            return [...lineNames].sort((a, b) => getLineUsage(b) - getLineUsage(a));
        }
        return [...lineNames].sort((a, b) => a.localeCompare(b, 'ja'));
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
        return [...companyEntries].sort((a, b) => a[0].localeCompare(b[0], 'ja'));
    };

    const allGroupKeys: string[] = [];
    Object.entries(companies).forEach(([comp, lines]) => {
        Object.keys(lines).forEach(l => allGroupKeys.push(`${comp}::${l}`));
    });

    const allGroupSelected = allGroupKeys.every(k => selectedLines.includes(k));

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                        type="checkbox"
                        checked={(() => {
                            let all = true;
                            Object.entries(companies).forEach(([c, ls]) => {
                                if (!Object.keys(ls).every(l => selectedLines.includes(`${c}::${l}`))) all = false;
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
                    {sortCompaniesForRender(Object.entries(companies)).map(([company, lines]) => {
                        const isExpanded = expandedCompanies[company];
                        const lineNames = Object.keys(lines);
                        const compositeKeys = lineNames.map(l => `${company}::${l}`);
                        const allLinesSelected = compositeKeys.every(k => selectedLines.includes(k));
                        const someLinesSelected = compositeKeys.some(k => selectedLines.includes(k));

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
                                        onChange={() => onToggleCompany(company, lines)}
                                        style={{ marginRight: '8px', cursor: 'pointer' }}
                                    />
                                    <span
                                        onClick={() => toggleCompany(company)}
                                        style={{ cursor: 'pointer', flex: 1, fontWeight: 'bold', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {company}
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
                                                {COMPANY_EN_NAMES[company] || company}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '11px', color: '#666', fontWeight: 'normal', flexShrink: 0 }}>
                                            ({companyVisitedCount}/{companyTotalLines})
                                        </span>
                                        <span style={{ flexShrink: 0, fontSize: '10px' }}>
                                            {isExpanded ? '▼' : '▶'}
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
                                            const isActive = activeLine ? normalizeKey(activeLine) === normalizedKey : false;
                                            const isSelected = selectedLines.some(sl => normalizeKey(sl) === normalizedKey) || isActive;
                                            const percent = lineLengths[normalizedKey] ? ((visitedLineLengths?.[normalizedKey] || 0) / lineLengths[normalizedKey] * 100) : 0;
                                            const isCompleted = percent >= 99.9;

                                            return (
                                                <div
                                                    key={line}
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
                                                                        cursor: 'pointer'
                                                                    }}>
                                                                    {line}
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
                                                                    {LINE_EN_NAMES[line] || line}
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
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                    }
                </div>
            )}
        </div>
    );
};

export default memo(SidebarGroup);
