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
    const [language, setLanguageState] = useState<Language>('ja'); // Default to ja for Japan rail app

    useEffect(() => {
        // Detect browser language on mount
        const browserLang = navigator.language.split('-')[0];
        let initialLang: Language = 'en';

        if (browserLang === 'ko') initialLang = 'ko';
        else if (browserLang === 'ja') initialLang = 'ja';

        // Check if user has a saved preference
        const savedLang = localStorage.getItem('pref-lang') as Language;
        if (savedLang === 'ko' || savedLang === 'en' || savedLang === 'ja') {
            setLanguageState(savedLang);
        } else {
            setLanguageState(initialLang);
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
