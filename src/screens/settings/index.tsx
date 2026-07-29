import { router } from 'expo-router';
import { ChevronRight, Globe, Smartphone, Sun } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { Title } from '@/components/typography/title';

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        flex: 1,
        paddingHorizontal: rt.insets.left + theme.space(4),
        paddingRight: rt.insets.right + theme.space(4),
    },
    content: {
        ...theme.screenContentPadding('root'),
        gap: theme.space(5),
    },
    settingsContainer: {
        flex: 1,
        backgroundColor: theme.colors.muted,
        borderRadius: theme.radius['4xl'],
        padding: theme.space(5),
    },
    settingsWrapper: {
        flex: 1,
    },
    settingContainer: {
        height: theme.space(8),
        alignItems: 'center',
        gap: theme.space(3),
    },
    iconContainer: {
        height: theme.space(8),
        width: theme.space(8),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.muted,
        borderRadius: theme.radius.lg,
    },
    settingContentContainer: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.space(3),
    },
    settingTitleContainer: {
        gap: theme.space(2),
    },
    settingTitle: {
        color: theme.colors.typography,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.border,
        marginLeft: theme.space(11),
        marginVertical: theme.space(2),
    },
}));

const SettingsScreen = () => {
    const { t } = useTranslation('settings');
    const { theme } = useUnistyles();

    const settings = [
        {
            icon: Globe,
            title: t('language.eyebrow'),
            onPress: () => router.navigate({ pathname: '/settings/language' }),
        },
        {
            icon: Sun,
            title: t('theme.eyebrow'),
            onPress: () => router.navigate({ pathname: '/settings/theme' }),
        },
        {
            icon: Smartphone,
            title: t('devices.eyebrow'),
            onPress: () => router.navigate({ pathname: '/settings/devices' }),
        },
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Title type="h1">{t('title')}</Title>
            <VStack style={styles.settingsContainer}>
                <VStack style={styles.settingsWrapper}>
                    {settings.map((setting, index) => (
                        <VStack key={setting.title}>
                            <Pressable accessibilityRole="button" onPress={setting.onPress}>
                                <HStack style={styles.settingContainer}>
                                    <Box style={styles.iconContainer}>
                                        <setting.icon
                                            size={theme.space(5)}
                                            strokeWidth={theme.space(0.375)}
                                            opacity={0.8}
                                            color={theme.colors.typography}
                                        />
                                    </Box>
                                    <HStack style={styles.settingContentContainer}>
                                        <VStack style={styles.settingTitleContainer}>
                                            <Box>
                                                <Text
                                                    fontWeight="medium"
                                                    style={styles.settingTitle}
                                                >
                                                    {setting.title}
                                                </Text>
                                            </Box>
                                        </VStack>
                                        <Box>
                                            <ChevronRight
                                                size={theme.space(5)}
                                                opacity={0.8}
                                                color={theme.colors.typography}
                                            />
                                        </Box>
                                    </HStack>
                                </HStack>
                            </Pressable>
                            {index < settings.length - 1 ? <Box style={styles.divider} /> : null}
                        </VStack>
                    ))}
                </VStack>
            </VStack>
        </ScrollView>
    );
};

export default SettingsScreen;
