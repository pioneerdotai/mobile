import { UnistylesRuntime } from 'react-native-unistyles';

import { storage } from '@/storage';
import { ThemePreference, type ThemePreferenceValue } from '@/services/settings/options';

export type AppColorScheme = 'light' | 'dark';

export const isThemePreference = (value: unknown): value is ThemePreferenceValue => {
    return (
        value === ThemePreference.SYSTEM ||
        value === ThemePreference.LIGHT ||
        value === ThemePreference.DARK
    );
};

export const normalizeStoredThemePreference = (value: unknown): ThemePreferenceValue | null => {
    return isThemePreference(value) ? value : null;
};

export const normalizeSystemColorScheme = (value: unknown): AppColorScheme | null => {
    return value === 'dark' || value === 'light' ? value : null;
};

export const resolveThemePreferenceCore = (
    preference: ThemePreferenceValue,
    systemColorScheme: AppColorScheme | null,
): AppColorScheme => {
    if (preference === ThemePreference.DARK) {
        return 'dark';
    }

    if (preference === ThemePreference.LIGHT) {
        return 'light';
    }

    return systemColorScheme ?? 'light';
};

export const nextManualThemePreference = (effectiveTheme: AppColorScheme): ThemePreferenceValue => {
    return effectiveTheme === 'dark' ? ThemePreference.LIGHT : ThemePreference.DARK;
};

const STORAGE_KEY = 'pioneer.settings.theme-preference.v1';

export const systemColorScheme = () => {
    return normalizeSystemColorScheme(UnistylesRuntime.colorScheme);
};

export const resolveThemePreference = (preference: ThemePreferenceValue) => {
    return resolveThemePreferenceCore(preference, systemColorScheme());
};

export const readCachedThemePreference = (): ThemePreferenceValue => {
    return normalizeStoredThemePreference(storage.getString(STORAGE_KEY)) ?? ThemePreference.SYSTEM;
};

export const readThemePreference = async (): Promise<ThemePreferenceValue> => {
    return readCachedThemePreference();
};

export const writeThemePreference = async (preference: ThemePreferenceValue): Promise<void> => {
    storage.set(STORAGE_KEY, preference);
};
