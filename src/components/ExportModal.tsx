"use client";

import React from 'react';
import { useI18n } from '../lib/i18n-context';
import { EXPORT_TRANSLATIONS, getTranslations } from '../lib/translations';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageData: string | null;
    stats: {
        stations: number;
        lines: number;
        distance: number;
    };
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, imageData, stats }) => {
    const { language } = useI18n();
    const t = getTranslations(EXPORT_TRANSLATIONS, language);

    if (!isOpen) return null;

    const handleDownload = () => {
        if (!imageData) return;
        const link = document.createElement('a');
        link.download = `jprail-map-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = imageData;
        link.click();
    };

    const handleTwitterShare = () => {
        const message = t.twitterMessage(stats.stations, stats.lines, stats.distance);
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-[#0f172a99] backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500">
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">download</span>
                        {t.title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-video relative shadow-inner group">
                        {imageData ? (
                            <img
                                src={imageData}
                                alt="Map Preview"
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
                            </div>
                        )}
                        <div className="absolute top-3 left-3 bg-[#ffffffcc] dark:bg-[#0f172acc] backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                            {t.preview}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={handleDownload}
                            className="flex items-center justify-center gap-3 py-4 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined text-2xl">download_for_offline</span>
                            {t.saveFile}
                        </button>

                        <button
                            onClick={handleTwitterShare}
                            className="flex items-center justify-center gap-3 py-4 px-6 bg-[#1DA1F2] hover:bg-[#1A91DA] text-white font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        >
                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                            </svg>
                            {t.shareTwitter}
                        </button>
                    </div>
                </div>

                <div className="px-8 py-6 bg-slate-50 dark:bg-[#0f172a80] border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed text-center">
                        {language === 'ko' ? "내보내기 기능은 현재 지도에 표시된 영역을 캡처합니다. 고해상도 지도를 저장하려면 지도를 원하는 위치에 맞춘 후 내보내기를 시도하세요." :
                            language === 'ja' ? "書き出し機能は、現在地図に表示されている領域をキャプチャします。高解像度の地図を保存するには、地図を目的の位置に合わせてから書き出しを試みてください。" :
                                "The export feature captures the area currently visible on the map. For high-resolution maps, center the map on your desired area before exporting."}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
