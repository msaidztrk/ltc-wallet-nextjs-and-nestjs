"use client";

import { useCallback } from 'react';

import { useSettings } from './useSettings';
import { translations, TranslationKey, LanguageCode } from '../lib/translations';

export function useTranslation() {
    const { settings } = useSettings();
    const currentLang = (settings.language as LanguageCode) || 'en';

    const t = useCallback((key: TranslationKey, params?: Record<string, string | number>) => {
        let text: string = (translations[currentLang] as any)?.[key] || (translations['en'] as any)[key];

        if (params) {
            Object.entries(params).forEach(([paramKey, paramValue]) => {
                text = text.replace(`{${paramKey}}`, String(paramValue));
            });
        }
        return text;
    }, [currentLang]);

    return { t, currentLang };
}
