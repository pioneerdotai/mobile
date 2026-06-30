import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ChevronLeft, Infinity as InfinityIcon, MessageCircle } from 'lucide-react-native';
import { useShallow } from 'zustand/react/shallow';

import { CollapseButton } from '@/components/buttons/collapse';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { useScreen } from '@/hooks/use-screen';
import { useActiveThreadStore } from '@/stores/active-thread';
import { Platform } from 'react-native';

const useThreadScreen = () => {
    const { options } = useScreen();
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');
    const params = useLocalSearchParams<{
        parentThreadId?: string | string[];
        taskTitle?: string | string[];
    }>();
    const parentThreadId = normalizeRouteParam(params.parentThreadId);
    const taskTitle = normalizeRouteParam(params.taskTitle);
    const isTaskChildThread = Boolean(parentThreadId);

    const { selectedMode, setModeSwitcherOpen } = useActiveThreadStore(
        useShallow((state) => ({
            selectedMode: state.composerSelectedMode,
            setModeSwitcherOpen: state.setComposerModeSwitcherOpen,
        })),
    );

    const handleBack = () => {
        if (router.canGoBack()) router.back();
        else router.navigate('/home');
    };

    const handleTaskBack = () => {
        if (parentThreadId) {
            router.replace({
                pathname: '/thread/[threadId]',
                params: { threadId: parentThreadId },
            });
            return;
        }

        handleBack();
    };

    const openModeSwitcher = () => {
        setModeSwitcherOpen(true);
    };

    const modeTitle = () => {
        if (isTaskChildThread) {
            return <Text style={styles.modeTitleText}>{taskTitle ?? t('modeAgentLabel')}</Text>;
        }

        const Icon = selectedMode === 'Agent' ? InfinityIcon : MessageCircle;
        const label = selectedMode === 'Agent' ? t('modeAgentLabel') : t('modeChatLabel');

        return (
            <Pressable onPress={openModeSwitcher}>
                <HStack style={styles.modeTitle}>
                    <Icon size={theme.space(4.5)} color={theme.colors.typography} />
                    <Text style={styles.modeTitleText}>{label}</Text>
                </HStack>
            </Pressable>
        );
    };

    return {
        name: 'index',
        options: {
            ...options,
            presentation: 'card' as const,
            animationTypeForReplace: 'pop' as const,
            cardOverlayEnabled: false,
            animation: 'slide_from_bottom' as const,
            headerMode: 'screen' as const,
            headerShown: true,
            headerTitle: modeTitle,
            headerTransparent: true,
            headerStyle: {
                ...options.headerStyle,
                backgroundColor: 'transparent',
            },
            headerLeft: () =>
                isTaskChildThread ? (
                    <Pressable onPress={handleTaskBack} style={styles.backButton}>
                        <ChevronLeft size={theme.space(7)} color={theme.colors.typography} />
                    </Pressable>
                ) : (
                    <CollapseButton onPressHandler={handleBack} />
                ),
            cardStyle: {
                ...options.cardStyle,
                backgroundColor: theme.colors.background,
            },
        },
    };
};

const styles = StyleSheet.create((theme) => ({
    modeTitle: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space(1.5),
        maxWidth: '100%',
    },
    modeTitleText: {
        fontSize: theme.fontSize.lg.fontSize,
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.bold.fontWeight,
        ...Platform.select({
            ios: {
                lineHeight: theme.fontSize.lg.fontSize,
                marginTop: theme.space(1),
            },
        }),
    },
    backButton: {
        width: theme.space(12),
        height: theme.space(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
}));

const normalizeRouteParam = (value: string | string[] | undefined): string | null => {
    const raw = Array.isArray(value) ? value[0] : value;
    const normalized = raw?.trim();
    return normalized ? normalized : null;
};

export { useThreadScreen };
