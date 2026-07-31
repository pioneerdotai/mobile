import { describe, expect, it } from '@jest/globals';
import { createInstance } from 'i18next';

import resources from './translations/resources.json';

const clientKinds = {
    en: { desktop: 'Desktop', mobile: 'Mobile', other: 'Other' },
    ru: { desktop: 'Компьютер', mobile: 'Мобильное', other: 'Другое' },
    de: { desktop: 'Desktop', mobile: 'Mobil', other: 'Andere' },
    es: { desktop: 'Escritorio', mobile: 'Móvil', other: 'Otro' },
    fr: { desktop: 'Ordinateur', mobile: 'Mobile', other: 'Autre' },
    hi: { desktop: 'डेस्कटॉप', mobile: 'मोबाइल', other: 'अन्य' },
    ja: { desktop: 'デスクトップ', mobile: 'モバイル', other: 'その他' },
    zh: { desktop: '桌面端', mobile: '移动端', other: '其他' },
} as const;

describe('device session metadata translations', () => {
    it('resolves client kinds through i18next nesting in every locale', async () => {
        for (const [locale, kinds] of Object.entries(clientKinds)) {
            const i18n = createInstance();
            await i18n.init({
                defaultNS: 'gateway',
                fallbackLng: 'en',
                lng: locale,
                resources,
            });

            for (const [kind, translatedKind] of Object.entries(kinds)) {
                const value = i18n.t('devices.sessionMeta', { kind, date: 'DATE' });
                expect(value).toContain(translatedKind);
                expect(value).toContain('DATE');
                expect(value).not.toContain('$t(');
                expect(value).not.toContain('devices.clientKind');
            }
        }
    });
});
