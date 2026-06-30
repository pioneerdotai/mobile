import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Infinity as InfinityIcon, MessageCircle } from 'lucide-react-native';
import { useShallow } from 'zustand/react/shallow';

import { CollapseButton } from '@/components/buttons/collapse';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { useScreen } from '@/hooks/use-screen';
import { isCliRuntimeProvider } from '@/services/providers/cli-runtime';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';
import { Platform } from 'react-native';

type ThreadScreenNavigation = 'modal' | 'stack';

type UseThreadScreenOptions = {
    navigation?: ThreadScreenNavigation;
};

const useThreadScreen = ({ navigation = 'modal' }: UseThreadScreenOptions = {}) => {
    const { options } = useScreen();
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');
    const params = useLocalSearchParams<{
        parentThreadId?: string | string[];
    }>();
    const parentThreadId = normalizeRouteParam(params.parentThreadId);
    const isTaskChildThread = Boolean(parentThreadId);

    const {
        selectedMode,
        selectedProvider,
        selectedModel,
        snapshot,
        sending,
        setModeSwitcherOpen,
    } = useActiveThreadStore(
        useShallow((state) => ({
            selectedMode: state.composerSelectedMode,
            selectedProvider: state.composerSelectedProvider,
            selectedModel: state.composerSelectedModel,
            snapshot: state.snapshot,
            sending: state.sending,
            setModeSwitcherOpen: state.setComposerModeSwitcherOpen,
        })),
    );
    const { connectionId, connectionState } = useGatewayStore(
        useShallow((state) => ({
            connectionId: state.connectionId,
            connectionState: state.connectionState,
        })),
    );

    const showModeSwitcher = Boolean(
        selectedProvider?.trim() &&
        selectedModel?.trim() &&
        !isCliRuntimeProvider(selectedProvider),
    );
    const modeSwitcherDisabled = Boolean(
        isTaskChildThread ||
        connectionState !== 'Connected' ||
        connectionId === null ||
        snapshot?.thread?.status === 'Closed' ||
        snapshot?.projection.composer_locked ||
        sending,
    );

    const handleBack = () => {
        if (router.canGoBack()) router.back();
        else router.navigate('/home');
    };

    const handleTaskBack = () => {
        if (parentThreadId) {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace({
                    pathname: '/thread/[threadId]',
                    params: { threadId: parentThreadId },
                });
            }
            return;
        }

        handleBack();
    };

    const openModeSwitcher = () => {
        if (modeSwitcherDisabled) {
            return;
        }

        setModeSwitcherOpen(true);
    };

    const modeTitle = () => {
        if (!showModeSwitcher) {
            return null;
        }

        const Icon = selectedMode === 'Agent' ? InfinityIcon : MessageCircle;
        const label = selectedMode === 'Agent' ? t('modeAgentLabel') : t('modeChatLabel');

        return (
            <Pressable disabled={modeSwitcherDisabled} onPress={openModeSwitcher}>
                <HStack
                    style={[styles.modeTitle, modeSwitcherDisabled && styles.modeTitleDisabled]}
                >
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
            headerMode: 'screen' as const,
            headerShown: true,
            headerTitle: modeTitle,
            headerTransparent: true,
            animation:
                navigation === 'stack'
                    ? ('slide_from_right' as const)
                    : ('slide_from_bottom' as const),
            headerStyle: {
                ...options.headerStyle,
                backgroundColor: 'transparent',
            },
            headerLeft: () =>
                isTaskChildThread ? (
                    <CollapseButton icon="left" onPressHandler={handleTaskBack} />
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
    modeTitleDisabled: {
        opacity: 0.6,
    },
}));

const normalizeRouteParam = (value: string | string[] | undefined): string | null => {
    const raw = Array.isArray(value) ? value[0] : value;
    const normalized = raw?.trim();
    return normalized ? normalized : null;
};

export { useThreadScreen };
