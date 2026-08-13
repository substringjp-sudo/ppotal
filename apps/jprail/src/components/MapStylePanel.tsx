"use client";

import React from 'react';
import { MapStyleSettings, DEFAULT_STYLE_SETTINGS } from './MainPageClient';
import { useI18n } from '../lib/i18n-context';
import { MAP_SHAPE_MODES, MapShapeMode } from '../lib/lineShapes';
import { MAP_THEME_IDS, MAP_THEMES, LAND_FORMS, LandForm, themeOf } from '../lib/mapThemes';

interface MapStylePanelProps {
    settings: MapStyleSettings;
    onSettingsChange: (settings: MapStyleSettings) => void;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}


/**
 * A three-station stub of a line drawn the way the mode would draw it, so the
 * choice is legible without reading the label. Same endpoints in all three.
 */
const ShapeGlyph: React.FC<{ mode: MapShapeMode; active: boolean }> = ({ mode, active }) => {
    const d = mode === 'geographic'
        ? 'M 4 17 C 9 17 9 9 14 9 C 19 9 20 5 28 5'
        : mode === 'smooth'
            ? 'M 4 17 Q 12 17 16 11 T 28 5'
            : 'M 4 17 L 10 17 L 18 9 L 24 9 L 28 5';
    return (
        <svg width="32" height="22" viewBox="0 0 32 22" fill="none" aria-hidden>
            <path
                d={d}
                stroke="currentColor"
                strokeWidth={active ? 2.6 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={active ? 1 : 0.65}
            />
            {[[4, 17], [28, 5]].map(([cx, cy]) => (
                <circle key={`${cx}`} cx={cx} cy={cy} r={2.4} fill="currentColor" opacity={active ? 1 : 0.65} />
            ))}
        </svg>
    );
};


/** A four-tile sample of what each land form looks like. */
const LandGlyph: React.FC<{ form: LandForm }> = ({ form }) => {
    if (form === 'outline') {
        return (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
                <path d="M4 14 C 6 7 12 5 16 8 C 19 10 18 16 13 17 C 8 18 5 17 4 14 Z"
                    fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
        );
    }
    const spots = [[7, 7], [14, 7], [7, 14], [14, 14]];
    return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
            {spots.map(([cx, cy], i) => {
                const shift = form === 'hexes' && i >= 2 ? 2.4 : 0;
                if (form === 'dots') return <circle key={i} cx={cx} cy={cy} r={3} fill="currentColor" />;
                if (form === 'squares') return <rect key={i} x={cx - 3} y={cy - 3} width={6} height={6} rx={1} fill="currentColor" />;
                const r = 3.4;
                const points = Array.from({ length: 6 }, (_, k) => {
                    const a = (Math.PI / 3) * k;
                    return `${cx + shift + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
                }).join(' ');
                return <polygon key={i} points={points} fill="currentColor" />;
            })}
        </svg>
    );
};

const MapStylePanel: React.FC<MapStylePanelProps> = ({ settings, onSettingsChange, isOpen, onOpenChange }) => {
    const { language } = useI18n();

    const translations = {
        ko: {
            mapStyle: "지도 스타일",
            theme: "지도 테마",
            land: "땅 표현",
            landOutline: "윤곽",
            landDots: "도트",
            landSquares: "사각",
            landHexes: "육각",
            landOutlineDesc: "노선 모양을 그대로 따라갑니다",
            landTileDesc: "땅을 타일로 채웁니다",
            shape: "노선 표현",
            shapeGeographic: "지리",
            shapeSmooth: "곡선",
            shapeSchematic: "도식",
            shapeGeographicDesc: "실제 선로 그대로",
            shapeSmoothDesc: "부드럽게 다듬은 곡선",
            shapeSchematicDesc: "45도로 정리한 노선도",
            flow: "이동한 노선에 흐름 효과",
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
            theme: "Map Theme",
            land: "Land",
            landOutline: "Outline",
            landDots: "Dots",
            landSquares: "Squares",
            landHexes: "Hexes",
            landOutlineDesc: "Follows whatever shape the lines use",
            landTileDesc: "The landmass drawn as tiles",
            shape: "Line Shape",
            shapeGeographic: "Real",
            shapeSmooth: "Smooth",
            shapeSchematic: "Schematic",
            shapeGeographicDesc: "The track as surveyed",
            shapeSmoothDesc: "Rounded, flowing curves",
            shapeSchematicDesc: "Squared off to 45 degrees",
            flow: "Flowing light on ridden lines",
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
            theme: "マップテーマ",
            land: "陸地の表現",
            landOutline: "輪郭",
            landDots: "ドット",
            landSquares: "四角",
            landHexes: "六角",
            landOutlineDesc: "路線の形状にそのまま合わせます",
            landTileDesc: "陸地をタイルで敷き詰めます",
            shape: "路線の表現",
            shapeGeographic: "地理",
            shapeSmooth: "曲線",
            shapeSchematic: "図式",
            shapeGeographicDesc: "実際の線路のまま",
            shapeSmoothDesc: "滑らかに整えた曲線",
            shapeSchematicDesc: "45度に整理した路線図",
            flow: "乗車した路線に流れる光",
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

    const shapeMode: MapShapeMode = settings.shapeMode ?? 'geographic';
    const landForm: LandForm = settings.landForm ?? 'outline';
    const activeTheme = themeOf(settings.theme);
    const landLabel: Record<LandForm, string> = {
        outline: t.landOutline, dots: t.landDots, squares: t.landSquares, hexes: t.landHexes
    };
    const shapeLabel: Record<MapShapeMode, string> = {
        geographic: t.shapeGeographic,
        smooth: t.shapeSmooth,
        schematic: t.shapeSchematic
    };
    const shapeDescription: Record<MapShapeMode, string> = {
        geographic: t.shapeGeographicDesc,
        smooth: t.shapeSmoothDesc,
        schematic: t.shapeSchematicDesc
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
                {/* Section: the palette the ground is painted with */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 px-1">
                        <span className="material-symbols-outlined text-primary text-sm">contrast</span>
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.theme}</h4>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {MAP_THEME_IDS.map(id => {
                            const swatch = MAP_THEMES[id];
                            const isActive = (settings.theme ?? 'day') === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => onSettingsChange({ ...settings, theme: id })}
                                    className={`group flex flex-col items-center gap-1.5 transition-transform duration-300 ${isActive ? 'scale-105' : 'hover:scale-105'}`}
                                    title={swatch.label[language as 'ko' | 'en' | 'ja'] ?? swatch.label.en}
                                >
                                    {/* A miniature of the map itself: sea, land, and a line across it */}
                                    <span
                                        className={`relative w-full aspect-square rounded-xl overflow-hidden transition-all duration-300 ${isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent shadow-lg' : 'ring-1 ring-black/10 dark:ring-white/10'}`}
                                        style={{ background: swatch.sea }}
                                    >
                                        <span className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: swatch.land }} />
                                        <span className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rotate-[-20deg]" style={{ background: '#e8543f' }} />
                                        <span className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: swatch.stationFill, boxShadow: `0 0 0 1px ${swatch.stationInk}` }} />
                                    </span>
                                    <span className={`text-[9px] font-black tracking-tight ${isActive ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {swatch.label[language as 'ko' | 'en' | 'ja'] ?? swatch.label.en}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="h-px bg-slate-900/5 dark:bg-white/5" />

                {/* Section: how the landmass itself is drawn */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 px-1">
                        <span className="material-symbols-outlined text-primary text-sm">grid_view</span>
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.land}</h4>
                    </div>
                    <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/5 dark:bg-white/5 rounded-2xl">
                        {LAND_FORMS.map(form => {
                            const isActive = landForm === form;
                            return (
                                <button
                                    key={form}
                                    onClick={() => onSettingsChange({ ...settings, landForm: form })}
                                    className={`flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-white dark:bg-slate-700 shadow-md text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                >
                                    <LandGlyph form={form} />
                                    <span className="text-[9px] font-black tracking-tight">{landLabel[form]}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="px-1 text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-snug">
                        {landForm === 'outline' ? t.landOutlineDesc : t.landTileDesc}
                    </p>
                </div>

                <div className="h-px bg-slate-900/5 dark:bg-white/5" />

                {/* Section: How the lines themselves are drawn */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 px-1">
                        <span className="material-symbols-outlined text-primary text-sm">route</span>
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.shape}</h4>
                    </div>

                    <div className="relative grid grid-cols-3 gap-1 p-1 bg-slate-900/5 dark:bg-white/5 rounded-2xl">
                        {/* The moving highlight: one element that slides, so switching reads as motion */}
                        <div
                            className="absolute top-1 bottom-1 rounded-xl bg-white dark:bg-slate-700 shadow-md transition-transform duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
                            style={{
                                width: 'calc((100% - 0.5rem) / 3)',
                                left: '0.25rem',
                                transform: `translateX(calc(${MAP_SHAPE_MODES.indexOf(shapeMode)} * (100% + 0.25rem)))`
                            }}
                        />
                        {MAP_SHAPE_MODES.map(mode => {
                            const isActive = shapeMode === mode;
                            return (
                                <button
                                    key={mode}
                                    onClick={() => onSettingsChange({ ...settings, shapeMode: mode })}
                                    className={`relative z-10 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-colors duration-300 ${isActive ? 'text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                >
                                    <ShapeGlyph mode={mode} active={isActive} />
                                    <span className="text-[10px] font-black tracking-tight">{shapeLabel[mode]}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="px-1 text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-snug min-h-[2.2em]">
                        {shapeDescription[shapeMode]}
                    </p>

                    <label className="flex items-center justify-between px-1 cursor-pointer group">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors">{t.flow}</span>
                        <span className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${settings.flow ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={settings.flow}
                                onChange={(e) => onSettingsChange({ ...settings, flow: e.target.checked })}
                            />
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${settings.flow ? 'translate-x-4' : ''}`} />
                        </span>
                    </label>
                </div>

                <div className="h-px bg-slate-900/5 dark:bg-white/5" />

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
