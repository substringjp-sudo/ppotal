"use client";

import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { normalizeKey } from '../lib/lineUtils';
import { Language, UI_TRANSLATIONS } from '../lib/translations';
import { trackEvent } from '../lib/gtag';
import { useStationHierarchy, GroupedHierarchy } from '../hooks/useStationHierarchy';
import { useRailData } from '../hooks/useRailData';
import SidebarGroup from './SidebarGroup';

interface SidebarProps {
    selectedLines: string[];
    onToggleLine: (line: string) => void;
    onSetSelectedLines: (lines: string[]) => void;
    lineLengths?: Record<string, number>;
    visitedLineLengths?: Record<string, number>;
    activeLine?: string | null;
    onLineClick?: (line: string) => void;
    language: Language;
    onLanguageChange?: (lang: Language) => void; // Added to match usage in AppClient
}

const Sidebar: React.FC<SidebarProps> = ({ selectedLines, onToggleLine, onSetSelectedLines, lineLengths = {}, visitedLineLengths = {}, activeLine, onLineClick, language }) => {
    const { railData } = useRailData();
    const { hierarchy, groupedHierarchy, companyNames, lineNames, lineLengths: hookLineLengths } = useStationHierarchy(railData);
    const [sortMode, setSortMode] = useState<'ja' | 'usage'>('ja');
    const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
    const [expandedGroups, setExpandedGroups] = useState<Record<keyof GroupedHierarchy, boolean>>({
        shinkansen: true,
        jr: true,
        majorPrivate: true,
        otherPrivate: false,
        nonRail: false,
    });
    const lineRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Helper functions for name resolution
    const getCompanyName = useCallback((id: string) => {
        return companyNames[id]?.name || id;
    }, [companyNames]);

    const getLineName = useCallback((id: string) => {
        return lineNames[id]?.name || id;
    }, [lineNames]);

    // Scroll active line into view and expand company if needed
    useEffect(() => {
        if (activeLine && groupedHierarchy) {
            let foundGroup: keyof GroupedHierarchy | null = null;
            let foundCompany: string | null = null;

            // Search for the active line in groups
            // activeLine is Name-based: "CompanyName::LineName"
            // groupedHierarchy structure is ID-based: group -> companyId -> lineId
            for (const group of Object.keys(groupedHierarchy) as (keyof GroupedHierarchy)[]) {
                for (const companyId of Object.keys(groupedHierarchy[group])) {
                    const cName = getCompanyName(companyId);
                    if (Object.keys(groupedHierarchy[group][companyId]).some(lineId => {
                        const lName = getLineName(lineId);
                        // Compare normalized keys to be safe
                        return normalizeKey(`${cName}::${lName}`) === normalizeKey(activeLine);
                    })) {
                        foundGroup = group;
                        foundCompany = companyId;
                        break;
                    }
                }
                if (foundGroup) break;
            }

            if (foundGroup && foundCompany) {
                setExpandedGroups(prev => ({ ...prev, [foundGroup!]: true }));
                setExpandedCompanies(prev => ({ ...prev, [foundCompany!]: true }));
                // Scroll logic is tricky because ref keys must match.
                // SidebarGroup registers refs using Name-based keys calling registerLineRef.
                // So activeLine (Name-based) should match the key in lineRefs.
                setTimeout(() => {
                    const el = lineRefs.current[activeLine];
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }, [activeLine, groupedHierarchy, getCompanyName, getLineName]);

    const toggleCompany = useCallback((company: string) => {
        setExpandedCompanies(prev => {
            const newState = !prev[company];
            trackEvent('company_toggle', 'ui_interaction', company, newState ? 1 : 0);
            return { ...prev, [company]: newState };
        });
    }, []);

    const toggleGroup = useCallback((group: string) => { // keyof GroupedHierarchy but passed as string from Child
        setExpandedGroups(prev => {
            const g = group as keyof GroupedHierarchy;
            const newState = !prev[g];
            trackEvent('group_toggle', 'ui_interaction', group, newState ? 1 : 0);
            return { ...prev, [g]: newState };
        });
    }, []);

    const handleGroupToggle = useCallback((groupKey: string) => {
        if (!groupedHierarchy) return;
        const key = groupKey as keyof GroupedHierarchy;
        const companies = groupedHierarchy[key];
        const allKeys: string[] = [];
        Object.entries(companies).forEach(([compId, lines]) => {
            const cName = getCompanyName(compId);
            Object.keys(lines).forEach(lineId => {
                const lName = getLineName(lineId);
                allKeys.push(`${cName}::${lName}`);
            });
        });

        // Use strict check or normalized for selection?
        // selectedLines usually contains original strings, but sometimes normalization is used for comparison.
        // onSetSelectedLines expects IDs (which are now Name-based).
        const allSelected = allKeys.every(k => selectedLines.includes(k));
        let newSelected = allSelected
            ? selectedLines.filter(l => !allKeys.includes(l))
            : Array.from(new Set([...selectedLines, ...allKeys]));

        if (newSelected.length > 1 && newSelected.includes("__NONE__")) {
            newSelected = newSelected.filter(l => l !== "__NONE__");
        } else if (newSelected.length === 0) {
            // Keep empty
        }

        onSetSelectedLines(newSelected);
    }, [groupedHierarchy, selectedLines, onSetSelectedLines, getCompanyName, getLineName]);

    const handleCompanyToggle = useCallback((companyId: string, lines: Record<string, any>) => {
        const cName = getCompanyName(companyId);
        const lineIds = Object.keys(lines);
        const compositeKeys = lineIds.map(lineId => {
            const lName = getLineName(lineId);
            return `${cName}::${lName}`;
        });

        const allSelected = compositeKeys.every(key => selectedLines.includes(key));
        let newSelected = allSelected
            ? selectedLines.filter(l => !compositeKeys.includes(l))
            : Array.from(new Set([...selectedLines, ...compositeKeys]));

        if (newSelected.length > 1 && newSelected.includes("__NONE__")) {
            newSelected = newSelected.filter(l => l !== "__NONE__");
        }
        onSetSelectedLines(newSelected);
    }, [selectedLines, onSetSelectedLines, getCompanyName, getLineName]);

    const handleSelectAll = useCallback(() => {
        if (!hierarchy) return;
        const allKeys: string[] = [];
        Object.entries(hierarchy).forEach(([compId, lines]) => {
            const cName = getCompanyName(compId);
            Object.keys(lines).forEach(lineId => {
                const lName = getLineName(lineId);
                allKeys.push(`${cName}::${lName}`);
            });
        });
        onSetSelectedLines(allKeys);
        trackEvent('select_all', 'interaction', 'all_lines');
    }, [hierarchy, onSetSelectedLines, getCompanyName, getLineName]);

    const handleDeselectAll = useCallback(() => {
        onSetSelectedLines(["__NONE__"]);
        trackEvent('deselect_all', 'interaction', 'none');
    }, [onSetSelectedLines]);

    const handleToggleAllGroups = useCallback((expand: boolean) => {
        setExpandedGroups({
            shinkansen: expand,
            jr: expand,
            majorPrivate: expand,
            otherPrivate: expand,
            nonRail: expand,
        });
        if (hierarchy) {
            const allCompanies: Record<string, boolean> = {};
            Object.keys(hierarchy).forEach(c => allCompanies[c] = expand);
            setExpandedCompanies(allCompanies);
        }
    }, [hierarchy]);

    const registerLineRef = useCallback((key: string, el: HTMLDivElement | null) => {
        lineRefs.current[key] = el;
    }, []);

    if (!groupedHierarchy) return <div>Loading...</div>;

    return (
        <div className="sidebar-content" style={{ padding: '20px', fontFamily: 'Pretendard, sans-serif', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ marginBottom: '15px' }}>
                <h2 style={{ fontSize: '18px', margin: 0, fontWeight: '900', color: '#2c3e50', borderBottom: '3px solid #3498db', paddingBottom: '8px' }}>
                    JapanRailNote
                </h2>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Sorting</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {[
                        { id: 'ja', label: 'Alphabetical' },
                        { id: 'usage', label: 'Usage Rate' },
                    ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => {
                                setSortMode(opt.id as 'ja' | 'usage');
                                trackEvent('sort_mode_change', 'filter', opt.id);
                            }}
                            style={{
                                flex: 1,
                                padding: '6px 4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                backgroundColor: sortMode === opt.id ? '#3498db' : '#fff',
                                color: sortMode === opt.id ? '#fff' : '#333',
                                fontWeight: sortMode === opt.id ? 'bold' : 'normal',
                                transition: 'all 0.2s'
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>Selection</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={handleSelectAll} style={{ flex: 1, padding: '8px 4px', fontSize: '11px', cursor: 'pointer', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                            Select All
                        </button>
                        <button onClick={handleDeselectAll} style={{ flex: 1, padding: '8px 4px', fontSize: '11px', cursor: 'pointer', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                            Deselect All
                        </button>
                    </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>Display</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleToggleAllGroups(true)} style={{ flex: 1, padding: '8px 4px', fontSize: '11px', cursor: 'pointer', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                            Open All
                        </button>
                        <button onClick={() => handleToggleAllGroups(false)} style={{ flex: 1, padding: '8px 4px', fontSize: '11px', cursor: 'pointer', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                            Close All
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                <SidebarGroup
                    title="新幹線"
                    groupKey="shinkansen"
                    companies={groupedHierarchy.shinkansen}
                    expanded={expandedGroups.shinkansen}
                    onToggleExpanded={toggleGroup}
                    onToggleSelection={handleGroupToggle}
                    selectedLines={selectedLines}
                    onToggleLine={onToggleLine}
                    onToggleCompany={handleCompanyToggle}
                    expandedCompanies={expandedCompanies}
                    toggleCompany={toggleCompany}
                    lineLengths={hookLineLengths}
                    visitedLineLengths={visitedLineLengths}
                    sortMode={sortMode}
                    activeLine={activeLine}
                    onLineClick={onLineClick}
                    language={language}
                    registerLineRef={registerLineRef}
                    companyNames={companyNames}
                    lineNames={lineNames}
                />
                <SidebarGroup
                    title="JR線"
                    groupKey="jr"
                    companies={groupedHierarchy.jr}
                    expanded={expandedGroups.jr}
                    onToggleExpanded={toggleGroup}
                    onToggleSelection={handleGroupToggle}
                    selectedLines={selectedLines}
                    onToggleLine={onToggleLine}
                    onToggleCompany={handleCompanyToggle}
                    expandedCompanies={expandedCompanies}
                    toggleCompany={toggleCompany}
                    lineLengths={hookLineLengths}
                    visitedLineLengths={visitedLineLengths}
                    sortMode={sortMode}
                    activeLine={activeLine}
                    onLineClick={onLineClick}
                    language={language}
                    registerLineRef={registerLineRef}
                    companyNames={companyNames}
                    lineNames={lineNames}
                />
                <SidebarGroup
                    title="大手私鉄 (16社)"
                    groupKey="majorPrivate"
                    companies={groupedHierarchy.majorPrivate}
                    expanded={expandedGroups.majorPrivate}
                    onToggleExpanded={toggleGroup}
                    onToggleSelection={handleGroupToggle}
                    selectedLines={selectedLines}
                    onToggleLine={onToggleLine}
                    onToggleCompany={handleCompanyToggle}
                    expandedCompanies={expandedCompanies}
                    toggleCompany={toggleCompany}
                    lineLengths={hookLineLengths}
                    visitedLineLengths={visitedLineLengths}
                    sortMode={sortMode}
                    activeLine={activeLine}
                    onLineClick={onLineClick}
                    language={language}
                    registerLineRef={registerLineRef}
                    companyNames={companyNames}
                    lineNames={lineNames}
                />
                <SidebarGroup
                    title="その他私鉄"
                    groupKey="otherPrivate"
                    companies={groupedHierarchy.otherPrivate}
                    expanded={expandedGroups.otherPrivate}
                    onToggleExpanded={toggleGroup}
                    onToggleSelection={handleGroupToggle}
                    selectedLines={selectedLines}
                    onToggleLine={onToggleLine}
                    onToggleCompany={handleCompanyToggle}
                    expandedCompanies={expandedCompanies}
                    toggleCompany={toggleCompany}
                    lineLengths={hookLineLengths}
                    visitedLineLengths={visitedLineLengths}
                    sortMode={sortMode}
                    activeLine={activeLine}
                    onLineClick={onLineClick}
                    language={language}
                    registerLineRef={registerLineRef}
                    companyNames={companyNames}
                    lineNames={lineNames}
                />
                <SidebarGroup
                    title="その他 (鋼索線・索道等)"
                    groupKey="nonRail"
                    companies={groupedHierarchy.nonRail}
                    expanded={expandedGroups.nonRail}
                    onToggleExpanded={toggleGroup}
                    onToggleSelection={handleGroupToggle}
                    selectedLines={selectedLines}
                    onToggleLine={onToggleLine}
                    onToggleCompany={handleCompanyToggle}
                    expandedCompanies={expandedCompanies}
                    toggleCompany={toggleCompany}
                    lineLengths={hookLineLengths}
                    visitedLineLengths={visitedLineLengths}
                    sortMode={sortMode}
                    activeLine={activeLine}
                    onLineClick={onLineClick}
                    language={language}
                    registerLineRef={registerLineRef}
                    companyNames={companyNames}
                    lineNames={lineNames}
                />
            </div>

        </div>
    );
};

export default memo(Sidebar);
