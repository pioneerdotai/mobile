import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CollapseButton } from '@/components/buttons/collapse';
import { ComposerPluginCapabilitiesScreen } from '@/screens/composer-capabilities/plugins';
export default function ComposerPluginsRoute() {
    const { t } = useTranslation('settings');
    return (
        <>
            <Stack.Screen
                options={{
                    title: t('plugins.title'),
                    headerShown: true,
                    headerLeft: () => <CollapseButton onPressHandler={() => router.back()} />,
                }}
            />
            <ComposerPluginCapabilitiesScreen />
        </>
    );
}
