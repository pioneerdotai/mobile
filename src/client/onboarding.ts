import { useSyncExternalStore } from 'react';
import type {
    OnboardingIntent,
    GatewaySetupIntent,
    InvitationIntent,
} from './generated/client_intent';
import type { GatewaySetupPublication } from './generated/gateway_setup_publication';
import type { GatewayDestinationsPublication } from './generated/gateway_destinations_publication';
import type { InvitationPublication } from './generated/invitation_publication';
import { mobileClientBinding, type MobileClientBinding } from './mobile-client-binding';
import { useGatewayStore } from '@/stores/gateway';

const destinationsScope = { kind: 'gateway_destinations' } as const;
const setupScope = { kind: 'gateway_setup' } as const;
const invitationScope = { kind: 'onboarding_invitation' } as const;
export const dispatchOnboarding = (intent: OnboardingIntent) => {
    const result = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'onboarding', intent },
    });
    for (const scope of [destinationsScope, setupScope, invitationScope])
        mobileClientBinding.drain(scope);
    return result;
};
export const dispatchGatewaySetup = (intent: GatewaySetupIntent) =>
    dispatchOnboarding({ kind: 'setup', intent });
export const dispatchInvitation = (intent: InvitationIntent) =>
    dispatchOnboarding({ kind: 'invitation', intent });
export const useGatewaySetup = () => {
    const store = mobileClientBinding.scope(setupScope);
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return (snapshot?.payload as GatewaySetupPublication | null) ?? null;
};
export const useGatewayDestinations = () => {
    const store = mobileClientBinding.scope(destinationsScope);
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return (snapshot?.payload as GatewayDestinationsPublication | null) ?? null;
};
export const useInvitation = () => {
    const store = mobileClientBinding.scope(invitationScope);
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return (snapshot?.payload as InvitationPublication | null) ?? null;
};
/** The process native adapter retains this mapping and releases it on close. */
export const attachGatewayProjection = (binding: MobileClientBinding): (() => void) => {
    const store = binding.scope(destinationsScope);
    const publish = () => {
        const value = store.getSnapshot()?.payload as GatewayDestinationsPublication | null;
        if (value) useGatewayStore.getState().applyOnboardingProjection(value);
    };
    const release = store.subscribe(publish);
    publish();
    return release;
};
export const hydrateOnboarding = (): Promise<void> =>
    new Promise((resolve, reject) => {
        const store = mobileClientBinding.scope(destinationsScope);
        let release: (() => void) | undefined;
        let finished = false;
        const read = () => {
            if (mobileClientBinding.isClosed()) {
                finished = true;
                release?.();
                reject(new Error('client_closed'));
                return;
            }
            const value = store.getSnapshot()?.payload as GatewayDestinationsPublication | null;
            if (!value || value.loading) return;
            if (value.installation_id || value.error) {
                finished = true;
                release?.();
                if (value.installation_id) resolve();
                else reject(new Error(value.error ?? 'gateway_environment_load_failed'));
            }
        };
        try {
            release = store.subscribe(read);
            dispatchOnboarding({ kind: 'initialize' });
            read();
            if (finished) release();
        } catch (error) {
            release?.();
            reject(error);
        }
    });

let workspaceRequest = 0;
/** Promise bridges a scoped Client outcome; it does not execute registry policy. */
export const persistGatewayWorkspace = (
    endpoint_id: string,
    workspace_id: string | null,
): Promise<void> => {
    const request_id = `mobile-workspace/${++workspaceRequest}`;
    const store = mobileClientBinding.scope(destinationsScope);
    return new Promise((resolve, reject) => {
        let release: (() => void) | undefined;
        let finished = false;
        const read = () => {
            if (finished) return;
            if (mobileClientBinding.isClosed()) {
                finished = true;
                release?.();
                reject(new Error('client_closed'));
                return;
            }
            const value = store.getSnapshot()?.payload as GatewayDestinationsPublication | null;
            const outcome = value?.workspace_outcomes.find(
                (candidate) => candidate.request_id === request_id,
            );
            if (outcome?.request_id !== request_id) return;
            finished = true;
            release?.();
            try {
                dispatchOnboarding({ kind: 'acknowledge_workspace_outcome', request_id });
            } catch (error) {
                reject(error);
                return;
            }
            if (outcome.succeeded) resolve();
            else reject(new Error('gateway_registry_write_failed'));
        };
        release = store.subscribe(read);
        try {
            const transition = dispatchOnboarding({
                kind: 'set_workspace_for_request',
                endpoint_id,
                workspace_id,
                request_id,
            });
            if (transition.outcome === 'rejected')
                throw new Error('gateway_workspace_request_rejected');
            read();
        } catch (error) {
            release();
            reject(error);
        }
        if (finished) release();
    });
};
