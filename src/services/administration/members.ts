import type {
    AuthMeResponse,
    ClientDeviceActivationPresentationResult,
    GatewayEndpoint,
    MemberListResponse,
    MemberListRow,
    MemberSummary,
    WorkspaceMemberListResponse,
} from '@/client';
import { pioneerClient } from '@/client';

export const MEMBER_PAGE_LIMIT = 50;
const WORKSPACE_MEMBER_PAGE_LIMIT = 100;

export const loadMemberPage = (cursor: string | null): Promise<MemberListResponse> =>
    pioneerClient.memberList({ cursor, limit: MEMBER_PAGE_LIMIT });

export const loadAllWorkspaceMembers = async (
    workspaceId: string,
): Promise<WorkspaceMemberListResponse> => {
    const members: MemberSummary[] = [];
    const seen = new Set<string>();
    let cursor: string | null = null;
    do {
        const page = await pioneerClient.workspaceMemberList({
            workspace_id: workspaceId,
            cursor,
            limit: WORKSPACE_MEMBER_PAGE_LIMIT,
        });
        for (const member of page.members) {
            if (!seen.has(member.principal_id)) {
                seen.add(member.principal_id);
                members.push(member);
            }
        }
        const next = page.next_cursor ?? null;
        if (next !== null && next === cursor) {
            throw new Error('invalid_workspace_member_cursor');
        }
        cursor = next;
    } while (cursor !== null);
    return { workspace_id: workspaceId, members, next_cursor: null };
};

export const presentMember = (
    auth: AuthMeResponse,
    member: MemberSummary,
    isWorkspaceMember: boolean,
): MemberListRow =>
    pioneerClient.memberPresentation({
        auth,
        member,
        is_workspace_member: isWorkspaceMember,
    });

export const addWorkspaceMember = async (
    workspaceId: string,
    principalId: string,
): Promise<void> => {
    await pioneerClient.workspaceMemberAdd({
        workspace_id: workspaceId,
        principal_id: principalId,
    });
};

export const removeWorkspaceMember = async (
    workspaceId: string,
    principalId: string,
): Promise<void> => {
    await pioneerClient.workspaceMemberRemove({
        workspace_id: workspaceId,
        principal_id: principalId,
    });
};

export const suspendMember = async (member: MemberSummary): Promise<void> => {
    await pioneerClient.memberSuspend({
        principal_id: member.principal_id,
        expected_status: member.status,
    });
};

export const restoreMember = async (member: MemberSummary): Promise<void> => {
    await pioneerClient.memberRestore({
        principal_id: member.principal_id,
        expected_status: member.status,
    });
};

export const removeMember = async (member: MemberSummary): Promise<void> => {
    await pioneerClient.memberRemove({
        principal_id: member.principal_id,
        expected_status: member.status,
    });
};

export const createRecoveryDevicePresentation = async (
    endpoint: GatewayEndpoint,
    principalId: string,
): Promise<ClientDeviceActivationPresentationResult> => {
    const response = await pioneerClient.memberDeviceCreate({ principal_id: principalId });
    try {
        return pioneerClient.gatewayDeviceActivationPresentation({
            gateway_base_url: endpoint.gateway_base_url,
            created_device: response.activation,
        });
    } catch (error) {
        await cancelRecoveryDevice(response.activation.session_id).catch(() => {});
        throw error;
    }
};

export const cancelRecoveryDevice = async (sessionId: string): Promise<void> => {
    await pioneerClient.gatewayAuthSessionRevoke({
        session_id: sessionId,
        expected_status: 'pending',
    });
};
