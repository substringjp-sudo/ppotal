"use client";

import React from 'react';
import { MapStyleSettings, DEFAULT_STYLE_SETTINGS } from './MainPageClient';

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
                    setIsOpen(true);
                }}
                onMouseDown={stopPropagation}
                onMouseUp={stopPropagation}
                onDoubleClick={stopPropagation}
                onWheel={stopPropagation}
                onTouchStart={stopPropagation}
                className="absolute top-4 right-4 z-[1000] flex items-center gap-2 px-4 py-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
            >
                <span className="material-symbols-outlined text-slate-600 dark:text-slate-300 group-hover:rotate-45 transition-transform duration-500">palette</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Map Style</span>
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
            className="absolute top-4 right-4 z-[1000] w-72 bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/20 dark:border-slate-800/50 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-right-4 fade-in duration-300 overflow-hidden shadow-primary/5"
        >
            {/* Header: Sticky */}
            <div className="p-5 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-lg">settings_suggest</span>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Map Styles</h3>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">close</span>
                </button>
            </div>

            {/* Content: Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 custom-scrollbar">
                {/* Section: Unselected */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 px-1">
                        <span className="material-symbols-outlined text-slate-400 text-sm">visibility_off</span>
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Hidden Lines (Deselected)</h4>
                    </div>
                    <div className="flex flex-col gap-5 px-1">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 px-0.5">
                                <span>OPACITY</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{Math.round(settings.unselected.opacity * 100)}%</span>
                            </div>
                            <input
                                type="range" min="0" max="1" step="0.05"
                                value={settings.unselected.opacity}
                                onChange={(e) => handleChange('unselected', 'opacity', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 px-0.5">
                                <span>THICKNESS</span>
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

                {/* Section: Unvisited */}
                <div className="flex flex-col gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-2 px-1">
                        <span className="material-symbols-outlined text-slate-400 text-sm">map</span>
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Unvisited (Selected)</h4>
                    </div>
                    <div className="flex flex-col gap-5 px-1">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 px-0.5">
                                <span>LINE WEIGHT</span>
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
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors">Show Line Outline</span>
                        </label>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 px-0.5">
                                <span>STATION SIZE</span>
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
                <div className="flex flex-col gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-2 px-1">
                        <span className="material-symbols-outlined text-emerald-500 text-sm">verified</span>
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Visited (Recorded)</h4>
                    </div>
                    <div className="flex flex-col gap-5 px-1">
                        <div className="space-y-2">
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

                        <div className="space-y-2">
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
            <div className="p-5 pt-3 border-t border-slate-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
                <button
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black tracking-widest transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined text-sm">restart_alt</span>
                    RESET TO DEFAULTS
                </button>
            </div>
        </div>
    );
};

export default MapStylePanel;
