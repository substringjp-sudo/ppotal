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
}

const Sidebar: React.FC<SidebarProps> = ({ selectedLines, onToggleLine, onSetSelectedLines, lineLengths: propLineLengths, visitedLineLengths = {}, activeLine, onLineClick }) => {
    const { railData } = useRailData();
    const { groupedHierarchy, companyNames, lineNames, lineLengths: hookLineLengths, CATEGORY_MAP } = useStationHierarchy(railData);

    const effectiveLineLengths = propLineLengths && Object.keys(propLineLengths).length > 0 ? propLineLengths : hookLineLengths;
    const [sortMode, setSortMode] = useState<'ja' | 'usage'>('ja');
    const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const { user, logout } = useAuth();
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
        <div className="sidebar-content" style={{ padding: '20px', fontFamily: 'Pretendard, sans-serif', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ marginBottom: '15px' }}>
                <h2 style={{ fontSize: '18px', margin: 0, fontWeight: '900', color: '#2c3e50', borderBottom: '3px solid #3498db', paddingBottom: '8px' }}>
                    JapanRailNote
                </h2>
            </div>

            <div style={{
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: 'rgba(52, 152, 219, 0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(52, 152, 219, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
            }}>
                {user ? (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                            <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user.displayName || user.email?.split('@')[0] || 'User'}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {user.email}
                            </span>
                        </div>
                        <button
                            onClick={logout}
                            style={{
                                padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                backgroundColor: '#fff', color: '#64748b', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                            }}
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '12px', color: '#475569', fontWeight: '500', lineHeight: '1.4' }}>
                                Save your progress to the cloud.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsAuthModalOpen(true)}
                            style={{
                                padding: '8px 16px', borderRadius: '10px', backgroundColor: '#3498db',
                                color: '#fff', border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                                boxShadow: '0 4px 10px rgba(52, 152, 219, 0.2)'
                            }}
                        >
                            Login
                        </button>
                    </>
                )}
            </div>

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />

            <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>SORT</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {[
                        { id: 'ja', label: 'ABC' },
                        { id: 'usage', label: 'Usage' },
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
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>SELECT</div>
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
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>DISPLAY</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleToggleAllGroups(true)} style={{ flex: 1, padding: '8px 4px', fontSize: '11px', cursor: 'pointer', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                            Expand All
                        </button>
                        <button onClick={() => handleToggleAllGroups(false)} style={{ flex: 1, padding: '8px 4px', fontSize: '11px', cursor: 'pointer', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                            Collapse All
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
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
    );
};

export default memo(Sidebar);
