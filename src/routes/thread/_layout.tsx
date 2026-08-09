import Stack from 'expo-router/js-stack';

import { useScreen } from '@/hooks/use-screen';

export default function ThreadStackLayout() {
    const { options } = useScreen();

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
                cardOverlayEnabled: false,
            }}
        >
            <Stack.Screen name="new" />
            <Stack.Screen name="[threadId]" />
            <Stack.Screen name="child/[threadId]" />
            <Stack.Screen name="members/[threadId]" />
        </Stack>
    );
}
