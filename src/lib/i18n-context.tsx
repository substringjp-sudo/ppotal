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
    const [language, setLanguageState] = useState<Language>('ja');

    useEffect(() => {
        // Hydration check: detect and set correct language after mount
        const savedLang = localStorage.getItem('pref-lang') as Language;
        if (savedLang === 'ko' || savedLang === 'en' || savedLang === 'ja') {
            if (savedLang !== 'ja') setLanguageState(savedLang);
        } else {
            const browserLang = navigator.language.split('-')[0];
            if (browserLang === 'ko') setLanguageState('ko');
            else if (browserLang === 'ja') setLanguageState('ja');
            else setLanguageState('en');
        }
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
