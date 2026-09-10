import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useNavigation } from 'expo-router';
import { LogOut, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import {
    pioneerClient,
    type AuthSessionListItem,
    type ClientDeviceActivationPresentationResult,
} from '@/client';
import { Button } from '@/components/buttons/base';
import { CreateButton } from '@/components/buttons/create';
import { CredentialPresentation } from '@/components/credential-presentation';
import Spinner from '@/components/feedback/spinner';
import { ActionsSheet } from '@/components/overlays/actions';
import { MenuItem } from '@/components/overlays/actions/menu-item';
import { Backdrop } from '@/components/overlays/components/backdrop';
import { Handle } from '@/components/overlays/components/handle';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { dispatchSettings, useAuthSessions, useDeviceActivation } from '@/client/settings';
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
    const sessionState = useAuthSessions();
    const activationState = useDeviceActivation();
    const sessions = useMemo(() => sessionState?.sessions ?? [], [sessionState?.sessions]);
    const pendingSessionId = sessionState?.revoking ?? null;
    const sessionError = sessionState?.error ? t('devices.loadFailed', { ns: 'gateway' }) : null;
    // The secret DTO is a native presentation resource; its generation and workflow live in Client.
    const [nativePresentation, setNativePresentation] = useState<{
        generation: number;
        value: ClientDeviceActivationPresentationResult | null;
        error: boolean;
    } | null>(null);
    const scopedPresentation =
        activationState?.ready && nativePresentation?.generation === activationState.generation
            ? nativePresentation
            : null;
    const activation = scopedPresentation?.value ?? null;
    const presentationError = scopedPresentation?.error ?? false;
    const [presentationRetry, setPresentationRetry] = useState(0);
    const activationBusy = activationState?.loading ?? false;
    const activationError =
        activationState?.error || presentationError
            ? t('devices.activationFailed', { ns: 'gateway' })
            : null;
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const selectedSession = sessions.find((item) => item.session.id === selectedSessionId) ?? null;
    const setSelectedSession = (item: AuthSessionListItem | null) =>
        setSelectedSessionId(item?.session.id ?? null);

    useEffect(() => {
        if (!activationState?.ready) return;
        const generation = activationState.generation;
        let active = true;
        void pioneerClient
            .gatewayDeviceActivationPresentation({ generation: activationState.generation })
            .then(
                (presentation) => {
                    if (active)
                        setNativePresentation({ generation, value: presentation, error: false });
                },
                () => {
                    if (active) setNativePresentation({ generation, value: null, error: true });
                },
            );
        return () => {
            active = false;
        };
    }, [activationState?.generation, activationState?.ready, presentationRetry]);

    const createDeviceActivation = useCallback(() => {
        setNativePresentation(null);
        if (activationState?.ready) setPresentationRetry((revision) => revision + 1);
        else dispatchSettings({ kind: 'create_device_activation' });
    }, [activationState?.ready]);
    const openDeviceActivation = useCallback(() => {
        if (!activeEndpoint) return;
        activationSheetRef.current?.present();
        createDeviceActivation();
    }, [activeEndpoint, createDeviceActivation]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <CreateButton
                    variant="primary"
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
            setSelectedSession(null);
            Alert.alert(
                t('devices.revokeTitle', { ns: 'gateway' }),
                t('devices.revokeOtherMessage', { ns: 'gateway' }),
                [
                    { text: t('cancel', { ns: 'common' }), style: 'cancel' },
                    {
                        text: t('devices.revokeAction', { ns: 'gateway' }),
                        style: 'destructive',
                        onPress: () => {
                            dispatchSettings({
                                kind: 'revoke_session',
                                session_id: item.session.id,
                                expected_status: item.session.status,
                                expected_owner: sessionState?.owner_generation ?? 0,
                            });
                        },
                    },
                ],
            );
        },
        [activeEndpoint, sessionState?.owner_generation, t],
    );

    const logout = useCallback(() => {
        if (!activeEndpoint) {
            return;
        }
        setSelectedSession(null);
        Alert.alert(
            t('devices.logoutTitle', { ns: 'gateway' }),
            t('devices.logoutMessage', { ns: 'gateway' }),
            [
                { text: t('cancel', { ns: 'common' }), style: 'cancel' },
                {
                    text: t('devices.logoutAction', { ns: 'gateway' }),
                    style: 'destructive',
                    onPress: () => {
                        const current = sessions.find((item) => item.current);
                        if (!current) return;
                        dispatchSettings({
                            kind: 'revoke_session',
                            session_id: current.session.id,
                            expected_status: current.session.status,
                            expected_owner: sessionState?.owner_generation ?? 0,
                        });
                    },
                },
            ],
        );
    }, [activeEndpoint, sessions, sessionState?.owner_generation, t]);

    const closeActivationSheet = useCallback(() => {
        activationSheetRef.current?.close();
    }, []);

    const dismissActivationSheet = useCallback(() => {
        if (activationState)
            dispatchSettings({
                kind: 'close_device_activation',
                generation: activationState.generation,
            });
        setNativePresentation(null);
    }, [activationState]);

    return (
        <>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {sessions.length > 0 ? (
                    <VStack testID="devices-list" style={styles.devicesCard}>
                        {sessions.map((item, index) => {
                            const presentation = pioneerClient.sessionListRowPresentation(item);
                            return (
                                <VStack key={item.session.id}>
                                    {index > 0 ? <Box style={styles.divider} /> : null}
                                    <Pressable
                                        delayLongPress={350}
                                        onLongPress={
                                            presentation.actionable && pendingSessionId === null
                                                ? () => setSelectedSession(item)
                                                : undefined
                                        }
                                    >
                                        <HStack
                                            style={[
                                                styles.row,
                                                index > 0 ? styles.rowWithDivider : null,
                                            ]}
                                        >
                                            <VStack style={styles.rowText}>
                                                <Text fontWeight="medium">
                                                    {item.device.display_name}
                                                </Text>
                                                <Text style={styles.secondary}>
                                                    {t('devices.sessionMeta', {
                                                        ns: 'gateway',
                                                        kind: item.device.client_kind,
                                                        date: new Date(
                                                            item.last_seen_at_unix * 1_000,
                                                        ).toLocaleString(),
                                                    })}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.secondary,
                                                        presentation.status === 'active'
                                                            ? styles.statusActive
                                                            : presentation.status === 'pending'
                                                              ? styles.statusPending
                                                              : styles.statusTerminal,
                                                    ]}
                                                >
                                                    {t(`devices.status.${presentation.status}`, {
                                                        ns: 'gateway',
                                                    })}
                                                </Text>
                                                {item.current ? (
                                                    <Text style={styles.current}>
                                                        {t('devices.current', { ns: 'gateway' })}
                                                    </Text>
                                                ) : null}
                                            </VStack>
                                        </HStack>
                                    </Pressable>
                                </VStack>
                            );
                        })}
                    </VStack>
                ) : null}
                {sessionError ? <Text style={styles.error}>{sessionError}</Text> : null}
            </ScrollView>

            <ActionsSheet open={selectedSession !== null} onClose={() => setSelectedSession(null)}>
                <VStack>
                    {selectedSession ? (
                        <MenuItem
                            Icon={selectedSession.current ? LogOut : Trash2}
                            title={t(
                                selectedSession.current
                                    ? 'devices.logoutAction'
                                    : 'devices.revokeAction',
                                { ns: 'gateway' },
                            )}
                            variant="destructive"
                            disabled={pendingSessionId !== null}
                            last
                            onPress={
                                selectedSession.current ? logout : () => revoke(selectedSession)
                            }
                        />
                    ) : null}
                </VStack>
            </ActionsSheet>

            <BottomSheetModal
                ref={activationSheetRef}
                backdropComponent={(props) => <Backdrop {...props} pressBehavior="close" />}
                handleComponent={(props) => (
                    <Handle handleClose={closeActivationSheet} closeButton {...props} />
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
                        <CredentialPresentation
                            qrModules={activation.qr_modules}
                            qrWidth={activation.qr_width}
                            qrAccessibilityLabel={t('devices.activationQrLabel', {
                                ns: 'gateway',
                            })}
                            code={{
                                value: activation.manual_code,
                                label: t('devices.codeLabel', { ns: 'gateway' }),
                                copyAccessibilityLabel: t('devices.copyCode', { ns: 'gateway' }),
                                copiedAccessibilityLabel: t('devices.copied', { ns: 'gateway' }),
                                kind: 'code',
                            }}
                            link={{
                                value: activation.deep_link,
                                label: t('devices.linkLabel', { ns: 'gateway' }),
                                copyAccessibilityLabel: t('devices.copyLink', { ns: 'gateway' }),
                                copiedAccessibilityLabel: t('devices.copied', { ns: 'gateway' }),
                                kind: 'link',
                            }}
                        />
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
    secondary: { ...theme.fontSize.xs, opacity: 0.6 },
    statusActive: { color: theme.colors.lime[400], opacity: 1 },
    statusPending: { color: theme.colors.warningText, opacity: 1 },
    statusTerminal: { color: theme.colors.dangerText, opacity: 1 },
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
}));

export default DevicesSettingsScreen;
