import React, { memo } from 'react';
import { trackEvent } from '../lib/gtag';
import { getProgressColor } from '../lib/uiUtils';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName } from '../lib/i18n-utils';

interface SidebarGroupProps {
    title: string;
    groupKey: string;
    companies: Record<string, Record<string, { name: string; name_en?: string; name_kr?: string; stations?: string[] }>>;
    expanded: boolean;
    onToggleExpanded: (groupKey: string) => void;
    onToggleSelection: (groupKey: string) => void;
    selectedLines: string[];
    onToggleLine: (lineKey: string) => void;
    onToggleCompany: (company: string, lines: Record<string, { name: string; name_en?: string; name_kr?: string; stations?: string[] }>) => void;
    expandedCompanies: Record<string, boolean>;
    toggleCompany: (company: string) => void;
    lineLengths: Record<string, number>;
    visitedLineLengths: Record<string, number>;
    sortMode: 'ja' | 'usage';
    activeLine?: string | null;
    onLineClick?: (line: string) => void;
    registerLineRef: (key: string, el: HTMLDivElement | null) => void;
    companyNames: Record<string, { name: string; name_en?: string; name_kr?: string }>;
    lineNames: Record<string, { name: string; name_en?: string; name_kr?: string }>;
}

const SidebarLineItem: React.FC<{
    lineId: string;
    companyId: string;
    lineData: { name: string; name_en?: string; name_kr?: string };
    registerLineRef: (key: string, el: HTMLDivElement | null) => void;
    onLineClick?: (line: string) => void;
    onToggleLine: (lineKey: string) => void;
    selectedLines: string[];
    activeLine?: string | null;
    lineLengths: Record<string, number>;
    visitedLineLengths: Record<string, number>;
}> = memo(({ lineId, companyId, lineData, registerLineRef, onLineClick, onToggleLine, selectedLines, activeLine, lineLengths, visitedLineLengths }) => {
    const { language } = useI18n();
    const lName = getLocalizedName(lineData, language);
    const lNameSub = language !== 'ja' ? lineData.name : '';
    const key = `${companyId}::${lineId}`;
    const isActive = activeLine === key;
    const isSelected = selectedLines.includes(key) || isActive;
    const percent = lineLengths[key] ? ((visitedLineLengths?.[key] || 0) / lineLengths[key] * 100) : 0;
    const isCompleted = percent >= 99.9;

    return (
        <div
            ref={el => registerLineRef(key, el)}
            onClick={() => onLineClick?.(key)}
            className={`flex flex-col p-2 rounded-lg cursor-pointer transition-all border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 group/line ${isActive ? 'bg-primary/5 border-primary/20 shadow-sm ring-1 ring-primary/10' : ''
                }`}
            role="button"
            tabIndex={0}
        >
            <div className="flex items-center gap-2 mb-1.5">
                <div className="relative size-4 flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleLine(key);
                            trackEvent('line_toggle', 'interaction', key);
                        }}
                        className="peer appearance-none size-4 rounded border border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary cursor-pointer shrink-0 transition-all focus:ring-2 focus:ring-primary/20 pointer-events-auto"
                    />
                    <span className="material-symbols-outlined absolute pointer-events-none text-[12px] text-white scale-0 peer-checked:scale-100 transition-transform font-black">
                        check
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-baseline gap-1.5 min-w-0 overflow-hidden">
                            <span className={`text-xs font-bold truncate ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-200'
                                } group-hover/line:text-primary transition-colors`}>
                                {lName}
                            </span>
                            {lNameSub && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                                    {lNameSub}
                                </span>
                            )}
                        </div>
                        {percent > 0 && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${isCompleted
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-primary/10 text-primary dark:bg-primary/20'
                                }`}>
                                {percent.toFixed(percent >= 100 ? 0 : 1)}%
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {lineLengths[key] > 0 && (
                <div className="pl-6 pr-1 space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                        <span>{(visitedLineLengths?.[key] || 0).toFixed(1)} km</span>
                        <span>{lineLengths[key].toFixed(1)} km</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-primary'
                                }`}
                            style={{ width: `${Math.min(100, percent)}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
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

    const { language } = useI18n();
    if (Object.keys(companies).length === 0) return null;
    const getCompanyName = (id: string) => companyNames[id]?.name || id;
    const getLineName = (id: string, lineData?: { name: string; name_en?: string; name_kr?: string }) => lineData?.name || lineNames[id]?.name || id;

    const sortedCompanies = Object.entries(companies).sort((a, b) => {
        if (sortMode === 'usage') {
            const getCompanyUsage = ([compId, lines]: [string, Record<string, any>]) => {
                let total = 0;
                let visited = 0;
                Object.keys(lines).forEach(lineId => {
                    const key = `${compId}::${lineId}`;
                    total += lineLengths[key] || 0;
                    visited += visitedLineLengths[key] || 0;
                });
                return total > 0 ? visited / total : 0;
            };
            return getCompanyUsage(b) - getCompanyUsage(a);
        }
        return getCompanyName(a[0]).localeCompare(getCompanyName(b[0]), 'en');
    });

    // Group-level stats
    let groupTotalLines = 0;
    let groupVisitedLines = 0;
    Object.entries(companies).forEach(([compId, lines]) => {
        Object.keys(lines).forEach((lineId) => {
            groupTotalLines++;
            const key = `${compId}::${lineId}`;
            if ((visitedLineLengths[key] || 0) > 0) groupVisitedLines++;
        });
    });

    const isAllGroupSelected = Object.entries(companies).every(([compId, lines]) => {
        return Object.keys(lines).every(lineId => selectedLines.includes(`${compId}::${lineId}`));
    });

    const isSomeGroupSelected = Object.entries(companies).some(([compId, lines]) => {
        return Object.keys(lines).some(lineId => selectedLines.includes(`${compId}::${lineId}`));
    });

    return (
        <details className="group/details border-b border-slate-50 dark:border-slate-800/50" open={expanded}>
            <summary
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer list-none transition-colors"
                onClick={(e) => {
                    e.preventDefault();
                    onToggleExpanded(groupKey);
                }}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative size-4 flex items-center justify-center">
                        <input
                            type="checkbox"
                            checked={isAllGroupSelected}
                            ref={input => {
                                if (input) {
                                    input.indeterminate = isSomeGroupSelected && !isAllGroupSelected;
                                }
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSelection(groupKey);
                                trackEvent('category_toggle', 'interaction', groupKey);
                            }}
                            onChange={() => { }} // Controlled component needs onChange
                            className="peer appearance-none size-4 rounded border border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary indeterminate:bg-primary indeterminate:border-primary cursor-pointer shrink-0 transition-all focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="material-symbols-outlined absolute pointer-events-none text-[12px] text-white scale-0 peer-checked:scale-100 transition-transform font-black">
                            check
                        </span>
                        <div className="absolute pointer-events-none scale-0 peer-indeterminate:scale-100 transition-transform">
                            <div className="size-1.5 bg-white rounded-full"></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-slate-400 text-lg group-open/details:text-primary transition-colors">
                            {groupKey === '0' ? 'speed' : groupKey === '1' ? 'train' : groupKey === '2' ? 'tram' : groupKey === '3' ? 'train' : groupKey === '5' ? 'subway' : 'train'}
                        </span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate group-open/details:text-slate-900 dark:group-open/details:text-white">
                            {title}
                        </span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-black">
                            {groupVisitedLines}/{groupTotalLines}
                        </span>
                    </div>
                </div>
                <span className="material-symbols-outlined text-slate-400 group-open/details:rotate-180 transition-transform duration-300 text-xl">
                    expand_more
                </span>
            </summary>

            <div className="pl-6 pr-1 py-1 space-y-3">
                {sortedCompanies.map(([companyId, lines]) => {
                    const isExpanded = expandedCompanies[companyId];
                    const companyData = companyNames[companyId];
                    const cName = getLocalizedName(companyData, language) || companyId;
                    const cNameSub = (language !== 'ja' && companyData?.name) ? companyData.name : '';

                    const allLinesSelected = Object.keys(lines).every(lineId => selectedLines.includes(`${companyId}::${lineId}`));
                    const someLinesSelected = Object.keys(lines).some(lineId => selectedLines.includes(`${companyId}::${lineId}`));

                    const companyTotalLines = Object.keys(lines).length;
                    const companyVisitedCount = Object.keys(lines).filter(lineId => (visitedLineLengths[`${companyId}::${lineId}`] || 0) > 0).length;

                    const companySortedLines = Object.keys(lines).sort((a, b) => {
                        if (sortMode === 'usage') {
                            const getUsage = (lId: string) => {
                                const k = `${companyId}::${lId}`;
                                return lineLengths[k] ? (visitedLineLengths[k] || 0) / lineLengths[k] : 0;
                            };
                            return getUsage(b) - getUsage(a);
                        }
                        return getLineName(a, lines[a]).localeCompare(getLineName(b, lines[b]), 'en');
                    });

                    return (
                        <div key={companyId} className="border-l-2 border-slate-100 dark:border-slate-800 pl-3 py-1 ml-2">
                            <div className="flex items-center gap-2 mb-2 group/company">
                                <div className="relative size-3.5 flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={allLinesSelected}
                                        ref={input => {
                                            if (input) {
                                                input.indeterminate = someLinesSelected && !allLinesSelected;
                                            }
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleCompany(companyId, lines);
                                            trackEvent('company_toggle_selection', 'interaction', companyId);
                                        }}
                                        onChange={() => { }} // Controlled component needs onChange
                                        className="peer appearance-none size-3.5 rounded border border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary indeterminate:bg-primary indeterminate:border-primary cursor-pointer shrink-0 transition-all focus:ring-2 focus:ring-primary/20"
                                    />
                                    <span className="material-symbols-outlined absolute pointer-events-none text-[10px] text-white scale-0 peer-checked:scale-100 transition-transform font-black">
                                        check
                                    </span>
                                    <div className="absolute pointer-events-none scale-0 peer-indeterminate:scale-100 transition-transform">
                                        <div className="size-1 bg-white rounded-full"></div>
                                    </div>
                                </div>
                                <div
                                    className="flex-1 min-w-0 cursor-pointer flex justify-between items-center pr-2"
                                    onClick={() => toggleCompany(companyId)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="flex flex-1 flex-col items-start min-w-0">
                                        <span className="text-[13px] font-black text-slate-800 dark:text-slate-200 truncate group-hover/company:text-primary transition-colors leading-tight">
                                            {cName}
                                        </span>
                                        {cNameSub && (
                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold truncate tracking-tight uppercase leading-tight mt-0.5">
                                                {cNameSub}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                                            {companyVisitedCount}/{companyTotalLines}
                                        </div>
                                        <span className={`material-symbols-outlined text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                            arrow_drop_down
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="space-y-1 animate-in slide-in-from-left-2 duration-200">
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
        </details>
    );
};

SidebarGroup.displayName = 'SidebarGroup';
export default memo(SidebarGroup);
