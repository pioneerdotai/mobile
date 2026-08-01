import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { useScreen } from '@/hooks/use-screen';
import { useGatewayStore } from '@/stores/gateway';
import { VStack } from '@/components/primitives/vstack';
import { HStack } from '@/components/primitives/hstack';
import { Box } from '@/components/primitives/box';
import { Text } from '@/components/primitives/text';
import { Pressable } from '@/components/primitives/pressable';
import Spinner from '@/components/feedback/spinner';
import type { GatewayConnectionState } from '@/client';

const isProgressConnectionState = (state: GatewayConnectionState) => {
    return state === 'Connecting' || state === 'Reconnecting';
};

const useHomeTab = () => {
    const { options } = useScreen();
    const { theme } = useUnistyles();
    const { t } = useTranslation('gateway');

    const { connectionState, registry, setGatewaySwitcherOpen } = useGatewayStore(
        useShallow((state) => ({
            connectionState: state.connectionState,
            registry: state.registry,
            setGatewaySwitcherOpen: state.setGatewaySwitcherOpen,
        })),
    );

    const activeGateway =
        registry.remotes?.find((remote) => remote.id === registry.active_gateway_id) ?? null;

    const statusLabel =
        connectionState === 'Idle'
            ? t('sessionIdle')
            : connectionState === 'Connecting'
              ? t('sessionConnecting')
              : connectionState === 'Connected'
                ? t('sessionConnected')
                : connectionState === 'Reconnecting'
                  ? t('sessionReconnecting')
                  : t('sessionDisconnected');

    const statusColor =
        connectionState === 'Connected'
            ? theme.colors.lime[400]
            : connectionState === 'Disconnected'
              ? theme.colors.red[500]
              : theme.colors.neutral[400];

    const showGatewaySwitcher = () => {
        setGatewaySwitcherOpen(true);
    };

    const gateway = () => {
        if (!activeGateway) {
            return null;
        }

        return (
            <Pressable onPress={showGatewaySwitcher}>
                <VStack style={styles.container}>
                    <HStack style={styles.titleRow}>
                        <Box style={styles.statusContainer} accessibilityLabel={statusLabel}>
                            {isProgressConnectionState(connectionState) ? (
                                <Spinner size={theme.space(2.5)} color={theme.colors.typography} />
                            ) : (
                                <Box style={styles.statusDot(statusColor)} />
                            )}
                        </Box>
                        <Text style={styles.name}>{activeGateway.name}</Text>
                    </HStack>
                    <Box>
                        <Text style={styles.gateway_base_url}>
                            {activeGateway.gateway_base_url}
                        </Text>
                    </Box>
                </VStack>
            </Pressable>
        );
    };

    return {
        name: 'index',
        options: {
            ...options,
            headerShown: true,
            headerTitle: gateway,
            headerTransparent: true,
            headerStyle: {
                ...options.headerStyle,
                backgroundColor: 'transparent',
            },
            cardStyle: {
                ...options.cardStyle,
                backgroundColor: theme.colors.background,
            },
            sceneStyle: {
                ...options.sceneStyle,
                backgroundColor: theme.colors.background,
            },
        },
    };
};

const styles = StyleSheet.create((theme) => ({
    container: {
        alignItems: 'center',
        gap: theme.space(1),
    },
    titleRow: {
        alignItems: 'center',
        gap: theme.space(1),
        maxWidth: '100%',
    },
    statusContainer: {
        alignItems: 'center',
        height: theme.space(3),
        justifyContent: 'center',
        width: theme.space(3),
        paddingBottom: theme.space(0.5),
    },
    statusDot: (color: string) => ({
        backgroundColor: color,
        borderRadius: theme.radius.full,
        height: theme.space(2),
        width: theme.space(2),
    }),
    name: {
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.fontSize,
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    gateway_base_url: {
        fontSize: theme.fontSize['2xs'].fontSize,
        lineHeight: theme.fontSize['2xs'].fontSize,
        color: theme.colors.typography,
        opacity: 0.6,
    },
}));

export { useHomeTab };
