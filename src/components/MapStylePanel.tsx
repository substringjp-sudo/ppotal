"use client";

import React from 'react';
import { MapStyleSettings } from './MainPageClient';

interface MapStylePanelProps {
    settings: MapStyleSettings;
    onSettingsChange: (settings: MapStyleSettings) => void;
}

const MapStylePanel: React.FC<MapStylePanelProps> = ({ settings, onSettingsChange }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const handleChange = (category: keyof MapStyleSettings, field: string, value: number | boolean) => {
        onSettingsChange({
            ...settings,
            [category]: {
                ...settings[category],
                [field]: value
            }
        });
    };

    const stopPropagation = (e: React.MouseEvent | React.TouchEvent | React.WheelEvent) => {
        e.stopPropagation();
    };

    if (!isOpen) {
        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(true);
                }}
                onMouseDown={stopPropagation}
                onMouseUp={stopPropagation}
                onDoubleClick={stopPropagation}
                onWheel={stopPropagation}
                onTouchStart={stopPropagation}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 'bold',
                    color: '#333',
                    fontSize: '0.9rem'
                }}
            >
                🎨 지도 스타일 설정
            </button>
        );
    }

    return (
        <div
            onMouseDown={stopPropagation}
            onMouseUp={stopPropagation}
            onClick={stopPropagation}
            onDoubleClick={stopPropagation}
            onWheel={stopPropagation}
            onTouchStart={stopPropagation}
            onTouchMove={stopPropagation}
            onTouchEnd={stopPropagation}
            style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 1000,
                width: '280px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '15px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(5px)',
                maxHeight: '80vh',
                overflowY: 'auto',
                color: '#333'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>지도 스타일 설정</h3>
                <button
                    onClick={() => setIsOpen(false)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#666' }}
                >
                    ✕
                </button>
            </div>

            {/* Section: Unselected */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#555', fontWeight: 'bold' }}>미표시 노선 (사이드바 미체크)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>투명도 ({Math.round(settings.unselected.opacity * 100)}%)</span>
                        <input
                            type="range" min="0" max="1" step="0.1"
                            value={settings.unselected.opacity}
                            onChange={(e) => handleChange('unselected', 'opacity', parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </label>
                    <label style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>두께 ({settings.unselected.weight}x)</span>
                        <input
                            type="range" min="0.1" max="3" step="0.1"
                            value={settings.unselected.weight}
                            onChange={(e) => handleChange('unselected', 'weight', parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </label>
                </div>
            </div>

            {/* Section: Unvisited */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#555', fontWeight: 'bold' }}>미방문 노선 (사이드바 체크됨)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>선 두께 ({settings.unvisited.weight}x)</span>
                        <input
                            type="range" min="0.5" max="5" step="0.1"
                            value={settings.unvisited.weight}
                            onChange={(e) => handleChange('unvisited', 'weight', parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </label>
                    <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.unvisited.showOutline}
                            onChange={(e) => handleChange('unvisited', 'showOutline', e.target.checked)}
                        />
                        <span>선 테두리 표시</span>
                    </label>
                    <label style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>역 점 크기 ({settings.unvisited.stationSize}x)</span>
                        <input
                            type="range" min="0.1" max="3" step="0.1"
                            value={settings.unvisited.stationSize}
                            onChange={(e) => handleChange('unvisited', 'stationSize', parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </label>
                </div>
            </div>

            {/* Section: Visited */}
            <div style={{ marginBottom: '10px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#555', fontWeight: 'bold' }}>방문 노선 (이동 기록 있음)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>선 두께 ({settings.visited.weight}x)</span>
                        <input
                            type="range" min="0.5" max="5" step="0.1"
                            value={settings.visited.weight}
                            onChange={(e) => handleChange('visited', 'weight', parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </label>
                    <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.visited.showOutline}
                            onChange={(e) => handleChange('visited', 'showOutline', e.target.checked)}
                        />
                        <span>선 테두리 표시</span>
                    </label>
                    <label style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>역 점 크기 ({settings.visited.stationSize}x)</span>
                        <input
                            type="range" min="0.1" max="3" step="0.1"
                            value={settings.visited.stationSize}
                            onChange={(e) => handleChange('visited', 'stationSize', parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};

export default MapStylePanel;
