import { Locale } from '@/locale/constants';

export const LanguagePreference = {
    SYSTEM: 'system',
    ENGLISH: Locale.EN,
    RUSSIAN: Locale.RU,
    GERMAN: Locale.DE,
    SPANISH: Locale.ES,
    FRENCH: Locale.FR,
    HINDI: Locale.HI,
    JAPANESE: Locale.JA,
    CHINESE: Locale.ZH,
} as const;

export type LanguagePreferenceValue = (typeof LanguagePreference)[keyof typeof LanguagePreference];

export const ThemePreference = {
    SYSTEM: 'system',
    LIGHT: 'light',
    DARK: 'dark',
} as const;

export type ThemePreferenceValue = (typeof ThemePreference)[keyof typeof ThemePreference];

export type SettingsOption<TValue extends string> = {
    value: TValue;
    label: string;
    description: string;
    labelKey: string;
    descriptionKey: string;
};

export const LANGUAGE_OPTIONS: SettingsOption<LanguagePreferenceValue>[] = [
    {
        value: LanguagePreference.SYSTEM,
        label: 'System',
        description: 'Use the device language when supported.',
        labelKey: 'language.options.system.label',
        descriptionKey: 'language.options.system.description',
    },
    {
        value: LanguagePreference.ENGLISH,
        label: 'English',
        description: 'English',
        labelKey: 'language.options.english.label',
        descriptionKey: 'language.options.english.description',
    },
    {
        value: LanguagePreference.RUSSIAN,
        label: 'Russian',
        description: 'Русский',
        labelKey: 'language.options.russian.label',
        descriptionKey: 'language.options.russian.description',
    },
    {
        value: LanguagePreference.GERMAN,
        label: 'German',
        description: 'Deutsch',
        labelKey: 'language.options.german.label',
        descriptionKey: 'language.options.german.description',
    },
    {
        value: LanguagePreference.SPANISH,
        label: 'Spanish',
        description: 'Español',
        labelKey: 'language.options.spanish.label',
        descriptionKey: 'language.options.spanish.description',
    },
    {
        value: LanguagePreference.FRENCH,
        label: 'French',
        description: 'Français',
        labelKey: 'language.options.french.label',
        descriptionKey: 'language.options.french.description',
    },
    {
        value: LanguagePreference.HINDI,
        label: 'Hindi',
        description: 'हिन्दी',
        labelKey: 'language.options.hindi.label',
        descriptionKey: 'language.options.hindi.description',
    },
    {
        value: LanguagePreference.JAPANESE,
        label: 'Japanese',
        description: '日本語',
        labelKey: 'language.options.japanese.label',
        descriptionKey: 'language.options.japanese.description',
    },
    {
        value: LanguagePreference.CHINESE,
        label: 'Chinese',
        description: '中文',
        labelKey: 'language.options.chinese.label',
        descriptionKey: 'language.options.chinese.description',
    },
];

export const THEME_OPTIONS: SettingsOption<ThemePreferenceValue>[] = [
    {
        value: ThemePreference.SYSTEM,
        label: 'System',
        description: 'Follow the device appearance.',
        labelKey: 'theme.options.system.label',
        descriptionKey: 'theme.options.system.description',
    },
    {
        value: ThemePreference.LIGHT,
        label: 'Light',
        description: 'Use the light app appearance.',
        labelKey: 'theme.options.light.label',
        descriptionKey: 'theme.options.light.description',
    },
    {
        value: ThemePreference.DARK,
        label: 'Dark',
        description: 'Use the dark app appearance.',
        labelKey: 'theme.options.dark.label',
        descriptionKey: 'theme.options.dark.description',
    },
];
