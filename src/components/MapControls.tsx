"use client";

import React from 'react';
import { useMap } from 'react-leaflet';

interface MapControlsProps {
    zoom: number;
    minZoom?: number;
    maxZoom?: number;
    showLabels?: boolean;
    onToggleLabels?: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({
    zoom,
    minZoom = 5,
    maxZoom = 18,
    showLabels = false,
    onToggleLabels
}) => {
    const map = useMap();

    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseInt(e.target.value);
        map.setZoom(newZoom);
    };

    const handleReset = () => {
        map.flyTo([35.6895, 139.6917], 5, { duration: 1.5 });
    };

    return (
        <>
            {/* Map Interaction Controls (Top Left) */}
            <div className="absolute top-4 left-6 z-[1000] flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    {/* Zoom Controls (Horizontal) */}
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 flex items-center">
                        <button
                            onClick={() => map.setZoom(Math.min(maxZoom, zoom + 1))}
                            disabled={zoom >= maxZoom}
                            className="w-8 h-9 flex items-center justify-center rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors disabled:opacity-30"
                        >
                            <span className="material-symbols-outlined !text-[20px]">add</span>
                        </button>
                        <div className="w-px h-6 bg-slate-100 dark:bg-slate-800 mx-1"></div>
                        <button
                            onClick={() => map.setZoom(Math.max(minZoom, zoom - 1))}
                            disabled={zoom <= minZoom}
                            className="w-8 h-9 flex items-center justify-center rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors disabled:opacity-30"
                        >
                            <span className="material-symbols-outlined !text-[20px]">remove</span>
                        </button>
                    </div>

                    {/* Reset Button (Next to Zoom) */}
                    <button
                        onClick={handleReset}
                        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md h-9 px-3 flex items-center justify-center rounded-xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-all active:scale-95 group"
                        title="Reset View"
                    >
                        <span className="material-symbols-outlined !text-[20px] group-hover:rotate-[-45deg] transition-transform">restart_alt</span>
                    </button>
                </div>

                <button
                    onClick={onToggleLabels}
                    className={`backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border transition-all flex items-center gap-2 ${showLabels
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-white/95 dark:bg-slate-900/95 border-slate-200/50 dark:border-slate-700/50 text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <span className="text-[10px] font-black whitespace-nowrap">STATION NAMES</span>
                    <span className={`size-1.5 rounded-full ${showLabels ? 'bg-primary animate-pulse' : 'bg-slate-300'}`}></span>
                </button>

                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-2 w-fit">
                    <span className="text-[10px] font-bold text-slate-500">ZOOM</span>
                    <span className="text-[10px] font-black text-primary">{zoom.toFixed(1)}</span>
                </div>
            </div>
        </>
    );
};

export default MapControls;
