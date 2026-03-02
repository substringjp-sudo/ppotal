'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from './i18n-utils';

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    isKorean: boolean;
    isJapanese: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof window === 'undefined') return 'ja';

        // 1. Check saved preference
        const savedLang = localStorage.getItem('pref-lang') as Language;
        if (savedLang === 'ko' || savedLang === 'en' || savedLang === 'ja') return savedLang;

        // 2. Detect browser language
        const browserLang = navigator.language.split('-')[0];
        if (browserLang === 'ko') return 'ko';
        if (browserLang === 'ja') return 'ja';

        return 'ja' as Language;
    });

    useEffect(() => {
        // Initialization handled in useState lazy initializer
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('pref-lang', lang);
    };

    const isKorean = language === 'ko';
    const isJapanese = language === 'ja';

    return (
        <I18nContext.Provider value={{ language, setLanguage, isKorean, isJapanese }}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = () => {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};
