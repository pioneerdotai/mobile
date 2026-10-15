import type {
    AuthMeResponse,
    AuthorizationCapabilitySnapshot,
    ClientDeviceActivationPresentationResult,
    GatewayEndpoint,
    MemberListRow,
    MemberSummary,
} from '@/client';
import { pioneerClient } from '@/client';
import {
    dismissAdministrationActivation,
    performAdministrationCommand,
    prepareAdministrationCommand,
} from './operations';
import { PIONEER_APP_URL_SCHEME } from '@/helpers/app-url';

export const presentMember = (
    auth: AuthMeResponse,
    capabilitySnapshot: AuthorizationCapabilitySnapshot,
    member: MemberSummary,
    isWorkspaceMember: boolean,
): MemberListRow =>
    pioneerClient.memberPresentation({
        auth,
        capability_snapshot: capabilitySnapshot,
        member,
        is_workspace_member: isWorkspaceMember,
    });

export const suspendMember = async (member: MemberSummary): Promise<void> => {
    await performAdministrationCommand({
        kind: 'suspend_member',
        params: {
            principal_id: member.principal_id,
            expected_status: member.status,
        },
    });
};

export const restoreMember = async (member: MemberSummary): Promise<void> => {
    await performAdministrationCommand({
        kind: 'restore_member',
        params: {
            principal_id: member.principal_id,
            expected_status: member.status,
        },
    });
};

export const removeMember = async (member: MemberSummary): Promise<void> => {
    await performAdministrationCommand({
        kind: 'remove_member',
        params: {
            principal_id: member.principal_id,
            expected_status: member.status,
        },
    });
};

export type AdministrationRecoveryPresentation = ClientDeviceActivationPresentationResult & {
    operationGeneration: number;
};

export const createRecoveryDevicePresentation = async (
    endpoint: GatewayEndpoint,
    principalId: string,
): Promise<AdministrationRecoveryPresentation> => {
    const generation = prepareAdministrationCommand({
        kind: 'create_recovery_device',
        params: { principal_id: principalId },
    });
    const response = await pioneerClient.memberDeviceCreate({ schema_version: 1, generation });
    try {
        return {
            ...(await pioneerClient.gatewayDeviceActivationPresentation({
                gateway_base_url: endpoint.gateway_base_url,
                created_device: response.activation,
                app_url_scheme: PIONEER_APP_URL_SCHEME,
            })),
            operationGeneration: generation,
        };
    } catch (error) {
        await cancelRecoveryDevice(generation).catch(() => {});
        throw error;
    }
};

export const cancelRecoveryDevice = async (generation: number): Promise<void> => {
    dismissAdministrationActivation(generation);
};
