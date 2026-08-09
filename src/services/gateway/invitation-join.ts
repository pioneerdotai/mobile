import { pioneerClient } from '@/client';
import type { GatewayEndpoint, GatewayRegistry, InvitationAcceptParams } from '@/client';
import { useGatewayStore } from '@/stores/gateway';
import {
    findGatewayEndpoint,
    loadGatewayRegistry,
    replaceGatewayEndpoint,
    saveGatewayRegistry,
} from './registry';
import { mobileAuthInstallation } from './session-grant';
import {
    MOBILE_GATEWAY_SESSION_SCHEMA_VERSION,
    deleteMobileGatewaySession,
    writeMobileGatewaySession,
} from './session-storage';
import { clearMobileGatewaySessionRuntime } from './session-coordinator';

const INVITATION_TIMEOUT_MS = 15_000;

export type AcceptMobileInvitationInput = {
    uri: string;
    profile: InvitationAcceptParams['profile'];
};

type PendingRegistryRecovery = {
    stagedRegistry: GatewayRegistry;
    activeRegistry: GatewayRegistry;
    endpoint: GatewayEndpoint;
};

let pendingRegistryRecovery: PendingRegistryRecovery | null = null;

export class MobileInvitationJoinError extends Error {
    readonly code:
        | 'unavailable'
        | 'invalid_profile'
        | 'nickname_unavailable'
        | 'avatar_invalid'
        | 'storage_failed';

    constructor(code: MobileInvitationJoinError['code'], cause?: unknown) {
        super(code);
        this.name = 'MobileInvitationJoinError';
        this.code = code;
        this.cause = cause;
    }
}

export const acceptMobileInvitation = async (
    input: AcceptMobileInvitationInput,
): Promise<GatewayEndpoint> => {
    if (pendingRegistryRecovery) {
        return finishPendingRegistryRecovery();
    }

    const registry = loadGatewayRegistry();
    const installationId = registry.installation_id?.trim();
    if (!installationId) {
        throw new MobileInvitationJoinError('storage_failed');
    }
    const presentation = await pioneerClient
        .invitationPresentation({ uri: input.uri })
        .catch((error: unknown) => {
            throw normalizeJoinError(error);
        });
    if (
        (registry.remotes ?? []).some(
            (endpoint) =>
                endpoint.server_gateway_id === presentation.gateway_id && endpoint.session_ref,
        )
    ) {
        throw new MobileInvitationJoinError('unavailable');
    }

    const planned = await pioneerClient.gatewayPlanAddAndActivateRemoteRegistry({
        registry,
        name: '',
        gateway_base_url: presentation.gateway_base_url,
        new_endpoint_id: null,
        default_remote_name: 'Pioneer Gateway',
    });
    const accepted = await pioneerClient
        .invitationAccept({
            uri: input.uri,
            params: {
                profile: input.profile,
                installation: mobileAuthInstallation(installationId),
            },
            expected_installation_id: installationId,
            timeout_ms: INVITATION_TIMEOUT_MS,
        })
        .catch((error: unknown) => {
            throw normalizeJoinError(error);
        });

    const commit = { commit_id: accepted.commit_id };
    const refresh = await pioneerClient.invitationCommitTakeRefresh(commit);
    const sessionRef = planned.endpoint.id;
    const endpoint: GatewayEndpoint = {
        ...planned.endpoint,
        session_ref: sessionRef,
        server_gateway_id: refresh.gateway_id,
        workspace_id: null,
    };
    const stagedRegistry = bindEndpoint(
        { ...planned.registry, active_gateway_id: registry.active_gateway_id ?? null },
        endpoint,
    );
    const activeRegistry = { ...stagedRegistry, active_gateway_id: endpoint.id };

    try {
        await writeMobileGatewaySession(sessionRef, {
            schema_version: MOBILE_GATEWAY_SESSION_SCHEMA_VERSION,
            gateway_id: refresh.gateway_id,
            principal_id: refresh.principal_id,
            device_id: refresh.device_id,
            session_id: refresh.session_id,
            token_family_id: refresh.token_family_id,
            installation_id: refresh.installation_id,
            refresh_generation: refresh.refresh_generation,
            refresh_expires_at_unix: refresh.refresh_expires_at_unix,
            refresh_token: refresh.refresh_token,
        });
    } catch (error) {
        refresh.refresh_token = '';
        await pioneerClient
            .invitationCommitSecureStorageFailed({
                commit_id: accepted.commit_id,
                timeout_ms: INVITATION_TIMEOUT_MS,
            })
            .catch(() => undefined);
        throw new MobileInvitationJoinError('storage_failed', error);
    }
    refresh.refresh_token = '';

    const binding = await pioneerClient.invitationCommitSecureStorageCommitted(commit);
    if (
        binding.gateway_id !== refresh.gateway_id ||
        binding.principal_id !== refresh.principal_id ||
        binding.device_id !== refresh.device_id ||
        binding.session_id !== refresh.session_id
    ) {
        await deleteMobileGatewaySession(sessionRef).catch(() => undefined);
        await pioneerClient.invitationCommitRegistryFailed(commit).catch(() => undefined);
        throw new MobileInvitationJoinError('storage_failed');
    }

    try {
        saveGatewayRegistry(stagedRegistry);
    } catch (error) {
        await pioneerClient.invitationCommitRegistryFailed(commit).catch(() => undefined);
        pendingRegistryRecovery = { stagedRegistry, activeRegistry, endpoint };
        throw new MobileInvitationJoinError('storage_failed', error);
    }

    let access: Awaited<ReturnType<typeof pioneerClient.invitationCommitRegistryCommitted>> | null =
        null;
    try {
        access = await pioneerClient.invitationCommitRegistryCommitted(commit);
        if (
            access.gateway_id !== refresh.gateway_id ||
            access.principal_id !== refresh.principal_id ||
            access.device_id !== refresh.device_id ||
            access.session_id !== refresh.session_id
        ) {
            throw new Error('invitation access identity mismatch');
        }
        saveGatewayRegistry(activeRegistry);
    } catch (error) {
        if (access === null) {
            await pioneerClient.invitationCommitRegistryFailed(commit).catch(() => undefined);
        }
        if (access !== null) {
            access.access_token = '';
        }
        pendingRegistryRecovery = { stagedRegistry, activeRegistry, endpoint };
        throw new MobileInvitationJoinError('storage_failed', error);
    }
    access.access_token = '';
    pendingRegistryRecovery = null;
    await publishActivatedRegistry(activeRegistry, endpoint);
    return endpoint;
};

const finishPendingRegistryRecovery = async (): Promise<GatewayEndpoint> => {
    const recovery = pendingRegistryRecovery;
    if (!recovery) {
        throw new MobileInvitationJoinError('storage_failed');
    }
    try {
        saveGatewayRegistry(recovery.stagedRegistry);
        saveGatewayRegistry(recovery.activeRegistry);
        pendingRegistryRecovery = null;
        await publishActivatedRegistry(recovery.activeRegistry, recovery.endpoint);
        return recovery.endpoint;
    } catch (error) {
        throw new MobileInvitationJoinError('storage_failed', error);
    }
};

const publishActivatedRegistry = async (
    registry: GatewayRegistry,
    endpoint: GatewayEndpoint,
): Promise<void> => {
    await clearMobileGatewaySessionRuntime(endpoint.id).catch(() => undefined);
    const store = useGatewayStore.getState();
    store.setRegistry(registry);
    store.bumpSessionRevision();
};

const bindEndpoint = (registry: GatewayRegistry, endpoint: GatewayEndpoint): GatewayRegistry => {
    const known = findGatewayEndpoint(registry, endpoint.id);
    return known
        ? replaceGatewayEndpoint(registry, endpoint)
        : { ...registry, remotes: [...(registry.remotes ?? []), endpoint] };
};

const normalizeJoinError = (error: unknown): MobileInvitationJoinError => {
    const code =
        error && typeof error === 'object' && 'code' in error
            ? String((error as { code?: unknown }).code)
            : '';
    switch (code) {
        case 'invalid_profile':
            return new MobileInvitationJoinError('invalid_profile', error);
        case 'nickname_unavailable':
            return new MobileInvitationJoinError('nickname_unavailable', error);
        case 'avatar_invalid':
            return new MobileInvitationJoinError('avatar_invalid', error);
        default:
            return new MobileInvitationJoinError('unavailable', error);
    }
};

export const resetPendingMobileInvitationRecoveryForTests = (): void => {
    pendingRegistryRecovery = null;
};
