'use client';

import React, { createContext, useContext } from 'react';
import pt from '@/src/locales/pt.json';
import en from '@/src/locales/en.json';

type Dictionary = typeof en;

const LanguageContext = createContext<{ dict: Dictionary; lang: string }>({ dict: en, lang: 'en' });

export function LanguageProvider({ children, lang }: { children: React.ReactNode; lang: string }) {
    const dict = lang === 'pt' ? pt : en;
    return (
        <LanguageContext.Provider value={{ dict, lang }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useTranslation() {
    return useContext(LanguageContext);
}
