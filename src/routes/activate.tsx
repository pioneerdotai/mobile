import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import GatewayEditorScreen from '@/screens/gateway/editor';
import type { GatewayActivationPrefill } from '@/screens/gateway/editor';
import {
    MobileDeviceActivationError,
    parseMobileDeviceActivationUri,
} from '@/services/gateway/device-activation';
import type { MobileDeviceActivationErrorCode } from '@/services/gateway/device-activation';
import { useGatewayStore } from '@/stores/gateway';

const activationErrorKey: Record<MobileDeviceActivationErrorCode, string> = {
    invalid_presentation: 'activation.invalidPresentation',
    gateway_mismatch: 'activation.gatewayMismatch',
    activation_failed: 'activation.activationFailed',
    storage_failed: 'activation.storageFailed',
};

const isActivationLink = (url: string | null): url is string =>
    Boolean(url?.includes('://activate'));

const ActivateRoute = () => {
    const { t } = useTranslation('gateway');
    const incomingUrl = Linking.useLinkingURL();
    const activeGatewayId = useGatewayStore((state) => state.registry.active_gateway_id);
    const handledUrl = useRef<string | null>(null);
    const [activationPrefill, setActivationPrefill] = useState<GatewayActivationPrefill | null>(
        null,
    );
    const [initialErrorKey, setInitialErrorKey] = useState<string | null>(null);
    const [parsing, setParsing] = useState(false);

    useEffect(() => {
        if (!isActivationLink(incomingUrl) || handledUrl.current === incomingUrl) {
            return;
        }

        let cancelled = false;
        handledUrl.current = incomingUrl;
        setParsing(true);
        setInitialErrorKey(null);
        setActivationPrefill(null);

        // Remove the secret-bearing URL from navigation and the native linking
        // cache before handing the parsed values to the shared editor.
        router.replace('/activate');
        Linking.clearInitialURL();

        void parseMobileDeviceActivationUri(incomingUrl)
            .then((parsed) => {
                if (cancelled) {
                    return;
                }
                setActivationPrefill({
                    gateway_base_url: parsed.gateway_base_url,
                    activationCode: parsed.activation_code,
                    serverGatewayId: parsed.gateway_id ?? null,
                });
            })
            .catch((error: unknown) => {
                if (cancelled) {
                    return;
                }
                const code =
                    error instanceof MobileDeviceActivationError
                        ? error.code
                        : 'invalid_presentation';
                setInitialErrorKey(activationErrorKey[code]);
            })
            .finally(() => {
                if (!cancelled) {
                    setParsing(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [incomingUrl]);

    const waitingForIncomingLink =
        isActivationLink(incomingUrl) && !activationPrefill && !initialErrorKey;
    if (parsing || waitingForIncomingLink) {
        return null;
    }

    return (
        <GatewayEditorScreen
            activationPrefill={activationPrefill ?? undefined}
            blocker={!activeGatewayId}
            initialError={initialErrorKey ? t(initialErrorKey) : null}
        />
    );
};

export default ActivateRoute;
