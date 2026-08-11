import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type {
    ClientInvitationPresentationResult,
    InvitationAcceptParams,
    InvitationPreviewResponse,
} from '@/client';
import { pioneerClient } from '@/client';
import Spinner from '@/components/feedback/spinner';
import { isPioneerAppUrl } from '@/helpers/app-url';
import { sanitizePioneerAppUrlRoute } from '@/helpers/app-url-route';
import InvitationJoinScreen from '@/screens/invitation/join';
import {
    acceptMobileInvitation,
    MobileInvitationJoinError,
} from '@/services/gateway/invitation-join';

type SafePresentation = Pick<
    ClientInvitationPresentationResult,
    'gateway_base_url' | 'gateway_id' | 'transport_security'
>;

const isInvitationLink = (url: string | null): url is string => isPioneerAppUrl(url, 'invite');

const InviteRoute = () => {
    const { t } = useTranslation('gateway');
    const { theme } = useUnistyles();
    const incomingUrl = Linking.useLinkingURL();
    const secretUri = useRef<string | null>(null);
    const handledDelivery = useRef<string | null>(null);
    const accepting = useRef(false);
    const [presentation, setPresentation] = useState<SafePresentation | null>(null);
    const [preview, setPreview] = useState<InvitationPreviewResponse | null>(null);
    const [error, setError] = useState<'unavailable' | null>(null);
    const [loading, setLoading] = useState(false);

    const clearSecret = useCallback(() => {
        secretUri.current = null;
        handledDelivery.current = null;
        accepting.current = false;
        Linking.clearInitialURL();
    }, []);

    useEffect(() => {
        if (!isInvitationLink(incomingUrl) || handledDelivery.current === incomingUrl) {
            return;
        }
        let cancelled = false;
        handledDelivery.current = incomingUrl;
        secretUri.current = incomingUrl;
        accepting.current = false;
        setLoading(true);
        setPresentation(null);
        setPreview(null);
        setError(null);

        // Strip the secret query/fragment without replacing and unmounting this
        // route. The full URI remains only in this component's private ref.
        sanitizePioneerAppUrlRoute('gateway_base_url', 'gateway_id');

        void Promise.all([
            pioneerClient.invitationPresentation({ uri: incomingUrl }),
            pioneerClient.invitationPreview({ uri: incomingUrl }),
        ])
            .then(([parsed, restrictedPreview]) => {
                if (cancelled || secretUri.current !== incomingUrl) {
                    return;
                }
                setPresentation({
                    gateway_base_url: parsed.gateway_base_url,
                    gateway_id: parsed.gateway_id,
                    transport_security: parsed.transport_security,
                });
                setPreview(restrictedPreview);
            })
            .catch(() => {
                if (cancelled) {
                    return;
                }
                clearSecret();
                setError('unavailable');
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [clearSecret, incomingUrl]);

    const cancel = useCallback(() => {
        clearSecret();
        setPresentation(null);
        setPreview(null);
        setError(null);
        router.dismiss();
    }, [clearSecret]);

    const submit = useCallback(
        async (profile: InvitationAcceptParams['profile']) => {
            const uri = secretUri.current;
            if (!uri || accepting.current) {
                return;
            }
            accepting.current = true;
            try {
                await acceptMobileInvitation({ uri, profile });
                clearSecret();
                router.dismiss();
            } catch (submitError) {
                if (submitError instanceof MobileInvitationJoinError) {
                    throw submitError;
                }
                throw new MobileInvitationJoinError('unavailable', submitError);
            } finally {
                accepting.current = false;
            }
        },
        [clearSecret],
    );

    if (loading) {
        return (
            <View style={styles.state}>
                <View
                    accessibilityLabel={t('invitation.join.loading')}
                    accessibilityRole="progressbar"
                >
                    <Spinner color={theme.colors.typography} />
                </View>
                <Text style={styles.stateText}>{t('invitation.join.loading')}</Text>
            </View>
        );
    }
    if (presentation && preview) {
        return <InvitationJoinScreen onCancel={cancel} onSubmit={submit} />;
    }
    if (error) {
        return (
            <View style={styles.state}>
                <Text accessibilityRole="alert" style={styles.error}>
                    {t(`invitation.join.errors.${error}`)}
                </Text>
            </View>
        );
    }
    return null;
};

const styles = StyleSheet.create((theme) => ({
    state: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space(3),
        padding: theme.space(10),
        backgroundColor: theme.colors.background,
    },
    stateText: {
        ...theme.fontSize.default,
        color: theme.colors.typography,
        textAlign: 'center',
    },
    error: {
        ...theme.fontSize.default,
        color: theme.colors.typography,
        textAlign: 'center',
    },
}));

export default InviteRoute;
