import { router } from 'expo-router';
import Stack from 'expo-router/js-stack';
import { useTranslation } from 'react-i18next';

import { BackButton } from '@/components/buttons/back';
import { useSettingScreen } from '@/screens/settings/hooks';

export default function SettingsStackLayout() {
    const { t } = useTranslation('settings');
    const { options } = useSettingScreen();

    const handleBack = () => {
        router.back();
    };

    return (
        <Stack
            screenOptions={{
                ...options,
                headerShown: true,
                headerMode: 'screen',
                headerLeft: () => <BackButton onPressHandler={handleBack} />,
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
            <Stack.Screen
                name="devices"
                options={{
                    headerTitle: t('devices.eyebrow'),
                }}
            />
            <Stack.Screen
                name="invitations"
                options={{
                    headerTitle: t('invitations.eyebrow'),
                }}
            />
            <Stack.Screen
                name="members"
                options={{
                    headerTitle: t('members.eyebrow'),
                }}
            />
            <Stack.Screen
                name="profile"
                options={{
                    headerTitle: t('profile.editTitle'),
                }}
            />
            <Stack.Screen
                name="username"
                options={{
                    headerTitle: t('profile.username'),
                }}
            />
        </Stack>
    );
}
