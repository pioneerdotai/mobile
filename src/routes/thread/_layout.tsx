import { Stack } from 'expo-router/js-stack';

import { useScreen } from '@/hooks/use-screen';

export default function ThreadStackLayout({ inbox = false }: { inbox?: boolean } = {}) {
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
            {inbox ? <Stack.Screen name="index" /> : <Stack.Screen name="new" />}
            <Stack.Screen name={inbox ? 'thread/[threadId]' : '[threadId]'} />
            <Stack.Screen name="child/[threadId]" />
            <Stack.Screen name="members/[threadId]" />
        </Stack>
    );
}
