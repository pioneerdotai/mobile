import {
    configureTurnStartupRecorder,
    type TurnStartupReport,
} from '@/services/telemetry/turn-startup';
import type { AdministrationActivationRequest } from './generated/administration_activation_request';
import type {
    ComposerOperationIdentity,
    ComposerOperationPlan,
} from './generated/composer_publication';
import type { ComposerVoiceStartRequest } from './generated/composer_voice_start_request';
import type { ComposerVoiceFinalizeRequest } from './generated/composer_voice_finalize_request';
import type { ComposerVoiceCancelRequest } from './generated/composer_voice_cancel_request';

import type { ClientTransportReserveRequestDto } from './generated/client_transport_reserve_request_dto';
import type { ClientTransportLeaseRequestDto } from './generated/client_transport_lease_request_dto';

import type { ClientGatewaySessionValidationRequest } from './generated/client_gateway_session_validation_request';
import type { ClientGatewaySessionValidationResult } from './generated/client_gateway_session_validation_result';
import type { ClientProcessChangeBatchDto } from './generated/client_process_change_batch_dto';
import { Platform } from 'react-native';

import { getPioneerClientNitro } from '@pioneer/client-nitro';

import type { AuthMeResponse } from './generated/auth_me_response';

import type { AuthSessionListItem } from './generated/auth_session_list_response';

import type { ClientArtifactDownloadRequest } from './generated/client_artifact_download_request';
import type { ClientArtifactDownloadResult } from './generated/client_artifact_download_result';
import type { ClientArtifactPresentationPolicyRequest } from './generated/client_artifact_presentation_policy_request';
import type { ClientArtifactTargetRequest } from './generated/client_artifact_target_request';
import type { ClientArtifactViewOpenResult } from './generated/client_artifact_view_open_result';
import type { ClientThreadFileViewOpenRequest } from './generated/client_thread_file_view_open_request';
import type { ClientThreadFileViewOpenResult } from './generated/client_thread_file_view_open_result';
import type { ArtifactPresentationPolicy } from './generated/artifact_presentation_policy';
import type { ClientActiveThreadClearResult } from './generated/client_active_thread_clear_result';
import type { ClientActiveThreadOpenByIdRequest } from './generated/client_active_thread_open_by_id_request';
import type { ClientActiveThreadOpenRequest } from './generated/client_active_thread_open_request';
import type { ClientActiveThreadSendTextRequest } from './generated/client_active_thread_send_text_request';

import type { ClientActiveThreadSendTextResult } from './generated/client_active_thread_send_text_result';

import type { ClientComposerAttachmentFromPathRequest } from './generated/client_composer_attachment_from_path_request';
import type { ClientComposerCapabilityMenuVisibilityRequest } from './generated/client_composer_capability_menu_visibility_request';
import type { ClientComposerCapabilityTargetRequest } from './generated/client_composer_capability_target_request';
import type { ClientComposerFilterMcpRowsRequest } from './generated/client_composer_filter_mcp_rows_request';
import type { ClientComposerFilterMcpRowsResult } from './generated/client_composer_filter_mcp_rows_result';
import type { ClientPendingRequestPresentationRequest } from './generated/client_pending_request_presentation_request';
import type { ClientPendingRequestPresentationResult } from './generated/client_pending_request_presentation_result';
import type { ClientPrepareVoiceComposerSnapshotRequest } from './generated/client_prepare_voice_composer_snapshot_request';
import type { ClientComposerSkillChipsRequest } from './generated/client_composer_skill_chips_request';
import type { ClientComposerSkillPackPickerRequest } from './generated/client_composer_skill_pack_picker_request';
import type { ClientComposerSkillRowsForTargetRequest } from './generated/client_composer_skill_rows_for_target_request';
import type { ClientComposerSubmissionPlanRequest } from './generated/client_composer_submission_plan_request';
import type { ClientDiagnosticEvent } from './generated/client_diagnostic_event';
import type { ClientChangeBatchDto } from './generated/client_change_batch_dto';
import type { ClientChangeBatchRequestDto } from './generated/client_change_batch_request_dto';
import type { ClientEffectCancellationDto } from './generated/client_effect_cancellation_dto';
import type { ClientEffectCompletionDto } from './generated/client_effect_completion_dto';
import type { ClientIntentDispatchDto } from './generated/client_intent_dispatch_dto';
import type { ClientScopedSnapshotDto } from './generated/client_scoped_snapshot_dto';
import type { ClientScopedSnapshotRequestDto } from './generated/client_scoped_snapshot_request_dto';
import type { ClientSequenceGapResnapshotDto } from './generated/client_sequence_gap_resnapshot_dto';
import type { ClientTransitionDto } from './generated/client_transition_dto';
import type { ClientDeviceActivationParseRequest } from './generated/client_device_activation_parse_request';
import type { ClientDeviceActivationParseResult } from './generated/client_device_activation_parse_result';
import type { ClientDeviceActivationPresentationRequest } from './generated/client_device_activation_presentation_request';
import type { ClientDeviceActivationPresentationResult } from './generated/client_device_activation_presentation_result';
import type { ClientInvitationPresentationRequest } from './generated/client_invitation_presentation_request';
import type { ClientInvitationPresentationResult } from './generated/client_invitation_presentation_result';
import type { ClientEnsureWorkspaceDraftRequest } from './generated/client_ensure_workspace_draft_request';

import type { ComposerAttachment } from './generated/composer_attachment';

import type { ComposerCapabilityMenuVisibility } from './generated/composer_capability_menu_visibility';
import type { ComposerCapabilityTarget } from './generated/composer_capability_target';
import type { ComposerSkillChip } from './generated/composer_skill_chip';
import type { ComposerSkillPickerProjection } from './generated/composer_skill_picker_projection';

import type { ComposerSubmissionPlan } from './generated/composer_submission_plan';

import type { LoadGatewayRegistryRequest } from './generated/load_gateway_registry_request';
import type { LoadGatewayRegistryResult } from './generated/load_gateway_registry_result';

import type { InvitationCreateParams } from './generated/invitation_create_params';
import type { InvitationCreateResponse } from './generated/invitation_create_response';

import type { ClientMemberAvatarCacheRequest } from './generated/client_member_avatar_cache_request';
import type { ClientMemberAvatarCacheResult } from './generated/client_member_avatar_cache_result';
import type { ClientAgentAvatarCacheRequest } from './generated/client_agent_avatar_cache_request';
import type { ClientAgentAvatarCacheResult } from './generated/client_agent_avatar_cache_result';
import type { ClientMemberPresentationRequest } from './generated/client_member_presentation_request';
import type { ClientCurrentPrincipalPresentationRequest } from './generated/client_current_principal_presentation_request';
import type { CurrentPrincipalPresentation } from './generated/current_principal_presentation';
import type { MemberDeviceCreateParams } from './generated/member_device_create_params';
import type { MemberDeviceCreateResponse } from './generated/member_device_create_response';

import type { MemberListRow } from './generated/member_list_row';

import type { PreparedVoiceComposerSnapshot } from './generated/prepared_voice_composer_snapshot';

import type { SelectableSkillCapability } from './generated/selectable_skill_capability';

import type { ThreadTreeLevel as ClientThreadTreeLevel } from './generated/thread_tree_level';
import type { ClientThreadCreateVisibilityRequest } from './generated/client_thread_create_visibility_request';
import type { SessionListRowPresentation } from './generated/session_list_row_presentation';
import type { ThreadCreateVisibilityPlan } from './generated/thread_create_visibility_plan';
import type { PrincipalPresentationCapabilities } from './generated/principal_presentation_capabilities';
import type { AuthorizationCapabilitiesParams } from './generated/authorization_capabilities_params';
import type { AuthorizationCapabilitySnapshot } from './generated/authorization_capability_snapshot';

import type { ThreadTreeLevelRequest } from './generated/thread_tree_level_request';

import type { ThreadTreeRefreshRequest } from './generated/thread_tree_refresh_request';

import type { VoiceAudioFormat } from './generated/voice_audio_format';
import type { VoiceSessionCancelResponse } from './generated/voice_session_cancel_response';
import type { VoiceSessionFinalizeResponse } from './generated/voice_session_finalize_response';
import type { VoiceSessionStartResponse } from './generated/voice_session_start_response';

import type { WorkspaceBootstrapRequest } from './generated/workspace_bootstrap_request';
import type { WorkspaceBootstrapSuccessReduction } from './generated/workspace_bootstrap_success_reduction';
import type { WorkspaceCreateRequest } from './generated/workspace_create_request';
import type { WorkspaceCreateResult } from './generated/workspace_create_result';
import type { WorkspaceRenameRequest } from './generated/workspace_rename_request';
import type { WorkspaceRenameResult } from './generated/workspace_rename_result';
import type { WorkspaceSwitchRequest } from './generated/workspace_switch_request';
import type { WorkspaceSwitchResult } from './generated/workspace_switch_result';

import { parsePioneerClientResponse } from './response';

export type { GatewaySessionConnectionResult } from './generated/gateway_session_connection_result';
export type { ActivateGatewayRegistryPlan } from './generated/activate_gateway_registry_plan';
export type { AuthLogoutResponse } from './generated/auth_logout_response';
export type { AuthMeResponse } from './generated/auth_me_response';
export type { AuthProfileUpdateParams } from './generated/auth_profile_update_params';
export type { AuthProfileUpdateResponse } from './generated/auth_profile_update_response';
export type { AuthDeviceCreateResponse } from './generated/auth_device_create_response';
export type { AuthRefreshGrant } from './generated/auth_refresh_grant';
export type { AuthSessionGrant } from './generated/auth_session_grant';
export type {
    AuthSessionListItem,
    AuthSessionListResponse,
} from './generated/auth_session_list_response';
export type { AuthSessionRevokeParams } from './generated/auth_session_revoke_params';
export type { AuthSessionRevokeResponse } from './generated/auth_session_revoke_response';
export type { ClientArtifactDownloadRequest } from './generated/client_artifact_download_request';
export type { ClientArtifactDownloadResult } from './generated/client_artifact_download_result';
export type { ClientArtifactPresentationPolicyRequest } from './generated/client_artifact_presentation_policy_request';
export type { ArtifactPresentationPolicy } from './generated/artifact_presentation_policy';
export type { ClientArtifactTargetRequest } from './generated/client_artifact_target_request';
export type { ClientArtifactViewOpenResult } from './generated/client_artifact_view_open_result';
export type { ClientThreadFileViewOpenRequest } from './generated/client_thread_file_view_open_request';
export type { ClientThreadFileViewOpenResult } from './generated/client_thread_file_view_open_result';
export type { ClientActiveThreadClearResult } from './generated/client_active_thread_clear_result';
export type { ClientActiveThreadOpenByIdRequest } from './generated/client_active_thread_open_by_id_request';
export type { ClientActiveThreadOpenRequest } from './generated/client_active_thread_open_request';
export type { ClientActiveThreadSendTextRequest } from './generated/client_active_thread_send_text_request';
export type { ThreadMode } from './generated/client_intent';
export type { ClientActiveThreadSendTextResult } from './generated/client_active_thread_send_text_result';
export type { ClientActiveThreadSnapshot } from './generated/client_active_thread_snapshot';
export type { ClientComposerAttachmentFromPathRequest } from './generated/client_composer_attachment_from_path_request';
export type { ClientComposerCapabilityMenuVisibilityRequest } from './generated/client_composer_capability_menu_visibility_request';
export type { ClientComposerCapabilityTargetRequest } from './generated/client_composer_capability_target_request';
export type { ClientComposerFilterMcpRowsRequest } from './generated/client_composer_filter_mcp_rows_request';
export type { ClientComposerFilterMcpRowsResult } from './generated/client_composer_filter_mcp_rows_result';
export type { ClientPendingRequestPresentationRequest } from './generated/client_pending_request_presentation_request';
export type { ClientPendingRequestPresentationResult } from './generated/client_pending_request_presentation_result';
export type { ClientPrepareVoiceComposerSnapshotRequest } from './generated/client_prepare_voice_composer_snapshot_request';
export type { ClientComposerSkillChipsRequest } from './generated/client_composer_skill_chips_request';
export type { ClientComposerSkillPackPickerRequest } from './generated/client_composer_skill_pack_picker_request';
export type { ClientComposerSkillRowsForTargetRequest } from './generated/client_composer_skill_rows_for_target_request';
export type { ClientComposerSubmissionPlanRequest } from './generated/client_composer_submission_plan_request';
export type { ClientDiagnosticEvent } from './generated/client_diagnostic_event';
export type { ClientEnsureWorkspaceDraftRequest } from './generated/client_ensure_workspace_draft_request';
export type { ExecutionDraftReconciliation } from './generated/execution_draft_reconciliation';
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
export type { CLIRuntimeRefreshParams } from './generated/cli_runtime_refresh_params';
export type { CLIRuntimeRefreshResponse } from './generated/cli_runtime_refresh_response';
export type { CLIRuntimePendingRequest } from './generated/cli_runtime_pending_request';
export type { CLIRuntimeRequestResolution } from './generated/cli_runtime_request_resolution';
export type { CLIRuntimeRequestRespondParams } from './generated/cli_runtime_request_respond_params';
export type { CLIRuntimeRequestRespondResponse } from './generated/cli_runtime_request_respond_response';
export type { CLIRuntimeReviewStartParams } from './generated/cli_runtime_review_start_params';
export type { CLIRuntimeReviewStartResponse } from './generated/cli_runtime_review_start_response';
export type { CLIRuntimeThreadBinding } from './generated/cli_runtime_thread_binding';
export type { CLIRuntimeThreadCompactParams } from './generated/cli_runtime_thread_compact_params';
export type { CLIRuntimeThreadCompactResponse } from './generated/cli_runtime_thread_compact_response';
export type { CLIRuntimeTurnSteerParams } from './generated/cli_runtime_turn_steer_params';
export type { CLIRuntimeTurnSteerResponse } from './generated/cli_runtime_turn_steer_response';
export type { ComposerAttachment } from './generated/composer_attachment';
export type { ComposerAttachmentKind } from './generated/composer_attachment_kind';
export type { ComposerAttachmentUploadState } from './generated/composer_attachment_upload_state';
export type { ComposerCapability } from './generated/composer_capability';
export type { ComposerCapabilityKind } from './generated/composer_capability_kind';
export type { ComposerCapabilityMenuVisibility } from './generated/composer_capability_menu_visibility';
export type { ComposerCapabilityTarget } from './generated/composer_capability_target';
export type { ComposerDomainAction } from './generated/composer_domain_action';
export type { ComposerDomainState } from './generated/composer_domain_state';
export type { ComposerReplyTarget } from './generated/composer_reply_target';
export type { ComposerMentionCandidate } from './generated/composer_mention_candidate';
export type { ComposerMentionSelection } from './generated/composer_mention_selection';
export type { ComposerDomainDraft } from './generated/composer_domain_draft';
export type { ComposerDraftLifecycleAction } from './generated/composer_draft_lifecycle_action';
export type { ComposerDraftLifecycleState } from './generated/composer_draft_lifecycle_state';
export type { ComposerSkillChip } from './generated/composer_skill_chip';
export type { ComposerSkillChipKind } from './generated/composer_skill_chip_kind';
export type { ComposerSkillPickerProjection } from './generated/composer_skill_picker_projection';
export type { ComposerSkillSelection } from './generated/composer_skill_selection';
export type { ComposerSkillSelectionReduction } from './generated/composer_skill_selection_reduction';
export type { ComposerSubmissionPlan } from './generated/composer_submission_plan';
export type {
    ComposerPermissionModeOption,
    TurnPermissionMode,
} from './generated/composer_permission_mode_option';
export type { DeleteRemoteGatewayRegistryPlan } from './generated/delete_remote_gateway_registry_plan';
export type { LoadGatewayRegistryRequest } from './generated/load_gateway_registry_request';
export type { LoadGatewayRegistryResult } from './generated/load_gateway_registry_result';
export type { GatewayConnectionState } from './generated/gateway_connection_state';
export type { GatewayEndpoint } from './generated/gateway_endpoint';
export type { GatewayEndpointKind } from './generated/gateway_endpoint_kind';
export type { GatewayRegistry } from './generated/gateway_registry';
export type { GatewaySettingsGetResponse } from './generated/gateway_settings_get_response';
export type { GatewaySettingsUpdateResponse } from './generated/gateway_settings_update_response';
export type { ProviderListModelsParams } from './generated/provider_list_models_params';
export type {
    ProviderListModelsResponse,
    ProviderModelInfo,
} from './generated/provider_list_models_response';
export type { ProviderListParams } from './generated/provider_list_params';
export type { ProviderListResponse, ProviderSummary } from './generated/provider_list_response';
export type { PendingRequest } from './generated/pending_request';
export type { PendingRequestActionKind } from './generated/pending_request_action_kind';
export type { PendingRequestAvailableAction } from './generated/pending_request_available_action';
export type { PendingRequestDetailRow } from './generated/pending_request_detail_row';
export type { PendingRequestDetailStyle } from './generated/pending_request_detail_style';
export type { PendingRequestKind } from './generated/pending_request_kind';
export type { PendingRequestOrigin } from './generated/pending_request_origin';
export type { PendingRequestPayload } from './generated/pending_request_payload';
export type { PendingRequestPresentation } from './generated/pending_request_presentation';
export type { PendingRequestResolution } from './generated/pending_request_resolution';
export type { PendingRequestUserInputOption } from './generated/pending_request_user_input_option';
export type { PendingRequestUserInputQuestion } from './generated/pending_request_user_input_question';
export type { PreparedVoiceComposerSnapshot } from './generated/prepared_voice_composer_snapshot';
export type { ProviderModelDisplayKey } from './generated/provider_model_display_key';
export type { ProviderModelDisplayResolution } from './generated/provider_model_display_resolution';
export type { ReasoningEffortRow } from './generated/reasoning_effort_row';
export type { ReasoningEffortRowsRequest } from './generated/reasoning_effort_rows_request';
export type { ReasoningEffortRowsResponse } from './generated/reasoning_effort_rows_response';
export type { RemoteGatewayValidation } from './generated/remote_gateway_validation';
export type { SelectableSkillCapability } from './generated/selectable_skill_capability';
export type { SelectablePackedSkillCapability } from './generated/selectable_packed_skill_capability';
export type { SelectableSkillPackCapability } from './generated/selectable_skill_pack_capability';
export type { SetGatewayWorkspaceRegistryPlan } from './generated/set_gateway_workspace_registry_plan';
export type { SessionTerminalReason } from './generated/session_terminal_reason';
export type { ClientDeviceActivationParseRequest } from './generated/client_device_activation_parse_request';
export type { ClientDeviceActivationParseResult } from './generated/client_device_activation_parse_result';
export type { ClientDeviceActivationPresentationRequest } from './generated/client_device_activation_presentation_request';
export type { ClientDeviceActivationPresentationResult } from './generated/client_device_activation_presentation_result';
export type { ClientInvitationPresentationRequest } from './generated/client_invitation_presentation_request';
export type { ClientInvitationPresentationResult } from './generated/client_invitation_presentation_result';
export type { InvitationCreateParams } from './generated/invitation_create_params';
export type { InvitationCreateResponse } from './generated/invitation_create_response';
export type { InvitationAcceptParams } from './generated/invitation_accept_params';
export type { InvitationListParams } from './generated/invitation_list_params';
export type { InvitationListResponse } from './generated/invitation_list_response';
export type { InvitationPreviewResponse } from './generated/invitation_preview_response';
export type { InvitationRevokeParams } from './generated/invitation_revoke_params';
export type { InvitationRevokeResponse } from './generated/invitation_revoke_response';
export type { ClientMemberAvatarCacheRequest } from './generated/client_member_avatar_cache_request';
export type { ClientMemberAvatarCacheResult } from './generated/client_member_avatar_cache_result';
export type { ClientAgentAvatarCacheRequest } from './generated/client_agent_avatar_cache_request';
export type { ClientAgentAvatarCacheResult } from './generated/client_agent_avatar_cache_result';
export type { ClientMemberPresentationRequest } from './generated/client_member_presentation_request';
export type { ClientCurrentPrincipalPresentationRequest } from './generated/client_current_principal_presentation_request';
export type { CurrentPrincipalPresentation } from './generated/current_principal_presentation';
export type { MemberDeviceCreateParams } from './generated/member_device_create_params';
export type { MemberDeviceCreateResponse } from './generated/member_device_create_response';
export type { MemberListParams } from './generated/member_list_params';
export type { MemberListResponse } from './generated/member_list_response';
export type { MemberSummary } from './generated/member_summary';
export type { MemberListRow } from './generated/member_list_row';
export type { MemberMutationResponse } from './generated/member_mutation_response';
export type { MemberRemoveParams } from './generated/member_remove_params';
export type { MemberRestoreParams } from './generated/member_restore_params';
export type { MemberSuspendParams } from './generated/member_suspend_params';
export type { WorkspaceMemberAddParams } from './generated/workspace_member_add_params';
export type { WorkspaceMemberListParams } from './generated/workspace_member_list_params';
export type { WorkspaceMemberListResponse } from './generated/workspace_member_list_response';
export type { WorkspaceMemberMutationResponse } from './generated/workspace_member_mutation_response';
export type { WorkspaceMemberRemoveParams } from './generated/workspace_member_remove_params';
export type { SelectableMcpCapability } from './generated/selectable_mcp_capability';
export type { ThreadTreeLevel as ClientThreadTreeLevel } from './generated/thread_tree_level';
export type { ClientThreadCreateVisibilityRequest } from './generated/client_thread_create_visibility_request';
export type { ThreadCreateVisibilityPlan } from './generated/thread_create_visibility_plan';
export type { PrincipalPresentationCapabilities } from './generated/principal_presentation_capabilities';
export type { AuthorizationCapabilitiesParams } from './generated/authorization_capabilities_params';
export type {
    AuthorizationCapabilitySnapshot,
    AuthorizationExecutionDraftPolicyProjection,
    AuthorizationGlobalCapabilities,
    AuthorizationThreadCapabilities,
    AuthorizationWorkspaceCapabilities,
} from './generated/authorization_capability_snapshot';
export type { ThreadParticipantMutationParams } from './generated/thread_participant_mutation_params';
export type { ThreadParticipantsListParams } from './generated/thread_participants_list_params';
export type {
    ThreadParticipantSummary,
    ThreadParticipantsResponse,
} from './generated/thread_participants_response';
export type { ThreadScopePresentation } from './generated/thread_scope_presentation';
export type { ThreadUpdateParams } from './generated/thread_update_params';
export type { ThreadUpdateResponse } from './generated/thread_update_response';
export type { ThreadTreeLevelRequest } from './generated/thread_tree_level_request';
export type {
    ClientThreadTreeQueryData,
    ThreadTreeSnapshot as ClientThreadTreeSnapshot,
    Thread,
    ThreadAgentsDocSummary,
    ThreadFolder,
    ThreadPlacement,
} from './generated/thread_tree_query_data';
export type { ThreadTreeRefreshRequest } from './generated/thread_tree_refresh_request';
export type { ThreadTimelinePageParams } from './generated/thread_timeline_page_params';
export type {
    ThreadTimelinePageResponse,
    TimelineBlock,
    TimelineBlockKind,
} from './generated/thread_timeline_page_response';
export type { ThreadReadParams } from './generated/thread_read_params';
export type { ThreadReadResponse } from './generated/thread_read_response';
export type { TimelineCursor } from './generated/timeline_cursor';
export type { TimelinePageAnchor } from './generated/timeline_page_anchor';
export type { TimelinePageInfo } from './generated/timeline_page_info';
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
export type { TurnWorkBlock } from './generated/turn_work_block';
export type { TurnWorkItem } from './generated/turn_work_item';
export type { TurnWorkItemStatus } from './generated/turn_work_item_status';
export type { TurnWorkItemsGetParams } from './generated/turn_work_items_get_params';
export type { TurnWorkItemsGetResponse } from './generated/turn_work_items_get_response';
export type { UserInput } from './generated/composer_publication';
export type { TurnMessageRevisionsPageResponse } from './generated/turn_message_revisions_page_response';
export type { MessageRevisionPagePresentation } from './generated/message_revision_page_presentation';
export type { TurnWorkPageParams } from './generated/turn_work_page_params';
export type { TurnWorkPageResponse, TurnItem } from './generated/turn_work_page_response';
export type { TurnPermissionApprovalRequest } from './generated/turn_permission_approval_request';
export type { TurnPermissionApprovalResolution } from './generated/turn_permission_approval_resolution';
export type { TurnPermissionRequestOpenedNotification } from './generated/turn_permission_request_opened_notification';
export type { TurnPermissionRequestResolvedNotification } from './generated/turn_permission_request_resolved_notification';
export type { TurnPermissionRequestRespondParams } from './generated/turn_permission_request_respond_params';
export type { TurnPermissionRequestRespondResponse } from './generated/turn_permission_request_respond_response';
export type { TaskAcceptParams } from './generated/task_accept_params';
export type { TaskAcceptResponse } from './generated/task_accept_response';
export type { TaskCancelParams } from './generated/task_cancel_params';
export type { TaskCancelResponse } from './generated/task_cancel_response';
export type { TaskReviseParams } from './generated/task_revise_params';
export type { TaskReviseResponse } from './generated/task_revise_response';
export type { TaskUserNotification } from './generated/task_user_notification';
export type { TaskUserNotificationAcknowledgeParams } from './generated/task_user_notification_acknowledge_params';
export type { TaskUserNotificationAcknowledgeResponse } from './generated/task_user_notification_acknowledge_response';
export type { TaskUserNotificationListParams } from './generated/task_user_notification_list_params';
export type { TaskUserNotificationListResponse } from './generated/task_user_notification_list_response';
export type { TurnWorkPresentation } from './generated/turn_work_presentation';
export type { TurnWorkState } from './generated/turn_work_state';
export type { UpdateRemoteGatewayRegistryPlan } from './generated/update_remote_gateway_registry_plan';
export type { VoiceAudioFormat } from './generated/voice_audio_format';
export type { VoiceError } from './generated/voice_error';
export type { VoiceErrorKind } from './generated/voice_error_kind';
export type { VoiceSessionCancelParams } from './generated/voice_session_cancel_params';
export type { VoiceSessionCancelResponse } from './generated/voice_session_cancel_response';
export type { VoiceSessionFinalizeParams } from './generated/voice_session_finalize_params';
export type { VoiceSessionFinalizeResponse } from './generated/voice_session_finalize_response';
export type { VoiceFinalizeResponseReduction } from './generated/voice_finalize_response_reduction';
export type { VoiceFinalizeUiAction } from './generated/voice_finalize_ui_action';
export type { VoiceSessionOutcome } from './generated/voice_session_outcome';
export type { VoiceSessionResultNotification } from './generated/voice_session_result_notification';
export type { VoiceSessionResultReduction } from './generated/voice_session_result_reduction';
export type {
    VoiceSessionStartContext,
    VoiceSessionStartParams,
} from './generated/voice_session_start_params';
export type { VoiceSessionStartResponse } from './generated/voice_session_start_response';
export type { VoiceStatus } from './generated/voice_status';
export type { VoiceStatusParams } from './generated/voice_status_params';
export type { VoiceStatusResponse } from './generated/voice_status_response';
export type { VoiceTurnContext } from './generated/voice_turn_context';
export type { AdministrationRefetch } from './generated/administration_refetch';
export type { AdministrationAction } from './generated/administration_action';
export type { SessionListRowPresentation } from './generated/session_list_row_presentation';
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
    boundary_version: number;
};

export type MobileStartupStageTiming = {
    name: string;
    start_offset_ms: number;
    duration_ms: number;
    failed?: boolean;
    cancelled?: boolean;
};

export type MobileStartupRecordRequest = {
    enabled: boolean;
    metrics_endpoint: string;
    traces_endpoint: string;
    export_interval_ms: number;
    export_timeout_ms: number;
    deployment_environment: 'development' | 'production';
    service_version?: string;
    started_at_unix_ms: number;
    duration_ms: number;
    outcome: 'ready' | 'setup_required' | 'authentication_required' | 'degraded';
    stages: MobileStartupStageTiming[];
};

export type MobileStartupRecordResult = {
    recorded: boolean;
};

export type VoiceAudioChunkParams = {
    operation: ComposerOperationIdentity;
    session_id: string;
    sequence: number;
    audio_format: VoiceAudioFormat;
    captured_at_unix_ms?: number | null;
    duration_ms?: number | null;
};

export type VoiceAudioChunkResult = {
    sent: boolean;
};

export const pioneerClient = {
    version(): string {
        return parsePioneerClientResponse<string>(getPioneerClientNitro().versionJson());
    },

    initialize(config: PioneerClientConfig = {}): PioneerClientInitializeResult {
        const result = parsePioneerClientResponse<PioneerClientInitializeResult>(
            getPioneerClientNitro().initializeJson(
                JSON.stringify({
                    app_data_dir: config.appDataDir ?? null,
                    locale: config.locale ?? null,
                    platform: config.platform ?? Platform.OS,
                }),
            ),
        );
        if (result.boundary_version !== 2)
            throw new Error('Client native boundary version mismatch');
        return result;
    },

    clientScopeAcquire(scope: import('./generated/client_scope').ClientScope): boolean {
        return parsePioneerClientResponse<boolean>(
            getPioneerClientNitro().clientScopeAcquireJson(
                JSON.stringify({ schema_version: 1, scope }),
            ),
        );
    },
    clientScopeRelease(scope: import('./generated/client_scope').ClientScope): boolean {
        return parsePioneerClientResponse<boolean>(
            getPioneerClientNitro().clientScopeReleaseJson(
                JSON.stringify({ schema_version: 1, scope }),
            ),
        );
    },
    async clientShutdown(): Promise<void> {
        parsePioneerClientResponse<boolean>(await getPioneerClientNitro().clientShutdownJson());
    },
    clientIntentDispatch(input: ClientIntentDispatchDto): ClientTransitionDto {
        return parsePioneerClientResponse<ClientTransitionDto>(
            getPioneerClientNitro().clientIntentDispatchJson(JSON.stringify(input)),
        );
    },

    clientScopedSnapshot(input: ClientScopedSnapshotRequestDto): ClientScopedSnapshotDto | null {
        return parsePioneerClientResponse<ClientScopedSnapshotDto | null>(
            getPioneerClientNitro().clientScopedSnapshotJson(JSON.stringify(input)),
        );
    },

    clientChangeBatch(input: ClientChangeBatchRequestDto): ClientChangeBatchDto {
        return parsePioneerClientResponse<ClientChangeBatchDto>(
            getPioneerClientNitro().clientChangeBatchJson(JSON.stringify(input)),
        );
    },

    async gatewaySessionValidate(
        input: ClientGatewaySessionValidationRequest,
    ): Promise<ClientGatewaySessionValidationResult> {
        return parsePioneerClientResponse<ClientGatewaySessionValidationResult>(
            await getPioneerClientNitro().gatewaySessionValidateJson(JSON.stringify(input)),
        );
    },

    async clientWaitPublications(afterSequence: number): Promise<ClientProcessChangeBatchDto> {
        return parsePioneerClientResponse<ClientProcessChangeBatchDto>(
            await getPioneerClientNitro().clientWaitPublicationsJson(
                JSON.stringify({ schema_version: 1, after_sequence: afterSequence }),
            ),
        );
    },

    clientEffectComplete(input: ClientEffectCompletionDto): ClientTransitionDto {
        return parsePioneerClientResponse<ClientTransitionDto>(
            getPioneerClientNitro().clientEffectCompleteJson(JSON.stringify(input)),
        );
    },

    clientEffectCancel(input: ClientEffectCancellationDto): ClientTransitionDto {
        return parsePioneerClientResponse<ClientTransitionDto>(
            getPioneerClientNitro().clientEffectCancelJson(JSON.stringify(input)),
        );
    },

    clientSequenceGapResnapshot(
        input: ClientSequenceGapResnapshotDto,
    ): ClientScopedSnapshotDto | null {
        return parsePioneerClientResponse<ClientScopedSnapshotDto | null>(
            getPioneerClientNitro().clientSequenceGapResnapshotJson(JSON.stringify(input)),
        );
    },

    turnStartupObserve(input: TurnStartupReport): { recorded: boolean; turn_id?: string } {
        return parsePioneerClientResponse(
            getPioneerClientNitro().mobileStartupRecordJson(
                JSON.stringify({ kind: 'turn_startup', ...input }),
            ),
        );
    },

    mobileStartupRecord(input: MobileStartupRecordRequest): MobileStartupRecordResult {
        return parsePioneerClientResponse<MobileStartupRecordResult>(
            getPioneerClientNitro().mobileStartupRecordJson(JSON.stringify(input)),
        );
    },

    diagnosticsDrain(): ClientDiagnosticEvent[] {
        return parsePioneerClientResponse<ClientDiagnosticEvent[]>(
            getPioneerClientNitro().diagnosticsDrainJson(),
        );
    },

    gatewayLoadRegistryV3(input: LoadGatewayRegistryRequest): LoadGatewayRegistryResult {
        return parsePioneerClientResponse<LoadGatewayRegistryResult>(
            getPioneerClientNitro().gatewayLoadRegistryV3Json(JSON.stringify(input)),
        );
    },

    async gatewayDeviceActivationPresentation(
        input: ClientDeviceActivationPresentationRequest,
    ): Promise<ClientDeviceActivationPresentationResult> {
        return parsePioneerClientResponse<ClientDeviceActivationPresentationResult>(
            await getPioneerClientNitro().gatewayDeviceActivationPresentationJson(
                JSON.stringify(input),
            ),
        );
    },

    async gatewayDeviceActivationParse(
        input: ClientDeviceActivationParseRequest,
    ): Promise<ClientDeviceActivationParseResult> {
        return parsePioneerClientResponse<ClientDeviceActivationParseResult>(
            await getPioneerClientNitro().gatewayDeviceActivationParseJson(JSON.stringify(input)),
        );
    },

    async invitationPresentation(
        input: ClientInvitationPresentationRequest,
    ): Promise<ClientInvitationPresentationResult> {
        return parsePioneerClientResponse<ClientInvitationPresentationResult>(
            await getPioneerClientNitro().invitationPresentationJson(JSON.stringify(input)),
        );
    },

    async invitationCreate(
        input: InvitationCreateParams | AdministrationActivationRequest,
    ): Promise<InvitationCreateResponse> {
        return parsePioneerClientResponse<InvitationCreateResponse>(
            await getPioneerClientNitro().invitationCreateJson(JSON.stringify(input)),
        );
    },

    async memberAvatarCache(
        input: ClientMemberAvatarCacheRequest,
    ): Promise<ClientMemberAvatarCacheResult> {
        return parsePioneerClientResponse<ClientMemberAvatarCacheResult>(
            await getPioneerClientNitro().memberAvatarCacheJson(JSON.stringify(input)),
        );
    },

    async agentAvatarCache(
        input: ClientAgentAvatarCacheRequest,
    ): Promise<ClientAgentAvatarCacheResult> {
        return parsePioneerClientResponse<ClientAgentAvatarCacheResult>(
            await getPioneerClientNitro().agentAvatarCacheJson(JSON.stringify(input)),
        );
    },

    async memberDeviceCreate(
        input: MemberDeviceCreateParams | AdministrationActivationRequest,
    ): Promise<MemberDeviceCreateResponse> {
        return parsePioneerClientResponse<MemberDeviceCreateResponse>(
            await getPioneerClientNitro().memberDeviceCreateJson(JSON.stringify(input)),
        );
    },

    async gatewayAuthMe(): Promise<AuthMeResponse> {
        return parsePioneerClientResponse<AuthMeResponse>(
            await getPioneerClientNitro().gatewayAuthMeJson('{}'),
        );
    },

    async gatewayAuthorizationCapabilities(
        input: AuthorizationCapabilitiesParams,
    ): Promise<AuthorizationCapabilitySnapshot> {
        // Schema, principal, resource scope, revision and manifest compatibility
        // are accepted by the shared Rust AuthorizationProjectionStore before a
        // snapshot is cached or rendered by the shell. Keeping a second schema
        // version in TypeScript made Mobile reject every newer Gateway projection
        // even though the bundled shared client already supported it.
        return parsePioneerClientResponse<AuthorizationCapabilitySnapshot>(
            await getPioneerClientNitro().gatewayAuthorizationCapabilitiesJson(
                JSON.stringify(input),
            ),
        );
    },

    gatewayTransportReserve(input: ClientTransportReserveRequestDto): number {
        return parsePioneerClientResponse<number>(
            getPioneerClientNitro().gatewayTransportReserveJson(JSON.stringify(input)),
        );
    },

    async gatewayTransportWait(input: ClientTransportLeaseRequestDto): Promise<boolean> {
        return parsePioneerClientResponse<boolean>(
            await getPioneerClientNitro().gatewayTransportWaitJson(JSON.stringify(input)),
        );
    },

    gatewayTransportRelease(input: ClientTransportLeaseRequestDto): boolean {
        return parsePioneerClientResponse<boolean>(
            getPioneerClientNitro().gatewayTransportReleaseJson(JSON.stringify(input)),
        );
    },

    async artifactViewOpen(
        input: ClientArtifactTargetRequest,
    ): Promise<ClientArtifactViewOpenResult> {
        return parsePioneerClientResponse<ClientArtifactViewOpenResult>(
            await getPioneerClientNitro().artifactViewOpenJson(JSON.stringify(input)),
        );
    },

    async threadFileViewOpen(
        input: ClientThreadFileViewOpenRequest,
    ): Promise<ClientThreadFileViewOpenResult> {
        return parsePioneerClientResponse<ClientThreadFileViewOpenResult>(
            await getPioneerClientNitro().threadFileViewOpenJson(JSON.stringify(input)),
        );
    },

    async artifactDownload(
        input: ClientArtifactDownloadRequest,
    ): Promise<ClientArtifactDownloadResult> {
        return parsePioneerClientResponse<ClientArtifactDownloadResult>(
            await getPioneerClientNitro().artifactDownloadJson(JSON.stringify(input)),
        );
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

    async composerVoiceCapturePlan(
        identity: ComposerOperationIdentity,
    ): Promise<ComposerOperationPlan> {
        return parsePioneerClientResponse<ComposerOperationPlan>(
            await getPioneerClientNitro().composerVoiceCapturePlanJson(JSON.stringify(identity)),
        );
    },
    async voiceSessionStart(input: ComposerVoiceStartRequest): Promise<VoiceSessionStartResponse> {
        return parsePioneerClientResponse<VoiceSessionStartResponse>(
            await getPioneerClientNitro().voiceSessionStartJson(JSON.stringify(input)),
        );
    },

    voiceAudioChunk(input: VoiceAudioChunkParams, pcmChunk: ArrayBuffer): VoiceAudioChunkResult {
        return parsePioneerClientResponse<VoiceAudioChunkResult>(
            getPioneerClientNitro().voiceAudioChunkJson(JSON.stringify(input), pcmChunk),
        );
    },

    async voiceSessionFinalize(
        input: ComposerVoiceFinalizeRequest,
    ): Promise<VoiceSessionFinalizeResponse> {
        return parsePioneerClientResponse<VoiceSessionFinalizeResponse>(
            await getPioneerClientNitro().voiceSessionFinalizeJson(JSON.stringify(input)),
        );
    },

    async voiceSessionCancel(
        input: ComposerVoiceCancelRequest,
    ): Promise<VoiceSessionCancelResponse> {
        return parsePioneerClientResponse<VoiceSessionCancelResponse>(
            await getPioneerClientNitro().voiceSessionCancelJson(JSON.stringify(input)),
        );
    },

    pendingRequestPresentation(
        input: ClientPendingRequestPresentationRequest,
    ): ClientPendingRequestPresentationResult {
        return parsePioneerClientResponse<ClientPendingRequestPresentationResult>(
            getPioneerClientNitro().pendingRequestPresentationJson(JSON.stringify(input)),
        );
    },

    principalPresentationCapabilities(
        input: AuthorizationCapabilitySnapshot,
    ): PrincipalPresentationCapabilities {
        return parsePioneerClientResponse<PrincipalPresentationCapabilities>(
            getPioneerClientNitro().principalPresentationCapabilitiesJson(JSON.stringify(input)),
        );
    },

    artifactPresentationPolicy(
        input: ClientArtifactPresentationPolicyRequest,
    ): ArtifactPresentationPolicy {
        return parsePioneerClientResponse<ArtifactPresentationPolicy>(
            getPioneerClientNitro().artifactPresentationPolicyJson(JSON.stringify(input)),
        );
    },

    currentPrincipalPresentation(
        input: ClientCurrentPrincipalPresentationRequest,
    ): CurrentPrincipalPresentation {
        return parsePioneerClientResponse<CurrentPrincipalPresentation>(
            getPioneerClientNitro().currentPrincipalPresentationJson(JSON.stringify(input)),
        );
    },

    sessionListRowPresentation(input: AuthSessionListItem): SessionListRowPresentation {
        return parsePioneerClientResponse<SessionListRowPresentation>(
            getPioneerClientNitro().sessionListRowPresentationJson(JSON.stringify(input)),
        );
    },

    threadCreateVisibilityPlan(
        input: ClientThreadCreateVisibilityRequest,
    ): ThreadCreateVisibilityPlan {
        return parsePioneerClientResponse<ThreadCreateVisibilityPlan>(
            getPioneerClientNitro().threadCreateVisibilityPlanJson(JSON.stringify(input)),
        );
    },

    memberPresentation(input: ClientMemberPresentationRequest): MemberListRow {
        return parsePioneerClientResponse<MemberListRow>(
            getPioneerClientNitro().memberPresentationJson(JSON.stringify(input)),
        );
    },

    composerAttachmentFromPath(input: ClientComposerAttachmentFromPathRequest): ComposerAttachment {
        return parsePioneerClientResponse<ComposerAttachment>(
            getPioneerClientNitro().composerAttachmentFromPathJson(JSON.stringify(input)),
        );
    },

    composerSkillPackPicker(
        input: ClientComposerSkillPackPickerRequest,
    ): ComposerSkillPickerProjection {
        return parsePioneerClientResponse<ComposerSkillPickerProjection>(
            getPioneerClientNitro().composerSkillPackPickerJson(JSON.stringify(input)),
        );
    },

    composerSkillChips(input: ClientComposerSkillChipsRequest): ComposerSkillChip[] {
        return parsePioneerClientResponse<ComposerSkillChip[]>(
            getPioneerClientNitro().composerSkillChipsJson(JSON.stringify(input)),
        );
    },

    composerCapabilityTarget(
        input: ClientComposerCapabilityTargetRequest,
    ): ComposerCapabilityTarget {
        return parsePioneerClientResponse<ComposerCapabilityTarget>(
            getPioneerClientNitro().composerCapabilityTargetJson(JSON.stringify(input)),
        );
    },

    composerCapabilityMenuVisibility(
        input: ClientComposerCapabilityMenuVisibilityRequest,
    ): ComposerCapabilityMenuVisibility {
        return parsePioneerClientResponse<ComposerCapabilityMenuVisibility>(
            getPioneerClientNitro().composerCapabilityMenuVisibilityJson(JSON.stringify(input)),
        );
    },

    composerSubmissionPlan(input: ClientComposerSubmissionPlanRequest): ComposerSubmissionPlan {
        return parsePioneerClientResponse<ComposerSubmissionPlan>(
            getPioneerClientNitro().composerSubmissionPlanJson(JSON.stringify(input)),
        );
    },

    composerSkillRowsForTarget(
        input: ClientComposerSkillRowsForTargetRequest,
    ): SelectableSkillCapability[] {
        return parsePioneerClientResponse<SelectableSkillCapability[]>(
            getPioneerClientNitro().composerSkillRowsForTargetJson(JSON.stringify(input)),
        );
    },

    composerFilterMcpRows(
        input: ClientComposerFilterMcpRowsRequest,
    ): ClientComposerFilterMcpRowsResult {
        return parsePioneerClientResponse<ClientComposerFilterMcpRowsResult>(
            getPioneerClientNitro().composerFilterMcpRowsJson(JSON.stringify(input)),
        );
    },

    async threadTreeRefresh(input: ThreadTreeRefreshRequest): Promise<void> {
        return parsePioneerClientResponse<void>(
            await getPioneerClientNitro().threadTreeRefreshJson(JSON.stringify(input)),
        );
    },

    threadTreeLevel(input: ThreadTreeLevelRequest): ClientThreadTreeLevel {
        return parsePioneerClientResponse<ClientThreadTreeLevel>(
            getPioneerClientNitro().threadTreeLevelJson(JSON.stringify(input)),
        );
    },

    async activeThreadOpen(input: ClientActiveThreadOpenRequest): Promise<void> {
        return parsePioneerClientResponse<void>(
            await getPioneerClientNitro().activeThreadOpenJson(JSON.stringify(input)),
        );
    },

    async activeThreadOpenById(input: ClientActiveThreadOpenByIdRequest): Promise<void> {
        return parsePioneerClientResponse<void>(
            await getPioneerClientNitro().activeThreadOpenByIdJson(JSON.stringify(input)),
        );
    },

    async activeThreadOpenOrCreateNew(input: ClientEnsureWorkspaceDraftRequest): Promise<string> {
        return parsePioneerClientResponse<string>(
            await getPioneerClientNitro().activeThreadOpenOrCreateNewJson(JSON.stringify(input)),
        );
    },

    async activeThreadSendText(
        input: ClientActiveThreadSendTextRequest,
    ): Promise<ClientActiveThreadSendTextResult> {
        return parsePioneerClientResponse<ClientActiveThreadSendTextResult>(
            await getPioneerClientNitro().activeThreadSendTextJson(JSON.stringify(input)),
        );
    },

    async prepareVoiceComposerSnapshot(
        input: ClientPrepareVoiceComposerSnapshotRequest,
    ): Promise<PreparedVoiceComposerSnapshot> {
        return parsePioneerClientResponse<PreparedVoiceComposerSnapshot>(
            await getPioneerClientNitro().prepareVoiceComposerSnapshotJson(JSON.stringify(input)),
        );
    },

    async activeThreadClear(): Promise<ClientActiveThreadClearResult> {
        return parsePioneerClientResponse<ClientActiveThreadClearResult>(
            await getPioneerClientNitro().activeThreadClearJson(),
        );
    },
};

configureTurnStartupRecorder((input) => pioneerClient.turnStartupObserve(input));
