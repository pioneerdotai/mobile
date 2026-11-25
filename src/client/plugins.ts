import { useEffect, useSyncExternalStore } from 'react';
import type { PluginIntent } from './generated/client_intent';
import type { PluginPublication } from './generated/plugin_publication';
import type { SkillUploadPublication } from './generated/skill_upload_publication';
import type { IdentityAuthorizationPublication } from './generated/identity_authorization_publication';
import { mobileClientBinding } from './mobile-client-binding';
import { useGatewayStore } from '@/stores/gateway';

export const pluginOriginConnection = (): number | null =>
    (
        mobileClientBinding.scope({ kind: 'administration', workspace_id: null }).getSnapshot()
            ?.payload as IdentityAuthorizationPublication | undefined
    )?.connection_id ?? null;

export const dispatchPlugin = (
    workspace: string,
    connectionId: number | null,
    intent: PluginIntent,
) => {
    const result = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: {
            kind: 'plugins',
            workspace_id: workspace,
            connection_id: connectionId,
            intent,
        },
    });
    mobileClientBinding.drain({ kind: 'plugins', workspace_id: workspace });
    return result;
};
export const usePlugins = (workspace: string | null, pluginId: string | null) => {
    const gateway = useGatewayStore((s) => s.registry.active_gateway_id);
    const identityStore = mobileClientBinding.scope({ kind: 'administration', workspace_id: null });
    const identity = useSyncExternalStore(
        identityStore.subscribe,
        identityStore.getSnapshot,
        identityStore.getSnapshot,
    )?.payload as IdentityAuthorizationPublication | undefined;
    const connection = identity?.connection_id ?? null;
    const store = mobileClientBinding.scope(
        workspace ? { kind: 'plugins', workspace_id: workspace } : { kind: 'navigation' },
    );
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    useEffect(() => {
        if (!workspace) return;
        dispatchPlugin(workspace, connection, { kind: 'observe', plugin_id: pluginId });
        return () => {
            dispatchPlugin(workspace, connection, { kind: 'close' });
        };
    }, [workspace, pluginId, gateway, connection, identity?.authorization_change_sequence]);
    const p = snapshot?.payload as PluginPublication | undefined;
    return workspace && p?.connection_id === connection && p?.plugin_id === pluginId ? p : null;
};
export const usePluginUpload = (workspace: string | null, operation: number | null) => {
    const store = mobileClientBinding.scope(
        workspace && operation !== null
            ? { kind: 'skills_upload', workspace_id: workspace, operation_id: operation }
            : { kind: 'navigation' },
    );
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return workspace && operation !== null
        ? (snapshot?.payload as SkillUploadPublication | undefined)
        : undefined;
};
/** Native action publications remain authoritative; no plugin-specific child FSM. */
export const usePluginChildAction = (
    workspace: string,
    kind: 'skills_action' | 'mcp_action',
    target: string,
) => {
    const store = mobileClientBinding.scope({ kind, workspace_id: workspace, target });
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return snapshot?.payload as
        | { state: 'pending' | 'succeeded' | 'failed' | 'cancelled'; operation_id: number }
        | undefined;
};
