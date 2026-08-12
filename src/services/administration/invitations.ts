import type {
    AuthMeResponse,
    AuthorizationCapabilitySnapshot,
    ClientInvitationPresentationResult,
    InvitationListResponse,
} from '@/client';
import { pioneerClient } from '@/client';

export const INVITATION_PAGE_LIMIT = 50;

export const loadCurrentAdministrationPrincipal = (): Promise<AuthMeResponse> =>
    pioneerClient.gatewayAuthMe();

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
): Promise<ClientInvitationPresentationResult> => {
    const unique = [...new Set(workspaceIds)].sort();
    if (unique.length === 0 || unique.length > 64) {
        throw new Error('invalid_invitation_workspace_selection');
    }
    const response = await pioneerClient.invitationCreate({
        workspace_ids: unique as [string, ...string[]],
    });
    return pioneerClient.invitationPresentation({ uri: response.presentation.deep_link });
};

export const revokeInvitation = async (invitationId: string): Promise<void> => {
    await pioneerClient.invitationRevoke({ invitation_id: invitationId });
};
