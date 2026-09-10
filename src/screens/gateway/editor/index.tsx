import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { Input } from '@/components/forms/input';
import { OtpInput } from '@/components/forms/otp-input';
import {
    dispatchGatewaySetup,
    useGatewaySetup,
    useGatewayDestinations,
    hydrateOnboarding,
} from '@/client/onboarding';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import type { GatewaySetupPublication } from '@/client/generated/gateway_setup_publication';
import { Title } from '@/components/typography/title';
import { Box } from '@/components/primitives/box';
import { Container } from '@/screens/editor/components/container';
type GatewaySetupScreenProps = {
    activationPrefill?: GatewayActivationPrefill;
    authenticateOnly?: boolean;
    blocker?: boolean;
    gatewayId?: string;
    initialError?: string | null;
};

export type GatewayActivationPrefill = {
    gateway_base_url: string;
    activationCode: string;
    serverGatewayId: string | null;
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
    const publication = useGatewaySetup();
    const [openedOwner, setOpenedOwner] = useState<number | null>(null);
    const [initializeAttempt, setInitializeAttempt] = useState(0);
    const form = publication?.owner_generation === openedOwner ? publication : null;
    const destinations = useGatewayDestinations();
    const owner = useRef<number | null>(null);
    const completed = useRef(false);
    // Native secret input/selection buffer; Client owns validation and submission.
    const [activation, setActivation] = useState(activationPrefill?.activationCode ?? '');
    const [initialErrorDismissed, setInitialErrorDismissed] = useState(false);
    const isEdit = Boolean(gatewayId) && !authenticateOnly;
    const prefillAddress = activationPrefill?.gateway_base_url;
    const prefillActivation = activationPrefill?.activationCode;
    const prefillGateway = activationPrefill?.serverGatewayId;
    useEffect(() => {
        let disposed = false;
        const open = async () => {
            await hydrateOnboarding();
            if (disposed) return;
            const mode = gatewayId
                ? authenticateOnly
                    ? {
                          kind: 'reauthenticate_gateway' as const,
                          endpoint_id: gatewayId,
                          close_on_success: true,
                      }
                    : { kind: 'edit_gateway' as const, endpoint_id: gatewayId }
                : {
                      kind: blocker ? ('initial' as const) : ('add_gateway' as const),
                      allow_local: false,
                  };
            dispatchGatewaySetup({ kind: 'open', mode });
            const opened = mobileClientBinding.scope({ kind: 'gateway_setup' }).getSnapshot()
                ?.payload as GatewaySetupPublication | null;
            owner.current = opened?.owner_generation ?? null;
            setOpenedOwner(owner.current);
            completed.current = false;
            if (prefillAddress && prefillActivation)
                dispatchGatewaySetup({
                    kind: 'prefill',
                    address: prefillAddress,
                    activation: prefillActivation,
                    gateway_id: prefillGateway ?? null,
                });
            setActivation(prefillActivation ?? '');
        };
        void open().catch(() => {
            /* Initialization errors are published by Client. */
        });
        return () => {
            disposed = true;
            const expected_owner = owner.current;
            if (expected_owner !== null) dispatchGatewaySetup({ kind: 'close', expected_owner });
        };
    }, [
        gatewayId,
        authenticateOnly,
        blocker,
        prefillAddress,
        prefillActivation,
        prefillGateway,
        initializeAttempt,
    ]);
    useEffect(() => {
        if (
            !form ||
            form.owner_generation !== owner.current ||
            !form.completed_endpoint ||
            form.pending ||
            form.error ||
            completed.current
        )
            return;
        completed.current = true;
        setActivation('');
        if (authenticateOnly || isEdit) router.back();
        else router.replace('/');
    }, [form, authenticateOnly, isEdit, router]);
    const submitting = form?.pending ?? false;
    const initializationFailed = Boolean(destinations?.error && !destinations.installation_id);
    const onSubmit = () => {
        if (initializationFailed) {
            setInitializeAttempt((attempt) => attempt + 1);
            return;
        }
        if (form && form.owner_generation === owner.current)
            dispatchGatewaySetup({
                kind: 'submit_for_owner',
                expected_owner: form.owner_generation,
                local: false,
            });
    };
    const addressError = form?.address_error ? t('invalidAddress') : null;
    const activationError = form?.activation_error ? t('invalidActivation') : null;
    const error = destinations?.error
        ? t('operationFailed')
        : form?.error
          ? t(
                form.error === 'gateway_identity_mismatch'
                    ? 'activation.gatewayMismatch'
                    : 'operationFailed',
            )
          : !initialErrorDismissed
            ? initialError
            : null;
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
    const edit = (change: () => void) => {
        if (!form) return;
        setInitialErrorDismissed(true);
        change();
    };
    return (
        <Container
            handleSubmit={onSubmit}
            handleClose={!blocker ? () => router.back() : null}
            loading={submitting}
            submitDisabled={
                Boolean(destinations?.loading) ||
                submitting ||
                (!initializationFailed && (!form || form.error === 'gateway_not_found'))
            }
            buttonLabel={buttonLabel}
        >
            <Box style={styles.container}>
                <View style={styles.header}>
                    <Title type="h2">{title}</Title>
                </View>
                <Input
                    value={form?.name ?? ''}
                    label={t('nameLabel')}
                    autoCapitalize="words"
                    editable={Boolean(form) && !authenticateOnly && !submitting}
                    onChangeText={(value) =>
                        edit(() =>
                            dispatchGatewaySetup({
                                kind: 'edit_name_for_owner',
                                expected_owner: openedOwner!,
                                value,
                            }),
                        )
                    }
                    onSubmitEditing={onSubmit}
                />
                <Input
                    value={form?.address ?? ''}
                    label={t('addressLabel')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    keyboardType="url"
                    editable={
                        Boolean(form) && !authenticateOnly && !activationPrefill && !submitting
                    }
                    error={addressError}
                    onChangeText={(value) =>
                        edit(() =>
                            dispatchGatewaySetup({
                                kind: 'edit_address_for_owner',
                                expected_owner: openedOwner!,
                                value,
                            }),
                        )
                    }
                    onSubmitEditing={onSubmit}
                />
                {!isEdit ? (
                    <OtpInput
                        value={form ? activation : ''}
                        label={t('activationCodeLabel')}
                        disabled={!form || submitting}
                        readOnly={Boolean(activationPrefill)}
                        error={activationError}
                        onChangeText={(value) =>
                            edit(() => {
                                setActivation(value);
                                dispatchGatewaySetup({
                                    kind: 'edit_activation_for_owner',
                                    expected_owner: openedOwner!,
                                    value,
                                });
                            })
                        }
                    />
                ) : null}
                {error ? <Text style={styles.error}>{error}</Text> : null}
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
