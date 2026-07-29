import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';

import { Button } from '@/components/buttons/base';
import { Input } from '@/components/forms/input';
import { OtpInput } from '@/components/forms/otp-input';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { Title } from '@/components/typography/title';
import {
    MobileDeviceActivationError,
    acceptMobileDeviceActivation,
    parseMobileDeviceActivationUri,
} from '@/services/gateway/device-activation';
import type {
    MobileDeviceActivationErrorCode,
    MobileDeviceActivationInput,
} from '@/services/gateway/device-activation';
import { useGatewayStore } from '@/stores/gateway';
import { normalizeDeviceActivationCode } from '@/services/gateway/device-activation-code';

const activationErrorKey: Record<MobileDeviceActivationErrorCode, string> = {
    invalid_presentation: 'activation.invalidPresentation',
    gateway_mismatch: 'activation.gatewayMismatch',
    activation_failed: 'activation.activationFailed',
    storage_failed: 'activation.storageFailed',
};

const DeviceActivationScreen = () => {
    const { t } = useTranslation('gateway');
    const activationLinkInFlight = useRef(false);
    const setRegistry = useGatewayStore((state) => state.setRegistry);
    const bumpSessionRevision = useGatewayStore((state) => state.bumpSessionRevision);
    const [endpoint, setEndpoint] = useState('');
    const [activationCode, setActivationCode] = useState('');
    const [gatewayId, setGatewayId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const showError = useCallback(
        (caught: unknown) => {
            const code =
                caught instanceof MobileDeviceActivationError ? caught.code : 'activation_failed';
            setError(t(activationErrorKey[code]));
        },
        [t],
    );

    useEffect(() => {
        let cancelled = false;
        const consume = (url: string | null) => {
            if (
                cancelled ||
                activationLinkInFlight.current ||
                !url ||
                !url.includes('://activate')
            ) {
                return;
            }
            activationLinkInFlight.current = true;
            setError(null);
            // Drop the original deep-link route before parsing so a malformed
            // presentation cannot leave its secret fragment in navigation
            // history.
            router.replace('/activate');
            void parseMobileDeviceActivationUri(url)
                .then((parsed) => {
                    if (cancelled) {
                        return;
                    }
                    setEndpoint(parsed.protected_endpoint);
                    setActivationCode(parsed.activation_code);
                    setGatewayId(parsed.gateway_id ?? null);
                })
                .catch((error) => {
                    if (!cancelled) {
                        showError(error);
                    }
                })
                .finally(() => {
                    activationLinkInFlight.current = false;
                });
        };
        const subscription = Linking.addEventListener('url', ({ url }) => consume(url));
        void Linking.getInitialURL().then(consume).catch(showError);
        return () => {
            cancelled = true;
            subscription.remove();
        };
    }, [showError]);

    const submit = useCallback(async () => {
        const input: MobileDeviceActivationInput = {
            protected_endpoint: endpoint.trim(),
            activation_code: activationCode.trim(),
            gateway_id: gatewayId,
        };
        // Keep the credential only in the direct call input after submit.
        setActivationCode('');
        setBusy(true);
        setError(null);
        try {
            const result = await acceptMobileDeviceActivation(input);
            setRegistry(result.registry);
            bumpSessionRevision();
            router.replace('/');
        } catch (caught) {
            showError(caught);
        } finally {
            setBusy(false);
        }
    }, [activationCode, bumpSessionRevision, endpoint, gatewayId, setRegistry, showError]);

    return (
        <VStack style={styles.container}>
            <Title type="h1">{t('activation.acceptTitle')}</Title>
            <Text style={styles.description}>{t('activation.acceptDescription')}</Text>
            <Input
                label={t('activation.endpointLabel')}
                value={endpoint}
                onChangeText={setEndpoint}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
            />
            <OtpInput
                label={t('activation.codeLabel')}
                value={activationCode}
                onChangeText={setActivationCode}
                disabled={busy}
                accessibilityLabel={t('activation.codeLabel')}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
                loading={busy}
                disabled={
                    busy ||
                    !endpoint.trim() ||
                    normalizeDeviceActivationCode(activationCode) === null
                }
                title={t('activation.connectAction')}
                onPress={() => void submit()}
            />
        </VStack>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        flex: 1,
        paddingTop: rt.insets.top + theme.space(8),
        paddingBottom: rt.insets.bottom + theme.space(6),
        paddingHorizontal: theme.space(5),
        gap: theme.space(4),
        backgroundColor: theme.colors.background,
    },
    description: { opacity: 0.7 },
    error: { color: theme.colors.dangerText, textAlign: 'center' },
}));

export default DeviceActivationScreen;
