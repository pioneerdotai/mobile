import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { AuthSessionListItem, ClientDeviceActivationPresentationResult } from '@/client';
import { Button } from '@/components/buttons/base';
import { CopyButton } from '@/components/buttons/copy';
import { CreateButton } from '@/components/buttons/create';
import Spinner from '@/components/feedback/spinner';
import { DeviceActivationQr } from '@/components/gateway/device-activation-qr';
import { Backdrop } from '@/components/overlays/components/backdrop';
import { Handle } from '@/components/overlays/components/handle';
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
    const navigation = useNavigation();
    const { theme, rt } = useUnistyles();
    const activationSheetRef = useRef<BottomSheetModal>(null);
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
    const activationRequestRef = useRef(0);
    const activationBusyRef = useRef(false);
    const [sessionBusy, setSessionBusy] = useState(false);
    const [activationBusy, setActivationBusy] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [activationError, setActivationError] = useState<string | null>(null);

    const replaceDeviceActivation = useCallback(
        (next: ClientDeviceActivationPresentationResult | null) => {
            activationRef.current = next;
            setDeviceActivation(next);
        },
        [],
    );

    const cancelCurrentActivation = useCallback(() => {
        activationRequestRef.current += 1;
        const current = activationRef.current;
        replaceDeviceActivation(null);
        if (current) {
            void cancelMobileDeviceActivation(current.session_id).catch(() => {});
        }
    }, [replaceDeviceActivation]);

    const load = useCallback(async () => {
        try {
            const response = await listMobileGatewaySessions();
            setSessions(response.sessions);
            setSessionError(null);
        } catch {
            setSessionError(t('devices.loadFailed', { ns: 'gateway' }));
        }
    }, [t]);

    useEffect(() => {
        let cancelled = false;
        void listMobileGatewaySessions()
            .then((response) => {
                if (!cancelled) {
                    setSessions(response.sessions);
                    setSessionError(null);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSessionError(t('devices.loadFailed', { ns: 'gateway' }));
                }
            });
        return () => {
            cancelled = true;
            activationRequestRef.current += 1;
            const current = activationRef.current;
            activationRef.current = null;
            if (current) {
                void cancelMobileDeviceActivation(current.session_id).catch(() => {});
            }
        };
    }, [t]);

    const createDeviceActivation = useCallback(async () => {
        if (!activeEndpoint || activationBusyRef.current) {
            return;
        }
        const request = activationRequestRef.current + 1;
        activationRequestRef.current = request;
        activationBusyRef.current = true;
        setActivationBusy(true);
        setActivationError(null);
        const previous = activationRef.current;
        try {
            if (previous) {
                await cancelMobileDeviceActivation(previous.session_id);
            }
            if (activationRequestRef.current !== request) {
                return;
            }
            const next = await createMobileDeviceActivationPresentation(activeEndpoint);
            if (activationRequestRef.current !== request) {
                await cancelMobileDeviceActivation(next.session_id).catch(() => {});
                return;
            }
            replaceDeviceActivation(next);
        } catch {
            if (activationRequestRef.current === request) {
                replaceDeviceActivation(null);
                setActivationError(t('devices.activationFailed', { ns: 'gateway' }));
            }
        } finally {
            if (activationRequestRef.current === request) {
                activationBusyRef.current = false;
                setActivationBusy(false);
            }
        }
    }, [activeEndpoint, replaceDeviceActivation, t]);

    const openDeviceActivation = useCallback(() => {
        if (!activeEndpoint || activationBusyRef.current) {
            return;
        }
        activationSheetRef.current?.present();
        void createDeviceActivation();
    }, [activeEndpoint, createDeviceActivation]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <CreateButton
                    accessibilityLabel={t('devices.createDeviceActivation', { ns: 'gateway' })}
                    onPressHandler={openDeviceActivation}
                />
            ),
        });
    }, [navigation, openDeviceActivation, t]);

    const revoke = useCallback(
        (item: AuthSessionListItem) => {
            if (!activeEndpoint) {
                return;
            }
            Alert.alert(
                t('devices.revokeTitle', { ns: 'gateway' }),
                t('devices.revokeOtherMessage', { ns: 'gateway' }),
                [
                    { text: t('cancel', { ns: 'common' }), style: 'cancel' },
                    {
                        text: t('devices.revokeAction', { ns: 'gateway' }),
                        style: 'destructive',
                        onPress: () => {
                            setSessionBusy(true);
                            void revokeMobileGatewaySession(
                                activeEndpoint.id,
                                item.session.id,
                                false,
                            )
                                .then(load)
                                .catch(() =>
                                    setSessionError(t('devices.revokeFailed', { ns: 'gateway' })),
                                )
                                .finally(() => setSessionBusy(false));
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
                        setSessionBusy(true);
                        void logoutMobileGatewaySession(activeEndpoint)
                            .catch(() =>
                                setSessionError(t('devices.logoutFailed', { ns: 'gateway' })),
                            )
                            .finally(() => setSessionBusy(false));
                    },
                },
            ],
        );
    }, [activeEndpoint, t]);

    const closeActivationSheet = useCallback(() => {
        activationSheetRef.current?.close();
    }, []);

    const dismissActivationSheet = useCallback(() => {
        cancelCurrentActivation();
        setActivationError(null);
        activationBusyRef.current = false;
        setActivationBusy(false);
    }, [cancelCurrentActivation]);

    return (
        <>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {sessions.length > 0 ? (
                    <VStack testID="devices-list" style={styles.devicesCard}>
                        {sessions.map((item, index) => (
                            <VStack key={item.session.id}>
                                {index > 0 ? <Box style={styles.divider} /> : null}
                                <HStack
                                    style={[styles.row, index > 0 ? styles.rowWithDivider : null]}
                                >
                                    <VStack style={styles.rowText}>
                                        <Text fontWeight="medium">{item.device.display_name}</Text>
                                        <Text style={styles.secondary}>
                                            {t('devices.sessionMeta', {
                                                ns: 'gateway',
                                                kind: item.device.client_kind,
                                                date: new Date(
                                                    item.last_seen_at_unix * 1_000,
                                                ).toLocaleString(),
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
                                        disabled={sessionBusy}
                                        title={t(
                                            item.current
                                                ? 'devices.logoutAction'
                                                : 'devices.revokeAction',
                                            { ns: 'gateway' },
                                        )}
                                        onPress={item.current ? logout : () => revoke(item)}
                                    />
                                </HStack>
                            </VStack>
                        ))}
                    </VStack>
                ) : null}
                {sessionError ? <Text style={styles.error}>{sessionError}</Text> : null}
            </ScrollView>

            <BottomSheetModal
                ref={activationSheetRef}
                backdropComponent={(props) => <Backdrop {...props} pressBehavior="close" />}
                handleComponent={(props) => (
                    <Handle
                        handleClose={closeActivationSheet}
                        closeButton
                        closeButtonType="ghost"
                        {...props}
                    />
                )}
                onDismiss={dismissActivationSheet}
                stackBehavior="push"
                topInset={rt.insets.top + theme.space(5)}
                backgroundStyle={styles.sheetBackground}
                handleStyle={styles.sheetHandle}
                handleIndicatorStyle={styles.sheetHandleIndicator}
            >
                <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
                    {activationBusy ? (
                        <Box style={styles.sheetFeedback}>
                            <Spinner size={theme.space(6)} color={theme.colors.typography} />
                        </Box>
                    ) : activation ? (
                        <VStack style={styles.activationContent}>
                            <DeviceActivationQr
                                modules={activation.qr_modules}
                                width={activation.qr_width}
                                accessibilityLabel={t('devices.activationQrLabel', {
                                    ns: 'gateway',
                                })}
                            />

                            <VStack style={styles.activationField}>
                                <Text style={styles.activationLabel}>
                                    {t('devices.codeLabel', { ns: 'gateway' })}
                                </Text>
                                <Box style={styles.activationValueCard}>
                                    <Text selectable fontWeight="semibold" style={styles.code}>
                                        {activation.manual_code}
                                    </Text>
                                    <Box style={styles.copyButtonContainer}>
                                        <CopyButton
                                            value={activation.manual_code}
                                            accessibilityLabel={t('devices.copyCode', {
                                                ns: 'gateway',
                                            })}
                                            copiedAccessibilityLabel={t('devices.copied', {
                                                ns: 'gateway',
                                            })}
                                            iconSize={theme.space(4)}
                                        />
                                    </Box>
                                </Box>
                            </VStack>

                            <VStack style={styles.activationField}>
                                <Text style={styles.activationLabel}>
                                    {t('devices.linkLabel', { ns: 'gateway' })}
                                </Text>
                                <Box style={styles.activationValueCard}>
                                    <Text selectable fontWeight="medium" style={styles.link}>
                                        {activation.deep_link}
                                    </Text>
                                    <Box style={styles.copyButtonContainer}>
                                        <CopyButton
                                            value={activation.deep_link}
                                            accessibilityLabel={t('devices.copyLink', {
                                                ns: 'gateway',
                                            })}
                                            copiedAccessibilityLabel={t('devices.copied', {
                                                ns: 'gateway',
                                            })}
                                            iconSize={theme.space(4)}
                                        />
                                    </Box>
                                </Box>
                            </VStack>
                        </VStack>
                    ) : (
                        <VStack style={styles.sheetFeedback}>
                            {activationError ? (
                                <Text style={styles.error}>{activationError}</Text>
                            ) : null}
                            <Button
                                type="link"
                                title={t('retry', { ns: 'common' })}
                                onPress={() => void createDeviceActivation()}
                            />
                        </VStack>
                    )}
                </BottomSheetScrollView>
            </BottomSheetModal>
        </>
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
    devicesCard: {
        backgroundColor: theme.colors.muted,
        borderRadius: theme.radius['4xl'],
        padding: theme.space(5),
        gap: theme.space(3),
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.border,
    },
    row: {
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(3),
    },
    rowWithDivider: {
        paddingTop: theme.space(3),
    },
    rowText: { flex: 1, gap: theme.space(1) },
    secondary: { ...theme.fontSize.xs, opacity: 0.65 },
    current: { ...theme.fontSize.xs, color: theme.colors.lime[400] },
    error: { color: theme.colors.dangerText, textAlign: 'center' },
    sheetBackground: {
        backgroundColor:
            rt.themeName === 'dark' ? theme.colors.neutral[925] : theme.colors.background,
        borderTopRightRadius: theme.radius['4xl'],
        borderTopLeftRadius: theme.radius['4xl'],
    },
    sheetHandle: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        borderTopRightRadius: theme.radius['4xl'],
        borderTopLeftRadius: theme.radius['4xl'],
    },
    sheetHandleIndicator: {
        backgroundColor: theme.colors.typography,
        opacity: 0.2,
    },
    sheetContent: {
        paddingHorizontal: theme.space(5),
        paddingTop: theme.sheetHeaderHeight() + theme.space(3),
        paddingBottom: rt.insets.bottom + theme.space(5),
    },
    sheetFeedback: {
        minHeight: theme.space(44),
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space(3),
    },
    activationContent: {
        width: '100%',
        alignItems: 'center',
        gap: theme.space(5),
    },
    activationField: {
        width: '100%',
        alignItems: 'center',
        gap: theme.space(1),
    },
    activationLabel: {
        ...theme.fontSize.sm,
        opacity: 0.6,
    },
    activationValueCard: {
        position: 'relative',
        width: '100%',
        minHeight: theme.space(16),
        padding: theme.space(4),
        paddingHorizontal: theme.space(12),
        borderRadius: theme.radius['2xl'],
        backgroundColor: theme.colors.muted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    code: {
        ...theme.fontSize.xl,
        textAlign: 'center',
    },
    link: {
        ...theme.fontSize.sm,
        textAlign: 'center',
    },
    copyButtonContainer: {
        position: 'absolute',
        top: theme.space(1.5),
        right: theme.space(1.5),
        width: theme.space(9),
        height: theme.space(9),
        alignItems: 'center',
        justifyContent: 'center',
    },
}));

export default DevicesSettingsScreen;
