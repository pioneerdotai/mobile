import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';

import { ScrollView } from '@/components/primitives/scrollview';
import i18n from '@/locale/i18n';
import {
    readLanguagePreference,
    resolveLanguagePreference,
    writeLanguagePreference,
} from '@/services/settings/language';
import { LANGUAGE_OPTIONS, type LanguagePreferenceValue } from '@/services/settings/options';
import { SettingsChoiceList } from '@/screens/settings/components/choice-list';

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        flex: 1,
        paddingHorizontal: rt.insets.left + theme.space(4),
        paddingRight: rt.insets.right + theme.space(4),
    },
    content: {
        ...theme.screenContentPadding('child'),
        gap: theme.space(5),
    },
}));

const LanguageSettingsScreen = () => {
    const { t } = useTranslation('settings');
    const [preference, setPreference] = useState<LanguagePreferenceValue | null>(null);

    useEffect(() => {
        let cancelled = false;

        void readLanguagePreference()
            .then((nextPreference) => {
                if (!cancelled) {
                    setPreference(nextPreference);
                }
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, []);

    const choices = useMemo(
        () =>
            LANGUAGE_OPTIONS.map((option) => ({
                value: option.value,
                title: option.value === 'system' ? t(option.labelKey) : option.description,
            })),
        [t],
    );

    const selectLanguage = useCallback(
        (nextPreference: LanguagePreferenceValue) => {
            const previousPreference = preference;
            setPreference(nextPreference);

            void writeLanguagePreference(nextPreference)
                .then(() => i18n.changeLanguage(resolveLanguagePreference(nextPreference)))
                .catch(() => {
                    setPreference(previousPreference);
                });
        },
        [preference],
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <SettingsChoiceList choices={choices} value={preference} onChange={selectLanguage} />
        </ScrollView>
    );
};

export default LanguageSettingsScreen;
