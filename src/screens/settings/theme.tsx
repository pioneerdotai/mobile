import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles';

import { ScrollView } from '@/components/primitives/scrollview';
import {
    readThemePreference,
    resolveThemePreference,
    writeThemePreference,
} from '@/services/settings/theme';
import { THEME_OPTIONS, type ThemePreferenceValue } from '@/services/settings/options';
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

const ThemeSettingsScreen = () => {
    const { t } = useTranslation('settings');
    const [preference, setPreference] = useState<ThemePreferenceValue | null>(null);

    useEffect(() => {
        let cancelled = false;

        void readThemePreference()
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
            THEME_OPTIONS.map((option) => ({
                value: option.value,
                title: t(option.labelKey),
            })),
        [t],
    );

    const selectTheme = useCallback(
        (nextPreference: ThemePreferenceValue) => {
            const previousPreference = preference;
            setPreference(nextPreference);

            void writeThemePreference(nextPreference)
                .then(() => {
                    UnistylesRuntime.setTheme(resolveThemePreference(nextPreference));
                })
                .catch(() => {
                    setPreference(previousPreference);
                });
        },
        [preference],
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <SettingsChoiceList choices={choices} value={preference} onChange={selectTheme} />
        </ScrollView>
    );
};

export default ThemeSettingsScreen;
