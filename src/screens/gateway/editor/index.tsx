import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native-unistyles';

import { ControlledInput } from '@/components/forms/controlled/input';
import { useGateway } from '@/hooks/use-gateway';
import { Title } from '@/components/typography/title';
import { Box } from '@/components/primitives/box';
import { GatewayOperationError } from '@/services/gateway/registry';
import type { GatewayOperationErrorCode } from '@/services/gateway/registry';
import { Container } from '@/screens/editor/components/container';

type GatewaySetupFormValues = {
    name: string;
    address: string;
    token: string;
};

type GatewaySetupScreenProps = {
    blocker?: boolean;
    gatewayId?: string;
};

const gatewayErrorTranslationKeys: Record<GatewayOperationErrorCode, string> = {
    invalidAddress: 'invalidAddress',
    invalidToken: 'invalidToken',
    notFound: 'notFound',
    unreachable: 'validationUnreachable',
    connectionFailed: 'connectionFailed',
    operationFailed: 'operationFailed',
};

const GatewayEditorScreen = ({ blocker = false, gatewayId }: GatewaySetupScreenProps) => {
    const { t } = useTranslation('gateway');
    const router = useRouter();
    const { addRemote, updateRemote, registry, busy, error: storeError } = useGateway();
    const isEdit = Boolean(gatewayId);
    const editingGateway = useMemo(
        () =>
            gatewayId ? (registry.remotes ?? []).find((remote) => remote.id === gatewayId) : null,
        [gatewayId, registry.remotes],
    );

    const [formError, setFormError] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        formState: { isSubmitting },
    } = useForm<GatewaySetupFormValues>({
        defaultValues: {
            name: '',
            address: '',
            token: '',
        },
    });
    const submitting = busy || isSubmitting;
    const clearFormError = useCallback(() => {
        setFormError(null);
    }, []);

    useEffect(() => {
        if (!isEdit || !editingGateway) {
            reset({ name: '', address: '', token: '' });
            return;
        }

        reset({
            name: editingGateway.name,
            address: editingGateway.address,
            token: '',
        });
    }, [editingGateway, isEdit, reset]);

    const requiredAddress = useCallback(
        (value: string) => {
            return value.trim() ? true : t('addressRequired');
        },
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
                return gatewayErrorMessage(error.code);
            }

            return t('operationFailed');
        },
        [gatewayErrorMessage, t],
    );

    const onSubmit = handleSubmit(async (values) => {
        setFormError(null);

        const token = values.token.trim();

        try {
            if (isEdit) {
                if (!gatewayId || !editingGateway) {
                    throw new GatewayOperationError('notFound');
                }

                await updateRemote({
                    gatewayId,
                    name: values.name,
                    address: values.address.trim(),
                    token: token || null,
                });

                router.back();
                return;
            }

            if (!token) {
                throw new GatewayOperationError('invalidToken');
            }

            await addRemote({
                name: values.name,
                address: values.address.trim(),
                token: token || null,
            });

            router.replace('/');
        } catch (error) {
            setFormError(unknownGatewayErrorMessage(error));
        }
    });

    const storeErrorMessage = storeError ? gatewayErrorMessage(storeError) : null;
    const handleClose = () => router.back();
    const title = isEdit ? t('editTitle') : t('setupTitle');
    const buttonLabel = isEdit ? t('saveButton') : t('addButton');
    const submitDisabled = submitting || (isEdit && !editingGateway);

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
                    onValueChange={clearFormError}
                />
                <ControlledInput
                    control={control}
                    name="token"
                    label={t('tokenLabel')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    secureTextEntry
                    onValueChange={clearFormError}
                />

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
