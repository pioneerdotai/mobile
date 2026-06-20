import { Platform } from 'react-native';

import { getPioneerClientNitro } from '@pioneer/client-nitro';

import type { ActivateGatewayRegistryPlan } from './generated/activate_gateway_registry_plan';
import type { AddRemoteGatewayPlan } from './generated/add_remote_gateway_plan';
import type { AddAndActivateRemoteGatewayRegistryPlan } from './generated/add_and_activate_remote_gateway_registry_plan';
import type { ClientActiveThreadCancelTurnRequest } from './generated/client_active_thread_cancel_turn_request';
import type { ClientActiveThreadCancelTurnResult } from './generated/client_active_thread_cancel_turn_result';
import type { ClientActiveThreadClearResult } from './generated/client_active_thread_clear_result';
import type { ClientActiveThreadEventRequest } from './generated/client_active_thread_event_request';
import type { ClientActiveThreadOpenRequest } from './generated/client_active_thread_open_request';
import type { ClientActiveThreadSendTextRequest } from './generated/client_active_thread_send_text_request';
import type { ClientActiveThreadSendTextResult } from './generated/client_active_thread_send_text_result';
import type { ClientActiveThreadSnapshot } from './generated/client_active_thread_snapshot';
import type { ClientActiveThreadSnapshotRequest } from './generated/client_active_thread_snapshot_request';
import type { ClientComposerAttachmentFromPathRequest } from './generated/client_composer_attachment_from_path_request';
import type { ClientComposerAttachmentsUpdateRequest } from './generated/client_composer_attachments_update_request';
import type { ClientComposerCapabilitiesUpdateRequest } from './generated/client_composer_capabilities_update_request';
import type { ClientComposerFilterMcpRowsRequest } from './generated/client_composer_filter_mcp_rows_request';
import type { ClientComposerFilterMcpRowsResult } from './generated/client_composer_filter_mcp_rows_result';
import type { ClientComposerFilterSkillRowsRequest } from './generated/client_composer_filter_skill_rows_request';
import type { ClientComposerMcpCapabilityFromRowRequest } from './generated/client_composer_mcp_capability_from_row_request';
import type { ClientComposerMcpPickerRowsRequest } from './generated/client_composer_mcp_picker_rows_request';
import type { ClientComposerMcpPickerRowsResult } from './generated/client_composer_mcp_picker_rows_result';
import type { ClientComposerMcpToggleRequest } from './generated/client_composer_mcp_toggle_request';
import type { ClientComposerMcpToggleResult } from './generated/client_composer_mcp_toggle_result';
import type { ClientComposerSkillCapabilityFromRowRequest } from './generated/client_composer_skill_capability_from_row_request';
import type { ClientComposerSkillPickerRowsRequest } from './generated/client_composer_skill_picker_rows_request';
import type { ClientComposerSkillToggleRequest } from './generated/client_composer_skill_toggle_request';
import type { ClientComposerSkillToggleResult } from './generated/client_composer_skill_toggle_result';
import type { ClientDiagnosticEvent } from './generated/client_diagnostic_event';
import type { ClientEvent } from './generated/client_event';
import type { ClientGatewayConnectRequest } from './generated/client_gateway_connect_request';
import type { ClientGatewayConnectResult } from './generated/client_gateway_connect_result';
import type { CLIRuntimeListModelsParams } from './generated/cli_runtime_list_models_params';
import type { CLIRuntimeListModelsResponse } from './generated/cli_runtime_list_models_response';
import type { CLIRuntimeListParams } from './generated/cli_runtime_list_params';
import type { CLIRuntimeListResponse } from './generated/cli_runtime_list_response';
import type { CLIRuntimeRequestRespondParams } from './generated/cli_runtime_request_respond_params';
import type { CLIRuntimeRequestRespondResponse } from './generated/cli_runtime_request_respond_response';
import type { CLIRuntimeReviewStartParams } from './generated/cli_runtime_review_start_params';
import type { CLIRuntimeReviewStartResponse } from './generated/cli_runtime_review_start_response';
import type { CLIRuntimeThreadBindingGetParams } from './generated/cli_runtime_thread_binding_get_params';
import type { CLIRuntimeThreadBindingGetResponse } from './generated/cli_runtime_thread_binding_get_response';
import type { CLIRuntimeThreadCompactParams } from './generated/cli_runtime_thread_compact_params';
import type { CLIRuntimeThreadCompactResponse } from './generated/cli_runtime_thread_compact_response';
import type { CLIRuntimeTurnSteerParams } from './generated/cli_runtime_turn_steer_params';
import type { CLIRuntimeTurnSteerResponse } from './generated/cli_runtime_turn_steer_response';
import type { ComposerAttachment } from './generated/composer_attachment';
import type { ComposerCapability } from './generated/composer_capability';
import type { DeleteRemoteGatewayRegistryPlan } from './generated/delete_remote_gateway_registry_plan';
import type { PlanActivateGatewayRequest } from './generated/plan_activate_gateway_request';
import type { PlanAddRemoteGatewayRequest } from './generated/plan_add_remote_gateway_request';
import type { PlanDeleteRemoteGatewayRequest } from './generated/plan_delete_remote_gateway_request';
import type { PlanSetGatewayWorkspaceRequest } from './generated/plan_set_gateway_workspace_request';
import type { PlanUpdateRemoteGatewayRequest } from './generated/plan_update_remote_gateway_request';
import type { ProviderListModelsParams } from './generated/provider_list_models_params';
import type { ProviderListModelsResponse } from './generated/provider_list_models_response';
import type { ProviderListParams } from './generated/provider_list_params';
import type { ProviderListResponse } from './generated/provider_list_response';
import type { ProviderModelDisplayKey } from './generated/provider_model_display_key';
import type { ProviderModelDisplayResolution } from './generated/provider_model_display_resolution';
import type { RemoteGatewayValidation } from './generated/remote_gateway_validation';
import type { RemoteGatewayValidationRequest } from './generated/remote_gateway_validation_request';
import type { SelectableSkillCapability } from './generated/selectable_skill_capability';
import type { SetGatewayWorkspaceRegistryPlan } from './generated/set_gateway_workspace_registry_plan';
import type { ClientThreadTreeLevel } from './generated/thread_tree_level';
import type { ThreadTreeLevelRequest } from './generated/thread_tree_level_request';
import type { ClientThreadTreeQueryData } from './generated/thread_tree_query_data';
import type { ThreadTreeRefreshRequest } from './generated/thread_tree_refresh_request';
import type { ThreadAgentsDocArchiveParams } from './generated/thread_agents_doc_archive_params';
import type { ThreadAgentsDocArchiveResponse } from './generated/thread_agents_doc_archive_response';
import type { ThreadAgentsDocGetParams } from './generated/thread_agents_doc_get_params';
import type { ThreadAgentsDocGetResponse } from './generated/thread_agents_doc_get_response';
import type { ThreadAgentsDocSaveParams } from './generated/thread_agents_doc_save_params';
import type { ThreadAgentsDocSaveResponse } from './generated/thread_agents_doc_save_response';
import type { UpdateRemoteGatewayRegistryPlan } from './generated/update_remote_gateway_registry_plan';
import type { WorkspaceBootstrapRequest } from './generated/workspace_bootstrap_request';
import type { WorkspaceBootstrapSuccessReduction } from './generated/workspace_bootstrap_success_reduction';
import type { WorkspaceCreateRequest } from './generated/workspace_create_request';
import type { WorkspaceCreateResult } from './generated/workspace_create_result';
import type { WorkspaceRenameRequest } from './generated/workspace_rename_request';
import type { WorkspaceRenameResult } from './generated/workspace_rename_result';
import type { WorkspaceSwitchRequest } from './generated/workspace_switch_request';
import type { WorkspaceSwitchResult } from './generated/workspace_switch_result';
import { parsePioneerClientResponse } from './response';

export type { ActivateGatewayRegistryPlan } from './generated/activate_gateway_registry_plan';
export type { AddRemoteGatewayPlan } from './generated/add_remote_gateway_plan';
export type { AddAndActivateRemoteGatewayRegistryPlan } from './generated/add_and_activate_remote_gateway_registry_plan';
export type { ClientActiveThreadCancelTurnRequest } from './generated/client_active_thread_cancel_turn_request';
export type { ClientActiveThreadCancelTurnResult } from './generated/client_active_thread_cancel_turn_result';
export type { ClientActiveThreadClearResult } from './generated/client_active_thread_clear_result';
export type { ClientActiveThreadEventRequest } from './generated/client_active_thread_event_request';
export type { ClientActiveThreadOpenRequest } from './generated/client_active_thread_open_request';
export type { ClientActiveThreadSendTextRequest } from './generated/client_active_thread_send_text_request';
export type { ThreadMode } from './generated/client_active_thread_send_text_request';
export type { ClientActiveThreadSendTextResult } from './generated/client_active_thread_send_text_result';
export type { ClientActiveThreadSnapshot } from './generated/client_active_thread_snapshot';
export type { ClientActiveThreadSnapshotRequest } from './generated/client_active_thread_snapshot_request';
export type { ClientComposerAttachmentFromPathRequest } from './generated/client_composer_attachment_from_path_request';
export type { ClientComposerAttachmentsUpdateRequest } from './generated/client_composer_attachments_update_request';
export type { ClientComposerCapabilitiesUpdateRequest } from './generated/client_composer_capabilities_update_request';
export type { ClientComposerFilterMcpRowsRequest } from './generated/client_composer_filter_mcp_rows_request';
export type { ClientComposerFilterMcpRowsResult } from './generated/client_composer_filter_mcp_rows_result';
export type { ClientComposerFilterSkillRowsRequest } from './generated/client_composer_filter_skill_rows_request';
export type { ClientComposerMcpCapabilityFromRowRequest } from './generated/client_composer_mcp_capability_from_row_request';
export type { ClientComposerMcpPickerRowsRequest } from './generated/client_composer_mcp_picker_rows_request';
export type { ClientComposerMcpPickerRowsResult } from './generated/client_composer_mcp_picker_rows_result';
export type { ClientComposerMcpToggleRequest } from './generated/client_composer_mcp_toggle_request';
export type { ClientComposerMcpToggleResult } from './generated/client_composer_mcp_toggle_result';
export type { ClientComposerSkillCapabilityFromRowRequest } from './generated/client_composer_skill_capability_from_row_request';
export type { ClientComposerSkillPickerRowsRequest } from './generated/client_composer_skill_picker_rows_request';
export type { ClientComposerSkillToggleRequest } from './generated/client_composer_skill_toggle_request';
export type { ClientComposerSkillToggleResult } from './generated/client_composer_skill_toggle_result';
export type { ClientDiagnosticEvent } from './generated/client_diagnostic_event';
export type { ClientEvent } from './generated/client_event';
export type { ClientGatewayConnectRequest } from './generated/client_gateway_connect_request';
export type { ClientGatewayConnectResult } from './generated/client_gateway_connect_result';
export type { CLIRuntimeListModelsParams } from './generated/cli_runtime_list_models_params';
export type {
    CLIRuntimeListModelsResponse,
    RuntimeModelInfo,
} from './generated/cli_runtime_list_models_response';
export type { CLIRuntimeListParams } from './generated/cli_runtime_list_params';
export type {
    CLIRuntimeListResponse,
    RuntimeStatus,
    RuntimeSummary,
} from './generated/cli_runtime_list_response';
export type { CLIRuntimePendingRequest } from './generated/cli_runtime_pending_request';
export type { CLIRuntimeRequestResolution } from './generated/cli_runtime_request_resolution';
export type { CLIRuntimeRequestRespondParams } from './generated/cli_runtime_request_respond_params';
export type { CLIRuntimeRequestRespondResponse } from './generated/cli_runtime_request_respond_response';
export type { CLIRuntimeReviewStartParams } from './generated/cli_runtime_review_start_params';
export type { CLIRuntimeReviewStartResponse } from './generated/cli_runtime_review_start_response';
export type { CLIRuntimeThreadBinding } from './generated/cli_runtime_thread_binding';
export type { CLIRuntimeThreadBindingGetParams } from './generated/cli_runtime_thread_binding_get_params';
export type { CLIRuntimeThreadBindingGetResponse } from './generated/cli_runtime_thread_binding_get_response';
export type { CLIRuntimeThreadCompactParams } from './generated/cli_runtime_thread_compact_params';
export type { CLIRuntimeThreadCompactResponse } from './generated/cli_runtime_thread_compact_response';
export type { CLIRuntimeTurnSteerParams } from './generated/cli_runtime_turn_steer_params';
export type { CLIRuntimeTurnSteerResponse } from './generated/cli_runtime_turn_steer_response';
export type { ComposerAttachment } from './generated/composer_attachment';
export type { ComposerAttachmentKind } from './generated/composer_attachment_kind';
export type { ComposerAttachmentUploadState } from './generated/composer_attachment_upload_state';
export type { ComposerCapability } from './generated/composer_capability';
export type { ComposerCapabilityKind } from './generated/composer_capability_kind';
export type { ClientGatewayWsTimings } from './generated/client_gateway_ws_timings';
export type { DeleteRemoteGatewayRegistryPlan } from './generated/delete_remote_gateway_registry_plan';
export type { GatewayAuthTokenWrite } from './generated/gateway_auth_token_write';
export type { GatewayAuthTokenUpdate } from './generated/gateway_auth_token_update';
export type { GatewayConnectionState } from './generated/gateway_connection_state';
export type { GatewayEndpoint } from './generated/gateway_endpoint';
export type { GatewayEndpointKind } from './generated/gateway_endpoint_kind';
export type { GatewayRegistry } from './generated/gateway_registry';
export type { PlanActivateGatewayRequest } from './generated/plan_activate_gateway_request';
export type { PlanAddRemoteGatewayRequest } from './generated/plan_add_remote_gateway_request';
export type { PlanDeleteRemoteGatewayRequest } from './generated/plan_delete_remote_gateway_request';
export type { PlanSetGatewayWorkspaceRequest } from './generated/plan_set_gateway_workspace_request';
export type { PlanUpdateRemoteGatewayRequest } from './generated/plan_update_remote_gateway_request';
export type { ProviderListModelsParams } from './generated/provider_list_models_params';
export type {
    ProviderListModelsResponse,
    ProviderModelInfo,
} from './generated/provider_list_models_response';
export type { ProviderListParams } from './generated/provider_list_params';
export type { ProviderListResponse, ProviderSummary } from './generated/provider_list_response';
export type { ProviderModelDisplayKey } from './generated/provider_model_display_key';
export type { ProviderModelDisplayResolution } from './generated/provider_model_display_resolution';
export type { RemoteGatewayValidation } from './generated/remote_gateway_validation';
export type { RemoteGatewayValidationRequest } from './generated/remote_gateway_validation_request';
export type { SelectableSkillCapability } from './generated/selectable_skill_capability';
export type { SetGatewayWorkspaceRegistryPlan } from './generated/set_gateway_workspace_registry_plan';
export type { SelectableMcpCapability } from './generated/selectable_mcp_capability';
export type { ClientThreadTreeLevel } from './generated/thread_tree_level';
export type { ThreadTreeLevelRequest } from './generated/thread_tree_level_request';
export type {
    ClientThreadTreeQueryData,
    ClientThreadTreeSnapshot,
    Thread,
    ThreadAgentsDocSummary,
    ThreadFolder,
    ThreadPlacement,
} from './generated/thread_tree_query_data';
export type { ThreadTreeRefreshRequest } from './generated/thread_tree_refresh_request';
export type { ThreadAgentsDocArchiveParams } from './generated/thread_agents_doc_archive_params';
export type { ThreadAgentsDocArchiveResponse } from './generated/thread_agents_doc_archive_response';
export type { ThreadAgentsDocGetParams } from './generated/thread_agents_doc_get_params';
export type { ThreadAgentsDocGetResponse } from './generated/thread_agents_doc_get_response';
export type { ThreadAgentsDocPayload } from './generated/thread_agents_doc_payload';
export type { ThreadAgentsDocResolvedPayload } from './generated/thread_agents_doc_resolved_payload';
export type { ThreadAgentsDocSaveParams } from './generated/thread_agents_doc_save_params';
export type { ThreadAgentsDocSaveReason } from './generated/thread_agents_doc_save_reason';
export type { ThreadAgentsDocSaveResponse } from './generated/thread_agents_doc_save_response';
export type { ThreadAgentsDocStatus } from './generated/thread_agents_doc_status';
export type { UpdateRemoteGatewayRegistryPlan } from './generated/update_remote_gateway_registry_plan';
export type { WorkspaceBootstrapRequest } from './generated/workspace_bootstrap_request';
export type { WorkspaceCreateRequest } from './generated/workspace_create_request';
export type { WorkspaceCreateResult } from './generated/workspace_create_result';
export type { WorkspaceRenameRequest } from './generated/workspace_rename_request';
export type { WorkspaceRenameResult } from './generated/workspace_rename_result';
export type {
    Workspace,
    WorkspaceBootstrapSuccessReduction,
    WorkspaceSelectionReduction,
} from './generated/workspace_bootstrap_success_reduction';
export type { WorkspaceSwitchRequest } from './generated/workspace_switch_request';
export type { WorkspaceSwitchResult } from './generated/workspace_switch_result';

export type PioneerClientConfig = {
    appDataDir?: string | null;
    locale?: string | null;
    platform?: string | null;
};

export type PioneerClientInitializeResult = {
    initialized: boolean;
};

export const pioneerClient = {
    version(): string {
        return parsePioneerClientResponse<string>(getPioneerClientNitro().versionJson());
    },

    initialize(config: PioneerClientConfig = {}): PioneerClientInitializeResult {
        return parsePioneerClientResponse<PioneerClientInitializeResult>(
            getPioneerClientNitro().initializeJson(
                JSON.stringify({
                    app_data_dir: config.appDataDir ?? null,
                    locale: config.locale ?? null,
                    platform: config.platform ?? Platform.OS,
                }),
            ),
        );
    },

    diagnosticsDrain(): ClientDiagnosticEvent[] {
        return parsePioneerClientResponse<ClientDiagnosticEvent[]>(
            getPioneerClientNitro().diagnosticsDrainJson(),
        );
    },

    async gatewayValidateRemote(
        input: RemoteGatewayValidationRequest,
    ): Promise<RemoteGatewayValidation> {
        return parsePioneerClientResponse<RemoteGatewayValidation>(
            await getPioneerClientNitro().gatewayValidateRemoteJson(JSON.stringify(input)),
        );
    },

    async gatewayPlanAddRemote(input: PlanAddRemoteGatewayRequest): Promise<AddRemoteGatewayPlan> {
        return parsePioneerClientResponse<AddRemoteGatewayPlan>(
            await getPioneerClientNitro().gatewayPlanAddRemoteJson(JSON.stringify(input)),
        );
    },

    async gatewayPlanAddAndActivateRemoteRegistry(
        input: PlanAddRemoteGatewayRequest,
    ): Promise<AddAndActivateRemoteGatewayRegistryPlan> {
        return parsePioneerClientResponse<AddAndActivateRemoteGatewayRegistryPlan>(
            await getPioneerClientNitro().gatewayPlanAddAndActivateRemoteRegistryJson(
                JSON.stringify(input),
            ),
        );
    },

    async gatewayPlanActivateRegistry(
        input: PlanActivateGatewayRequest,
    ): Promise<ActivateGatewayRegistryPlan> {
        return parsePioneerClientResponse<ActivateGatewayRegistryPlan>(
            await getPioneerClientNitro().gatewayPlanActivateRegistryJson(JSON.stringify(input)),
        );
    },

    async gatewayPlanUpdateRemoteRegistry(
        input: PlanUpdateRemoteGatewayRequest,
    ): Promise<UpdateRemoteGatewayRegistryPlan> {
        return parsePioneerClientResponse<UpdateRemoteGatewayRegistryPlan>(
            await getPioneerClientNitro().gatewayPlanUpdateRemoteRegistryJson(
                JSON.stringify(input),
            ),
        );
    },

    async gatewayPlanDeleteRemoteRegistry(
        input: PlanDeleteRemoteGatewayRequest,
    ): Promise<DeleteRemoteGatewayRegistryPlan> {
        return parsePioneerClientResponse<DeleteRemoteGatewayRegistryPlan>(
            await getPioneerClientNitro().gatewayPlanDeleteRemoteRegistryJson(
                JSON.stringify(input),
            ),
        );
    },

    async gatewayPlanSetWorkspaceRegistry(
        input: PlanSetGatewayWorkspaceRequest,
    ): Promise<SetGatewayWorkspaceRegistryPlan> {
        return parsePioneerClientResponse<SetGatewayWorkspaceRegistryPlan>(
            await getPioneerClientNitro().gatewayPlanSetWorkspaceRegistryJson(
                JSON.stringify(input),
            ),
        );
    },

    async gatewayConnect(input: ClientGatewayConnectRequest): Promise<ClientGatewayConnectResult> {
        return parsePioneerClientResponse<ClientGatewayConnectResult>(
            await getPioneerClientNitro().gatewayConnectJson(JSON.stringify(input)),
        );
    },

    async gatewayNextEvents(): Promise<ClientEvent[]> {
        return parsePioneerClientResponse<ClientEvent[]>(
            await getPioneerClientNitro().gatewayNextEventsJson(),
        );
    },

    async gatewayDisconnect(): Promise<boolean> {
        const result = parsePioneerClientResponse<{ disconnected: boolean }>(
            await getPioneerClientNitro().gatewayDisconnectJson(),
        );

        return result.disconnected;
    },

    async workspaceBootstrap(
        input: WorkspaceBootstrapRequest,
    ): Promise<WorkspaceBootstrapSuccessReduction> {
        return parsePioneerClientResponse<WorkspaceBootstrapSuccessReduction>(
            await getPioneerClientNitro().workspaceBootstrapJson(JSON.stringify(input)),
        );
    },

    async workspaceSwitch(input: WorkspaceSwitchRequest): Promise<WorkspaceSwitchResult> {
        return parsePioneerClientResponse<WorkspaceSwitchResult>(
            await getPioneerClientNitro().workspaceSwitchJson(JSON.stringify(input)),
        );
    },

    async workspaceCreate(input: WorkspaceCreateRequest): Promise<WorkspaceCreateResult> {
        return parsePioneerClientResponse<WorkspaceCreateResult>(
            await getPioneerClientNitro().workspaceCreateJson(JSON.stringify(input)),
        );
    },

    async workspaceRename(input: WorkspaceRenameRequest): Promise<WorkspaceRenameResult> {
        return parsePioneerClientResponse<WorkspaceRenameResult>(
            await getPioneerClientNitro().workspaceRenameJson(JSON.stringify(input)),
        );
    },

    async providerList(input: ProviderListParams): Promise<ProviderListResponse> {
        return parsePioneerClientResponse<ProviderListResponse>(
            await getPioneerClientNitro().providerListJson(JSON.stringify(input)),
        );
    },

    async cliRuntimeList(input: CLIRuntimeListParams): Promise<CLIRuntimeListResponse> {
        return parsePioneerClientResponse<CLIRuntimeListResponse>(
            await getPioneerClientNitro().cliRuntimeListJson(JSON.stringify(input)),
        );
    },

    async cliRuntimeListModels(
        input: CLIRuntimeListModelsParams,
    ): Promise<CLIRuntimeListModelsResponse> {
        return parsePioneerClientResponse<CLIRuntimeListModelsResponse>(
            await getPioneerClientNitro().cliRuntimeListModelsJson(JSON.stringify(input)),
        );
    },

    async cliRuntimeThreadBindingGet(
        input: CLIRuntimeThreadBindingGetParams,
    ): Promise<CLIRuntimeThreadBindingGetResponse> {
        return parsePioneerClientResponse<CLIRuntimeThreadBindingGetResponse>(
            await getPioneerClientNitro().cliRuntimeThreadBindingGetJson(JSON.stringify(input)),
        );
    },

    async cliRuntimeThreadCompact(
        input: CLIRuntimeThreadCompactParams,
    ): Promise<CLIRuntimeThreadCompactResponse> {
        return parsePioneerClientResponse<CLIRuntimeThreadCompactResponse>(
            await getPioneerClientNitro().cliRuntimeThreadCompactJson(JSON.stringify(input)),
        );
    },

    async cliRuntimeTurnSteer(
        input: CLIRuntimeTurnSteerParams,
    ): Promise<CLIRuntimeTurnSteerResponse> {
        return parsePioneerClientResponse<CLIRuntimeTurnSteerResponse>(
            await getPioneerClientNitro().cliRuntimeTurnSteerJson(JSON.stringify(input)),
        );
    },

    async cliRuntimeReviewStart(
        input: CLIRuntimeReviewStartParams,
    ): Promise<CLIRuntimeReviewStartResponse> {
        return parsePioneerClientResponse<CLIRuntimeReviewStartResponse>(
            await getPioneerClientNitro().cliRuntimeReviewStartJson(JSON.stringify(input)),
        );
    },

    async cliRuntimeRequestRespond(
        input: CLIRuntimeRequestRespondParams,
    ): Promise<CLIRuntimeRequestRespondResponse> {
        return parsePioneerClientResponse<CLIRuntimeRequestRespondResponse>(
            await getPioneerClientNitro().cliRuntimeRequestRespondJson(JSON.stringify(input)),
        );
    },

    async providerListModels(input: ProviderListModelsParams): Promise<ProviderListModelsResponse> {
        return parsePioneerClientResponse<ProviderListModelsResponse>(
            await getPioneerClientNitro().providerListModelsJson(JSON.stringify(input)),
        );
    },

    async providerModelDisplay(
        input: ProviderModelDisplayKey,
    ): Promise<ProviderModelDisplayResolution> {
        return parsePioneerClientResponse<ProviderModelDisplayResolution>(
            await getPioneerClientNitro().providerModelDisplayJson(JSON.stringify(input)),
        );
    },

    composerAttachmentFromPath(input: ClientComposerAttachmentFromPathRequest): ComposerAttachment {
        return parsePioneerClientResponse<ComposerAttachment>(
            getPioneerClientNitro().composerAttachmentFromPathJson(JSON.stringify(input)),
        );
    },

    composerAttachmentsUpdate(input: ClientComposerAttachmentsUpdateRequest): ComposerAttachment[] {
        return parsePioneerClientResponse<ComposerAttachment[]>(
            getPioneerClientNitro().composerAttachmentsUpdateJson(JSON.stringify(input)),
        );
    },

    async composerSkillPickerRows(
        input: ClientComposerSkillPickerRowsRequest,
    ): Promise<SelectableSkillCapability[]> {
        return parsePioneerClientResponse<SelectableSkillCapability[]>(
            await getPioneerClientNitro().composerSkillPickerRowsJson(JSON.stringify(input)),
        );
    },

    async composerMcpPickerRows(
        input: ClientComposerMcpPickerRowsRequest,
    ): Promise<ClientComposerMcpPickerRowsResult> {
        return parsePioneerClientResponse<ClientComposerMcpPickerRowsResult>(
            await getPioneerClientNitro().composerMcpPickerRowsJson(JSON.stringify(input)),
        );
    },

    composerCapabilitiesUpdate(
        input: ClientComposerCapabilitiesUpdateRequest,
    ): ComposerCapability[] {
        return parsePioneerClientResponse<ComposerCapability[]>(
            getPioneerClientNitro().composerCapabilitiesUpdateJson(JSON.stringify(input)),
        );
    },

    composerSkillCapabilityFromRow(
        input: ClientComposerSkillCapabilityFromRowRequest,
    ): ComposerCapability {
        return parsePioneerClientResponse<ComposerCapability>(
            getPioneerClientNitro().composerSkillCapabilityFromRowJson(JSON.stringify(input)),
        );
    },

    composerMcpCapabilityFromRow(
        input: ClientComposerMcpCapabilityFromRowRequest,
    ): ComposerCapability {
        return parsePioneerClientResponse<ComposerCapability>(
            getPioneerClientNitro().composerMcpCapabilityFromRowJson(JSON.stringify(input)),
        );
    },

    composerSkillToggle(input: ClientComposerSkillToggleRequest): ClientComposerSkillToggleResult {
        return parsePioneerClientResponse<ClientComposerSkillToggleResult>(
            getPioneerClientNitro().composerSkillToggleJson(JSON.stringify(input)),
        );
    },

    composerMcpToggle(input: ClientComposerMcpToggleRequest): ClientComposerMcpToggleResult {
        return parsePioneerClientResponse<ClientComposerMcpToggleResult>(
            getPioneerClientNitro().composerMcpToggleJson(JSON.stringify(input)),
        );
    },

    composerFilterSkillRows(
        input: ClientComposerFilterSkillRowsRequest,
    ): SelectableSkillCapability[] {
        return parsePioneerClientResponse<SelectableSkillCapability[]>(
            getPioneerClientNitro().composerFilterSkillRowsJson(JSON.stringify(input)),
        );
    },

    composerFilterMcpRows(
        input: ClientComposerFilterMcpRowsRequest,
    ): ClientComposerFilterMcpRowsResult {
        return parsePioneerClientResponse<ClientComposerFilterMcpRowsResult>(
            getPioneerClientNitro().composerFilterMcpRowsJson(JSON.stringify(input)),
        );
    },

    async threadTreeRefresh(input: ThreadTreeRefreshRequest): Promise<ClientThreadTreeQueryData> {
        return parsePioneerClientResponse<ClientThreadTreeQueryData>(
            await getPioneerClientNitro().threadTreeRefreshJson(JSON.stringify(input)),
        );
    },

    threadTreeLevel(input: ThreadTreeLevelRequest): ClientThreadTreeLevel {
        return parsePioneerClientResponse<ClientThreadTreeLevel>(
            getPioneerClientNitro().threadTreeLevelJson(JSON.stringify(input)),
        );
    },

    async agentsDocGet(input: ThreadAgentsDocGetParams): Promise<ThreadAgentsDocGetResponse> {
        return parsePioneerClientResponse<ThreadAgentsDocGetResponse>(
            await getPioneerClientNitro().agentsDocGetJson(JSON.stringify(input)),
        );
    },

    async agentsDocSave(input: ThreadAgentsDocSaveParams): Promise<ThreadAgentsDocSaveResponse> {
        return parsePioneerClientResponse<ThreadAgentsDocSaveResponse>(
            await getPioneerClientNitro().agentsDocSaveJson(JSON.stringify(input)),
        );
    },

    async agentsDocArchive(
        input: ThreadAgentsDocArchiveParams,
    ): Promise<ThreadAgentsDocArchiveResponse> {
        return parsePioneerClientResponse<ThreadAgentsDocArchiveResponse>(
            await getPioneerClientNitro().agentsDocArchiveJson(JSON.stringify(input)),
        );
    },

    async activeThreadOpen(
        input: ClientActiveThreadOpenRequest,
    ): Promise<ClientActiveThreadSnapshot> {
        return parsePioneerClientResponse<ClientActiveThreadSnapshot>(
            await getPioneerClientNitro().activeThreadOpenJson(JSON.stringify(input)),
        );
    },

    activeThreadSnapshot(input: ClientActiveThreadSnapshotRequest): ClientActiveThreadSnapshot {
        return parsePioneerClientResponse<ClientActiveThreadSnapshot>(
            getPioneerClientNitro().activeThreadSnapshotJson(JSON.stringify(input)),
        );
    },

    async activeThreadApplyEvent(
        input: ClientActiveThreadEventRequest,
    ): Promise<ClientActiveThreadSnapshot> {
        return parsePioneerClientResponse<ClientActiveThreadSnapshot>(
            await getPioneerClientNitro().activeThreadApplyEventJson(JSON.stringify(input)),
        );
    },

    async activeThreadSendText(
        input: ClientActiveThreadSendTextRequest,
    ): Promise<ClientActiveThreadSendTextResult> {
        return parsePioneerClientResponse<ClientActiveThreadSendTextResult>(
            await getPioneerClientNitro().activeThreadSendTextJson(JSON.stringify(input)),
        );
    },

    async activeThreadCancelTurn(
        input: ClientActiveThreadCancelTurnRequest,
    ): Promise<ClientActiveThreadCancelTurnResult> {
        return parsePioneerClientResponse<ClientActiveThreadCancelTurnResult>(
            await getPioneerClientNitro().activeThreadCancelTurnJson(JSON.stringify(input)),
        );
    },

    async activeThreadClear(): Promise<ClientActiveThreadClearResult> {
        return parsePioneerClientResponse<ClientActiveThreadClearResult>(
            await getPioneerClientNitro().activeThreadClearJson(),
        );
    },
};
