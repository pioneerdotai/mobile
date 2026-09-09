import type {
    AuthMeResponse,
    AuthorizationCapabilitySnapshot,
    ClientInvitationPresentationResult,
} from '@/client';
import { pioneerClient, mobileClientBinding } from '@/client';
import { prepareAdministrationCommand, performAdministrationCommand } from './operations';
import type { IdentityAuthorizationPublication } from '@/client/generated/identity_authorization_publication';

export const currentAdministrationPrincipalSnapshot = (): AuthMeResponse | null => {
    const publication = mobileClientBinding
        .scope({ kind: 'administration', workspace_id: null })
        .getSnapshot();
    return (publication?.payload as IdentityAuthorizationPublication | null)?.current_auth ?? null;
};

export const loadCurrentAdministrationPrincipal = async (): Promise<AuthMeResponse> => {
    currentAdministrationPrincipalSnapshot();
    await pioneerClient.gatewayAuthMe();
    await mobileClientBinding.synchronize();
    const auth = currentAdministrationPrincipalSnapshot();
    if (!auth) {
        throw new Error('stale_authorization_projection');
    }
    return auth;
};

export const loadAuthorizationCapabilitySnapshot = (
    workspaceId: string | null,
    threadId: string | null = null,
): Promise<AuthorizationCapabilitySnapshot> =>
    pioneerClient.gatewayAuthorizationCapabilities({
        workspace_id: workspaceId,
        thread_id: threadId,
    });

export type AdministrationInvitationPresentation = ClientInvitationPresentationResult & {
    operationGeneration: number;
};

export const createInvitationPresentation = async (
    workspaceIds: readonly string[],
    roleKey: string,
): Promise<AdministrationInvitationPresentation> => {
    const generation = prepareAdministrationCommand({
        kind: 'create_invitation',
        params: {
            role_key: roleKey,
            workspace_ids: [...workspaceIds] as [string, ...string[]],
        },
    });
    const response = await pioneerClient.invitationCreate({ schema_version: 1, generation });
    return {
        ...(await pioneerClient.invitationPresentation({ uri: response.presentation.deep_link })),
        operationGeneration: generation,
    };
};

export const revokeInvitation = async (invitationId: string): Promise<void> => {
    await performAdministrationCommand({
        kind: 'revoke_invitation',
        params: { invitation_id: invitationId },
    });
};
