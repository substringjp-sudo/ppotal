'use client';

import React from 'react';
import { useI18n } from '../lib/i18n-context';

export const LanguageSelector: React.FC<{ className?: string }> = ({ className }) => {
    const { language, setLanguage } = useI18n();

    return (
        <div className={`flex items-center gap-2 px-3 py-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shrink-0 ${className || ''}`}>
            <span className="material-symbols-outlined text-slate-400 text-sm">language</span>
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 min-w-[180px]">
                <button
                    onClick={() => setLanguage('ko')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${language === 'ko'
                        ? 'bg-white dark:bg-slate-600 text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    한국어
                </button>
                <button
                    onClick={() => setLanguage('en')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${language === 'en'
                        ? 'bg-white dark:bg-slate-600 text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    English
                </button>
                <button
                    onClick={() => setLanguage('ja')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${language === 'ja'
                        ? 'bg-white dark:bg-slate-600 text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    日本語
                </button>
            </div>
        </div>
    );
};
