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
            {/* Map Interaction Controls (Top Left) */}
            <div className="absolute top-4 left-6 z-[1000] flex flex-col gap-3">
                {/* Vertical Zoom Pill: Liquid Glassmorphism */}
                <div className="flex flex-col items-center bg-white/30 dark:bg-slate-900/40 backdrop-blur-3xl rounded-full shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10 p-1 transition-all duration-500 overflow-hidden group w-10">
                    {/* Zoom In */}
                    <button
                        onClick={() => map.setZoom(Math.min(maxZoom, zoom + 1))}
                        disabled={zoom >= maxZoom}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/40 dark:hover:bg-white/10 text-slate-800 dark:text-white transition-all active:scale-90 disabled:opacity-20"
                    >
                        <span className="material-symbols-outlined !text-[20px]">add</span>
                    </button>

                    {/* Zoom Level Indicator */}
                    <div className="flex flex-col items-center py-1 relative">
                        <div className="w-4 h-[1px] bg-slate-800/10 dark:bg-white/10 mb-1.5"></div>
                        <span className="text-[12px] font-black text-primary leading-none">{zoom.toFixed(0)}</span>
                        <div className="w-4 h-[1px] bg-slate-800/10 dark:bg-white/10 mt-1.5"></div>
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

                {/* Reset Button: Separate Glass Circle */}
                <button
                    onClick={handleReset}
                    className="bg-white/30 dark:bg-slate-900/40 backdrop-blur-3xl w-10 h-10 flex items-center justify-center rounded-full shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10 text-slate-800 dark:text-white hover:text-primary dark:hover:text-primary transition-all active:scale-90 group"
                    title={language === 'ko' ? "지도 초기화" : language === 'ja' ? "マップをリセット" : "Reset View"}
                >
                    <span className="material-symbols-outlined !text-[20px] group-hover:rotate-180 transition-transform duration-700">restart_alt</span>
                </button>
            </div>
        </>
    );
};

export default MapControls;
