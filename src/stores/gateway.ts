import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import type { GatewayRegistry, GatewayConnectionState } from '@/client';
import type { GatewayDestinationsPublication } from '@/client/generated/gateway_destinations_publication';
import type { GatewaySessionPublication } from '@/client/generated/gateway_session_publication';
import { mobileSessionProjection } from '@/services/gateway/session-coordinator';
import type { GatewayOperationErrorCode } from '@/services/gateway/registry';

const presentation = create<{
    showGatewaySwitcher: boolean;
    setGatewaySwitcherOpen: (open: boolean) => void;
}>((set) => ({
    showGatewaySwitcher: false,
    setGatewaySwitcherOpen: (showGatewaySwitcher) => set({ showGatewaySwitcher }),
}));
const emptyRegistry: GatewayRegistry = {
    version: 3,
    installation_id: null,
    active_gateway_id: null,
    local: null,
    remotes: [],
};
const registryMemo = new WeakMap<GatewayDestinationsPublication, GatewayRegistry>();
const registryFor = (value: GatewayDestinationsPublication | null): GatewayRegistry => {
    if (!value) return emptyRegistry;
    const previous = registryMemo.get(value);
    if (previous) return previous;
    const registry: GatewayRegistry = {
        version: 3,
        installation_id: value.installation_id,
        active_gateway_id: value.selected_endpoint,
        local: value.endpoints.find((endpoint) => endpoint.kind === 'local') ?? null,
        remotes: value.endpoints.filter((endpoint) => endpoint.kind === 'remote'),
    };
    registryMemo.set(value, registry);
    return registry;
};
const view = () => {
    const destinations = mobileClientBinding.scope({ kind: 'gateway_destinations' }).getSnapshot()
        ?.payload as GatewayDestinationsPublication | null;
    const session = mobileClientBinding.scope({ kind: 'session' }).getSnapshot()
        ?.payload as GatewaySessionPublication | null;
    const id = destinations?.selected_endpoint ?? null;
    const projection = mobileSessionProjection(id ?? '');
    const connection = id ? session?.connections[id] : null;
    const connectionId = projection.terminalReason
        ? null
        : (connection?.presentation_connection_id ?? connection?.connected?.connection_id ?? null);
    const connectionState: GatewayConnectionState =
        connectionId !== null
            ? 'Connected'
            : connection?.pending
              ? 'Connecting'
              : connection?.failure
                ? 'Disconnected'
                : 'Idle';
    return {
        ...presentation.getState(),
        registry: registryFor(destinations),
        bootstrapped: Boolean(destinations?.installation_id),
        busy: Boolean(destinations?.loading || destinations?.pending_endpoint),
        error: (destinations?.error ? 'operationFailed' : null) as GatewayOperationErrorCode | null,
        connectionId,
        connectionGatewayId: connectionId !== null ? id : null,
        connectionState: connectionState as GatewayConnectionState,
        sessionError: session?.gateway_error ?? projection.terminalReason,
        sessionRevision: 0,
        sessionLifecyclePhase: projection.phase,
        sessionPrincipalId: projection.principalId,
        sessionDeviceId: projection.deviceId,
        sessionId: projection.sessionId,
        sessionAccessExpiresAtUnix: projection.accessExpiresAtUnix,
        sessionTerminalReason: projection.terminalReason,
        sessionConnectionGeneration: projection.connectionGeneration,
    };
};
export const useGatewayStore = Object.assign(
    <T>(selector: (state: ReturnType<typeof view>) => T): T => {
        for (const scope of [
            { kind: 'gateway_destinations' },
            { kind: 'session' },
            { kind: 'administration', workspace_id: null },
        ] as const) {
            const store = mobileClientBinding.scope(scope);
            // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed scoped selector tuple
            useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
        }
        presentation();
        return selector(view());
    },
    {
        getState: view,
        subscribe: (
            listener: (state: ReturnType<typeof view>, previous: ReturnType<typeof view>) => void,
        ) => {
            let previous = view();
            const notify = () => {
                const state = view();
                if (
                    (Object.keys(state) as (keyof typeof state)[]).every((key) =>
                        Object.is(state[key], previous[key]),
                    )
                )
                    return;
                const before = previous;
                previous = state;
                listener(state, before);
            };
            const releases = [
                mobileClientBinding.scope({ kind: 'gateway_destinations' }).subscribe(notify),
                mobileClientBinding.scope({ kind: 'session' }).subscribe(notify),
                mobileClientBinding
                    .scope({ kind: 'administration', workspace_id: null })
                    .subscribe(notify),
                presentation.subscribe(notify),
            ];
            return () => releases.forEach((release) => release());
        },
    },
);
