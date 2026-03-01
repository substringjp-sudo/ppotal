'use client';

import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { trackEvent } from '../lib/gtag';
import { useStationHierarchy } from '../hooks/useStationHierarchy';
import { useRailData } from '../hooks/useRailData';
import SidebarGroup from './SidebarGroup';
import { useAuth } from '../lib/auth-context';
import AuthModal from './auth/AuthModal';

export interface SidebarProps {
    selectedLines: string[];
    onToggleLine: (line: string) => void;
    onSetSelectedLines: (lines: string[]) => void;
    lineLengths?: Record<string, number>;
    visitedLineLengths?: Record<string, number>;
    activeLine?: string | null;
    onLineClick?: (line: string) => void;
    className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedLines, onToggleLine, onSetSelectedLines, lineLengths: propLineLengths, visitedLineLengths = {}, activeLine, onLineClick, className }) => {
    const { railData } = useRailData();
    const { groupedHierarchy, companyNames, lineNames, lineLengths: hookLineLengths, CATEGORY_MAP } = useStationHierarchy(railData);

    const effectiveLineLengths = propLineLengths && Object.keys(propLineLengths).length > 0 ? propLineLengths : hookLineLengths;
    const [sortMode, setSortMode] = useState<'ja' | 'usage'>('ja');
    const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const lineRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        if (activeLine && groupedHierarchy) {
            let foundGroup: string | null = null;
            let foundCompany: string | null = null;

            for (const categoryId of Object.keys(groupedHierarchy)) {
                for (const companyId of Object.keys(groupedHierarchy[categoryId])) {
                    if (Object.keys(groupedHierarchy[categoryId][companyId]).some(lineId => `${companyId}::${lineId}` === activeLine)) {
                        foundGroup = categoryId;
                        foundCompany = companyId;
                        break;
                    }
                }
                if (foundGroup) break;
            }

            if (foundGroup && foundCompany) {
                const g = foundGroup;
                const c = foundCompany;
                Promise.resolve().then(() => {
                    setExpandedGroups(prev => ({ ...prev, [g]: true }));
                    setExpandedCompanies(prev => ({ ...prev, [c]: true }));
                });
                setTimeout(() => {
                    const el = lineRefs.current[activeLine];
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }, [activeLine, groupedHierarchy]);

    const toggleCompany = useCallback((company: string) => {
        setExpandedCompanies(prev => {
            const newState = !prev[company];
            trackEvent('company_toggle', 'ui_interaction', company, newState ? 1 : 0);
            return { ...prev, [company]: newState };
        });
    }, []);

    const toggleGroup = useCallback((group: string) => {
        setExpandedGroups(prev => {
            let currentState = prev[group];
            if (currentState === undefined && groupedHierarchy) {
                const sortedIds = Object.keys(groupedHierarchy).sort((a, b) => parseInt(a) - parseInt(b));
                currentState = sortedIds.indexOf(group) < 4;
            }
            const newState = !currentState;
            trackEvent('group_toggle', 'ui_interaction', group, newState ? 1 : 0);
            return { ...prev, [group]: newState };
        });
    }, [groupedHierarchy]);

    const handleGroupToggle = useCallback((groupKey: string) => {
        if (!groupedHierarchy) return;
        const companies = groupedHierarchy[groupKey];
        if (!companies) return;

        const allKeys: string[] = [];
        Object.entries(companies).forEach(([compId, lines]) => {
            Object.keys(lines).forEach(lineId => {
                allKeys.push(`${compId}::${lineId}`);
            });
        });

        const allSelected = allKeys.every(k => selectedLines.includes(k));
        let newSelected = allSelected
            ? selectedLines.filter(l => !allKeys.includes(l))
            : Array.from(new Set([...selectedLines, ...allKeys]));

        if (newSelected.length > 1 && newSelected.includes("__NONE__")) {
            newSelected = newSelected.filter(l => l !== "__NONE__");
        }

        onSetSelectedLines(newSelected);
    }, [groupedHierarchy, selectedLines, onSetSelectedLines]);

    const handleCompanyToggle = useCallback((companyId: string, lines: Record<string, { name: string; name_en?: string; stations?: string[]; }>) => {
        const lineIds = Object.keys(lines);
        const compositeKeys = lineIds.map(lineId => `${companyId}::${lineId}`);

        const allSelected = compositeKeys.every(key => selectedLines.includes(key));
        let newSelected = allSelected
            ? selectedLines.filter(l => !compositeKeys.includes(l))
            : Array.from(new Set([...selectedLines, ...compositeKeys]));

        if (newSelected.length > 1 && newSelected.includes("__NONE__")) {
            newSelected = newSelected.filter(l => l !== "__NONE__");
        }
        onSetSelectedLines(newSelected);
    }, [selectedLines, onSetSelectedLines]);

    const handleSelectAll = useCallback(() => {
        if (!groupedHierarchy) return;
        const allKeys: string[] = [];
        Object.values(groupedHierarchy).forEach(companies => {
            Object.entries(companies).forEach(([compId, lines]) => {
                Object.keys(lines).forEach(lineId => {
                    allKeys.push(`${compId}::${lineId}`);
                });
            });
        });
        onSetSelectedLines(allKeys);
        trackEvent('select_all', 'interaction', 'all_lines');
    }, [groupedHierarchy, onSetSelectedLines]);

    const handleDeselectAll = useCallback(() => {
        onSetSelectedLines(["__NONE__"]);
        trackEvent('deselect_all', 'interaction', 'none');
    }, [onSetSelectedLines]);

    const handleToggleAllGroups = useCallback((expand: boolean) => {
        if (!groupedHierarchy) return;
        const allGroups: Record<string, boolean> = {};
        Object.keys(groupedHierarchy).forEach(g => allGroups[g] = expand);
        setExpandedGroups(allGroups);

        const allCompanies: Record<string, boolean> = {};
        Object.keys(companyNames).forEach(c => allCompanies[c] = expand);
        setExpandedCompanies(allCompanies);
    }, [groupedHierarchy, companyNames]);

    const registerLineRef = useCallback((key: string, el: HTMLDivElement | null) => {
        lineRefs.current[key] = el;
    }, []);

    if (!groupedHierarchy || !CATEGORY_MAP || !companyNames || !lineNames) return <div>Loading...</div>;

    const sortedCategoryIds = Object.keys(groupedHierarchy).sort((a, b) => parseInt(a) - parseInt(b));

    return (
        <div className={`flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden font-display ${className || ""}`}>
            {/* Sidebar Header & Progress Card */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">account_tree</span>
                    Railroad Networks
                </h2>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-tight font-semibold">Select lines to visualize on map</p>
            </div>

            {/* Sidebar Controls */}
            <div className="p-3 border-b border-slate-50 dark:border-slate-800 space-y-3 shrink-0 bg-slate-50/30 dark:bg-slate-800/20">
                {/* Sort Mode */}
                <div>
                    <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest pl-1">Sort & Organize</div>
                    <div className="flex p-0.5 bg-slate-200/50 dark:bg-slate-700/50 rounded-lg">
                        {[
                            { id: 'ja', label: 'Alphabetical', icon: 'sort_by_alpha' },
                            { id: 'usage', label: 'By Usage', icon: 'trending_up' },
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => {
                                    setSortMode(opt.id as 'ja' | 'usage');
                                    trackEvent('sort_mode_change', 'filter', opt.id);
                                }}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[11px] font-bold rounded-md transition-all ${sortMode === opt.id
                                    ? 'bg-white dark:bg-slate-600 text-primary shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bulk Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <div className="text-[9px] font-bold text-slate-400 uppercase px-1">Selection</div>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                onClick={handleSelectAll}
                                className="h-8 flex items-center justify-center px-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-primary hover:text-primary transition-all active:scale-95 shadow-sm"
                                title="Select All Lines"
                            >
                                All
                            </button>
                            <button
                                onClick={handleDeselectAll}
                                className="h-8 flex items-center justify-center px-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-red-400 hover:text-red-500 transition-all active:scale-95 shadow-sm"
                                title="Deselect All Lines"
                            >
                                None
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <div className="text-[9px] font-bold text-slate-400 uppercase px-1">View Groups</div>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                onClick={() => handleToggleAllGroups(true)}
                                className="h-8 flex items-center justify-center px-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-primary hover:text-primary transition-all active:scale-95 shadow-sm"
                                title="Expand All Categories"
                            >
                                <span className="material-symbols-outlined text-[18px]">expand_all</span>
                            </button>
                            <button
                                onClick={() => handleToggleAllGroups(false)}
                                className="h-8 flex items-center justify-center px-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-primary hover:text-primary transition-all active:scale-95 shadow-sm"
                                title="Collapse All Categories"
                            >
                                <span className="material-symbols-outlined text-[18px]">collapse_all</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Groups List */}
            <div className="flex-1 overflow-y-auto p-2 pb-10 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                <div className="space-y-1">
                    {sortedCategoryIds.map((categoryId, index) => {
                        const categoryInfo = CATEGORY_MAP[parseInt(categoryId)];
                        if (!categoryInfo) return null;
                        const title = categoryInfo.name || categoryInfo.name_en;
                        return (
                            <SidebarGroup
                                key={categoryId}
                                title={title}
                                groupKey={categoryId}
                                companies={groupedHierarchy[categoryId]}
                                expanded={expandedGroups[categoryId] !== undefined ? expandedGroups[categoryId] : index < 4}
                                onToggleExpanded={toggleGroup}
                                onToggleSelection={handleGroupToggle}
                                selectedLines={selectedLines}
                                onToggleLine={onToggleLine}
                                onToggleCompany={handleCompanyToggle}
                                expandedCompanies={expandedCompanies}
                                toggleCompany={toggleCompany}
                                lineLengths={effectiveLineLengths}
                                visitedLineLengths={visitedLineLengths}
                                sortMode={sortMode}
                                activeLine={activeLine}
                                onLineClick={onLineClick}
                                registerLineRef={registerLineRef}
                                companyNames={companyNames}
                                lineNames={lineNames}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default memo(Sidebar);
