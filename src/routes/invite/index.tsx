import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
    dispatchInvitation,
    useInvitation,
    useGatewayDestinations,
    hydrateOnboarding,
} from '@/client/onboarding';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import type { InvitationPublication } from '@/client/generated/invitation_publication';
import Spinner from '@/components/feedback/spinner';
import { Button } from '@/components/buttons/base';
import { isPioneerAppUrl } from '@/helpers/app-url';
import { sanitizePioneerAppUrlRoute } from '@/helpers/app-url-route';
import InvitationJoinScreen from '@/screens/invitation/join';

const InviteRoute = () => {
    const { t } = useTranslation('gateway');
    const { theme } = useUnistyles();
    const incomingUrl = Linking.useLinkingURL();
    const invitation = useInvitation();
    const destinations = useGatewayDestinations();
    const [initializeAttempt, setInitializeAttempt] = useState(0);
    const owner = useRef<number | null>(null);
    const delivery = useRef<string | null>(null);
    const dismissed = useRef(false);
    usePreventRemove(
        invitation?.active === true &&
            invitation.can_cancel === false &&
            invitation.phase !== 'complete',
        () => {},
    );
    useEffect(() => {
        if (!isPioneerAppUrl(incomingUrl, 'invite') || delivery.current === incomingUrl) return;
        delivery.current = incomingUrl;
        let disposed = false;
        sanitizePioneerAppUrlRoute('gateway_base_url', 'gateway_id');
        void hydrateOnboarding()
            .then(() => {
                if (disposed) return;
                dispatchInvitation({ kind: 'open', uri: incomingUrl! });
                owner.current =
                    (
                        mobileClientBinding.scope({ kind: 'onboarding_invitation' }).getSnapshot()
                            ?.payload as InvitationPublication | null
                    )?.owner_generation ?? null;
                Linking.clearInitialURL();
            })
            .catch(() => {
                /* The initialization error remains in the Client destination scope. */
            });
        return () => {
            disposed = true;
        };
    }, [incomingUrl, initializeAttempt]);
    useEffect(
        () => () => {
            if (owner.current !== null)
                dispatchInvitation({ kind: 'close', expected_owner: owner.current });
            delivery.current = null;
            Linking.clearInitialURL();
        },
        [],
    );
    useEffect(() => {
        if (
            invitation?.owner_generation === owner.current &&
            invitation?.phase === 'complete' &&
            !dismissed.current
        ) {
            dismissed.current = true;
            router.dismiss();
        }
    }, [invitation]);
    const cancel = useCallback(() => {
        if (owner.current !== null) {
            dispatchInvitation({ kind: 'close', expected_owner: owner.current });
            const current = mobileClientBinding
                .scope({ kind: 'onboarding_invitation' })
                .getSnapshot()?.payload as InvitationPublication | null;
            if (current?.owner_generation === owner.current && current.active) return;
        }
        Linking.clearInitialURL();
        router.dismiss();
    }, []);
    if (invitation?.preview && invitation.phase !== 'terminal')
        return <InvitationJoinScreen onCancel={cancel} />;
    if (invitation?.error || destinations?.error)
        return (
            <View style={styles.state}>
                <Text accessibilityRole="alert" style={styles.error}>
                    {t('invitation.join.errors.unavailable')}
                </Text>
                {destinations?.error && !destinations.installation_id ? (
                    <Button
                        title={t('retry', { ns: 'common' })}
                        onPress={() => {
                            delivery.current = null;
                            setInitializeAttempt((attempt) => attempt + 1);
                        }}
                    />
                ) : null}
                {invitation?.error &&
                invitation.phase !== 'terminal' &&
                !invitation.preview_pending ? (
                    <Button
                        title={t('retry', { ns: 'common' })}
                        onPress={() =>
                            dispatchInvitation({
                                kind: 'preview_retry_for_owner',
                                expected_owner: invitation.owner_generation,
                            })
                        }
                    />
                ) : null}
                <Button title={t('cancel', { ns: 'common' })} onPress={cancel} />
            </View>
        );
    return (
        <View style={styles.state}>
            <View accessibilityLabel={t('invitation.join.loading')} accessibilityRole="progressbar">
                <Spinner color={theme.colors.typography} />
            </View>
            <Text style={styles.stateText}>{t('invitation.join.loading')}</Text>
        </View>
    );
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
