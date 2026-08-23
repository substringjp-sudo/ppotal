"use client";

import React, { useState, useEffect } from 'react';
import { Rocket, Check } from 'lucide-react';
import { CloseIcon } from '@ppotal/ui';
import { CURRENT_VERSION, CHANGELOG } from '../constants/changelog';
import { useI18n } from '../lib/i18n-context';
import { UPDATE_NOTICE_TRANSLATIONS, getTranslations } from '../lib/translations';
import { Z } from '../lib/layers';

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
        <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="update-modal-title"
            style={{ zIndex: Z.modal }} 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={handleClose}
        >
            <div 
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary shadow-sm">
                            <Rocket className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 id="update-modal-title" className="text-lg font-black text-slate-900 dark:text-white">
                                {t.title}
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {t.subtitle(CURRENT_VERSION)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="size-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        aria-label="닫기"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 sheet-scroll custom-scrollbar">
                    {CHANGELOG.map((item, idx) => (
                        <div key={item.version} className={`${idx !== 0 ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${idx === 0 ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}>
                                    v{item.version}
                                </span>
                                <span className="text-xs text-slate-400">{item.date}</span>
                                {item.isMajor && (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                        MAJOR
                                    </span>
                                )}
                            </div>
                            {item.imageUrl && (
                                <div className="mb-6 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-900/50">
                                    <img 
                                        src={item.imageUrl} 
                                        alt={item.title[language]} 
                                        className="w-full h-auto object-cover hover:scale-[1.02] transition-transform duration-500"
                                        fetchPriority="high"
                                    />
                                </div>
                            )}
                            <h3 className="text-base font-bold mb-3 text-slate-800 dark:text-slate-200">{item.title[language]}</h3>
                            <ul className="space-y-2">
                                {item.changes[language].map((change, cIdx) => (
                                    <li key={cIdx} className="flex gap-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                        <span className="text-primary mt-0.5 flex-shrink-0 animate-pulse">•</span>
                                        <div dangerouslySetInnerHTML={{ __html: change.replace(/\*\*(.*?)\*\*/g, '<b class="text-slate-900 dark:text-white font-semibold">$1</b>') }} />
                                    </li>
                                ))}
                            </ul>
                            {idx === 0 && CHANGELOG.length > 1 && (
                                <div className="mt-8 pt-8 border-t border-dashed border-slate-100 dark:border-slate-800">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t.previousUpdates}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                                className="peer appearance-none size-5 border-2 border-slate-300 dark:border-slate-600 rounded-md checked:bg-primary checked:border-primary transition-all cursor-pointer"
                            />
                            <Check className="w-3.5 h-3.5 text-white absolute scale-0 peer-checked:scale-100 transition-transform pointer-events-none stroke-[3]" />
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                            {t.dontShowAgain}
                        </span>
                    </label>
                    <button
                        onClick={handleClose}
                        className="w-full sm:w-auto px-8 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 cursor-pointer"
                    >
                        {t.ok}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateNoticeModal;
