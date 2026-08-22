"use client";

import React, { useState, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { useI18n } from '../lib/i18n-context';
import { HOW_TO_TRANSLATIONS, getTranslations } from '../lib/translations';
import { Z } from '../lib/layers';
import { isPhoneWidth } from '../lib/mobile';

interface HowToModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HowToModal: React.FC<HowToModalProps> = ({ isOpen, onClose }) => {
    const { language } = useI18n();
    const t = getTranslations(HOW_TO_TRANSLATIONS, language);
    const [activeTab, setActiveTab] = useState<'desktop' | 'mobile'>('desktop');

    useEffect(() => {
        if (isOpen) {
            const isPhone = isPhoneWidth(window.innerWidth)
                || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setActiveTab(isPhone ? 'mobile' : 'desktop');

            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleEscape);
            return () => window.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="howto-modal-title"
            style={{ zIndex: Z.modal }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
                            <HelpCircle className="w-5 h-5" />
                        </div>
                        <h2 id="howto-modal-title" className="text-lg font-black text-slate-900 dark:text-white">
                            {t.title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        aria-label="닫기"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="px-6 pt-4 shrink-0">
                    <div className="flex bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1">
                        <button
                            onClick={() => setActiveTab('desktop')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                activeTab === 'desktop'
                                    ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                            }`}
                        >
                            {t.desktop}
                        </button>
                        <button
                            onClick={() => setActiveTab('mobile')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                activeTab === 'mobile'
                                    ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                            }`}
                        >
                            {t.mobile}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 sheet-scroll custom-scrollbar">
                    {t.guides[activeTab].map((item: any, idx: number) => (
                        <div key={idx} className="pb-4 border-b border-slate-100 dark:border-slate-800/60 last:border-none">
                            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-2">
                                <span className="size-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-primary text-[11px] font-black flex items-center justify-center shrink-0">
                                    {idx + 1}
                                </span>
                                {item.title}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-7">
                                {item.desc.split(/(\*\*.*?\*\*)/).map((part: string, i: number) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                        return <strong key={i} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
                                    }
                                    return part;
                                })}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    <button
                        autoFocus
                        onClick={onClose}
                        className="w-full py-3 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] cursor-pointer"
                    >
                        {t.startBtn}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HowToModal;
