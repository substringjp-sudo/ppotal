"use client";

import React from 'react';
import { MAP_THEMES, MAP_THEME_IDS, LandForm, MapThemeId } from '../lib/mapThemes';
import { MAP_SHAPE_MODES, MapShapeMode } from '../lib/lineShapes';
import { useI18n } from '../lib/i18n-context';
import { Z } from '../lib/layers';

export interface MapStyleSettings {
    theme: MapThemeId;
    landForm: LandForm;
    shapeMode: MapShapeMode;
    showLabels: boolean;
    showAirports: boolean;
    flow?: boolean;
    unvisited: {
        weight: number;
        showOutline: boolean;
        stationSize: number;
    };
    visited: {
        weight: number;
        showOutline: boolean;
        stationSize: number;
    };
    unselected: {
        opacity: number;
        weight: number;
    };
}

export const DEFAULT_STYLE_SETTINGS: MapStyleSettings = {
    theme: 'day',
    landForm: 'outline',
    shapeMode: 'smooth',
    showLabels: true,
    showAirports: true,
    flow: false,
    unvisited: {
        weight: 1.0,
        showOutline: false,
        stationSize: 1.0,
    },
    visited: {
        weight: 3.5,
        showOutline: true,
        stationSize: 1.0,
    },
    unselected: {
        opacity: 0.3,
        weight: 1.0,
    },
};

const LAND_FORMS: LandForm[] = ['outline', 'dots', 'squares', 'hexes'];

const TEXT = {
    ko: {
        mapStyle: '지도 스타일',
        mapStyles: '지도 스타일 설정',
        theme: '테마',
        land: '지형 형태',
        landOutline: '기본 테두리',
        landDots: '도트',
        landSquares: '스퀘어',
        landHexes: '허니콤',
        tileThemeOnlyNotice: '도트/스퀘어/허니콤 타일 뷰에서는 테마 스타일만 선택 가능합니다.',
        shape: '노선 형태',
        shapeStraight: '직선',
        shapeSmooth: '곡선',
        shapeOctilinear: '8방향 각진선',
        shapeStraightDesc: '역과 역 사이를 일직선으로 잇습니다.',
        shapeSmoothDesc: '실제 철로의 곡선을 매끄럽게 살립니다.',
        shapeOctilinearDesc: '지하철 노선도처럼 45도 각도로 정돈합니다.',
        unvisitedSelected: '미방문 노선 (선택됨)',
        lineWeight: '선 두께',
        showOutline: '테두리 선 표시',
        stationSize: '역 크기',
        hiddenLines: '숨겨진 노선 (선택 해제)',
        opacity: '투명도',
        thickness: '두께',
        resetToDefaults: '기본 설정으로 초기화',
        showStationNames: '역 이름 표시',
        showAirports: '공항 표시',
    },
    en: {
        mapStyle: 'Map Style',
        mapStyles: 'Map Style Settings',
        theme: 'Theme',
        land: 'Landform',
        landOutline: 'Outline',
        landDots: 'Dots',
        landSquares: 'Squares',
        landHexes: 'Hexes',
        tileThemeOnlyNotice: 'Dot/Square/Hex lattice view only uses Theme styles.',
        shape: 'Track Shape',
        shapeStraight: 'Straight',
        shapeSmooth: 'Smooth',
        shapeOctilinear: 'Schematic',
        shapeStraightDesc: 'Connects stations with straight lines.',
        shapeSmoothDesc: 'Follows actual railway curves.',
        shapeOctilinearDesc: 'Diagrammatic lines snapped to 45° angles.',
        unvisitedSelected: 'Unvisited Lines (Selected)',
        lineWeight: 'Line Weight',
        showOutline: 'Show Outline',
        stationSize: 'Station Marker Size',
        hiddenLines: 'Hidden Lines (Unselected)',
        opacity: 'Opacity',
        thickness: 'Thickness',
        resetToDefaults: 'Reset to Defaults',
        showStationNames: 'Show Station Names',
        showAirports: 'Show Airports',
    },
    ja: {
        mapStyle: 'マップスタイル',
        mapStyles: 'マップスタイル設定',
        theme: 'テーマ',
        land: '地形表現',
        landOutline: 'アウトライン',
        landDots: 'ドット',
        landSquares: 'スクエア',
        landHexes: 'ハニカム',
        tileThemeOnlyNotice: 'ドット/スクエア/ハニカム表示ではテーマスタイルのみ適用されます。',
        shape: '路線形状',
        shapeStraight: '直線',
        shapeSmooth: '曲線',
        shapeOctilinear: '路線図風',
        shapeStraightDesc: '駅間を straight な直線で結びます。',
        shapeSmoothDesc: '実際の線路のカーブ를再現します。',
        shapeOctilinearDesc: '地下鉄路線図のように45°に整えます。',
        unvisitedSelected: '未乗車路線（選択中）',
        lineWeight: '線の太さ',
        showOutline: 'アウトライン表示',
        stationSize: '駅マーカーの size',
        hiddenLines: '非表示路線（選択解除）',
        opacity: '不透明度',
        thickness: '太さ',
        resetToDefaults: 'デフォルトに戻す',
        showStationNames: '駅名を表示',
        showAirports: '空港を表示',
    }
};

const LandGlyph: React.FC<{ form: LandForm }> = ({ form }) => {
    switch (form) {
        case 'outline':
            return (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 15C4 10 7 6 12 6C17 6 20 10 20 15C20 18 17 19 12 19C7 19 4 18 4 15Z" strokeLinecap="round" />
                </svg>
            );
        case 'dots':
            return (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="6" cy="6" r="2" /><circle cx="12" cy="6" r="2" /><circle cx="18" cy="6" r="2" />
                    <circle cx="6" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="18" cy="12" r="2" />
                    <circle cx="6" cy="18" r="2" /><circle cx="12" cy="18" r="2" /><circle cx="18" cy="18" r="2" />
                </svg>
            );
        case 'squares':
            return (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="6" height="6" rx="1" />
                    <rect x="14" y="4" width="6" height="6" rx="1" />
                    <rect x="4" y="14" width="6" height="6" rx="1" />
                    <rect x="14" y="14" width="6" height="6" rx="1" />
                </svg>
            );
        case 'hexes':
            return (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 3L19 7V15L12 19L5 15V7L12 3Z" />
                </svg>
            );
    }
};

const ShapeGlyph: React.FC<{ mode: MapShapeMode; active: boolean }> = ({ mode, active }) => {
    const stroke = active ? '#1c74e9' : 'currentColor';
    switch (mode) {
        case 'geographic':
            return (
                <svg className="w-6 h-6" viewBox="0 0 28 28" fill="none">
                    <path d="M5 22L23 6" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="5" cy="22" r="2.5" fill={stroke} />
                    <circle cx="23" cy="6" r="2.5" fill={stroke} />
                </svg>
            );
        case 'smooth':
            return (
                <svg className="w-6 h-6" viewBox="0 0 28 28" fill="none">
                    <path d="M5 22C11 22 17 6 23 6" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="5" cy="22" r="2.5" fill={stroke} />
                    <circle cx="23" cy="6" r="2.5" fill={stroke} />
                </svg>
            );
        case 'schematic':
            return (
                <svg className="w-6 h-6" viewBox="0 0 28 28" fill="none">
                    <path d="M5 22H14L23 13V6" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="5" cy="22" r="2.5" fill={stroke} />
                    <circle cx="23" cy="6" r="2.5" fill={stroke} />
                </svg>
            );
    }
};

interface MapStylePanelProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    settings: MapStyleSettings;
    onSettingsChange: (newSettings: MapStyleSettings) => void;
    isMobile?: boolean;
}

export const MapStylePanel: React.FC<MapStylePanelProps> = ({
    isOpen,
    onOpenChange,
    settings,
    onSettingsChange,
    isMobile = false,
}) => {
    const { language } = useI18n();
    const t = TEXT[language as keyof typeof TEXT] || TEXT.en;

    const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

    const handleChange = (
        category: 'unvisited' | 'visited' | 'unselected' | 'showLabels' | 'showAirports' | 'flow',
        key: string | null,
        value: number | boolean
    ) => {
        if (key === null) {
            onSettingsChange({
                ...settings,
                [category]: value
            });
        } else {
            onSettingsChange({
                ...settings,
                [category]: {
                    ...(settings[category as 'unvisited' | 'visited' | 'unselected'] as any),
                    [key]: value,
                },
            });
        }
    };

    const handleReset = () => {
        onSettingsChange(DEFAULT_STYLE_SETTINGS);
    };

    const landForm = settings.landForm ?? 'outline';
    const shapeMode = settings.shapeMode ?? 'smooth';
    const isTileMode = landForm !== 'outline';

    const landLabel: Record<LandForm, string> = {
        outline: t.landOutline,
        dots: t.landDots,
        squares: t.landSquares,
        hexes: t.landHexes
    };

    const shapeLabel: Record<MapShapeMode, string> = {
        geographic: t.shapeStraight,
        smooth: t.shapeSmooth,
        schematic: t.shapeOctilinear
    };

    const shapeDescription: Record<MapShapeMode, string> = {
        geographic: t.shapeStraightDesc,
        smooth: t.shapeSmoothDesc,
        schematic: t.shapeOctilinearDesc
    };

    const landFormSelector = (compact: boolean) => (
        <div className={`flex items-center p-1 ${compact ? '' : 'w-full'} bg-white/85 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 rounded-2xl shadow-lg`}>
            {LAND_FORMS.map(form => {
                const isActive = landForm === form;
                return (
                    <button
                        key={form}
                        onClick={() => onSettingsChange({ ...settings, landForm: form })}
                        className={`flex items-center justify-center gap-1.5 px-3 rounded-xl transition-colors duration-200 ${compact ? 'py-1.5' : 'flex-1 h-11'} ${isActive
                            ? 'bg-primary text-white font-black shadow-md'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        title={landLabel[form]}
                        aria-label={landLabel[form]}
                    >
                        <LandGlyph form={form} />
                        <span className="text-[11px] font-bold hidden sm:inline">{landLabel[form]}</span>
                    </button>
                );
            })}
        </div>
    );

    // Render External Floating Toolbar (Landform selector + Map Style Button).
    // A phone has no room for a four-way segmented control plus a labelled
    // button in the map's top-right corner, so it gets one icon and the
    // landform choice moves inside the sheet.
    const renderTopBar = () => (
        <div
            onMouseDown={stopPropagation}
            onMouseUp={stopPropagation}
            onClick={stopPropagation}
            onDoubleClick={stopPropagation}
            onWheel={stopPropagation}
            onTouchStart={stopPropagation}
            style={{ zIndex: Z.mapOverlay }}
            className="absolute top-3 right-3 flex items-center gap-2 pointer-events-auto"
        >
            {/* Landform selector (boundary/dots/squares/hexes) is temporarily hidden */}
            {/* {!isMobile && landFormSelector(true)} */}

            {!isOpen && (
                <button
                    onClick={() => onOpenChange(true)}
                    className={`flex items-center justify-center gap-2 bg-white/85 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 rounded-2xl shadow-lg transition-all duration-300 group ${isMobile ? 'w-11 h-11' : 'px-4 h-[44px] hover:scale-105'}`}
                    aria-label={t.mapStyle}
                >
                    <span className="material-symbols-outlined text-primary group-hover:rotate-45 transition-transform duration-700">palette</span>
                    {!isMobile && <span className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-widest uppercase">{t.mapStyle}</span>}
                </button>
            )}
        </div>
    );

    if (!isOpen) {
        return renderTopBar();
    }

    return (
        <>
            {renderTopBar()}

            {/* On a phone the sheet takes the width and a tap outside closes it;
                a 256px card floating over a 344px screen leaves neither room to
                read nor room to dismiss. */}
            {isMobile && (
                <div
                    onClick={() => onOpenChange(false)}
                    style={{ zIndex: Z.mapOverlay }}
                    className="fixed inset-0 bg-black/30 pointer-events-auto animate-in fade-in duration-200"
                />
            )}

            <div
                onMouseDown={stopPropagation}
                onMouseUp={stopPropagation}
                onClick={stopPropagation}
                onDoubleClick={stopPropagation}
                onWheel={stopPropagation}
                onTouchStart={stopPropagation}
                onTouchMove={stopPropagation}
                onTouchEnd={stopPropagation}
                className={isMobile
                    ? "fixed inset-x-0 bottom-0 bg-white/95 dark:bg-slate-900/97 backdrop-blur-3xl border-t border-white/60 dark:border-slate-700/70 rounded-t-[28px] shadow-2xl flex flex-col max-h-[85dvh] animate-in slide-in-from-bottom duration-300 overflow-hidden pointer-events-auto"
                    : "absolute top-16 right-4 w-64 sm:w-72 bg-white/90 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/60 dark:border-slate-700/70 rounded-3xl shadow-2xl flex flex-col max-h-[80dvh] animate-in slide-in-from-right-8 fade-in duration-300 overflow-hidden pointer-events-auto"}
                style={isMobile
                    ? { zIndex: Z.mapOverlay + 1, paddingBottom: 'var(--safe-bottom)' }
                    : { zIndex: Z.mapOverlay }}
            >
                {/* Header */}
                <div className="p-5 pb-3 flex justify-between items-center bg-white/85 dark:bg-slate-900/95 backdrop-blur-md z-10 border-b border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-primary">
                        <span className="material-symbols-outlined text-lg">palette</span>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{t.mapStyles}</h3>
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className={`${isMobile ? 'w-11 h-11' : 'w-7 h-7'} flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-300 hover:text-slate-600 transition-colors`}
                        aria-label="Close"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                {/* Content: Scrollable */}
                <div className="flex-1 overflow-y-auto sheet-scroll p-4 sm:p-5 flex flex-col gap-4 sm:gap-6 custom-scrollbar">
                    {/* Landform selector (boundary/dots/squares/hexes) is temporarily hidden */}
                    {/* {isMobile && landFormSelector(false)} */}

                    {/* Notice in Tile Mode */}
                    {isTileMode && (
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                            <span className="material-symbols-outlined text-amber-500 !text-[18px] shrink-0 mt-0.5">palette</span>
                            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 leading-snug">
                                {t.tileThemeOnlyNotice}
                            </p>
                        </div>
                    )}

                    {/* 1. Theme Palette (Always visible) */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 px-1">
                            <span className="material-symbols-outlined text-primary text-sm">contrast</span>
                            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">{t.theme}</h4>
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
                                        <span
                                            className={`relative w-full aspect-square rounded-xl overflow-hidden transition-all duration-300 ${isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent shadow-lg' : 'ring-1 ring-black/10 dark:ring-white/10'}`}
                                            style={{ background: swatch.sea }}
                                        >
                                            <span className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: swatch.land }} />
                                            <span className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rotate-[-20deg]" style={{ background: '#e8543f' }} />
                                            <span className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: swatch.stationFill, boxShadow: `0 0 0 1px ${swatch.stationInk}` }} />
                                        </span>
                                        <span className={`text-[9px] font-black tracking-tight ${isActive ? 'text-primary' : 'text-slate-600 dark:text-slate-200'}`}>
                                            {swatch.label[language as 'ko' | 'en' | 'ja'] ?? swatch.label.en}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Vector Line Settings: Hidden completely when in Tile Mode */}
                    {!isTileMode && (
                        <>
                            <div className="h-px bg-slate-900/5 dark:bg-white/10" />

                            {/* 2. Track Shape */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="material-symbols-outlined text-primary text-sm">route</span>
                                    <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">{t.shape}</h4>
                                </div>
                                <div className="relative grid grid-cols-3 gap-1 p-1 bg-slate-900/5 dark:bg-white/10 rounded-2xl">
                                    <div
                                        className="absolute top-1 bottom-1 rounded-xl bg-white dark:bg-slate-700 shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
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
                                                className={`relative z-10 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-colors duration-300 ${isActive ? 'text-primary font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}
                                            >
                                                <ShapeGlyph mode={mode} active={isActive} />
                                                <span className="text-[10px] font-black tracking-tight">{shapeLabel[mode]}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="px-1 text-[10px] font-medium text-slate-500 dark:text-slate-300 leading-snug min-h-[2.2em]">
                                    {shapeDescription[shapeMode]}
                                </p>
                            </div>

                            <div className="h-px bg-slate-900/5 dark:bg-white/10" />

                            {/* 3. Unselected Lines */}
                            <div className="flex flex-col gap-3 sm:gap-4">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="material-symbols-outlined text-slate-400 dark:text-slate-300 text-sm">visibility_off</span>
                                    <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">{t.hiddenLines}</h4>
                                </div>
                                <div className="flex flex-col gap-5 px-1">
                                    <div className="space-y-1 sm:space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 dark:text-slate-200 px-0.5">
                                            <span>{t.opacity}</span>
                                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded-md">{Math.round(settings.unselected.opacity * 100)}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.05"
                                            value={settings.unselected.opacity}
                                            onChange={(e) => handleChange('unselected', 'opacity', parseFloat(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                    <div className="space-y-1 sm:space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 dark:text-slate-200 px-0.5">
                                            <span>{t.thickness}</span>
                                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded-md">{settings.unselected.weight.toFixed(1)}x</span>
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

                            {/* 4. Visibility Toggle */}
                            <div className="flex flex-col gap-3 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="material-symbols-outlined text-primary text-sm">label</span>
                                    <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Visibility</h4>
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
                                        <div className="w-10 h-6 bg-slate-300/50 dark:bg-slate-700/70 backdrop-blur-sm peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[16px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
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
                                        <div className="w-10 h-6 bg-slate-300/50 dark:bg-slate-700/70 backdrop-blur-sm peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[16px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                                    </div>
                                </label>
                            </div>

                            {/* 5. Unvisited Lines */}
                            <div className="flex flex-col gap-3 sm:gap-4 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="material-symbols-outlined text-slate-400 dark:text-slate-300 text-sm">map</span>
                                    <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">{t.unvisitedSelected}</h4>
                                </div>
                                <div className="flex flex-col gap-5 px-1">
                                    <div className="space-y-1 sm:space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 dark:text-slate-200 px-0.5">
                                            <span>{t.lineWeight}</span>
                                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded-md">{settings.unvisited.weight.toFixed(1)}x</span>
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
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">{t.showOutline}</span>
                                    </label>

                                    <div className="space-y-1 sm:space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 dark:text-slate-200 px-0.5">
                                            <span>{t.stationSize}</span>
                                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded-md">{settings.unvisited.stationSize.toFixed(1)}x</span>
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

                            {/* 6. Visited Lines */}
                            <div className="flex flex-col gap-3 sm:gap-4 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="material-symbols-outlined text-emerald-500 text-sm">verified</span>
                                    <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Visited (Recorded)</h4>
                                </div>
                                <div className="flex flex-col gap-5 px-1">
                                    <div className="space-y-1 sm:space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 dark:text-slate-200 px-0.5">
                                            <span>LINE WEIGHT</span>
                                            <span className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded-md">{settings.visited.weight.toFixed(1)}x</span>
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
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-500 transition-colors">Show Line Outline</span>
                                    </label>

                                    <div className="space-y-1 sm:space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 dark:text-slate-200 px-0.5">
                                            <span>STATION SIZE</span>
                                            <span className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded-md">{settings.visited.stationSize.toFixed(1)}x</span>
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
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 pt-3 bg-white/85 dark:bg-slate-900/95 backdrop-blur-md z-10 border-t border-slate-200/50 dark:border-slate-800">
                    <button
                        onClick={handleReset}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black tracking-widest transition-all active:scale-95 shadow-md"
                    >
                        <span className="material-symbols-outlined text-sm">restart_alt</span>
                        {t.resetToDefaults}
                    </button>
                </div>
            </div>
        </>
    );
};

export default MapStylePanel;
