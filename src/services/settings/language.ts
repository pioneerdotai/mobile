import { getLocales } from 'expo-localization';

import { defaultLocale, supportedLanguages } from '@/locale/constants';
import { storage } from '@/storage';
import { LanguagePreference, type LanguagePreferenceValue } from '@/services/settings/options';

const STORAGE_KEY = 'pioneer.settings.language';

const supportedLanguageSet = new Set<string>(supportedLanguages);

export const isLanguagePreference = (value: unknown): value is LanguagePreferenceValue => {
    return (
        typeof value === 'string' &&
        (value === LanguagePreference.SYSTEM || supportedLanguageSet.has(value))
    );
};

export const normalizeStoredLanguagePreference = (
    value: unknown,
): LanguagePreferenceValue | null => {
    return isLanguagePreference(value) ? value : null;
};

export const normalizeLanguageCode = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim().toLowerCase().replace(/_/g, '-');
    if (!normalized) {
        return null;
    }

    const primary = normalized.split('-')[0];
    const canonical = primary === 'ja' ? LanguagePreference.JAPANESE : primary;

    return supportedLanguageSet.has(canonical) ? canonical : null;
};

export const systemLanguageCode = (): string | null => {
    const locale = getLocales()[0];
    return normalizeLanguageCode(locale?.languageCode ?? locale?.languageTag);
};

export const resolveLanguagePreference = (
    preference: LanguagePreferenceValue,
    systemLanguage: string | null = systemLanguageCode(),
): string => {
    if (preference === LanguagePreference.SYSTEM) {
        return normalizeLanguageCode(systemLanguage) ?? defaultLocale;
    }

    return normalizeLanguageCode(preference) ?? defaultLocale;
};

export const readLanguagePreference = async (): Promise<LanguagePreferenceValue> => {
    const raw = storage.getString(STORAGE_KEY);
    return normalizeStoredLanguagePreference(raw) ?? LanguagePreference.SYSTEM;
};

export const writeLanguagePreference = async (
    preference: LanguagePreferenceValue,
): Promise<void> => {
    storage.set(STORAGE_KEY, preference);
};

export const detectLanguagePreference = async (): Promise<string> => {
    const preference = await readLanguagePreference();
    return resolveLanguagePreference(preference);
};
