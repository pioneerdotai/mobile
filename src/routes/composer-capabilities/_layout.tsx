import { router } from 'expo-router';
import Stack from 'expo-router/js-stack';
import { useTranslation } from 'react-i18next';

import { CollapseButton } from '@/components/buttons/collapse';
import { useScreen } from '@/hooks/use-screen';

export default function ComposerCapabilitiesStackLayout() {
    const { t } = useTranslation('threads');
    const { options } = useScreen();

    const close = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.navigate('/');
        }
    };

    return (
        <Stack
            screenOptions={{
                ...options,
                headerShown: true,
                headerMode: 'screen',
                headerTransparent: true,
                headerStyle: {
                    ...options.headerStyle,
                    backgroundColor: 'transparent',
                },
                animation: 'slide_from_right',
                animationTypeForReplace: 'pop',
            }}
        >
            <Stack.Screen
                name="skills"
                options={{
                    title: t('composerAddSkill'),
                    headerLeft: () => <CollapseButton onPressHandler={close} />,
                }}
            />
            <Stack.Screen
                name="mcp"
                options={{
                    title: t('composerAddMcp'),
                    headerLeft: () => <CollapseButton onPressHandler={close} />,
                }}
            />
        </Stack>
    );
}
