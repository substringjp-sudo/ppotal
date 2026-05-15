"use client";

import React from 'react';
import { MapStyleSettings, DEFAULT_STYLE_SETTINGS } from './MainPageClient';
import { useI18n } from '../lib/i18n-context';

interface MapStylePanelProps {
    settings: MapStyleSettings;
    onSettingsChange: (settings: MapStyleSettings) => void;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

const MapStylePanel: React.FC<MapStylePanelProps> = ({ settings, onSettingsChange, isOpen, onOpenChange }) => {
    const { language } = useI18n();

    const translations = {
        ko: {
            mapStyle: "지도 스타일",
            mapStyles: "지도 스타일 설정",
            hiddenLines: "비활성 노선 (선택 안 됨)",
            opacity: "투명도",
            thickness: "두께",
            unvisitedSelected: "활성 노선 (미방문)",
            lineWeight: "선 굵기",
            showOutline: "외곽선 표시",
            stationSize: "역 크기",
            visitedRecorded: "방문 기록 (탑승함)",
            showStationNames: "역 이름 표시",
            showAirports: "공항 표시",
            resetToDefaults: "기본값으로 초기화"
        },
        en: {
            mapStyle: "Map Style",
            mapStyles: "Map Styles",
            hiddenLines: "Hidden Lines (Deselected)",
            opacity: "OPACITY",
            thickness: "THICKNESS",
            unvisitedSelected: "Unvisited (Selected)",
            lineWeight: "LINE WEIGHT",
            showOutline: "Show Line Outline",
            stationSize: "STATION SIZE",
            visitedRecorded: "Visited (Recorded)",
            showStationNames: "Show Station Names",
            showAirports: "Show Airports",
            resetToDefaults: "RESET TO DEFAULTS"
        },
        ja: {
            mapStyle: "マップスタイル",
            mapStyles: "マップスタイル設定",
            hiddenLines: "非表示の路線 (未選択)",
            opacity: "不透明도",
            thickness: "太さ",
            unvisitedSelected: "未訪問の路線 (選択中)",
            lineWeight: "線の太さ",
            showOutline: "アウトラインを表示",
            stationSize: "駅のサイズ",
            visitedRecorded: "訪問済みの路線 (記録済み)",
            showStationNames: "駅名を表示",
            showAirports: "空港を表示",
            resetToDefaults: "デフォルトに戻す"
        }
    };

    const t = translations[language as keyof typeof translations] || translations.en;

    const handleChange = (category: keyof MapStyleSettings, field: string | null, value: number | boolean) => {
        if (category === 'showLabels' || category === 'showAirports') {
            onSettingsChange({
                ...settings,
                [category]: value as boolean
            });
            return;
        }

        const currentCategory = settings[category];
        if (typeof currentCategory === 'object' && currentCategory !== null) {
            onSettingsChange({
                ...settings,
                [category]: {
                    ...currentCategory,
                    [field!]: value
                }
            } as MapStyleSettings);
        }
    };

    const handleReset = () => {
        onSettingsChange(DEFAULT_STYLE_SETTINGS);
    };

    const stopPropagation = (e: React.MouseEvent | React.TouchEvent | React.WheelEvent) => {
        e.stopPropagation();
    };

    if (!isOpen) {
        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenChange(true);
                }}
                onMouseDown={stopPropagation}
                onMouseUp={stopPropagation}
                onDoubleClick={stopPropagation}
                onWheel={stopPropagation}
                onTouchStart={stopPropagation}
                className="absolute top-4 right-4 z-[1000] flex items-center gap-2 px-5 h-[44px] bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] hover:scale-105 transition-all duration-500 group pointer-events-auto"
            >
                <span className="material-symbols-outlined text-primary group-hover:rotate-45 transition-transform duration-700">palette</span>
                <span className="text-xs font-black text-slate-800 dark:text-white tracking-widest uppercase">{t.mapStyle}</span>
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
            className="absolute top-4 right-4 w-64 sm:w-72 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col max-h-[60vh] sm:max-h-[85vh] animate-in slide-in-from-right-8 fade-in duration-500 overflow-hidden pointer-events-auto"
        >
            {/* Header: Sticky */}
            <div className="p-6 pb-4 flex justify-between items-center bg-white/20 dark:bg-slate-900/20 backdrop-blur-md z-10 border-b border-white/10">
                <div className="flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-lg">settings_suggest</span>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{t.mapStyles}</h3>
                </div>
                <button
                    onClick={() => onOpenChange(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">close</span>
                </button>
            </div>

            {/* Content: Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 sm:gap-6 custom-scrollbar">
                {/* Section: Unselected */}
                <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 px-1">
                        <span className="material-symbols-outlined text-slate-400 text-sm">visibility_off</span>
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.hiddenLines}</h4>
                    </div>
                    <div className="flex flex-col gap-5 px-1">
                        <div className="space-y-1 sm:space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 px-0.5">
                                <span>{t.opacity}</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{Math.round(settings.unselected.opacity * 100)}%</span>
                            </div>
                            <input
                                type="range" min="0" max="1" step="0.05"
                                value={settings.unselected.opacity}
                                onChange={(e) => handleChange('unselected', 'opacity', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                        <div className="space-y-1 sm:space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 px-0.5">
                                <span>{t.thickness}</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{settings.unselected.weight.toFixed(1)}x</span>
                            </div>
                            <input
                                type="range" min="0.1" max="3" step="0.1"
                                value={settings.unselected.weight}
                                onChange={(e) => handleChange('unselected', 'weight', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Labels Visibility (Moved Here) */}
                <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2 px-1">
                        <span className="material-symbols-outlined text-primary text-sm">label</span>
                        <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Visibility</h4>
                    </div>
                    <label className="flex justify-between items-center cursor-pointer group px-1 py-1">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">{t.showStationNames}</span>
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.showLabels}
                                onChange={(e) => handleChange('showLabels', null, e.target.checked)}
                            />
                            <div className="w-10 h-6 bg-slate-300/50 dark:bg-slate-700/50 backdrop-blur-sm peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[16px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                        </div>
                    </label>
                    <label className="flex justify-between items-center cursor-pointer group px-1 py-1">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">{t.showAirports}</span>
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.showAirports}
                                onChange={(e) => handleChange('showAirports', null, e.target.checked)}
                            />
                            <div className="w-10 h-6 bg-slate-300/50 dark:bg-slate-700/50 backdrop-blur-sm peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[16px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                        </div>
                    </label>
                </div>

                {/* Section: Unvisited */}
                <div className="flex flex-col gap-3 sm:gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-2 px-1">
                        <span className="material-symbols-outlined text-slate-400 text-sm">map</span>
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.unvisitedSelected}</h4>
                    </div>
                    <div className="flex flex-col gap-5 px-1">
                        <div className="space-y-1 sm:space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 px-0.5">
                                <span>{t.lineWeight}</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{settings.unvisited.weight.toFixed(1)}x</span>
                            </div>
                            <input
                                type="range" min="0.5" max="8" step="0.1"
                                value={settings.unvisited.weight}
                                onChange={(e) => handleChange('unvisited', 'weight', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer group px-0.5">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.unvisited.showOutline}
                                    onChange={(e) => handleChange('unvisited', 'showOutline', e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                            </div>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors">{t.showOutline}</span>
                        </label>

                        <div className="space-y-1 sm:space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 px-0.5">
                                <span>{t.stationSize}</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{settings.unvisited.stationSize.toFixed(1)}x</span>
                            </div>
                            <input
                                type="range" min="0.1" max="4" step="0.1"
                                value={settings.unvisited.stationSize}
                                onChange={(e) => handleChange('unvisited', 'stationSize', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Visited */}
                <div className="flex flex-col gap-3 sm:gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-2 px-1">
                        <span className="material-symbols-outlined text-emerald-500 text-sm">verified</span>
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Visited (Recorded)</h4>
                    </div>
                    <div className="flex flex-col gap-5 px-1">
                        <div className="space-y-1 sm:space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 px-0.5">
                                <span>LINE WEIGHT</span>
                                <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">{settings.visited.weight.toFixed(1)}x</span>
                            </div>
                            <input
                                type="range" min="0.5" max="10" step="0.1"
                                value={settings.visited.weight}
                                onChange={(e) => handleChange('visited', 'weight', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer group px-0.5">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.visited.showOutline}
                                    onChange={(e) => handleChange('visited', 'showOutline', e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                            </div>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-emerald-500 transition-colors">Show Line Outline</span>
                        </label>

                        <div className="space-y-1 sm:space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 px-0.5">
                                <span>STATION SIZE</span>
                                <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">{settings.visited.stationSize.toFixed(1)}x</span>
                            </div>
                            <input
                                type="range" min="0.1" max="5" step="0.1"
                                value={settings.visited.stationSize}
                                onChange={(e) => handleChange('visited', 'stationSize', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer: Sticky */}
            <div className="p-6 pt-4 bg-white/20 dark:bg-slate-900/20 backdrop-blur-md z-10 border-t border-white/10">
                <button
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-white/30 dark:bg-slate-800/40 hover:bg-white/50 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-100 border border-white/40 dark:border-white/10 rounded-2xl text-[10px] font-black tracking-widest transition-all active:scale-95 shadow-lg"
                >
                    <span className="material-symbols-outlined text-sm">restart_alt</span>
                    {t.resetToDefaults}
                </button>
            </div>
        </div>
    );
};

export default MapStylePanel;
