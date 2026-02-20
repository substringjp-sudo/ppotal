import React, { memo } from 'react';
import { normalizeKey, translateName } from '../lib/lineUtils';
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
    cName: string;
    lineData: any;
    language: Language;
    registerLineRef: (key: string, el: HTMLDivElement | null) => void;
    onLineClick?: (line: string) => void;
    onToggleLine: (lineKey: string) => void;
    selectedLines: string[];
    activeLine?: string | null;
    lineLengths: Record<string, number>;
    visitedLineLengths: Record<string, number>;
}> = memo(({ lineId, cName, lineData, language, registerLineRef, onLineClick, onToggleLine, selectedLines, activeLine, lineLengths, visitedLineLengths }) => {
    const lName = lineData.name;
    const key = `${cName}::${lName}`;
    const normalizedKey = normalizeKey(key);
    const isActive = activeLine ? normalizeKey(activeLine) === normalizedKey : false;
    const isSelected = selectedLines.some(sl => normalizeKey(sl) === normalizedKey) || isActive;
    const percent = lineLengths[normalizedKey] ? ((visitedLineLengths?.[normalizedKey] || 0) / lineLengths[normalizedKey] * 100) : 0;
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
                            {translateName(lName, language, lineData.name_en)}
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
                            {language === 'en' ? lName : lineData.name_en}
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
    const getCompanyEnName = (id: string) => companyNames[id]?.name_en || id;
    const getLineName = (id: string) => lineNames[id]?.name || id;

    const sortLines = (lineIds: string[], companyId: string) => {
        if (sortMode === 'usage') {
            const getLineUsage = (lineId: string) => {
                const key = normalizeKey(`${getCompanyName(companyId)}::${getLineName(lineId)}`);
                return lineLengths[key] ? ((visitedLineLengths?.[key] || 0) / lineLengths[key]) : 0;
            };
            return [...lineIds].sort((a, b) => getLineUsage(b) - getLineUsage(a));
        }
        return [...lineIds].sort((a, b) => getLineName(a).localeCompare(getLineName(b), 'ja'));
    };

    const sortedCompanies = Object.entries(companies).sort((a, b) => {
        if (sortMode === 'usage') {
            const getCompanyUsage = ([, lines]: [string, Record<string, any>]) => {
                const total = Object.keys(lines).reduce((sum, lineId) => sum + (lineLengths[normalizeKey(`${getCompanyName(a[0])}::${getLineName(lineId)}`)] || 0), 0);
                const visited = Object.keys(lines).reduce((sum, lineId) => sum + (visitedLineLengths[normalizeKey(`${getCompanyName(a[0])}::${getLineName(lineId)}`)] || 0), 0);
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
                        Object.values(companies).forEach(lines => {
                            Object.keys(lines).forEach(lineId => {
                                total++;
                                const key = normalizeKey(`${getCompanyName(Object.keys(companies)[0])}::${getLineName(lineId)}`);
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
                        checked={Object.values(companies).every(lines => Object.keys(lines).every(lineId => selectedLines.includes(normalizeKey(`${getCompanyName(Object.keys(companies)[0])}::${getLineName(lineId)}`))))}
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

                        const allLinesSelected = lineIds.every(l => selectedLines.includes(normalizeKey(`${cName}::${getLineName(l)}`)));
                        const someLinesSelected = lineIds.some(l => selectedLines.includes(normalizeKey(`${cName}::${getLineName(l)}`)));

                        const companyTotalLines = lineIds.length;
                        const companyVisitedCount = lineIds.filter(l => (visitedLineLengths[normalizeKey(`${cName}::${getLineName(l)}`)] || 0) > 0).length;

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
                                                {translateName(cName, language, getCompanyEnName(companyId))}
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
                                                 {language === 'en' ? cName : getCompanyEnName(companyId)}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '11px', color: '#666', fontWeight: 'normal', flexShrink: 0 }}>
                                            ({companyVisitedCount}/{companyTotalLines})
                                        </span>
                                    </span>
                                </div>
                                {isExpanded && (
                                    <div style={{ marginLeft: '22px' }}>
                                        {sortLines(lineIds, companyId).map(lId => (
                                            <SidebarLineItem
                                                key={lId}
                                                lineId={lId}
                                                cName={cName}
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
