import React from 'react';
import { Tabs } from 'expo-router/js-tabs';

import { Menu } from '@/components/overlays/menu';
import { useScreen } from '@/hooks/use-screen';
import { useSettingsTab } from '@/screens/settings/hooks';

export const unstable_settings = {
    initialRouteName: '(home)',
};

export default function TabLayout() {
    const { options } = useScreen();

    const settings = useSettingsTab();

    return (
        <Tabs
            tabBar={(props) => <Menu {...props} />}
            screenOptions={{
                ...options,
                headerTitle: () => null,
                headerLeft: () => null,
            }}
        >
            <Tabs.Screen
                name="(home)"
                options={{
                    headerShown: false,
                }}
            />
            <Tabs.Screen {...settings} />
        </Tabs>
    );
}
