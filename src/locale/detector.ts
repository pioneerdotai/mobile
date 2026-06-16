import { detectLanguagePreference } from '@/services/settings/language';

export const languageDetector = {
    type: 'languageDetector' as const,
    async: true,
    init: () => {},
    detect: async (callback: (language: string) => void) => {
        callback(await detectLanguagePreference());
    },
    cacheUserLanguage: () => {},
};
