'use client';

import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { BranchIcon, ChevronDownIcon, ChevronUpIcon, SidebarFrame, SidebarSegmentTabs } from '@ppotal/ui';
import { trackEvent } from '../lib/gtag';
import { useStationHierarchy } from '../hooks/useStationHierarchy';
import { useRailData } from '../hooks/useRailData';
import SidebarGroup from './SidebarGroup';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName } from '../lib/i18n-utils';
import { SIDEBAR_TRANSLATIONS, getTranslations } from '../lib/translations';

export interface SidebarProps {
    selectedLines: string[];
    onToggleLine: (line: string) => void;
    onSetSelectedLines: (lines: string[]) => void;
    lineLengths?: Record<string, number>;
    visitedLineLengths?: Record<string, number>;
    activeLine?: string | null;
    onLineClick?: (line: string) => void;
    className?: string;
    isMobile?: boolean;
    onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    selectedLines, 
    onToggleLine, 
    onSetSelectedLines, 
    lineLengths: propLineLengths, 
    visitedLineLengths = {}, 
    activeLine, 
    onLineClick, 
    className, 
    isMobile = false,
    onClose,
}) => {
    const { railData } = useRailData();
    const { groupedHierarchy, companyNames, lineNames, lineLengths: hookLineLengths, CATEGORY_MAP } = useStationHierarchy(railData);
    const { language } = useI18n();

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
                setExpandedGroups(prev => ({ ...prev, [g]: true }));
                setExpandedCompanies(prev => ({ ...prev, [c]: true }));

                setTimeout(() => {
                    const el = lineRefs.current[activeLine];
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 100);
            }
        }
    }, [activeLine, groupedHierarchy]);

    const toggleGroup = useCallback((group: string) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
        trackEvent('toggle_group', 'filter', group);
    }, []);

    const toggleCompany = useCallback((company: string) => {
        setExpandedCompanies(prev => ({ ...prev, [company]: !prev[company] }));
        trackEvent('toggle_company', 'filter', company);
    }, []);

    const handleGroupToggle = useCallback((group: string) => {
        if (!groupedHierarchy || !groupedHierarchy[group]) return;
        const companies = groupedHierarchy[group];
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

    const t = getTranslations(SIDEBAR_TRANSLATIONS, language);

    if (!groupedHierarchy || !CATEGORY_MAP || !companyNames || !lineNames) {
        return <div className="p-10 text-center text-slate-400 font-bold">{t.loading}</div>;
    }

    const sortedCategoryIds = Object.keys(groupedHierarchy).sort((a, b) => parseInt(a) - parseInt(b));

    return (
        <SidebarFrame
            className={className}
            icon={<BranchIcon className="w-5 h-5 text-primary" />}
            title={t.title}
            subtitle={t.subtitle}
            onClose={onClose}
            headerActions={
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSelectAll}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                        {t.all}
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <button
                        onClick={handleDeselectAll}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:underline cursor-pointer"
                    >
                        {t.none}
                    </button>
                </div>
            }
            tabs={
                <div className="space-y-2">
                    <SidebarSegmentTabs<'ja' | 'usage'>
                        options={[
                            { id: 'ja', label: t.alphabetical },
                            { id: 'usage', label: t.byUsage },
                        ]}
                        activeId={sortMode}
                        onChange={(m) => {
                            setSortMode(m);
                            trackEvent('sort_mode_change', 'filter', m);
                        }}
                    />

                    <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-400">
                        <span>{t.viewGroups}</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleToggleAllGroups(true)}
                                className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary transition-all cursor-pointer"
                                title={t.expandAll}
                            >
                                <ChevronDownIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => handleToggleAllGroups(false)}
                                className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary transition-all cursor-pointer"
                                title={t.collapseAll}
                            >
                                <ChevronUpIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            }
        >
            <div className="space-y-1 pb-8">
                {sortedCategoryIds.map((categoryId, index) => {
                    const categoryInfo = CATEGORY_MAP[parseInt(categoryId)];
                    if (!categoryInfo) return null;
                    const title = getLocalizedName(categoryInfo, language);
                    return (
                        <SidebarGroup
                            key={categoryId}
                            isMobile={isMobile}
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
        </SidebarFrame>
    );
};

export default memo(Sidebar);
