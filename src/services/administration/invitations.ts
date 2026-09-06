import type {
    AuthMeResponse,
    AuthorizationCapabilitySnapshot,
    ClientInvitationPresentationResult,
    InvitationListResponse,
} from '@/client';
import { pioneerClient, mobileClientBinding } from '@/client';
import type { IdentityAuthorizationPublication } from '@/client/generated/identity_authorization_publication';

export const INVITATION_PAGE_LIMIT = 50;

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

export const loadInvitationPage = (cursor: string | null): Promise<InvitationListResponse> =>
    pioneerClient.invitationList({
        cursor,
        limit: INVITATION_PAGE_LIMIT,
    });

export const createInvitationPresentation = async (
    workspaceIds: readonly string[],
    roleKey: string,
): Promise<ClientInvitationPresentationResult> => {
    const unique = [...new Set(workspaceIds)].sort();
    if (unique.length === 0 || unique.length > 64 || !roleKey.trim()) {
        throw new Error('invalid_invitation_workspace_selection');
    }
    const response = await pioneerClient.invitationCreate({
        role_key: roleKey,
        workspace_ids: unique as [string, ...string[]],
    });
    return pioneerClient.invitationPresentation({ uri: response.presentation.deep_link });
};

export const revokeInvitation = async (invitationId: string): Promise<void> => {
    await pioneerClient.invitationRevoke({ invitation_id: invitationId });
};
