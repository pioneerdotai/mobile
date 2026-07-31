import Stack from 'expo-router/js-stack';

import { useScreen } from '@/hooks/use-screen';
import { useHomeTab } from '@/screens/home/hooks';
import { useThreadsFolderScreen } from '@/screens/threads/folder/hooks';

export const unstable_settings = {
    initialRouteName: 'index',
};

export default function HomeStackLayout() {
    const { options } = useScreen();

    const home = useHomeTab();
    const folder = useThreadsFolderScreen();

    return (
        <Stack
            screenOptions={{
                ...options,
            }}
        >
            <Stack.Screen {...home} />
            <Stack.Screen {...folder} />
        </Stack>
    );
}
