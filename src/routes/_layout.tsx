import 'react-native-reanimated';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import { Paths } from 'expo-file-system';
import * as SystemUI from 'expo-system-ui';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Stack } from 'expo-router/js-stack';
import { SystemBars } from 'react-native-edge-to-edge';
import { useShallow } from 'zustand/react/shallow';

import i18n from '@/locale/i18n';

import { pioneerClient } from '@/client';
import type { GatewayConnectionState, GatewayEndpoint } from '@/client';
import { useGateway } from '@/hooks/use-gateway';
import { useGatewaySession } from '@/hooks/use-gateway-session';
import { useThreadTreeController } from '@/hooks/use-thread-tree';
import { useWorkspace } from '@/hooks/use-workspace';
import { useScreen } from '@/hooks/use-screen';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import GatewaySwitcherSheet from '@/components/overlays/gateway';
import WorkspaceSwitcherSheet from '@/components/overlays/workspace';
import ComposerAttachmentMenuSheet from '@/components/overlays/composer-attachments';
import ThreadModeSwitcherSheet from '@/components/overlays/thread-mode';
import ThreadPermissionModeSwitcherSheet from '@/components/overlays/thread-permission';
import { TerminalGatewaySessionNavigation } from '@/components/gateway/session-terminal-navigation';
import { initializeSentry, isSentryEnabled, Sentry } from '@/services/sentry';
import { pioneerQueryClient } from '@/services/query/client';
import { hideAppSplash, preventAppSplashAutoHide } from '@/services/app-splash';
import { useVoiceInputGatewayQueryLifecycle } from '@/services/voice-input/data-source';
import { TaskUserNotificationController } from '@/services/tasks/user-notifications';
import { mobileStartup } from '@/services/telemetry/mobile-startup';
import { mobileStartupReadinessOutcome } from '@/services/telemetry/mobile-startup-readiness';
import {
    composerCapabilityTargetForProvider,
    isCliRuntimeProvider,
} from '@/services/providers/cli-runtime';
import { useCliRuntimeSummaries } from '@/hooks/use-cli-runtime-summaries';
import { useAuthorizationCapabilitySnapshot } from '@/hooks/use-administration-capabilities';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';
import { useThreadTreeStore } from '@/stores/thread-tree';
import { useWorkspaceStore } from '@/stores/workspace';

export const unstable_settings = {
    initialRouteName: '(tabs)',
};

preventAppSplashAutoHide();
mobileStartup.begin('fonts.load');

initializeSentry();

const normalizeStartupError = (error: unknown): Error => {
    if (error instanceof Error) {
        return error;
    }

    return new Error(i18n.t('common:startupFailed'));
};

const RootLayout = () => {
    const { hydrate: hydrateGateway } = useGateway();
    const bootstrapStartedRef = useRef(false);

    const [startupReady, setStartupReady] = useState(false);
    const [startupError, setStartupError] = useState<Error | null>(null);

    const [fontsLoaded, fontsError] = useFonts({
        InterRegular: require('../../assets/fonts/Inter-Regular.ttf'),
        InterMedium: require('../../assets/fonts/Inter-Medium.ttf'),
        InterSemibold: require('../../assets/fonts/Inter-SemiBold.ttf'),
        InterBold: require('../../assets/fonts/Inter-Bold.ttf'),
        InterExtraBold: require('../../assets/fonts/Inter-ExtraBold.ttf'),
        InterBlack: require('../../assets/fonts/Inter-Black.ttf'),
    });

    useEffect(() => {
        if (bootstrapStartedRef.current) {
            return;
        }

        bootstrapStartedRef.current = true;

        const bootstrap = async () => {
            mobileStartup.begin('client.initialize');
            try {
                pioneerClient.initialize({
                    appDataDir: decodeURIComponent(Paths.cache.uri.replace(/^file:\/\//, '')),
                });
                mobileStartup.succeed('client.initialize');
            } catch (error) {
                mobileStartup.fail('client.initialize');
                throw error;
            }

            mobileStartup.begin('gateway_registry.hydrate');
            try {
                await hydrateGateway();
                mobileStartup.succeed('gateway_registry.hydrate');
            } catch (error) {
                mobileStartup.fail('gateway_registry.hydrate');
                throw error;
            }
        };

        void bootstrap()
            .catch((error) => {
                setStartupError(normalizeStartupError(error));
            })
            .finally(() => {
                setStartupReady(true);
            });
    }, [hydrateGateway]);

    useEffect(() => {
        if (fontsLoaded) {
            mobileStartup.succeed('fonts.load');
        }
        if (fontsError) {
            mobileStartup.fail('fonts.load');
            mobileStartup.completeWithFailure('degraded', hideAppSplash);
            throw fontsError;
        }

        if (startupError) {
            mobileStartup.completeWithFailure('degraded', hideAppSplash);
            throw startupError;
        }
    }, [fontsError, fontsLoaded, startupError]);

    if (!fontsLoaded || !startupReady || fontsError || startupError) {
        return null;
    }

    return (
        <GestureHandlerRootView style={styles.root}>
            <QueryClientProvider client={pioneerQueryClient}>
                <AppSystemBars />
                <KeyboardProvider>
                    <RootContent />
                </KeyboardProvider>
            </QueryClientProvider>
        </GestureHandlerRootView>
    );
};

const AppSystemBars = () => {
    const { rt, theme } = useUnistyles();
    const systemBarStyle = rt.themeName === 'dark' ? 'light' : 'dark';

    useEffect(() => {
        void SystemUI.setBackgroundColorAsync(theme.colors.background);
    }, [theme.colors.background]);

    return (
        <SystemBars
            style={{
                statusBar: systemBarStyle,
                navigationBar: systemBarStyle,
            }}
        />
    );
};

const RootContent = () => {
    const { registry, bootstrapped, connectionId, connectionState, sessionRevision } = useGateway();
    useVoiceInputGatewayQueryLifecycle();

    const remotes = registry.remotes ?? [];
    const activeGateway = bootstrapped
        ? (remotes.find((remote) => remote.id === registry.active_gateway_id) ?? null)
        : null;

    if (!bootstrapped) {
        return null;
    }

    return (
        <>
            {activeGateway ? (
                <>
                    <GatewaySessionController
                        activeGateway={activeGateway}
                        sessionRevision={sessionRevision}
                    />
                    <WorkspaceBootstrapController
                        activeGateway={activeGateway}
                        connectionId={connectionId}
                        connectionState={connectionState}
                    />
                </>
            ) : null}
            <ThreadTreeController />
            <AuthorizationProjectionController />
            <RootStack />
            <MobileStartupReadinessController />
            <CliRuntimeComposerCapabilityController />
            <TaskUserNotificationController />
            <TerminalGatewaySessionNavigation />
        </>
    );
};

/**
 * Keeps the authenticated principal and active-workspace authorization
 * projection warm independently of whichever screen happens to be mounted.
 * The hook waits for workspace bootstrap, so this remains background work and
 * never extends the splash/readiness boundary.
 */
const AuthorizationProjectionController = () => {
    useAuthorizationCapabilitySnapshot();
    return null;
};

const MobileStartupReadinessController = () => {
    const gateway = useGatewayStore(
        useShallow((state) => ({
            registry: state.registry,
            bootstrapped: state.bootstrapped,
            connectionId: state.connectionId,
            connectionState: state.connectionState,
            sessionError: state.sessionError,
            sessionTerminalReason: state.sessionTerminalReason,
        })),
    );
    const workspace = useWorkspaceStore(
        useShallow((state) => ({
            bootstrappedConnectionId: state.bootstrappedConnectionId,
            activeWorkspaceId: state.activeWorkspaceId,
            loading: state.loading,
            error: state.error,
        })),
    );
    const threadTree = useThreadTreeStore(
        useShallow((state) => ({
            snapshot: state.snapshot,
            workspaceId: state.workspaceId,
            loading: state.loading,
            error: state.error,
        })),
    );
    const composer = useActiveThreadStore(
        useShallow((state) => ({
            loading: state.defaultComposerSelectionLoading,
        })),
    );
    // Mobile can establish sessions only to remote endpoints. A desktop-local
    // registry entry must lead to setup UI instead of an endless startup wait.
    const hasActiveGateway = (gateway.registry.remotes ?? []).some(
        (remote) => remote.id === gateway.registry.active_gateway_id,
    );
    const outcome = mobileStartupReadinessOutcome({
        registryBootstrapped: gateway.bootstrapped,
        hasActiveGateway,
        connectionId: gateway.connectionId,
        connectionState: gateway.connectionState,
        sessionError: gateway.sessionError,
        sessionTerminalReason: gateway.sessionTerminalReason,
        workspaceBootstrappedConnectionId: workspace.bootstrappedConnectionId,
        activeWorkspaceId: workspace.activeWorkspaceId,
        workspaceLoading: workspace.loading,
        workspaceError: workspace.error,
        threadTreeWorkspaceId: threadTree.workspaceId,
        threadTreeLoaded: threadTree.snapshot !== null,
        threadTreeLoading: threadTree.loading,
        threadTreeError: threadTree.error,
        composerSelectionLoading: composer.loading,
    });

    useEffect(() => {
        if (outcome) {
            mobileStartup.completeAfterOperationalFrame(outcome, hideAppSplash);
        }
    }, [outcome]);

    return null;
};

const CliRuntimeComposerCapabilityController = () => {
    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const cliRuntimes = useCliRuntimeSummaries(activeWorkspaceId);
    const selection = useActiveThreadStore(
        useShallow((state) => ({
            defaultWorkspaceId: state.defaultComposerWorkspaceId,
            defaultProvider: state.defaultComposerProvider,
            defaultModel: state.defaultComposerModel,
            defaultReasoningEffort: state.defaultComposerReasoningEffort,
            selectedProvider: state.composerSelectedProvider,
            selectedModel: state.composerSelectedModel,
            selectedReasoningEffort: state.composerSelectedReasoningEffort,
            syncDefault: state.syncDefaultComposerModelSelection,
            syncSelected: state.syncComposerModelSelection,
        })),
    );

    useEffect(() => {
        if (!activeWorkspaceId) {
            return;
        }

        if (
            selection.defaultWorkspaceId === activeWorkspaceId &&
            isCliRuntimeProvider(selection.defaultProvider)
        ) {
            selection.syncDefault(
                activeWorkspaceId,
                selection.defaultProvider,
                selection.defaultModel,
                selection.defaultReasoningEffort,
                composerCapabilityTargetForProvider(selection.defaultProvider, cliRuntimes),
            );
        }

        if (isCliRuntimeProvider(selection.selectedProvider)) {
            selection.syncSelected(
                selection.selectedProvider,
                selection.selectedModel,
                selection.selectedReasoningEffort,
                composerCapabilityTargetForProvider(selection.selectedProvider, cliRuntimes),
            );
        }
    }, [activeWorkspaceId, cliRuntimes, selection]);

    return null;
};

const GatewaySessionController = ({
    activeGateway,
    sessionRevision,
}: {
    activeGateway: GatewayEndpoint;
    sessionRevision: number;
}) => {
    useGatewaySession(activeGateway, sessionRevision);
    return null;
};

const WorkspaceBootstrapController = ({
    activeGateway,
    connectionId,
    connectionState,
}: {
    activeGateway: GatewayEndpoint;
    connectionId: number | null;
    connectionState: GatewayConnectionState;
}) => {
    const { bootstrappedConnectionId, bootstrapGatewayWorkspace, resetConnectionBootstrap } =
        useWorkspace();
    const pendingConnectionIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (connectionState !== 'Connected' || connectionId === null) {
            pendingConnectionIdRef.current = null;
            resetConnectionBootstrap();
            return;
        }

        if (
            bootstrappedConnectionId === connectionId ||
            pendingConnectionIdRef.current === connectionId
        ) {
            return;
        }

        pendingConnectionIdRef.current = connectionId;

        void bootstrapGatewayWorkspace(activeGateway, connectionId)
            .catch(() => {})
            .finally(() => {
                if (pendingConnectionIdRef.current === connectionId) {
                    pendingConnectionIdRef.current = null;
                }
            });
    }, [
        activeGateway,
        bootstrappedConnectionId,
        bootstrapGatewayWorkspace,
        connectionId,
        connectionState,
        resetConnectionBootstrap,
    ]);

    return null;
};

const ThreadTreeController = () => {
    useThreadTreeController();
    return null;
};

const RootStack = () => {
    const { options } = useScreen();

    const threadModalOptions = {
        presentation: 'card' as const,
        animationTypeForReplace: 'pop' as const,
        cardOverlayEnabled: false,
        animation: 'slide_from_bottom' as const,
        headerShown: false,
    };

    return (
        <BottomSheetModalProvider>
            <Stack
                screenOptions={{
                    ...options,
                    headerShown: false,
                }}
            >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="thread" options={threadModalOptions} />
                <Stack.Screen
                    name="message-revisions"
                    options={{
                        presentation: 'card',
                        animationTypeForReplace: 'pop',
                        cardOverlayEnabled: false,
                        animation: 'slide_from_bottom',
                    }}
                />
                <Stack.Screen
                    name="agents-doc"
                    options={{
                        presentation: 'card',
                        animationTypeForReplace: 'pop',
                        cardOverlayEnabled: false,
                        animation: 'slide_from_bottom',
                    }}
                />
                <Stack.Screen
                    name="source-file"
                    options={{
                        presentation: 'card',
                        animationTypeForReplace: 'pop',
                        cardOverlayEnabled: false,
                        animation: 'slide_from_bottom',
                    }}
                />
                <Stack.Screen
                    name="editor"
                    options={{
                        presentation: 'card',
                        animationTypeForReplace: 'pop',
                        cardOverlayEnabled: false,
                        animation: 'slide_from_bottom',
                    }}
                />
                <Stack.Screen
                    name="model-selector"
                    options={{
                        presentation: 'card',
                        animationTypeForReplace: 'pop',
                        cardOverlayEnabled: false,
                        animation: 'slide_from_bottom',
                    }}
                />
                <Stack.Screen name="settings" />
                <Stack.Screen
                    name="activate"
                    options={{
                        presentation: 'card',
                        animationTypeForReplace: 'pop',
                        cardOverlayEnabled: false,
                        animation: 'slide_from_bottom',
                    }}
                />
                <Stack.Screen
                    name="invite"
                    options={{
                        presentation: 'card',
                        animationTypeForReplace: 'pop',
                        cardOverlayEnabled: false,
                        animation: 'slide_from_right',
                    }}
                />
                <Stack.Screen
                    name="composer-capabilities"
                    options={{
                        presentation: 'card',
                        animationTypeForReplace: 'pop',
                        cardOverlayEnabled: false,
                        animation: 'slide_from_bottom',
                    }}
                />
            </Stack>
            <GatewaySwitcherSheet />
            <WorkspaceSwitcherSheet />
            <ComposerAttachmentMenuSheet />
            <ThreadModeSwitcherSheet />
            <ThreadPermissionModeSwitcherSheet />
        </BottomSheetModalProvider>
    );
};

const styles = StyleSheet.create(() => ({
    root: {
        flex: 1,
    },
}));

export default isSentryEnabled ? Sentry.wrap(RootLayout) : RootLayout;
