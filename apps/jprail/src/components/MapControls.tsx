"use client";

import React from 'react';
import { useMap } from 'react-leaflet';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { useI18n } from '../lib/i18n-context';
import { Z } from '../lib/layers';

interface MapControlsProps {
    zoom: number;
    minZoom?: number;
    maxZoom?: number;
    onBounce?: (dir: 'in' | 'out') => void;
    isMobile?: boolean;
}

const MapControls: React.FC<MapControlsProps> = ({
    zoom,
    minZoom = 5,
    maxZoom = 18,
    onBounce,
    isMobile = false
}) => {
    const map = useMap();
    const { language } = useI18n();

    const handleReset = () => {
        map.flyTo([35.6895, 139.6917], 5, { duration: 1.5 });
    };

    const step = (direction: 1 | -1) => {
        const current = map.getZoom();
        const limit = direction === 1 ? maxZoom : minZoom;
        if (direction === 1 ? current >= maxZoom : current <= minZoom) {
            onBounce?.(direction === 1 ? 'in' : 'out');
            return;
        }
        const next = direction === 1
            ? Math.min(limit, Math.floor(current) + 1)
            : Math.max(limit, Math.ceil(current) - 1);
        map.setZoom(next);
    };

    const handleZoomIn = () => step(1);
    const handleZoomOut = () => step(-1);

    const stepBtn = `${isMobile ? 'w-11 h-11' : 'w-8 h-8'} flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white transition-all active:scale-90 cursor-pointer`;

    return (
        <>
            {/* Map Interaction Controls (Top Left) - Right of Left Sidebar */}
            <div className={isMobile
                ? "absolute flex flex-col items-start gap-2"
                : "absolute top-4 left-4 md:left-[366px] flex flex-row items-center gap-2"}
                style={isMobile
                    ? {
                        zIndex: Z.mapOverlay,
                        bottom: 'calc(var(--sheet-h, 120px) + 12px)',
                        left: 'calc(var(--sheet-w, 0px) + 12px)',
                        transition: 'bottom 260ms cubic-bezier(0.32, 0.72, 0, 1), left 260ms cubic-bezier(0.32, 0.72, 0, 1)'
                    }
                    : { zIndex: Z.mapOverlay }}
            >
                {/* Horizontal Zoom Pill */}
                <div className="flex flex-row items-center bg-white/85 dark:bg-slate-900/90 backdrop-blur-2xl h-[44px] rounded-2xl shadow-lg border border-white/60 dark:border-slate-700/60 px-1 transition-all duration-300 overflow-hidden group">
                    {/* Zoom In */}
                    <button
                        onClick={handleZoomIn}
                        className={stepBtn}
                        aria-label="Zoom in"
                    >
                        <Plus className="w-4 h-4" />
                    </button>

                    {/* Zoom Level Indicator */}
                    <div className="flex flex-row items-center px-2 relative min-w-[32px] justify-center">
                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mr-2" />
                        <span className="text-[12px] font-black text-primary leading-none tabular-nums">{zoom.toFixed(0)}</span>
                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 ml-2" />
                    </div>

                    {/* Zoom Out */}
                    <button
                        onClick={handleZoomOut}
                        className={stepBtn}
                        aria-label="Zoom out"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                </div>

                {/* Reset Button */}
                <button
                    onClick={handleReset}
                    className="bg-white/85 dark:bg-slate-900/90 backdrop-blur-2xl w-[44px] h-[44px] flex items-center justify-center rounded-2xl shadow-lg border border-white/60 dark:border-slate-700/60 text-slate-800 dark:text-white hover:text-primary dark:hover:text-primary transition-all active:scale-90 group shrink-0 cursor-pointer"
                    title={language === 'ko' ? "지도 초기화" : language === 'ja' ? "マップをリセット" : "Reset View"}
                    aria-label={language === 'ko' ? "지도 초기화" : language === 'ja' ? "マップをリセット" : "Reset View"}
                >
                    <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
                </button>
            </div>
        </>
    );
};

export default MapControls;
