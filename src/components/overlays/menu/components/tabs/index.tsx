import React, { useCallback } from 'react';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { LucideIcon, Settings2, TextAlignStart, Plus } from 'lucide-react-native';

import { Pressable } from '@/components/primitives/pressable';
import { VStack } from '@/components/primitives/vstack';
import { Box } from '@/components/primitives/box';
import { Text } from '@/components/primitives/text';
import { HStack } from '@/components/primitives/hstack';
import { runInBackground } from '@/services/error-reporting';

type TabsType = Omit<BottomTabBarProps, 'descriptors' | 'insets' | 'navigation'>;

interface ItemType {
    isFocused: boolean;
    children: string;
    onPress: () => void;
    Icon: LucideIcon;
}

const styles = StyleSheet.create((theme, rt) => ({
    tabsContainer: {
        justifyContent: 'space-around',
        height: theme.space(16),
        paddingTop: theme.space(3),
        paddingHorizontal: theme.space(1),
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        backgroundColor:
            rt.themeName === 'dark' ? theme.colors.neutral[925] : theme.colors.background,
    },
    itemContainer: {
        flex: 1,
    },
    itemWrapper: {
        alignItems: 'center',
        gap: theme.space(0.25),
    },
    itemIconWrapper: {
        marginBottom: theme.space(1.5),
        height: theme.space(5),
        width: theme.space(5),
    },
    startContainer: {
        flex: 1,
        alignItems: 'center',
    },
    startWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.foreground,
        borderRadius: theme.radius['full'],
        height: theme.space(11),
        width: theme.space(11),
    },
    itemText: (isFocused: boolean) => ({
        color: theme.colors.typography,
        opacity: isFocused ? 1 : 0.6,
    }),
}));

const Item = ({ isFocused, onPress, children, Icon }: ItemType) => {
    const { theme } = useUnistyles();

    return (
        <Box style={styles.itemContainer}>
            <Pressable
                onPressIn={() => {
                    runInBackground(
                        () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
                        'Failed to trigger tab haptic feedback:',
                    );
                    onPress();
                }}
            >
                <VStack style={styles.itemWrapper}>
                    <Box style={styles.itemIconWrapper}>
                        <Icon
                            size={theme.space(5)}
                            color={theme.colors.typography}
                            opacity={isFocused ? 1 : 0.7}
                        />
                    </Box>
                    <Box>
                        <Text
                            fontSize="xs"
                            fontWeight={isFocused ? 'semibold' : 'medium'}
                            style={styles.itemText(isFocused)}
                        >
                            {children}
                        </Text>
                    </Box>
                </VStack>
            </Pressable>
        </Box>
    );
};

const Start = () => {
    const { theme, rt } = useUnistyles();

    return (
        <Box style={styles.startContainer}>
            <Pressable
                onPressIn={() => {
                    runInBackground(
                        () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
                        'Failed to trigger tab haptic feedback:',
                    );
                    router.navigate('/');
                }}
            >
                <VStack style={styles.startWrapper}>
                    <Plus
                        size={theme.space(7)}
                        color={
                            rt.themeName === 'dark' ? theme.colors.neutral[950] : theme.colors.white
                        }
                    />
                </VStack>
            </Pressable>
        </Box>
    );
};

const Tabs = ({ state }: TabsType) => {
    const { t } = useTranslation(['menu']);

    const activeRouteName = state.routes[state.index].name;
    const isFocused = useCallback(
        (name: string) => {
            if (name === 'home') {
                return activeRouteName === '(home)' || activeRouteName === 'home';
            }

            return name === activeRouteName;
        },
        [activeRouteName],
    );

    return (
        <HStack style={styles.tabsContainer}>
            <Item
                key="home"
                onPress={() => router.navigate('/home')}
                isFocused={isFocused('home')}
                Icon={TextAlignStart}
            >
                {t('home.title', { ns: 'menu' })}
            </Item>
            <Start />
            <Item
                key="settings"
                onPress={() => router.navigate('/settings')}
                isFocused={isFocused('settings')}
                Icon={Settings2}
            >
                {t('settings.title', { ns: 'menu' })}
            </Item>
        </HStack>
    );
};

export default Tabs;
