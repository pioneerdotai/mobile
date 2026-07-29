import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';

import type { AuthSessionListItem, ClientDeviceActivationPresentationResult } from '@/client';
import { Button } from '@/components/buttons/base';
import { DeviceActivationQr } from '@/components/gateway/device-activation-qr';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import {
    cancelMobileDeviceActivation,
    createMobileDeviceActivationPresentation,
    listMobileGatewaySessions,
    logoutMobileGatewaySession,
    revokeMobileGatewaySession,
} from '@/services/gateway/device-activation';
import { useGatewayStore } from '@/stores/gateway';

const DevicesSettingsScreen = () => {
    const { t } = useTranslation(['gateway', 'common']);
    const registry = useGatewayStore((state) => state.registry);
    const activeEndpoint = useMemo(
        () =>
            (registry.remotes ?? []).find(
                (candidate) => candidate.id === registry.active_gateway_id,
            ) ?? null,
        [registry],
    );
    const [sessions, setSessions] = useState<AuthSessionListItem[]>([]);
    const [activation, setDeviceActivation] =
        useState<ClientDeviceActivationPresentationResult | null>(null);
    const activationRef = useRef<ClientDeviceActivationPresentationResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const replaceDeviceActivation = useCallback(
        (next: ClientDeviceActivationPresentationResult | null) => {
            activationRef.current = next;
            setDeviceActivation(next);
        },
        [],
    );

    const load = useCallback(async () => {
        try {
            const response = await listMobileGatewaySessions();
            setSessions(response.sessions);
            setError(null);
        } catch {
            setError(t('devices.loadFailed', { ns: 'gateway' }));
        }
    }, [t]);

    useEffect(() => {
        let cancelled = false;
        void listMobileGatewaySessions()
            .then((response) => {
                if (!cancelled) {
                    setSessions(response.sessions);
                    setError(null);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError(t('devices.loadFailed', { ns: 'gateway' }));
                }
            });
        return () => {
            cancelled = true;
            const current = activationRef.current;
            activationRef.current = null;
            if (current) {
                void cancelMobileDeviceActivation(current.session_id).catch(() => {});
            }
        };
    }, [t]);

    const createDeviceActivation = useCallback(async () => {
        if (!activeEndpoint) {
            return;
        }
        setBusy(true);
        setError(null);
        const previous = activationRef.current;
        try {
            if (previous) {
                await cancelMobileDeviceActivation(previous.session_id);
            }
            replaceDeviceActivation(await createMobileDeviceActivationPresentation(activeEndpoint));
        } catch {
            replaceDeviceActivation(null);
            setError(t('devices.activationFailed', { ns: 'gateway' }));
        } finally {
            setBusy(false);
        }
    }, [activeEndpoint, replaceDeviceActivation, t]);

    const revoke = useCallback(
        (item: AuthSessionListItem) => {
            if (!activeEndpoint) {
                return;
            }
            Alert.alert(
                t('devices.revokeTitle', { ns: 'gateway' }),
                t(item.current ? 'devices.revokeCurrentMessage' : 'devices.revokeOtherMessage', {
                    ns: 'gateway',
                }),
                [
                    { text: t('cancel', { ns: 'common' }), style: 'cancel' },
                    {
                        text: t('devices.revokeAction', { ns: 'gateway' }),
                        style: 'destructive',
                        onPress: () => {
                            setBusy(true);
                            void revokeMobileGatewaySession(
                                activeEndpoint.id,
                                item.session.id,
                                item.current,
                            )
                                .then(load)
                                .catch(() => setError(t('devices.revokeFailed', { ns: 'gateway' })))
                                .finally(() => setBusy(false));
                        },
                    },
                ],
            );
        },
        [activeEndpoint, load, t],
    );

    const logout = useCallback(() => {
        if (!activeEndpoint) {
            return;
        }
        Alert.alert(
            t('devices.logoutTitle', { ns: 'gateway' }),
            t('devices.logoutMessage', { ns: 'gateway' }),
            [
                { text: t('cancel', { ns: 'common' }), style: 'cancel' },
                {
                    text: t('devices.logoutAction', { ns: 'gateway' }),
                    style: 'destructive',
                    onPress: () => {
                        setBusy(true);
                        void logoutMobileGatewaySession(activeEndpoint)
                            .catch(() => setError(t('devices.logoutFailed', { ns: 'gateway' })))
                            .finally(() => setBusy(false));
                    },
                },
            ],
        );
    }, [activeEndpoint, t]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <VStack style={styles.section}>
                <Text fontWeight="semibold">{t('devices.sessionsTitle', { ns: 'gateway' })}</Text>
                {sessions.map((item) => (
                    <HStack key={item.session.id} style={styles.row}>
                        <VStack style={styles.rowText}>
                            <Text fontWeight="medium">{item.device.display_name}</Text>
                            <Text style={styles.secondary}>
                                {t('devices.sessionMeta', {
                                    ns: 'gateway',
                                    kind: item.device.client_kind,
                                    date: new Date(item.last_seen_at_unix * 1_000).toLocaleString(),
                                })}
                            </Text>
                            {item.current ? (
                                <Text style={styles.current}>
                                    {t('devices.current', { ns: 'gateway' })}
                                </Text>
                            ) : null}
                        </VStack>
                        <Button
                            type="link"
                            size="sm"
                            disabled={busy}
                            title={t('devices.revokeAction', { ns: 'gateway' })}
                            onPress={() => revoke(item)}
                        />
                    </HStack>
                ))}
            </VStack>

            <VStack style={styles.section}>
                <Text fontWeight="semibold">{t('devices.activationTitle', { ns: 'gateway' })}</Text>
                <Button
                    disabled={busy || !activeEndpoint}
                    loading={busy}
                    title={t('devices.createDeviceActivation', { ns: 'gateway' })}
                    onPress={() => void createDeviceActivation()}
                />
                {activation ? (
                    <VStack style={styles.activation}>
                        <DeviceActivationQr
                            modules={activation.qr_modules}
                            width={activation.qr_width}
                            accessibilityLabel={t('devices.activationQrLabel', { ns: 'gateway' })}
                        />
                        <Text selectable style={styles.code}>
                            {activation.manual_code}
                        </Text>
                        <Button
                            type="link"
                            title={t('devices.copyCode', { ns: 'gateway' })}
                            onPress={() => void Clipboard.setStringAsync(activation.manual_code)}
                        />
                        <Button
                            type="link"
                            title={t('devices.copyLink', { ns: 'gateway' })}
                            onPress={() => void Clipboard.setStringAsync(activation.deep_link)}
                        />
                    </VStack>
                ) : null}
            </VStack>

            <Box>
                <Button
                    type="link"
                    disabled={busy}
                    title={t('devices.logoutAction', { ns: 'gateway' })}
                    onPress={logout}
                />
            </Box>
            {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    container: { flex: 1 },
    content: {
        ...theme.screenContentPadding('child'),
        paddingHorizontal: rt.insets.left + theme.space(4),
        paddingRight: rt.insets.right + theme.space(4),
        gap: theme.space(5),
    },
    section: { gap: theme.space(3) },
    row: {
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(3),
        padding: theme.space(4),
        borderRadius: theme.radius['2xl'],
        backgroundColor: theme.colors.muted,
    },
    rowText: { flex: 1, gap: theme.space(1) },
    secondary: { ...theme.fontSize.xs, opacity: 0.65 },
    current: { ...theme.fontSize.xs, color: theme.colors.lime[700] },
    activation: { alignItems: 'center', gap: theme.space(3) },
    code: { ...theme.fontSize.xs, textAlign: 'center' },
    error: { color: theme.colors.dangerText, textAlign: 'center' },
}));

export default DevicesSettingsScreen;
