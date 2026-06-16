import { router } from 'expo-router';
import Stack from 'expo-router/js-stack';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';

import { BackButton } from '@/components/buttons/back';
import { useSettingScreen } from '@/screens/settings/hooks';

export default function SettingsStackLayout() {
    const { t } = useTranslation('settings');
    const { options } = useSettingScreen();
    const { theme } = useUnistyles();

    const handleBack = () => {
        router.back();
    };

    return (
        <Stack
            screenOptions={{
                ...options,
                headerShown: true,
                headerMode: 'screen',
                animation: 'slide_from_right',
                animationTypeForReplace: 'pop',
                headerLeft: () => (
                    <BackButton
                        onPressHandler={handleBack}
                        backgroundColor={theme.colors.background}
                        iconColor={theme.colors.typography}
                    />
                ),
            }}
        >
            <Stack.Screen
                name="language"
                options={{
                    headerTitle: t('language.eyebrow'),
                }}
            />
            <Stack.Screen
                name="theme"
                options={{
                    headerTitle: t('theme.eyebrow'),
                }}
            />
        </Stack>
    );
}
