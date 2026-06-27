import 'react-native-reanimated';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Stack } from 'expo-router/js-stack';
import { SystemBars } from 'react-native-edge-to-edge';

import i18n from '@/locale/i18n';

import { pioneerClient } from '@/client';
import type { GatewayConnectionState, GatewayEndpoint } from '@/client';
import GatewaySetupScreen from '@/screens/gateway/editor';
import { useGateway } from '@/hooks/use-gateway';
import { useGatewaySession } from '@/hooks/use-gateway-session';
import { useThreadTreeController } from '@/hooks/use-thread-tree';
import { useWorkspace } from '@/hooks/use-workspace';
import { useScreen } from '@/hooks/use-screen';
import { useThreadScreen } from '@/screens/thread/hooks';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import GatewaySwitcherSheet from '@/components/overlays/gateway';
import WorkspaceSwitcherSheet from '@/components/overlays/workspace';
import ComposerAttachmentMenuSheet from '@/components/overlays/composer-attachments';
import ThreadModeSwitcherSheet from '@/components/overlays/thread-mode';
import { initializeSentry, isSentryEnabled, Sentry } from '@/services/sentry';
import { pioneerQueryClient } from '@/services/query/client';

export const unstable_settings = {
    initialRouteName: '(tabs)',
};

void SplashScreen.preventAutoHideAsync();

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
    const splashHiddenRef = useRef(false);

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
            pioneerClient.initialize();
            await hydrateGateway();
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
        const readyToLeaveSplash = (fontsLoaded && startupReady) || !!fontsError || !!startupError;

        if (!readyToLeaveSplash || splashHiddenRef.current) {
            return;
        }

        splashHiddenRef.current = true;

        void SplashScreen.hideAsync();
    }, [fontsError, fontsLoaded, startupError, startupReady]);

    useEffect(() => {
        if (fontsError) {
            throw fontsError;
        }

        if (startupError) {
            throw startupError;
        }
    }, [fontsError, startupError]);

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

    const remotes = registry.remotes ?? [];
    const activeGateway = bootstrapped
        ? (remotes.find((remote) => remote.id === registry.active_gateway_id) ?? null)
        : null;

    if (!bootstrapped) {
        return null;
    }

    if (!activeGateway) {
        return <GatewaySetupScreen blocker />;
    }

    return (
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
            <ThreadTreeController />
            <RootStack />
        </>
    );
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

    const thread = useThreadScreen();

    return (
        <BottomSheetModalProvider>
            <Stack
                screenOptions={{
                    ...options,
                    headerShown: false,
                }}
            >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen {...thread} />
                <Stack.Screen name="thread/[threadId]" options={thread.options} />
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
        </BottomSheetModalProvider>
    );
};

const styles = StyleSheet.create(() => ({
    root: {
        flex: 1,
    },
}));

export default isSentryEnabled ? Sentry.wrap(RootLayout) : RootLayout;
