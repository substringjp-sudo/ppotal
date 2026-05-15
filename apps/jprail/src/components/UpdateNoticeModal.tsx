"use client";

import React, { useState, useEffect } from 'react';
import { CURRENT_VERSION, CHANGELOG } from '../constants/changelog';
import { useI18n } from '../lib/i18n-context';
import { UPDATE_NOTICE_TRANSLATIONS, getTranslations } from '../lib/translations';

export const UpdateNoticeModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const { language } = useI18n();
    const t = getTranslations(UPDATE_NOTICE_TRANSLATIONS, language);

    useEffect(() => {
        const lastSeenVersion = localStorage.getItem('lastSeenVersion');
        if (lastSeenVersion !== CURRENT_VERSION) {
            // Give a small delay for smoother entrance
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem('lastSeenVersion', CURRENT_VERSION);
        }
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#1a232e] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="text-primary material-symbols-outlined">rocket_launch</span>
                            {t.title}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {t.subtitle(CURRENT_VERSION)}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-gray-500">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {CHANGELOG.map((item, idx) => (
                        <div key={item.version} className={`${idx !== 0 ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${idx === 0 ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                    }`}>
                                    v{item.version}
                                </span>
                                <span className="text-xs text-gray-400">{item.date}</span>
                                {item.isMajor && (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                        MAJOR
                                    </span>
                                )}
                            </div>
                            {item.imageUrl && (
                                <div className="mb-6 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm bg-gray-50 dark:bg-gray-900/50">
                                    <img 
                                        src={item.imageUrl} 
                                        alt={item.title[language]} 
                                        className="w-full h-auto object-cover hover:scale-[1.02] transition-transform duration-500"
                                    />
                                </div>
                            )}
                            <h3 className="text-lg font-bold mb-3 text-gray-800 dark:text-gray-200">{item.title[language]}</h3>
                            <ul className="space-y-2">
                                {item.changes[language].map((change, cIdx) => (
                                    <li key={cIdx} className="flex gap-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                        <span className="text-primary mt-1 flex-shrink-0 animate-pulse">•</span>
                                        <div dangerouslySetInnerHTML={{ __html: change.replace(/\*\*(.*?)\*\*/g, '<b class="text-gray-900 dark:text-white font-semibold">$1</b>') }} />
                                    </li>
                                ))}
                            </ul>
                            {idx === 0 && CHANGELOG.length > 1 && (
                                <div className="mt-8 pt-8 border-t border-dashed border-gray-100 dark:border-gray-800">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t.previousUpdates}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 dark:bg-[#111821]/50 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                                className="peer appearance-none w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-md checked:bg-primary checked:border-primary transition-all cursor-pointer"
                            />
                            <span className="absolute text-white scale-0 peer-checked:scale-100 transition-transform material-symbols-outlined text-[16px] pointer-events-none">
                                check
                            </span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                            {t.dontShowAgain}
                        </span>
                    </label>
                    <button
                        onClick={handleClose}
                        className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        {t.ok}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateNoticeModal;
