"use client";

import React, { useMemo } from 'react';

interface MyLinesPaneProps {
    visitedLineLengths: Record<string, number>;
    lineLengths: Record<string, number>;
    onLineClick: (line: string) => void;
    onDeleteLineHistory: (line: string) => void;
    activeLine: string | null;
}

const MyLinesPane: React.FC<MyLinesPaneProps> = ({ visitedLineLengths, lineLengths, onLineClick, onDeleteLineHistory, activeLine }) => {
    const utilizedLines = useMemo(() => {
        return Object.entries(visitedLineLengths)
            .filter(([_, length]) => length > 0)
            .map(([id, visitedLength]) => {
                const totalLength = lineLengths[id] || 0;
                const percent = totalLength > 0 ? Math.round((visitedLength / totalLength) * 100) : 0;
                const [company, name] = id.split('::');
                return { id, company, name, visitedLength, totalLength, percent };
            })
            .sort((a, b) => b.percent - a.percent); // Sort by completion
    }, [visitedLineLengths, lineLengths]);

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '15px', fontWeight: '900', color: '#2c3e50', borderBottom: '3px solid #27ae60', paddingBottom: '8px' }}>
                MY UTILIZED LINES
            </h2>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {utilizedLines.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#999', marginTop: '40px', fontSize: '14px' }}>
                        No lines utilized yet.<br />Record travel progress to see them here!
                    </div>
                ) : (
                    utilizedLines.map(line => (
                        <div
                            key={line.id}
                            onClick={() => onLineClick(line.id)}
                            style={{
                                padding: '12px',
                                marginBottom: '10px',
                                border: `1px solid ${activeLine === line.id ? '#27ae60' : '#eee'}`,
                                borderRadius: '8px',
                                backgroundColor: activeLine === line.id ? '#f0fff4' : '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: activeLine === line.id ? '0 2px 8px rgba(39, 174, 96, 0.1)' : 'none'
                            }}
                        >
                            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>{line.company}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{line.name}</div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteLineHistory(line.id);
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#e74c3c',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        fontSize: '12px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginTop: '-4px',
                                        marginRight: '-4px'
                                    }}
                                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.1)')}
                                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    title="이동 기록 삭제"
                                >
                                    ✕
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ flex: 1, height: '6px', backgroundColor: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${line.percent}%`,
                                        height: '100%',
                                        backgroundColor: '#27ae60',
                                        transition: 'width 0.4s ease'
                                    }} />
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#27ae60', minWidth: '35px', textAlign: 'right' }}>
                                    {line.percent}%
                                </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px', textAlign: 'right' }}>
                                {Math.round(line.visitedLength * 10) / 10} km / {Math.round(line.totalLength * 10) / 10} km
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default React.memo(MyLinesPane);
