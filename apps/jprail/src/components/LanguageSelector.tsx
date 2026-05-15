'use client';

import React from 'react';
import { useI18n } from '../lib/i18n-context';

export const LanguageSelector: React.FC<{ className?: string, variant?: 'default' | 'dropdown' }> = ({ className, variant = 'default' }) => {
    const { language, setLanguage } = useI18n();
    const [isOpen, setIsOpen] = React.useState(false);

    const languages = [
        { code: 'ko', label: '한국어' },
        { code: 'en', label: 'English' },
        { code: 'ja', label: '日本語' }
    ] as const;

    if (variant === 'dropdown') {
        const currentLang = languages.find(l => l.code === language) || languages[0];

        return (
            <div className={`relative ${className || ''}`}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                    <span className="material-symbols-outlined text-lg">language</span>
                    <span className="text-xs font-bold uppercase tracking-wider">{currentLang.code}</span>
                    <span className="material-symbols-outlined text-sm transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                        expand_more
                    </span>
                </button>

                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-[10010]"
                            onClick={() => setIsOpen(false)}
                        />
                        <div className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-[10011] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setLanguage(lang.code);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-4 py-2 text-left text-xs font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${language === lang.code
                                        ? 'text-primary bg-primary/5'
                                        : 'text-slate-600 dark:text-slate-400'
                                        }`}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 px-3 py-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shrink-0 ${className || ''}`}>
            <span className="material-symbols-outlined text-slate-400 text-sm">language</span>
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 min-w-[180px]">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${language === lang.code
                            ? 'bg-white dark:bg-slate-600 text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        {lang.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
