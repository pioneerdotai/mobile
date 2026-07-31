import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native-unistyles';

import { ControlledInput } from '@/components/forms/controlled/input';
import { ControlledOtpInput } from '@/components/forms/controlled/otp-input';
import { useGateway } from '@/hooks/use-gateway';
import { Title } from '@/components/typography/title';
import { Box } from '@/components/primitives/box';
import { GatewayOperationError } from '@/services/gateway/registry';
import type { GatewayOperationErrorCode } from '@/services/gateway/registry';
import { Container } from '@/screens/editor/components/container';
import { MobileDeviceActivationError } from '@/services/gateway/device-activation';
import type { MobileDeviceActivationErrorCode } from '@/services/gateway/device-activation';
import { normalizeDeviceActivationCode } from '@/services/gateway/device-activation-code';

type GatewaySetupFormValues = {
    name: string;
    address: string;
    activationCode: string;
};

type GatewaySetupScreenProps = {
    activationPrefill?: GatewayActivationPrefill;
    authenticateOnly?: boolean;
    blocker?: boolean;
    gatewayId?: string;
    initialError?: string | null;
};

export type GatewayActivationPrefill = {
    address: string;
    activationCode: string;
    serverGatewayId: string | null;
};

const gatewayErrorTranslationKeys: Record<GatewayOperationErrorCode, string> = {
    invalidAddress: 'invalidAddress',
    invalidActivation: 'invalidActivation',
    notFound: 'notFound',
    unreachable: 'validationUnreachable',
    connectionFailed: 'connectionFailed',
    operationFailed: 'operationFailed',
};

const activationErrorTranslationKeys: Record<MobileDeviceActivationErrorCode, string> = {
    invalid_presentation: 'activation.invalidPresentation',
    gateway_mismatch: 'activation.gatewayMismatch',
    activation_failed: 'activation.activationFailed',
    storage_failed: 'activation.storageFailed',
};

const GatewayEditorScreen = ({
    activationPrefill,
    authenticateOnly = false,
    blocker = false,
    gatewayId,
    initialError = null,
}: GatewaySetupScreenProps) => {
    const { t } = useTranslation('gateway');
    const router = useRouter();
    const {
        addRemote,
        authenticateRemote,
        updateRemote,
        registry,
        busy,
        error: storeError,
    } = useGateway();
    const hasExistingGateway = Boolean(gatewayId);
    const isEdit = hasExistingGateway && !authenticateOnly;
    const editingGateway = useMemo(
        () =>
            gatewayId ? (registry.remotes ?? []).find((remote) => remote.id === gatewayId) : null,
        [gatewayId, registry.remotes],
    );

    const [formError, setFormError] = useState<string | null>(initialError);

    const {
        control,
        handleSubmit,
        reset,
        formState: { isSubmitting },
    } = useForm<GatewaySetupFormValues>({
        defaultValues: {
            name: '',
            address: '',
            activationCode: '',
        },
    });
    const submitting = busy || isSubmitting;
    const clearFormError = useCallback(() => {
        setFormError(null);
    }, []);

    useEffect(() => {
        if (activationPrefill) {
            reset({
                name: '',
                address: activationPrefill.address,
                activationCode: activationPrefill.activationCode,
            });
            return;
        }

        if (!hasExistingGateway || !editingGateway) {
            reset({ name: '', address: '', activationCode: '' });
            return;
        }

        reset({
            name: editingGateway.name,
            address: editingGateway.address,
            activationCode: '',
        });
    }, [activationPrefill, editingGateway, hasExistingGateway, reset]);

    const requiredAddress = useCallback(
        (value: string) => {
            return value.trim() ? true : t('addressRequired');
        },
        [t],
    );
    const validActivationCode = useCallback(
        (value: string) => normalizeDeviceActivationCode(value) !== null || t('invalidActivation'),
        [t],
    );

    const gatewayErrorMessage = useCallback(
        (code: GatewayOperationErrorCode) => {
            return t(gatewayErrorTranslationKeys[code]);
        },
        [t],
    );

    const unknownGatewayErrorMessage = useCallback(
        (error: unknown) => {
            if (error instanceof GatewayOperationError) {
                if (error.source instanceof MobileDeviceActivationError) {
                    return t(activationErrorTranslationKeys[error.source.code]);
                }
                return gatewayErrorMessage(error.code);
            }
            if (error instanceof MobileDeviceActivationError) {
                return t(activationErrorTranslationKeys[error.code]);
            }

            return t('operationFailed');
        },
        [gatewayErrorMessage, t],
    );

    const onSubmit = handleSubmit(async (values) => {
        setFormError(null);

        const activationCode = values.activationCode.trim();

        try {
            if (authenticateOnly) {
                if (!gatewayId || !editingGateway) {
                    throw new GatewayOperationError('notFound');
                }
                if (!activationCode) {
                    throw new GatewayOperationError('invalidActivation');
                }
                await authenticateRemote(gatewayId, activationCode);
                router.back();
                return;
            }

            if (isEdit) {
                if (!gatewayId || !editingGateway) {
                    throw new GatewayOperationError('notFound');
                }

                await updateRemote({
                    gatewayId,
                    name: values.name,
                    address: values.address.trim(),
                });

                router.back();
                return;
            }

            if (!activationCode) {
                throw new GatewayOperationError('invalidActivation');
            }

            await addRemote({
                name: values.name,
                address: values.address.trim(),
                activationCode,
                activationGatewayId: activationPrefill?.serverGatewayId,
            });

            router.replace('/');
        } catch (error) {
            setFormError(unknownGatewayErrorMessage(error));
        }
    });

    const storeErrorMessage = storeError ? gatewayErrorMessage(storeError) : null;
    const handleClose = () => router.back();
    const title = authenticateOnly
        ? t('authenticateTitle')
        : isEdit
          ? t('editTitle')
          : t('setupTitle');
    const buttonLabel = authenticateOnly
        ? t('authenticateButton')
        : isEdit
          ? t('saveButton')
          : t('addButton');
    const submitDisabled = submitting || (hasExistingGateway && !editingGateway);

    return (
        <Container
            handleSubmit={() => void onSubmit()}
            handleClose={!blocker ? handleClose : null}
            loading={submitting}
            submitDisabled={submitDisabled}
            buttonLabel={buttonLabel}
        >
            <Box style={styles.container}>
                <View style={styles.header}>
                    <Title type="h2">{title}</Title>
                </View>

                <ControlledInput
                    control={control}
                    name="name"
                    label={t('nameLabel')}
                    autoCapitalize="words"
                    editable={!authenticateOnly}
                    onValueChange={clearFormError}
                />
                <ControlledInput
                    control={control}
                    name="address"
                    rules={{
                        validate: requiredAddress,
                    }}
                    label={t('addressLabel')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    keyboardType="url"
                    editable={!authenticateOnly && !activationPrefill}
                    onValueChange={clearFormError}
                />
                {!isEdit ? (
                    <ControlledOtpInput
                        control={control}
                        name="activationCode"
                        rules={{ validate: validActivationCode }}
                        label={t('activationCodeLabel')}
                        disabled={submitting}
                        readOnly={Boolean(activationPrefill)}
                        onValueChange={clearFormError}
                    />
                ) : null}

                {formError || storeErrorMessage ? (
                    <Text style={styles.error}>{formError ?? storeErrorMessage}</Text>
                ) : null}
            </Box>
        </Container>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        paddingHorizontal: theme.space(4),
        paddingBottom: rt.insets.bottom + theme.space(24),
        gap: theme.space(5),
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingTop: theme.screenContentPadding('child').paddingTop,
        gap: theme.space(2),
    },
    error: {
        ...theme.fontSize.sm,
        color: theme.colors.dangerText,
        fontWeight: theme.fontWeight.medium.fontWeight,
        textAlign: 'center',
    },
}));

export default GatewayEditorScreen;
