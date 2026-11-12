import { useSyncExternalStore } from 'react';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import type { IdentityAuthorizationPublication } from '@/client/generated/identity_authorization_publication';
import { useGatewayStore } from '@/stores/gateway';
import { useWorkspaceStore } from '@/stores/workspace';

// Read the existing identity publication without starting capability fetches per header.
// The global lifecycle controller owns the capability hook and inbox refresh.
export const useInboxScope = () => {
    const store = mobileClientBinding.scope({ kind: 'administration', workspace_id: null });
    const publication = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const identity = publication?.payload as Readonly<IdentityAuthorizationPublication> | null;
    const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
    const {
        connectionGatewayId: gatewayId, connectionId, connectionState,
        sessionPrincipalId, sessionId, sessionDeviceId: deviceId,
    } = useGatewayStore((state) => state);
    const connected = connectionState === 'Connected';
    const principalId = identity?.current_auth?.principal.id ?? null;
    const capabilities = workspaceId ? identity?.workspace_snapshots?.[workspaceId] : null;
    const canRead = capabilities?.workspace?.capabilities.can_read_own_notifications === true;
    const canAcknowledge = capabilities?.workspace?.capabilities.can_acknowledge_own_notifications === true;
    // connectionId is the accepted presentation ID; identity.connection_id is transport-only.
    // A token rotation preserves this subject and authorization generation in the shared client.
    const enabled = connected && canRead && gatewayId !== null && connectionId !== null &&
        identity?.endpoint_id === gatewayId && principalId !== null &&
        principalId === sessionPrincipalId && sessionId != null && deviceId != null &&
        identity?.current_auth?.session.id === sessionId &&
        identity?.current_auth?.device.id === deviceId && workspaceId !== null;
    return {
        workspaceId, enabled, canAcknowledge,
        key: JSON.stringify([gatewayId, connectionId, identity?.connection_generation, principalId, sessionId, deviceId, workspaceId, enabled]),
    };
};
