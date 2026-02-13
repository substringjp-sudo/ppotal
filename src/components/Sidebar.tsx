"use client";

import React, { useState, useEffect, useCallback, memo } from 'react';

const Sidebar = ({ selectedLines, onToggleLine, onSetSelectedLines, lineLengths = {} }) => {
    const [hierarchy, setHierarchy] = useState(null);
    const [expandedCompanies, setExpandedCompanies] = useState({});

    useEffect(() => {
        fetch('/station_hierarchy.json')
            .then(res => res.json())
            .then(setHierarchy)
            .catch(console.error);
    }, []);

    const toggleCompany = useCallback((company) => {
        setExpandedCompanies(prev => ({
            ...prev,
            [company]: !prev[company]
        }));
    }, []);

    const handleCompanyToggle = useCallback((company, lines) => {
        const lineNames = Object.keys(lines);
        const compositeKeys = lineNames.map(line => `${company}::${line}`);
        const allSelected = compositeKeys.every(key => selectedLines.includes(key));

        let newSelected;
        if (allSelected) {
            newSelected = selectedLines.filter(l => !compositeKeys.includes(l));
        } else {
            const keysToAdd = compositeKeys.filter(key => !selectedLines.includes(key));
            newSelected = [...selectedLines, ...keysToAdd];
        }
        onSetSelectedLines(newSelected);
    }, [selectedLines, onSetSelectedLines]);

    if (!hierarchy) return <div className="p-4">Loading hierarchy...</div>;

    return (
        <div className="sidebar-content" style={{ padding: '20px', fontFamily: 'Pretendard, sans-serif' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Railroad Filter</h2>
            <div className="hierarchy-tree">
                {Object.entries(hierarchy).map(([company, lines]) => {
                    const lineNames = Object.keys(lines);
                    const compositeKeys = lineNames.map(line => `${company}::${line}`);
                    const isExpanded = expandedCompanies[company];
                    const selectedInCompany = compositeKeys.filter(key => selectedLines.includes(key));
                    const isAllSelected = selectedInCompany.length === lineNames.length;
                    const isSomeSelected = selectedInCompany.length > 0 && !isAllSelected;

                    return (
                        <div key={company} style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    onClick={() => toggleCompany(company)}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        width: '16px'
                                    }}
                                >
                                    {isExpanded ? '▼' : '▶'}
                                </button>
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    ref={el => {
                                        if (el) el.indeterminate = isSomeSelected;
                                    }}
                                    onChange={() => handleCompanyToggle(company, lines)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <span
                                    onClick={() => toggleCompany(company)}
                                    style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                                >
                                    {company}
                                </span>
                                <span style={{ fontSize: '10px', color: '#888' }}>({selectedInCompany.length}/{lineNames.length})</span>
                            </div>

                            {isExpanded && (
                                <div style={{ marginLeft: '24px', marginTop: '4px' }}>
                                    {lineNames.map(line => {
                                        const key = `${company}::${line}`;
                                        return (
                                            <div key={line} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLines.includes(key)}
                                                    onChange={() => onToggleLine(key)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                <span style={{ fontSize: '13px' }}>
                                                    {line}
                                                    {lineLengths[key] !== undefined && (
                                                        <span style={{ color: '#888', marginLeft: '5px', fontSize: '11px' }}>
                                                            ({lineLengths[key]} km)
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default memo(Sidebar);
