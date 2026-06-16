import i18n from './i18n';
import { defaultLocale } from './constants';
import { systemLanguageCode } from '@/services/settings/language';

export const getLang = () => {
    if (i18n.language) {
        return i18n.language;
    }

    return systemLanguageCode() ?? defaultLocale;
};
