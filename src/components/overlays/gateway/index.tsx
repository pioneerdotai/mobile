import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { Bolt, Trash2 } from 'lucide-react-native';

import { Backdrop } from '../components/backdrop';
import { Handle } from '../components/handle';
import { Text } from '@/components/primitives/text';
import { useGateway } from '@/hooks/use-gateway';
import { useGatewayStore } from '@/stores/gateway';
import { VStack } from '@/components/primitives/vstack';
import { stableOutlineWidth } from '@/helpers/styles';
import { CreateButton } from '@/components/buttons/create';
import { HStack } from '@/components/primitives/hstack';
import { useEditor } from '@/hooks/use-editor';
import { GatewayOperationError } from '@/services/gateway/registry';
import type { GatewayOperationErrorCode } from '@/services/gateway/registry';
import { Box } from '@/components/primitives/box';

const gatewayErrorTranslationKeys: Record<GatewayOperationErrorCode, string> = {
    invalidAddress: 'invalidAddress',
    invalidActivation: 'invalidActivation',
    notFound: 'notFound',
    unreachable: 'validationUnreachable',
    connectionFailed: 'connectionFailed',
    operationFailed: 'operationFailed',
};

const GatewaySwitcherSheet = () => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const { t } = useTranslation(['gateway', 'common']);
    const { theme, rt } = useUnistyles();
    const { navigate } = useEditor();
    const { registry, busy, error: storeError, activateRemote, deleteRemote } = useGateway();
    const [actionError, setActionError] = useState<string | null>(null);

    const { showGatewaySwitcher, setGatewaySwitcherOpen } = useGatewayStore(
        useShallow((state) => ({
            showGatewaySwitcher: state.showGatewaySwitcher,
            setGatewaySwitcherOpen: state.setGatewaySwitcherOpen,
        })),
    );

    const remotes = registry.remotes ?? [];
    const activeGatewayId = registry.active_gateway_id ?? null;
    const storeErrorMessage = storeError
        ? t(gatewayErrorTranslationKeys[storeError], { ns: 'gateway' })
        : null;

    useEffect(() => {
        if (bottomSheetRef.current) {
            if (showGatewaySwitcher) {
                bottomSheetRef.current.present();
            } else {
                bottomSheetRef.current.close();
            }
        }
    }, [showGatewaySwitcher]);

    const handleSheetChanges = useCallback(
        (index: number) => {
            if (index === -1 && showGatewaySwitcher) {
                setGatewaySwitcherOpen(false);
            }
        },
        [setGatewaySwitcherOpen, showGatewaySwitcher],
    );

    const gatewayErrorMessage = useCallback(
        (error: unknown) => {
            if (error instanceof GatewayOperationError) {
                return t(gatewayErrorTranslationKeys[error.code], { ns: 'gateway' });
            }

            return t('operationFailed', { ns: 'gateway' });
        },
        [t],
    );

    const handleGatewayCreate = useCallback(() => {
        setGatewaySwitcherOpen(false);
        navigate({ type: 'gateway__create' });
    }, [navigate, setGatewaySwitcherOpen]);

    const handleGatewayEdit = useCallback(
        (gatewayId: string) => {
            setGatewaySwitcherOpen(false);
            navigate({ type: 'gateway__edit', payload: { gatewayId } });
        },
        [navigate, setGatewaySwitcherOpen],
    );

    const handleGatewayActivate = useCallback(
        async (gatewayId: string) => {
            setActionError(null);

            try {
                await activateRemote(gatewayId);
                setGatewaySwitcherOpen(false);
            } catch (error) {
                setActionError(gatewayErrorMessage(error));
            }
        },
        [activateRemote, gatewayErrorMessage, setGatewaySwitcherOpen],
    );

    const handleGatewayDelete = useCallback(
        (gatewayId: string, active: boolean) => {
            Alert.alert(
                t('removeConfirmTitle', { ns: 'gateway' }),
                active
                    ? t('removeActiveConfirmMessage', { ns: 'gateway' })
                    : t('removeConfirmMessage', { ns: 'gateway' }),
                [
                    {
                        text: t('cancel', { ns: 'common' }),
                        style: 'cancel',
                    },
                    {
                        text: t('remove', { ns: 'common' }),
                        style: 'destructive',
                        onPress: async () => {
                            setActionError(null);

                            try {
                                await deleteRemote(gatewayId);
                                if (active || remotes.length <= 1) {
                                    setGatewaySwitcherOpen(false);
                                }
                            } catch (error) {
                                setActionError(gatewayErrorMessage(error));
                            }
                        },
                    },
                ],
            );
        },
        [deleteRemote, gatewayErrorMessage, remotes.length, setGatewaySwitcherOpen, t],
    );

    const errorMessage = actionError ?? storeErrorMessage;
    const empty = remotes.length === 0;

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            backdropComponent={(props) => <Backdrop {...props} pressBehavior="close" />}
            handleComponent={(props) => (
                <Handle
                    handleClose={() => setGatewaySwitcherOpen(false)}
                    title={t('manageTitle', { ns: 'gateway' })}
                    closeButton={true}
                    closeButtonType="ghost"
                    leftButton={
                        <CreateButton variant="primary" onPressHandler={handleGatewayCreate} />
                    }
                    {...props}
                />
            )}
            onChange={handleSheetChanges}
            stackBehavior="push"
            topInset={rt.insets.top + 20}
            backgroundStyle={styles.backgroundStyle}
            handleStyle={styles.sheetHandle}
            handleIndicatorStyle={styles.sheetHandleIndicator}
        >
            <BottomSheetScrollView style={styles.sheetContainer}>
                <VStack style={styles.sheetContentContainer}>
                    {empty ? <Text style={styles.emptyText}>{t('emptyState')}</Text> : null}

                    {remotes.map((gateway) => {
                        const active = activeGatewayId === gateway.id;

                        return (
                            <Pressable
                                key={gateway.id}
                                disabled={busy || active}
                                onPress={() => void handleGatewayActivate(gateway.id)}
                                accessibilityRole="button"
                                accessibilityLabel={t('activate', { ns: 'common' })}
                            >
                                <HStack style={styles.gatewayContainer}>
                                    <Box
                                        style={[
                                            styles.gatewayContainerBackground,
                                            active ? styles.activeGatewayContainerBackground : null,
                                        ]}
                                    />
                                    <VStack style={styles.gatewayNameContainer}>
                                        <Text style={styles.gatewayName}>{gateway.name}</Text>
                                        <Text style={styles.gatewayAddress}>
                                            {gateway.gateway_base_url}
                                        </Text>
                                    </VStack>

                                    <HStack style={styles.gatewayActions}>
                                        <Pressable
                                            disabled={busy}
                                            onPress={() => handleGatewayEdit(gateway.id)}
                                            accessibilityRole="button"
                                            accessibilityLabel={t('editAction', { ns: 'gateway' })}
                                            style={[
                                                styles.iconButton,
                                                busy ? styles.iconButtonDisabled : null,
                                            ]}
                                        >
                                            <Bolt
                                                size={theme.space(4.5)}
                                                color={theme.colors.typography}
                                            />
                                        </Pressable>
                                        <Pressable
                                            disabled={busy}
                                            onPress={() => handleGatewayDelete(gateway.id, active)}
                                            accessibilityRole="button"
                                            accessibilityLabel={t('deleteAction', {
                                                ns: 'gateway',
                                            })}
                                            style={[
                                                styles.iconButton,
                                                busy ? styles.iconButtonDisabled : null,
                                            ]}
                                        >
                                            <Trash2
                                                size={theme.space(4.5)}
                                                color={theme.colors.dangerText}
                                            />
                                        </Pressable>
                                    </HStack>
                                </HStack>
                            </Pressable>
                        );
                    })}

                    {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
                </VStack>
            </BottomSheetScrollView>
        </BottomSheetModal>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    backgroundStyle: {
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
    sheetContainer: {
        borderTopRightRadius: theme.radius['4xl'],
        borderTopLeftRadius: theme.radius['4xl'],
        overflow: 'hidden',
    },
    sheetContentContainer: {
        paddingHorizontal: theme.space(5),
        paddingTop: theme.sheetHeaderHeight() + theme.space(3),
        paddingBottom: rt.insets.bottom + theme.space(5),
        gap: theme.space(1.5),
    },
    gatewayContainer: {
        paddingLeft: theme.space(5),
        paddingRight: theme.space(2.5),
        paddingVertical: theme.space(4),
        borderWidth: stableOutlineWidth,
        borderColor: theme.colors.border,
        borderRadius: theme.radius['2xl'],
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.space(3),
        overflow: 'hidden',
    },
    gatewayContainerBackground: {
        position: 'absolute',
        inset: 0,
        opacity: 0.04,
    },
    activeGatewayContainerBackground: {
        backgroundColor: theme.colors.foreground,
    },
    gatewayNameContainer: {
        flex: 1,
        minWidth: 0,
        gap: theme.space(1.5),
    },
    gatewayName: {
        flexShrink: 1,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.fontSize,
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    gatewayAddress: {
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.fontSize,
        color: theme.colors.typography,
        opacity: 0.6,
    },
    activeBadge: {
        flexShrink: 0,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.fontSize,
        color: theme.colors.lime[700],
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
    gatewayActions: {
        flexShrink: 0,
        gap: theme.space(1),
    },
    iconButton: {
        width: theme.space(9),
        height: theme.space(9),
        borderRadius: theme.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconButtonDisabled: {
        opacity: 0.6,
    },
    emptyText: {
        color: theme.colors.typography,
        opacity: 0.6,
        textAlign: 'center',
        paddingVertical: theme.space(5),
    },
    error: {
        ...theme.fontSize.sm,
        color: theme.colors.dangerText,
        fontWeight: theme.fontWeight.medium.fontWeight,
        textAlign: 'center',
    },
}));

export default GatewaySwitcherSheet;
