import { router } from 'expo-router';
import Stack from 'expo-router/js-stack';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';

import { BackButton } from '@/components/buttons/back';
import { useScreen } from '@/hooks/use-screen';
import { InvitationProfileProvider } from '@/screens/invitation/profile-context';

const InvitationStackLayout = () => {
    const { t } = useTranslation('gateway');
    const { t: settingsT } = useTranslation('settings');
    const { options } = useScreen();
    const { theme } = useUnistyles();

    return (
        <InvitationProfileProvider>
            <Stack
                screenOptions={{
                    ...options,
                    headerShown: true,
                    headerMode: 'screen',
                    animation: 'slide_from_right',
                    headerTransparent: true,
                    headerStyle: { backgroundColor: 'transparent' },
                    cardStyle: { backgroundColor: theme.colors.background },
                    headerLeft: () => <BackButton onPressHandler={() => router.back()} />,
                }}
            >
                <Stack.Screen
                    name="index"
                    options={{
                        headerTitle: t('invitation.join.title'),
                    }}
                />
                <Stack.Screen
                    name="username"
                    options={{
                        headerTitle: settingsT('profile.username'),
                    }}
                />
            </Stack>
        </InvitationProfileProvider>
    );
};

export default InvitationStackLayout;
