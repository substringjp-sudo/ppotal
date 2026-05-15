"use client";

import React from 'react';
import { useMap } from 'react-leaflet';
import { useI18n } from '../lib/i18n-context';

interface MapControlsProps {
    zoom: number;
    minZoom?: number;
    maxZoom?: number;
}

const MapControls: React.FC<MapControlsProps> = ({
    zoom,
    minZoom = 5,
    maxZoom = 18,
}) => {
    const map = useMap();
    const { language } = useI18n();

    const handleReset = () => {
        map.flyTo([35.6895, 139.6917], 5, { duration: 1.5 });
    };

    return (
        <>
            {/* Map Interaction Controls (Top Left) - Right of Left Sidebar */}
            <div className="absolute top-4 left-4 md:left-[366px] z-[1000] flex flex-row items-center gap-2">
                {/* Horizontal Zoom Pill: Liquid Glassmorphism */}
                <div className="flex flex-row items-center bg-white/30 dark:bg-slate-900/40 backdrop-blur-3xl h-[44px] rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10 px-1 transition-all duration-500 overflow-hidden group">
                    {/* Zoom In */}
                    <button
                        onClick={() => map.setZoom(Math.min(maxZoom, zoom + 1))}
                        disabled={zoom >= maxZoom}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/40 dark:hover:bg-white/10 text-slate-800 dark:text-white transition-all active:scale-90 disabled:opacity-20"
                    >
                        <span className="material-symbols-outlined !text-[20px]">add</span>
                    </button>

                    {/* Zoom Level Indicator */}
                    <div className="flex flex-row items-center px-2 relative min-w-[32px] justify-center">
                        <div className="h-4 w-[1px] bg-slate-800/10 dark:bg-white/10 mr-2"></div>
                        <span className="text-[12px] font-black text-primary leading-none">{zoom.toFixed(0)}</span>
                        <div className="h-4 w-[1px] bg-slate-800/10 dark:bg-white/10 ml-2"></div>
                    </div>

                    {/* Zoom Out */}
                    <button
                        onClick={() => map.setZoom(Math.max(minZoom, zoom - 1))}
                        disabled={zoom <= minZoom}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/40 dark:hover:bg-white/10 text-slate-800 dark:text-white transition-all active:scale-90 disabled:opacity-20"
                    >
                        <span className="material-symbols-outlined !text-[20px]">remove</span>
                    </button>
                </div>

                {/* Reset Button: Glass Circle */}
                <button
                    onClick={handleReset}
                    className="bg-white/30 dark:bg-slate-900/40 backdrop-blur-3xl w-[44px] h-[44px] flex items-center justify-center rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10 text-slate-800 dark:text-white hover:text-primary dark:hover:text-primary transition-all active:scale-90 group shrink-0"
                    title={language === 'ko' ? "지도 초기화" : language === 'ja' ? "マップをリセット" : "Reset View"}
                >
                    <span className="material-symbols-outlined !text-[20px] group-hover:rotate-180 transition-transform duration-700">restart_alt</span>
                </button>
            </div>
        </>
    );
};

export default MapControls;
