import { Platform } from 'react-native';

import { getPioneerClientNitro } from '@pioneer/client-nitro';

import type { ActivateGatewayRegistryPlan } from './generated/activate_gateway_registry_plan';
import type { AdministrationAction } from './generated/administration_action';
import type { AdministrationRefetch } from './generated/administration_refetch';
import type { AuthLogoutResponse } from './generated/auth_logout_response';
import type { AuthMeResponse } from './generated/auth_me_response';
import type { AuthProfileUpdateParams } from './generated/auth_profile_update_params';
import type { AuthProfileUpdateResponse } from './generated/auth_profile_update_response';
import type { AuthDeviceCreateResponse } from './generated/auth_device_create_response';
import type { AuthRefreshGrant } from './generated/auth_refresh_grant';
import type { AuthSessionGrant } from './generated/auth_session_grant';
import type {
    AuthSessionListItem,
    AuthSessionListResponse,
} from './generated/auth_session_list_response';
import type { AuthSessionRevokeParams } from './generated/auth_session_revoke_params';
import type { AuthSessionRevokeResponse } from './generated/auth_session_revoke_response';
import type { AddRemoteGatewayPlan } from './generated/add_remote_gateway_plan';
import type { AddAndActivateRemoteGatewayRegistryPlan } from './generated/add_and_activate_remote_gateway_registry_plan';
import type { ClientArtifactDownloadCancelResult } from './generated/client_artifact_download_cancel_result';
import type { ClientArtifactDownloadOperationRequest } from './generated/client_artifact_download_operation_request';
import type { ClientArtifactDownloadProgressResult } from './generated/client_artifact_download_progress_result';
import type { ClientArtifactDownloadRequest } from './generated/client_artifact_download_request';
import type { ClientArtifactDownloadResult } from './generated/client_artifact_download_result';
import type { ClientArtifactPresentationPolicyRequest } from './generated/client_artifact_presentation_policy_request';
import type { ClientArtifactTargetRequest } from './generated/client_artifact_target_request';
import type { ClientArtifactViewOpenResult } from './generated/client_artifact_view_open_result';
import type { ArtifactPresentationPolicy } from './generated/artifact_presentation_policy';
import type { ClientAuthorizationProjectionAcceptRequest } from './generated/client_authorization_projection_accept_request';
import type { ClientAuthorizationProjectionAcceptResult } from './generated/client_authorization_projection_accept_result';
import type { ClientActiveThreadCancelTurnRequest } from './generated/client_active_thread_cancel_turn_request';
import type { ClientActiveThreadCancelTurnResult } from './generated/client_active_thread_cancel_turn_result';
import type { ClientActiveThreadClearResult } from './generated/client_active_thread_clear_result';
import type { ClientActiveThreadEventRequest } from './generated/client_active_thread_event_request';
import type { ClientActiveThreadEventResult } from './generated/client_active_thread_event_result';
import type { ClientActiveThreadOpenByIdRequest } from './generated/client_active_thread_open_by_id_request';
import type { ClientActiveThreadOpenRequest } from './generated/client_active_thread_open_request';
import type {
    ClientActiveThreadSendTextRequest,
    ThreadMode,
} from './generated/client_active_thread_send_text_request';
import type { ClientActiveThreadSendTextResult } from './generated/client_active_thread_send_text_result';
import type { ClientActiveThreadSnapshot } from './generated/client_active_thread_snapshot';
import type { ClientActiveThreadSnapshotRequest } from './generated/client_active_thread_snapshot_request';
import type { ClientActiveThreadUnsubscribeRequest } from './generated/client_active_thread_unsubscribe_request';
import type { ClientActiveThreadUnsubscribeResult } from './generated/client_active_thread_unsubscribe_result';
import type { ClientComposerAttachmentFromPathRequest } from './generated/client_composer_attachment_from_path_request';
import type { ClientComposerAttachmentsUpdateRequest } from './generated/client_composer_attachments_update_request';
import type { ClientComposerCapabilitiesUpdateRequest } from './generated/client_composer_capabilities_update_request';
import type { ClientComposerCapabilityMenuVisibilityRequest } from './generated/client_composer_capability_menu_visibility_request';
import type { ClientComposerCapabilityTargetRequest } from './generated/client_composer_capability_target_request';
import type { ClientComposerDomainTransitionRequest } from './generated/client_composer_domain_transition_request';
import type { ClientComposerDraftLifecycleTransitionRequest } from './generated/client_composer_draft_lifecycle_transition_request';
import type { ClientComposerFilterMcpRowsRequest } from './generated/client_composer_filter_mcp_rows_request';
import type { ClientComposerFilterMcpRowsResult } from './generated/client_composer_filter_mcp_rows_result';
import type { ClientComposerFilterSkillRowsRequest } from './generated/client_composer_filter_skill_rows_request';
import type { ClientComposerMcpCapabilityFromRowRequest } from './generated/client_composer_mcp_capability_from_row_request';
import type { ClientComposerMcpPickerRowsRequest } from './generated/client_composer_mcp_picker_rows_request';
import type { ClientComposerMcpPickerRowsResult } from './generated/client_composer_mcp_picker_rows_result';
import type { ClientComposerMcpToggleRequest } from './generated/client_composer_mcp_toggle_request';
import type { ClientComposerMcpToggleResult } from './generated/client_composer_mcp_toggle_result';
import type { ClientPendingRequestResponsePlanRequest } from './generated/client_pending_request_response_plan_request';
import type { ClientPendingRequestResponsePlanResult } from './generated/client_pending_request_response_plan_result';
import type { ClientPendingRequestPresentationRequest } from './generated/client_pending_request_presentation_request';
import type { ClientPendingRequestPresentationResult } from './generated/client_pending_request_presentation_result';
import type { ClientPrepareVoiceComposerSnapshotRequest } from './generated/client_prepare_voice_composer_snapshot_request';
import type { ClientComposerSkillCapabilityFromRowRequest } from './generated/client_composer_skill_capability_from_row_request';
import type { ClientComposerSkillChipsRequest } from './generated/client_composer_skill_chips_request';
import type { ClientComposerSkillPackPickerRequest } from './generated/client_composer_skill_pack_picker_request';
import type { ClientComposerSkillPickerRowsRequest } from './generated/client_composer_skill_picker_rows_request';
import type { ClientComposerSkillSelectionToggleRequest } from './generated/client_composer_skill_selection_toggle_request';
import type { ClientComposerSkillToggleRequest } from './generated/client_composer_skill_toggle_request';
import type { ClientComposerSkillToggleResult } from './generated/client_composer_skill_toggle_result';
import type { ClientComposerSkillRowsForTargetRequest } from './generated/client_composer_skill_rows_for_target_request';
import type { ClientComposerSubmissionPlanRequest } from './generated/client_composer_submission_plan_request';
import type { ClientDiagnosticEvent } from './generated/client_diagnostic_event';
import type { ClientEvent } from './generated/client_event';
import type { ClientAuthDeviceActivateRequest } from './generated/client_auth_activate_device_request';
import type { ClientAuthRefreshRequest } from './generated/client_auth_refresh_request';
import type { ClientAuthSessionCleanupRequest } from './generated/client_auth_session_cleanup_request';
import type { ClientGatewaySessionReplaceAccessRequest } from './generated/client_gateway_session_replace_access_request';
import type { ClientGatewaySessionReplaceAccessResult } from './generated/client_gateway_session_replace_access_result';
import type { ClientGatewaySessionLifecycleRequest } from './generated/client_gateway_session_lifecycle_request';
import type { ClientGatewaySessionLifecycleResult } from './generated/client_gateway_session_lifecycle_result';
import type { ClientDeviceActivationParseRequest } from './generated/client_device_activation_parse_request';
import type { ClientDeviceActivationParseResult } from './generated/client_device_activation_parse_result';
import type { ClientDeviceActivationPresentationRequest } from './generated/client_device_activation_presentation_request';
import type { ClientDeviceActivationPresentationResult } from './generated/client_device_activation_presentation_result';
import type { ClientInvitationAcceptRequest } from './generated/client_invitation_accept_request';
import type { ClientInvitationAcceptResult } from './generated/client_invitation_accept_result';
import type { ClientInvitationAccessResult } from './generated/client_invitation_access_result';
import type { ClientInvitationCommitCleanupRequest } from './generated/client_invitation_commit_cleanup_request';
import type { ClientInvitationCommitFailureResult } from './generated/client_invitation_commit_failure_result';
import type { ClientInvitationCommitRequest } from './generated/client_invitation_commit_request';
import type { ClientInvitationPresentationRequest } from './generated/client_invitation_presentation_request';
import type { ClientInvitationPresentationResult } from './generated/client_invitation_presentation_result';
import type { ClientInvitationPreviewRequest } from './generated/client_invitation_preview_request';
import type { ClientInvitationRefreshWrite } from './generated/client_invitation_refresh_write';
import type { ClientInvitationRegistryWrite } from './generated/client_invitation_registry_write';
import type { ClientGatewaySettingsUpdateRequest } from './generated/client_gateway_settings_update_request';
import type { ClientVoiceInputPlanRequest } from './generated/client_voice_input_plan_request';
import type { ClientVoiceInputPlanResult } from './generated/client_voice_input_plan_result';
import type { ClientEnsureWorkspaceDraftRequest } from './generated/client_ensure_workspace_draft_request';
import type { ClientExecutionDraftReconcileRequest } from './generated/client_execution_draft_reconcile_request';
import type { CLIRuntimeListModelsParams } from './generated/cli_runtime_list_models_params';
import type { CLIRuntimeListModelsResponse } from './generated/cli_runtime_list_models_response';
import type { CLIRuntimeListParams } from './generated/cli_runtime_list_params';
import type { CLIRuntimeListResponse } from './generated/cli_runtime_list_response';
import type { CLIRuntimeRefreshParams } from './generated/cli_runtime_refresh_params';
import type { CLIRuntimeRefreshResponse } from './generated/cli_runtime_refresh_response';
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
import type { ComposerCapabilityMenuVisibility } from './generated/composer_capability_menu_visibility';
import type { ComposerCapabilityTarget } from './generated/composer_capability_target';
import type { ComposerDomainTransition } from './generated/composer_domain_transition';
import type { ComposerDraftLifecycleTransition } from './generated/composer_draft_lifecycle_transition';
import type { ComposerSkillChip } from './generated/composer_skill_chip';
import type { ComposerSkillPickerProjection } from './generated/composer_skill_picker_projection';
import type { ComposerSkillSelectionReduction } from './generated/composer_skill_selection_reduction';
import type { ComposerSubmissionPlan } from './generated/composer_submission_plan';
import type { DeleteRemoteGatewayRegistryPlan } from './generated/delete_remote_gateway_registry_plan';
import type { ExecutionDraftReconciliation } from './generated/execution_draft_reconciliation';
import type { LoadGatewayRegistryRequest } from './generated/load_gateway_registry_request';
import type { LoadGatewayRegistryResult } from './generated/load_gateway_registry_result';
import type { GatewaySettingsGetResponse } from './generated/gateway_settings_get_response';
import type { GatewaySettingsUpdateResponse } from './generated/gateway_settings_update_response';
import type { InvitationCreateParams } from './generated/invitation_create_params';
import type { InvitationCreateResponse } from './generated/invitation_create_response';
import type { InvitationListParams } from './generated/invitation_list_params';
import type { InvitationListResponse } from './generated/invitation_list_response';
import type { InvitationPreviewResponse } from './generated/invitation_preview_response';
import type { InvitationRevokeParams } from './generated/invitation_revoke_params';
import type { InvitationRevokeResponse } from './generated/invitation_revoke_response';
import type { ClientMemberAvatarCacheRequest } from './generated/client_member_avatar_cache_request';
import type { ClientMemberAvatarCacheResult } from './generated/client_member_avatar_cache_result';
import type { ClientAgentAvatarCacheRequest } from './generated/client_agent_avatar_cache_request';
import type { ClientAgentAvatarCacheResult } from './generated/client_agent_avatar_cache_result';
import type { ClientMemberPresentationRequest } from './generated/client_member_presentation_request';
import type { ClientInvitationListRowRequest } from './generated/client_invitation_list_row_request';
import type { InvitationListRow } from './generated/invitation_list_row';
import type { ClientCurrentPrincipalPresentationRequest } from './generated/client_current_principal_presentation_request';
import type { CurrentPrincipalPresentation } from './generated/current_principal_presentation';
import type { MemberDeviceCreateParams } from './generated/member_device_create_params';
import type { MemberDeviceCreateResponse } from './generated/member_device_create_response';
import type { MemberListParams } from './generated/member_list_params';
import type { MemberListResponse } from './generated/member_list_response';
import type { MemberListRow } from './generated/member_list_row';
import type { MemberMutationResponse } from './generated/member_mutation_response';
import type { MemberRemoveParams } from './generated/member_remove_params';
import type { MemberRestoreParams } from './generated/member_restore_params';
import type { MemberSuspendParams } from './generated/member_suspend_params';
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
import type { PreparedVoiceComposerSnapshot } from './generated/prepared_voice_composer_snapshot';
import type { ReasoningEffortRowsRequest } from './generated/reasoning_effort_rows_request';
import type { ReasoningEffortRowsResponse } from './generated/reasoning_effort_rows_response';
import type { RemoteGatewayValidation } from './generated/remote_gateway_validation';
import type { RemoteGatewayValidationRequest } from './generated/remote_gateway_validation_request';
import type { TaskAcceptParams } from './generated/task_accept_params';
import type { TaskAcceptResponse } from './generated/task_accept_response';
import type { TaskCancelParams } from './generated/task_cancel_params';
import type { TaskCancelResponse } from './generated/task_cancel_response';
import type { TaskReviseParams } from './generated/task_revise_params';
import type { TaskReviseResponse } from './generated/task_revise_response';
import type { TaskUserNotificationAcknowledgeParams } from './generated/task_user_notification_acknowledge_params';
import type { TaskUserNotificationAcknowledgeResponse } from './generated/task_user_notification_acknowledge_response';
import type { TaskUserNotificationListParams } from './generated/task_user_notification_list_params';
import type { TaskUserNotificationListResponse } from './generated/task_user_notification_list_response';
import type { SelectableSkillCapability } from './generated/selectable_skill_capability';
import type { SetGatewayWorkspaceRegistryPlan } from './generated/set_gateway_workspace_registry_plan';
import type { ClientThreadTreeLevel } from './generated/thread_tree_level';
import type { ClientThreadScopePresentationRequest } from './generated/client_thread_scope_presentation_request';
import type { ClientThreadCreateVisibilityRequest } from './generated/client_thread_create_visibility_request';
import type { ClientThreadScopeMutationPlanRequest } from './generated/client_thread_scope_mutation_plan_request';
import type { SessionListRowPresentation } from './generated/session_list_row_presentation';
import type { ThreadCreateVisibilityPlan } from './generated/thread_create_visibility_plan';
import type { PrincipalPresentationCapabilities } from './generated/principal_presentation_capabilities';
import type { AuthorizationCapabilitiesParams } from './generated/authorization_capabilities_params';
import type { AuthorizationCapabilitySnapshot } from './generated/authorization_capability_snapshot';
import type { ThreadParticipantMutationParams } from './generated/thread_participant_mutation_params';
import type { ThreadParticipantsListParams } from './generated/thread_participants_list_params';
import type { ThreadParticipantsResponse } from './generated/thread_participants_response';
import type { ThreadScopePresentation } from './generated/thread_scope_presentation';
import type { ThreadScopeMutationPlan } from './generated/thread_scope_mutation_plan';
import type { ThreadUpdateParams } from './generated/thread_update_params';
import type { ThreadUpdateResponse } from './generated/thread_update_response';
import type { ThreadTreeLevelRequest } from './generated/thread_tree_level_request';
import type { ClientThreadTreeQueryData } from './generated/thread_tree_query_data';
import type { ThreadTreeRefreshRequest } from './generated/thread_tree_refresh_request';
import type { ThreadTimelinePageParams } from './generated/thread_timeline_page_params';
import type { ThreadTimelinePageResponse } from './generated/thread_timeline_page_response';
import type { ThreadReadParams } from './generated/thread_read_params';
import type { ThreadReadResponse } from './generated/thread_read_response';
import type { ThreadAgentsDocArchiveParams } from './generated/thread_agents_doc_archive_params';
import type { ThreadAgentsDocArchiveResponse } from './generated/thread_agents_doc_archive_response';
import type { ThreadAgentsDocGetParams } from './generated/thread_agents_doc_get_params';
import type { ThreadAgentsDocGetResponse } from './generated/thread_agents_doc_get_response';
import type { ThreadAgentsDocSaveParams } from './generated/thread_agents_doc_save_params';
import type { ThreadAgentsDocSaveResponse } from './generated/thread_agents_doc_save_response';
import type { TurnWorkItemsGetParams } from './generated/turn_work_items_get_params';
import type { TurnWorkItemsGetResponse } from './generated/turn_work_items_get_response';
import type { TurnMessageDeleteParams } from './generated/turn_message_delete_params';
import type { TurnMessageDeleteResponse } from './generated/turn_message_delete_response';
import type { TurnMessageEditParams } from './generated/turn_message_edit_params';
import type { TurnMessageEditResponse } from './generated/turn_message_edit_response';
import type { TurnMessageRevisionsPageParams } from './generated/turn_message_revisions_page_params';
import type { TurnMessageRevisionsPageResponse } from './generated/turn_message_revisions_page_response';
import type { MessageRevisionPagePresentation } from './generated/message_revision_page_presentation';
import type { TurnWorkPageParams } from './generated/turn_work_page_params';
import type { TurnWorkPageResponse } from './generated/turn_work_page_response';
import type { TurnPermissionRequestRespondParams } from './generated/turn_permission_request_respond_params';
import type { TurnPermissionRequestRespondResponse } from './generated/turn_permission_request_respond_response';
import type { UpdateRemoteGatewayRegistryPlan } from './generated/update_remote_gateway_registry_plan';
import type { VoiceAudioFormat } from './generated/voice_audio_format';
import type { VoiceSessionCancelParams } from './generated/voice_session_cancel_params';
import type { VoiceSessionCancelResponse } from './generated/voice_session_cancel_response';
import type { VoiceSessionFinalizeParams } from './generated/voice_session_finalize_params';
import type { VoiceSessionFinalizeResponse } from './generated/voice_session_finalize_response';
import type { VoiceSessionStartParams } from './generated/voice_session_start_params';
import type { VoiceSessionStartResponse } from './generated/voice_session_start_response';
import type { VoiceStatusParams } from './generated/voice_status_params';
import type { VoiceStatusResponse } from './generated/voice_status_response';
import type { WorkspaceBootstrapRequest } from './generated/workspace_bootstrap_request';
import type { WorkspaceBootstrapSuccessReduction } from './generated/workspace_bootstrap_success_reduction';
import type { WorkspaceCreateRequest } from './generated/workspace_create_request';
import type { WorkspaceCreateResult } from './generated/workspace_create_result';
import type { WorkspaceRenameRequest } from './generated/workspace_rename_request';
import type { WorkspaceRenameResult } from './generated/workspace_rename_result';
import type { WorkspaceSwitchRequest } from './generated/workspace_switch_request';
import type { WorkspaceSwitchResult } from './generated/workspace_switch_result';
import type { WorkspaceMemberAddParams } from './generated/workspace_member_add_params';
import type { WorkspaceMemberListParams } from './generated/workspace_member_list_params';
import type { WorkspaceMemberListResponse } from './generated/workspace_member_list_response';
import type { WorkspaceMemberMutationResponse } from './generated/workspace_member_mutation_response';
import type { WorkspaceMemberRemoveParams } from './generated/workspace_member_remove_params';
import { parsePioneerClientResponse } from './response';

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
export type { AddRemoteGatewayPlan } from './generated/add_remote_gateway_plan';
export type { AddAndActivateRemoteGatewayRegistryPlan } from './generated/add_and_activate_remote_gateway_registry_plan';
export type { ClientArtifactDownloadCancelResult } from './generated/client_artifact_download_cancel_result';
export type { ClientArtifactDownloadOperationRequest } from './generated/client_artifact_download_operation_request';
export type { ClientArtifactDownloadProgressResult } from './generated/client_artifact_download_progress_result';
export type { ClientArtifactDownloadRequest } from './generated/client_artifact_download_request';
export type { ClientArtifactDownloadResult } from './generated/client_artifact_download_result';
export type { ClientArtifactDownloadState } from './generated/client_artifact_download_state';
export type { ClientArtifactPresentationPolicyRequest } from './generated/client_artifact_presentation_policy_request';
export type { ArtifactPresentationPolicy } from './generated/artifact_presentation_policy';
export type { ClientArtifactTargetRequest } from './generated/client_artifact_target_request';
export type { ClientArtifactViewOpenResult } from './generated/client_artifact_view_open_result';
export type { ClientAuthorizationProjectionAcceptRequest } from './generated/client_authorization_projection_accept_request';
export type { ClientAuthorizationProjectionAcceptResult } from './generated/client_authorization_projection_accept_result';
export type { ClientActiveThreadCancelTurnRequest } from './generated/client_active_thread_cancel_turn_request';
export type { ClientActiveThreadCancelTurnResult } from './generated/client_active_thread_cancel_turn_result';
export type { ClientActiveThreadClearResult } from './generated/client_active_thread_clear_result';
export type { ClientActiveThreadEventRequest } from './generated/client_active_thread_event_request';
export type { ClientActiveThreadEventResult } from './generated/client_active_thread_event_result';
export type { ClientActiveThreadOpenByIdRequest } from './generated/client_active_thread_open_by_id_request';
export type { ClientActiveThreadOpenRequest } from './generated/client_active_thread_open_request';
export type { ClientActiveThreadSendTextRequest } from './generated/client_active_thread_send_text_request';
export type { ThreadMode } from './generated/client_active_thread_send_text_request';
export type { ClientActiveThreadSendTextResult } from './generated/client_active_thread_send_text_result';
export type { ClientActiveThreadSnapshot } from './generated/client_active_thread_snapshot';
export type { ClientActiveThreadSnapshotRequest } from './generated/client_active_thread_snapshot_request';
export type { ClientActiveThreadUnsubscribeRequest } from './generated/client_active_thread_unsubscribe_request';
export type { ClientActiveThreadUnsubscribeResult } from './generated/client_active_thread_unsubscribe_result';
export type { ClientComposerAttachmentFromPathRequest } from './generated/client_composer_attachment_from_path_request';
export type { ClientComposerAttachmentsUpdateRequest } from './generated/client_composer_attachments_update_request';
export type { ClientComposerCapabilitiesUpdateRequest } from './generated/client_composer_capabilities_update_request';
export type { ClientComposerCapabilityMenuVisibilityRequest } from './generated/client_composer_capability_menu_visibility_request';
export type { ClientComposerCapabilityTargetRequest } from './generated/client_composer_capability_target_request';
export type { ClientComposerFilterMcpRowsRequest } from './generated/client_composer_filter_mcp_rows_request';
export type { ClientComposerFilterMcpRowsResult } from './generated/client_composer_filter_mcp_rows_result';
export type { ClientComposerFilterSkillRowsRequest } from './generated/client_composer_filter_skill_rows_request';
export type { ClientComposerMcpCapabilityFromRowRequest } from './generated/client_composer_mcp_capability_from_row_request';
export type { ClientComposerMcpPickerRowsRequest } from './generated/client_composer_mcp_picker_rows_request';
export type { ClientComposerMcpPickerRowsResult } from './generated/client_composer_mcp_picker_rows_result';
export type { ClientComposerMcpToggleRequest } from './generated/client_composer_mcp_toggle_request';
export type { ClientComposerMcpToggleResult } from './generated/client_composer_mcp_toggle_result';
export type { ClientPendingRequestResponseAction } from './generated/client_pending_request_response_action';
export type { ClientPendingRequestResponsePlanRequest } from './generated/client_pending_request_response_plan_request';
export type { ClientPendingRequestResponsePlanResult } from './generated/client_pending_request_response_plan_result';
export type { ClientPendingRequestPresentationRequest } from './generated/client_pending_request_presentation_request';
export type { ClientPendingRequestPresentationResult } from './generated/client_pending_request_presentation_result';
export type { ClientPrepareVoiceComposerSnapshotRequest } from './generated/client_prepare_voice_composer_snapshot_request';
export type { ClientComposerSkillCapabilityFromRowRequest } from './generated/client_composer_skill_capability_from_row_request';
export type { ClientComposerSkillChipsRequest } from './generated/client_composer_skill_chips_request';
export type { ClientComposerSkillPackPickerRequest } from './generated/client_composer_skill_pack_picker_request';
export type { ClientComposerSkillPickerRowsRequest } from './generated/client_composer_skill_picker_rows_request';
export type { ClientComposerSkillSelectionToggleRequest } from './generated/client_composer_skill_selection_toggle_request';
export type { ClientComposerSkillToggleRequest } from './generated/client_composer_skill_toggle_request';
export type { ClientComposerSkillToggleResult } from './generated/client_composer_skill_toggle_result';
export type { ClientComposerSkillRowsForTargetRequest } from './generated/client_composer_skill_rows_for_target_request';
export type { ClientComposerSubmissionPlanRequest } from './generated/client_composer_submission_plan_request';
export type { ClientDiagnosticEvent } from './generated/client_diagnostic_event';
export type { ClientEvent } from './generated/client_event';
export type { ClientAuthDeviceActivateRequest } from './generated/client_auth_activate_device_request';
export type { ClientAuthRefreshRequest } from './generated/client_auth_refresh_request';
export type { ClientAuthSessionCleanupRequest } from './generated/client_auth_session_cleanup_request';
export type { ClientGatewaySessionReplaceAccessRequest } from './generated/client_gateway_session_replace_access_request';
export type { ClientGatewaySessionReplaceAccessResult } from './generated/client_gateway_session_replace_access_result';
export type { ClientGatewaySessionLifecycleRequest } from './generated/client_gateway_session_lifecycle_request';
export type { ClientGatewaySessionLifecycleResult } from './generated/client_gateway_session_lifecycle_result';
export type { ClientGatewaySettingsUpdateRequest } from './generated/client_gateway_settings_update_request';
export type { ClientVoiceInputPlanRequest } from './generated/client_voice_input_plan_request';
export type { ClientVoiceInputPlanResult } from './generated/client_voice_input_plan_result';
export type { ClientEnsureWorkspaceDraftRequest } from './generated/client_ensure_workspace_draft_request';
export type { ClientExecutionDraftReconcileRequest } from './generated/client_execution_draft_reconcile_request';
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
export type { ComposerCapabilityMenuVisibility } from './generated/composer_capability_menu_visibility';
export type { ComposerCapabilityTarget } from './generated/composer_capability_target';
export type { ComposerDomainAction } from './generated/composer_domain_action';
export type { ComposerDomainState } from './generated/composer_domain_state';
export type { ComposerDomainTransition } from './generated/composer_domain_transition';
export type { ComposerReplyTarget } from './generated/composer_reply_target';
export type { ComposerMentionCandidate } from './generated/composer_mention_candidate';
export type { ComposerMentionSelection } from './generated/composer_mention_selection';
export type { ComposerDomainDraft } from './generated/composer_domain_draft';
export type { ComposerDraftLifecycleAction } from './generated/composer_draft_lifecycle_action';
export type { ComposerDraftLifecycleState } from './generated/composer_draft_lifecycle_state';
export type { ComposerDraftLifecycleTransition } from './generated/composer_draft_lifecycle_transition';
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
export type { ClientGatewayWsTimings } from './generated/client_gateway_ws_timings';
export type { DeleteRemoteGatewayRegistryPlan } from './generated/delete_remote_gateway_registry_plan';
export type { LoadGatewayRegistryRequest } from './generated/load_gateway_registry_request';
export type { LoadGatewayRegistryResult } from './generated/load_gateway_registry_result';
export type { GatewayConnectionState } from './generated/gateway_connection_state';
export type { GatewayEndpoint } from './generated/gateway_endpoint';
export type { GatewayEndpointKind } from './generated/gateway_endpoint_kind';
export type { GatewayRegistry } from './generated/gateway_registry';
export type { GatewaySettingsGetResponse } from './generated/gateway_settings_get_response';
export type { GatewaySettingsUpdateResponse } from './generated/gateway_settings_update_response';
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
export type { RemoteGatewayValidationRequest } from './generated/remote_gateway_validation_request';
export type { SelectableSkillCapability } from './generated/selectable_skill_capability';
export type { SelectablePackedSkillCapability } from './generated/selectable_packed_skill_capability';
export type { SelectableSkillPackCapability } from './generated/selectable_skill_pack_capability';
export type { SetGatewayWorkspaceRegistryPlan } from './generated/set_gateway_workspace_registry_plan';
export type { SessionTerminalReason } from './generated/session_terminal_reason';
export type { ClientDeviceActivationParseRequest } from './generated/client_device_activation_parse_request';
export type { ClientDeviceActivationParseResult } from './generated/client_device_activation_parse_result';
export type { ClientDeviceActivationPresentationRequest } from './generated/client_device_activation_presentation_request';
export type { ClientDeviceActivationPresentationResult } from './generated/client_device_activation_presentation_result';
export type { ClientInvitationAcceptRequest } from './generated/client_invitation_accept_request';
export type { ClientInvitationAcceptResult } from './generated/client_invitation_accept_result';
export type { ClientInvitationAccessResult } from './generated/client_invitation_access_result';
export type { ClientInvitationCommitCleanupRequest } from './generated/client_invitation_commit_cleanup_request';
export type { ClientInvitationCommitFailureResult } from './generated/client_invitation_commit_failure_result';
export type { ClientInvitationCommitRequest } from './generated/client_invitation_commit_request';
export type { ClientInvitationPresentationRequest } from './generated/client_invitation_presentation_request';
export type { ClientInvitationPresentationResult } from './generated/client_invitation_presentation_result';
export type { ClientInvitationPreviewRequest } from './generated/client_invitation_preview_request';
export type { ClientInvitationRefreshWrite } from './generated/client_invitation_refresh_write';
export type { ClientInvitationRegistryWrite } from './generated/client_invitation_registry_write';
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
export type { ClientThreadTreeLevel } from './generated/thread_tree_level';
export type { ClientThreadScopePresentationRequest } from './generated/client_thread_scope_presentation_request';
export type { ClientThreadCreateVisibilityRequest } from './generated/client_thread_create_visibility_request';
export type { ClientThreadScopeMutationPlanRequest } from './generated/client_thread_scope_mutation_plan_request';
export type { ThreadCreateVisibilityPlan } from './generated/thread_create_visibility_plan';
export type { ClientInvitationListRowRequest } from './generated/client_invitation_list_row_request';
export type { InvitationListRow } from './generated/invitation_list_row';
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
export type { ThreadScopeMutationPlan } from './generated/thread_scope_mutation_plan';
export type { ThreadUpdateParams } from './generated/thread_update_params';
export type { ThreadUpdateResponse } from './generated/thread_update_response';
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
export type { TurnMessageDeleteParams } from './generated/turn_message_delete_params';
export type { TurnMessageDeleteResponse } from './generated/turn_message_delete_response';
export type { TurnMessageEditParams } from './generated/turn_message_edit_params';
export type { UserInput } from './generated/turn_message_edit_params';
export type { TurnMessageEditResponse } from './generated/turn_message_edit_response';
export type { TurnMessageRevisionsPageParams } from './generated/turn_message_revisions_page_params';
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
};

export type MobileStartupStageTiming = {
    name: string;
    start_offset_ms: number;
    duration_ms: number;
    failed?: boolean;
};

export type MobileStartupRecordRequest = {
    enabled: boolean;
    metrics_endpoint: string;
    traces_endpoint: string;
    export_interval_ms: number;
    export_timeout_ms: number;
    deployment_environment: 'development' | 'production';
    started_at_unix_ms: number;
    duration_ms: number;
    outcome: 'ready' | 'setup_required' | 'authentication_required' | 'degraded';
    stages: MobileStartupStageTiming[];
};

export type MobileStartupRecordResult = {
    recorded: boolean;
};

export type VoiceAudioChunkParams = {
    session_id: string;
    sequence: number;
    audio_format: VoiceAudioFormat;
    captured_at_unix_ms?: number | null;
    duration_ms?: number | null;
};

export type VoiceAudioChunkResult = {
    sent: boolean;
};

const AUTHORIZATION_CAPABILITY_SNAPSHOT_SCHEMA_VERSION = 1;

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

    async gatewaySessionLifecycleReduce(
        input: ClientGatewaySessionLifecycleRequest,
    ): Promise<ClientGatewaySessionLifecycleResult> {
        return parsePioneerClientResponse<ClientGatewaySessionLifecycleResult>(
            await getPioneerClientNitro().gatewaySessionLifecycleReduceJson(JSON.stringify(input)),
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

    async invitationPreview(
        input: ClientInvitationPreviewRequest,
    ): Promise<InvitationPreviewResponse> {
        return parsePioneerClientResponse<InvitationPreviewResponse>(
            await getPioneerClientNitro().invitationPreviewJson(JSON.stringify(input)),
        );
    },

    async invitationAccept(
        input: ClientInvitationAcceptRequest,
    ): Promise<ClientInvitationAcceptResult> {
        return parsePioneerClientResponse<ClientInvitationAcceptResult>(
            await getPioneerClientNitro().invitationAcceptJson(JSON.stringify(input)),
        );
    },

    async invitationCommitTakeRefresh(
        input: ClientInvitationCommitRequest,
    ): Promise<ClientInvitationRefreshWrite> {
        return parsePioneerClientResponse<ClientInvitationRefreshWrite>(
            await getPioneerClientNitro().invitationCommitTakeRefreshJson(JSON.stringify(input)),
        );
    },

    async invitationCommitSecureStorageCommitted(
        input: ClientInvitationCommitRequest,
    ): Promise<ClientInvitationRegistryWrite> {
        return parsePioneerClientResponse<ClientInvitationRegistryWrite>(
            await getPioneerClientNitro().invitationCommitSecureStorageCommittedJson(
                JSON.stringify(input),
            ),
        );
    },

    async invitationCommitRegistryCommitted(
        input: ClientInvitationCommitRequest,
    ): Promise<ClientInvitationAccessResult> {
        return parsePioneerClientResponse<ClientInvitationAccessResult>(
            await getPioneerClientNitro().invitationCommitRegistryCommittedJson(
                JSON.stringify(input),
            ),
        );
    },

    async invitationCommitSecureStorageFailed(
        input: ClientInvitationCommitCleanupRequest,
    ): Promise<ClientInvitationCommitFailureResult> {
        return parsePioneerClientResponse<ClientInvitationCommitFailureResult>(
            await getPioneerClientNitro().invitationCommitSecureStorageFailedJson(
                JSON.stringify(input),
            ),
        );
    },

    async invitationCommitRegistryFailed(
        input: ClientInvitationCommitRequest,
    ): Promise<ClientInvitationCommitFailureResult> {
        return parsePioneerClientResponse<ClientInvitationCommitFailureResult>(
            await getPioneerClientNitro().invitationCommitRegistryFailedJson(JSON.stringify(input)),
        );
    },

    async invitationCreate(input: InvitationCreateParams): Promise<InvitationCreateResponse> {
        return parsePioneerClientResponse<InvitationCreateResponse>(
            await getPioneerClientNitro().invitationCreateJson(JSON.stringify(input)),
        );
    },

    async invitationList(input: InvitationListParams): Promise<InvitationListResponse> {
        return parsePioneerClientResponse<InvitationListResponse>(
            await getPioneerClientNitro().invitationListJson(JSON.stringify(input)),
        );
    },

    async invitationRevoke(input: InvitationRevokeParams): Promise<InvitationRevokeResponse> {
        return parsePioneerClientResponse<InvitationRevokeResponse>(
            await getPioneerClientNitro().invitationRevokeJson(JSON.stringify(input)),
        );
    },

    async memberList(input: MemberListParams): Promise<MemberListResponse> {
        return parsePioneerClientResponse<MemberListResponse>(
            await getPioneerClientNitro().memberListJson(JSON.stringify(input)),
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

    async memberSuspend(input: MemberSuspendParams): Promise<MemberMutationResponse> {
        return parsePioneerClientResponse<MemberMutationResponse>(
            await getPioneerClientNitro().memberSuspendJson(JSON.stringify(input)),
        );
    },

    async memberRestore(input: MemberRestoreParams): Promise<MemberMutationResponse> {
        return parsePioneerClientResponse<MemberMutationResponse>(
            await getPioneerClientNitro().memberRestoreJson(JSON.stringify(input)),
        );
    },

    async memberRemove(input: MemberRemoveParams): Promise<MemberMutationResponse> {
        return parsePioneerClientResponse<MemberMutationResponse>(
            await getPioneerClientNitro().memberRemoveJson(JSON.stringify(input)),
        );
    },

    async memberDeviceCreate(input: MemberDeviceCreateParams): Promise<MemberDeviceCreateResponse> {
        return parsePioneerClientResponse<MemberDeviceCreateResponse>(
            await getPioneerClientNitro().memberDeviceCreateJson(JSON.stringify(input)),
        );
    },

    async workspaceMemberList(
        input: WorkspaceMemberListParams,
    ): Promise<WorkspaceMemberListResponse> {
        return parsePioneerClientResponse<WorkspaceMemberListResponse>(
            await getPioneerClientNitro().workspaceMemberListJson(JSON.stringify(input)),
        );
    },

    async workspaceMemberAdd(
        input: WorkspaceMemberAddParams,
    ): Promise<WorkspaceMemberMutationResponse> {
        return parsePioneerClientResponse<WorkspaceMemberMutationResponse>(
            await getPioneerClientNitro().workspaceMemberAddJson(JSON.stringify(input)),
        );
    },

    async workspaceMemberRemove(
        input: WorkspaceMemberRemoveParams,
    ): Promise<WorkspaceMemberMutationResponse> {
        return parsePioneerClientResponse<WorkspaceMemberMutationResponse>(
            await getPioneerClientNitro().workspaceMemberRemoveJson(JSON.stringify(input)),
        );
    },

    async threadParticipantsList(
        input: ThreadParticipantsListParams,
    ): Promise<ThreadParticipantsResponse> {
        return parsePioneerClientResponse<ThreadParticipantsResponse>(
            await getPioneerClientNitro().threadParticipantsListJson(JSON.stringify(input)),
        );
    },

    async threadUpdate(input: ThreadUpdateParams): Promise<ThreadUpdateResponse> {
        return parsePioneerClientResponse<ThreadUpdateResponse>(
            await getPioneerClientNitro().threadUpdateJson(JSON.stringify(input)),
        );
    },

    async threadParticipantAdd(
        input: ThreadParticipantMutationParams,
    ): Promise<ThreadParticipantsResponse> {
        return parsePioneerClientResponse<ThreadParticipantsResponse>(
            await getPioneerClientNitro().threadParticipantAddJson(JSON.stringify(input)),
        );
    },

    async threadParticipantRemove(
        input: ThreadParticipantMutationParams,
    ): Promise<ThreadParticipantsResponse> {
        return parsePioneerClientResponse<ThreadParticipantsResponse>(
            await getPioneerClientNitro().threadParticipantRemoveJson(JSON.stringify(input)),
        );
    },

    async gatewayAuthRefresh(input: ClientAuthRefreshRequest): Promise<AuthRefreshGrant> {
        return parsePioneerClientResponse<AuthRefreshGrant>(
            await getPioneerClientNitro().gatewayAuthRefreshJson(JSON.stringify(input)),
        );
    },

    async gatewayAuthDeviceActivate(
        input: ClientAuthDeviceActivateRequest,
    ): Promise<AuthSessionGrant> {
        return parsePioneerClientResponse<AuthSessionGrant>(
            await getPioneerClientNitro().gatewayAuthDeviceActivateJson(JSON.stringify(input)),
        );
    },

    async gatewayAuthSessionCleanup(
        input: ClientAuthSessionCleanupRequest,
    ): Promise<AuthSessionRevokeResponse> {
        return parsePioneerClientResponse<AuthSessionRevokeResponse>(
            await getPioneerClientNitro().gatewayAuthSessionCleanupJson(JSON.stringify(input)),
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
        const snapshot = parsePioneerClientResponse<AuthorizationCapabilitySnapshot>(
            await getPioneerClientNitro().gatewayAuthorizationCapabilitiesJson(
                JSON.stringify(input),
            ),
        );
        if (
            snapshot.schema_version !== AUTHORIZATION_CAPABILITY_SNAPSHOT_SCHEMA_VERSION ||
            (snapshot.workspace && snapshot.workspace.workspace_id !== input.workspace_id) ||
            (snapshot.thread &&
                (snapshot.thread.workspace_id !== input.workspace_id ||
                    snapshot.thread.thread_id !== input.thread_id))
        ) {
            throw new Error('incompatible_authorization_capability_snapshot');
        }
        return snapshot;
    },

    async gatewayAuthProfileUpdate(
        input: AuthProfileUpdateParams,
    ): Promise<AuthProfileUpdateResponse> {
        return parsePioneerClientResponse<AuthProfileUpdateResponse>(
            await getPioneerClientNitro().gatewayAuthProfileUpdateJson(JSON.stringify(input)),
        );
    },

    async gatewayAuthSessionList(): Promise<AuthSessionListResponse> {
        return parsePioneerClientResponse<AuthSessionListResponse>(
            await getPioneerClientNitro().gatewayAuthSessionListJson('{}'),
        );
    },

    async gatewayAuthSessionRevoke(
        input: AuthSessionRevokeParams,
    ): Promise<AuthSessionRevokeResponse> {
        return parsePioneerClientResponse<AuthSessionRevokeResponse>(
            await getPioneerClientNitro().gatewayAuthSessionRevokeJson(JSON.stringify(input)),
        );
    },

    async gatewayAuthLogout(): Promise<AuthLogoutResponse> {
        return parsePioneerClientResponse<AuthLogoutResponse>(
            await getPioneerClientNitro().gatewayAuthLogoutJson('{}'),
        );
    },

    async gatewayAuthDeviceCreate(): Promise<AuthDeviceCreateResponse> {
        return parsePioneerClientResponse<AuthDeviceCreateResponse>(
            await getPioneerClientNitro().gatewayAuthDeviceCreateJson('{}'),
        );
    },

    async gatewaySessionReplaceAccess(
        input: ClientGatewaySessionReplaceAccessRequest,
    ): Promise<ClientGatewaySessionReplaceAccessResult> {
        return parsePioneerClientResponse<ClientGatewaySessionReplaceAccessResult>(
            await getPioneerClientNitro().gatewaySessionReplaceAccessJson(JSON.stringify(input)),
        );
    },

    async gatewaySettingsGet(): Promise<GatewaySettingsGetResponse> {
        return parsePioneerClientResponse<GatewaySettingsGetResponse>(
            await getPioneerClientNitro().gatewaySettingsGetJson('{}'),
        );
    },

    async gatewaySettingsUpdate(
        input: ClientGatewaySettingsUpdateRequest,
    ): Promise<GatewaySettingsUpdateResponse> {
        return parsePioneerClientResponse<GatewaySettingsUpdateResponse>(
            await getPioneerClientNitro().gatewaySettingsUpdateJson(JSON.stringify(input)),
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

    async artifactViewOpen(
        input: ClientArtifactTargetRequest,
    ): Promise<ClientArtifactViewOpenResult> {
        return parsePioneerClientResponse<ClientArtifactViewOpenResult>(
            await getPioneerClientNitro().artifactViewOpenJson(JSON.stringify(input)),
        );
    },

    async artifactDownload(
        input: ClientArtifactDownloadRequest,
    ): Promise<ClientArtifactDownloadResult> {
        return parsePioneerClientResponse<ClientArtifactDownloadResult>(
            await getPioneerClientNitro().artifactDownloadJson(JSON.stringify(input)),
        );
    },

    async artifactDownloadProgress(
        input: ClientArtifactDownloadOperationRequest,
    ): Promise<ClientArtifactDownloadProgressResult> {
        return parsePioneerClientResponse<ClientArtifactDownloadProgressResult>(
            await getPioneerClientNitro().artifactDownloadProgressJson(JSON.stringify(input)),
        );
    },

    async artifactDownloadCancel(
        input: ClientArtifactDownloadOperationRequest,
    ): Promise<ClientArtifactDownloadCancelResult> {
        return parsePioneerClientResponse<ClientArtifactDownloadCancelResult>(
            await getPioneerClientNitro().artifactDownloadCancelJson(JSON.stringify(input)),
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

    async cliRuntimeRefresh(input: CLIRuntimeRefreshParams): Promise<CLIRuntimeRefreshResponse> {
        return parsePioneerClientResponse<CLIRuntimeRefreshResponse>(
            await getPioneerClientNitro().cliRuntimeRefreshJson(JSON.stringify(input)),
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

    async turnPermissionRequestRespond(
        input: TurnPermissionRequestRespondParams,
    ): Promise<TurnPermissionRequestRespondResponse> {
        return parsePioneerClientResponse<TurnPermissionRequestRespondResponse>(
            await getPioneerClientNitro().turnPermissionRequestRespondJson(JSON.stringify(input)),
        );
    },

    async taskAccept(input: TaskAcceptParams): Promise<TaskAcceptResponse> {
        return parsePioneerClientResponse<TaskAcceptResponse>(
            await getPioneerClientNitro().taskAcceptJson(JSON.stringify(input)),
        );
    },

    async taskRevise(input: TaskReviseParams): Promise<TaskReviseResponse> {
        return parsePioneerClientResponse<TaskReviseResponse>(
            await getPioneerClientNitro().taskReviseJson(JSON.stringify(input)),
        );
    },

    async taskCancel(input: TaskCancelParams): Promise<TaskCancelResponse> {
        return parsePioneerClientResponse<TaskCancelResponse>(
            await getPioneerClientNitro().taskCancelJson(JSON.stringify(input)),
        );
    },

    async taskUserNotificationList(
        input: TaskUserNotificationListParams,
    ): Promise<TaskUserNotificationListResponse> {
        return parsePioneerClientResponse<TaskUserNotificationListResponse>(
            await getPioneerClientNitro().taskUserNotificationListJson(JSON.stringify(input)),
        );
    },

    async taskUserNotificationAcknowledge(
        input: TaskUserNotificationAcknowledgeParams,
    ): Promise<TaskUserNotificationAcknowledgeResponse> {
        return parsePioneerClientResponse<TaskUserNotificationAcknowledgeResponse>(
            await getPioneerClientNitro().taskUserNotificationAcknowledgeJson(
                JSON.stringify(input),
            ),
        );
    },

    async voiceStatus(input: VoiceStatusParams): Promise<VoiceStatusResponse> {
        return parsePioneerClientResponse<VoiceStatusResponse>(
            await getPioneerClientNitro().voiceStatusJson(JSON.stringify(input)),
        );
    },

    async voiceSessionStart(input: VoiceSessionStartParams): Promise<VoiceSessionStartResponse> {
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
        input: VoiceSessionFinalizeParams,
    ): Promise<VoiceSessionFinalizeResponse> {
        return parsePioneerClientResponse<VoiceSessionFinalizeResponse>(
            await getPioneerClientNitro().voiceSessionFinalizeJson(JSON.stringify(input)),
        );
    },

    async voiceSessionCancel(input: VoiceSessionCancelParams): Promise<VoiceSessionCancelResponse> {
        return parsePioneerClientResponse<VoiceSessionCancelResponse>(
            await getPioneerClientNitro().voiceSessionCancelJson(JSON.stringify(input)),
        );
    },

    pendingRequestResponsePlan(
        input: ClientPendingRequestResponsePlanRequest,
    ): ClientPendingRequestResponsePlanResult {
        return parsePioneerClientResponse<ClientPendingRequestResponsePlanResult>(
            getPioneerClientNitro().pendingRequestResponsePlanJson(JSON.stringify(input)),
        );
    },

    pendingRequestPresentation(
        input: ClientPendingRequestPresentationRequest,
    ): ClientPendingRequestPresentationResult {
        return parsePioneerClientResponse<ClientPendingRequestPresentationResult>(
            getPioneerClientNitro().pendingRequestPresentationJson(JSON.stringify(input)),
        );
    },

    async providerListModels(input: ProviderListModelsParams): Promise<ProviderListModelsResponse> {
        return parsePioneerClientResponse<ProviderListModelsResponse>(
            await getPioneerClientNitro().providerListModelsJson(JSON.stringify(input)),
        );
    },

    async providerListTranscriptionModels(
        input: ProviderListModelsParams,
    ): Promise<ProviderListModelsResponse> {
        return parsePioneerClientResponse<ProviderListModelsResponse>(
            await getPioneerClientNitro().providerListTranscriptionModelsJson(
                JSON.stringify(input),
            ),
        );
    },

    voiceInputSettingsPlan(input: ClientVoiceInputPlanRequest): ClientVoiceInputPlanResult {
        return parsePioneerClientResponse<ClientVoiceInputPlanResult>(
            getPioneerClientNitro().voiceInputSettingsPlanJson(JSON.stringify(input)),
        );
    },

    async providerModelDisplay(
        input: ProviderModelDisplayKey,
    ): Promise<ProviderModelDisplayResolution> {
        return parsePioneerClientResponse<ProviderModelDisplayResolution>(
            await getPioneerClientNitro().providerModelDisplayJson(JSON.stringify(input)),
        );
    },

    reasoningEffortRows(input: ReasoningEffortRowsRequest): ReasoningEffortRowsResponse {
        return parsePioneerClientResponse<ReasoningEffortRowsResponse>(
            getPioneerClientNitro().reasoningEffortRowsJson(JSON.stringify(input)),
        );
    },

    composerTurnModeOptions(): ThreadMode[] {
        return parsePioneerClientResponse<ThreadMode[]>(
            getPioneerClientNitro().composerTurnModeOptionsJson(),
        );
    },

    principalPresentationCapabilities(
        input: AuthorizationCapabilitySnapshot,
    ): PrincipalPresentationCapabilities {
        return parsePioneerClientResponse<PrincipalPresentationCapabilities>(
            getPioneerClientNitro().principalPresentationCapabilitiesJson(JSON.stringify(input)),
        );
    },

    authorizationProjectionAccept(
        input: ClientAuthorizationProjectionAcceptRequest,
    ): ClientAuthorizationProjectionAcceptResult {
        return parsePioneerClientResponse<ClientAuthorizationProjectionAcceptResult>(
            getPioneerClientNitro().authorizationProjectionAcceptJson(JSON.stringify(input)),
        );
    },

    artifactPresentationPolicy(
        input: ClientArtifactPresentationPolicyRequest,
    ): ArtifactPresentationPolicy {
        return parsePioneerClientResponse<ArtifactPresentationPolicy>(
            getPioneerClientNitro().artifactPresentationPolicyJson(JSON.stringify(input)),
        );
    },

    reconcileExecutionDraft(
        input: ClientExecutionDraftReconcileRequest,
    ): ExecutionDraftReconciliation {
        return parsePioneerClientResponse<ExecutionDraftReconciliation>(
            getPioneerClientNitro().reconcileExecutionDraftJson(JSON.stringify(input)),
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

    threadScopePresentation(input: ClientThreadScopePresentationRequest): ThreadScopePresentation {
        return parsePioneerClientResponse<ThreadScopePresentation>(
            getPioneerClientNitro().threadScopePresentationJson(JSON.stringify(input)),
        );
    },

    threadCreateVisibilityPlan(
        input: ClientThreadCreateVisibilityRequest,
    ): ThreadCreateVisibilityPlan {
        return parsePioneerClientResponse<ThreadCreateVisibilityPlan>(
            getPioneerClientNitro().threadCreateVisibilityPlanJson(JSON.stringify(input)),
        );
    },

    threadScopeMutationPlan(input: ClientThreadScopeMutationPlanRequest): ThreadScopeMutationPlan {
        return parsePioneerClientResponse<ThreadScopeMutationPlan>(
            getPioneerClientNitro().threadScopeMutationPlanJson(JSON.stringify(input)),
        );
    },

    memberPresentation(input: ClientMemberPresentationRequest): MemberListRow {
        return parsePioneerClientResponse<MemberListRow>(
            getPioneerClientNitro().memberPresentationJson(JSON.stringify(input)),
        );
    },

    invitationListRow(input: ClientInvitationListRowRequest): InvitationListRow {
        return parsePioneerClientResponse<InvitationListRow>(
            getPioneerClientNitro().invitationListRowJson(JSON.stringify(input)),
        );
    },

    administrationConflictRefetch(input: AdministrationAction): AdministrationRefetch[] {
        return parsePioneerClientResponse<AdministrationRefetch[]>(
            getPioneerClientNitro().administrationConflictRefetchJson(JSON.stringify(input)),
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

    async composerSkillPackPicker(
        input: ClientComposerSkillPackPickerRequest,
    ): Promise<ComposerSkillPickerProjection> {
        return parsePioneerClientResponse<ComposerSkillPickerProjection>(
            await getPioneerClientNitro().composerSkillPackPickerJson(JSON.stringify(input)),
        );
    },

    composerSkillSelectionToggle(
        input: ClientComposerSkillSelectionToggleRequest,
    ): ComposerSkillSelectionReduction {
        return parsePioneerClientResponse<ComposerSkillSelectionReduction>(
            getPioneerClientNitro().composerSkillSelectionToggleJson(JSON.stringify(input)),
        );
    },

    composerSkillChips(input: ClientComposerSkillChipsRequest): ComposerSkillChip[] {
        return parsePioneerClientResponse<ComposerSkillChip[]>(
            getPioneerClientNitro().composerSkillChipsJson(JSON.stringify(input)),
        );
    },

    composerCapabilitiesUpdate(
        input: ClientComposerCapabilitiesUpdateRequest,
    ): ComposerCapability[] {
        return parsePioneerClientResponse<ComposerCapability[]>(
            getPioneerClientNitro().composerCapabilitiesUpdateJson(JSON.stringify(input)),
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

    composerDomainTransition(
        input: ClientComposerDomainTransitionRequest,
    ): ComposerDomainTransition {
        return parsePioneerClientResponse<ComposerDomainTransition>(
            getPioneerClientNitro().composerDomainTransitionJson(JSON.stringify(input)),
        );
    },

    composerDraftLifecycleTransition(
        input: ClientComposerDraftLifecycleTransitionRequest,
    ): ComposerDraftLifecycleTransition {
        return parsePioneerClientResponse<ComposerDraftLifecycleTransition>(
            getPioneerClientNitro().composerDraftLifecycleTransitionJson(JSON.stringify(input)),
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

    async threadTimelinePage(input: ThreadTimelinePageParams): Promise<ThreadTimelinePageResponse> {
        return parsePioneerClientResponse<ThreadTimelinePageResponse>(
            await getPioneerClientNitro().threadTimelinePageJson(JSON.stringify(input)),
        );
    },

    async turnMessageEdit(input: TurnMessageEditParams): Promise<TurnMessageEditResponse> {
        return parsePioneerClientResponse<TurnMessageEditResponse>(
            await getPioneerClientNitro().turnMessageEditJson(JSON.stringify(input)),
        );
    },

    async turnMessageDelete(input: TurnMessageDeleteParams): Promise<TurnMessageDeleteResponse> {
        return parsePioneerClientResponse<TurnMessageDeleteResponse>(
            await getPioneerClientNitro().turnMessageDeleteJson(JSON.stringify(input)),
        );
    },

    async turnMessageRevisionsPage(
        input: TurnMessageRevisionsPageParams,
    ): Promise<TurnMessageRevisionsPageResponse> {
        return parsePioneerClientResponse<TurnMessageRevisionsPageResponse>(
            await getPioneerClientNitro().turnMessageRevisionsPageJson(JSON.stringify(input)),
        );
    },

    messageRevisionPagePresentation(
        input: TurnMessageRevisionsPageResponse,
    ): MessageRevisionPagePresentation {
        return parsePioneerClientResponse<MessageRevisionPagePresentation>(
            getPioneerClientNitro().messageRevisionPagePresentationJson(JSON.stringify(input)),
        );
    },

    async threadRead(input: ThreadReadParams): Promise<ThreadReadResponse> {
        return parsePioneerClientResponse<ThreadReadResponse>(
            await getPioneerClientNitro().threadReadJson(JSON.stringify(input)),
        );
    },

    async turnWorkPage(input: TurnWorkPageParams): Promise<TurnWorkPageResponse> {
        return parsePioneerClientResponse<TurnWorkPageResponse>(
            await getPioneerClientNitro().turnWorkPageJson(JSON.stringify(input)),
        );
    },

    async turnWorkItemsGet(input: TurnWorkItemsGetParams): Promise<TurnWorkItemsGetResponse> {
        return parsePioneerClientResponse<TurnWorkItemsGetResponse>(
            await getPioneerClientNitro().turnWorkItemsGetJson(JSON.stringify(input)),
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

    async activeThreadOpenById(
        input: ClientActiveThreadOpenByIdRequest,
    ): Promise<ClientActiveThreadSnapshot> {
        return parsePioneerClientResponse<ClientActiveThreadSnapshot>(
            await getPioneerClientNitro().activeThreadOpenByIdJson(JSON.stringify(input)),
        );
    },

    async activeThreadEnsureWorkspaceDraft(
        input: ClientEnsureWorkspaceDraftRequest,
    ): Promise<ClientActiveThreadSnapshot> {
        return parsePioneerClientResponse<ClientActiveThreadSnapshot>(
            await getPioneerClientNitro().activeThreadEnsureWorkspaceDraftJson(
                JSON.stringify(input),
            ),
        );
    },

    async activeThreadOpenOrCreateNew(
        input: ClientEnsureWorkspaceDraftRequest,
    ): Promise<ClientActiveThreadSnapshot> {
        return parsePioneerClientResponse<ClientActiveThreadSnapshot>(
            await getPioneerClientNitro().activeThreadOpenOrCreateNewJson(JSON.stringify(input)),
        );
    },

    activeThreadSnapshot(input: ClientActiveThreadSnapshotRequest): ClientActiveThreadSnapshot {
        return parsePioneerClientResponse<ClientActiveThreadSnapshot>(
            getPioneerClientNitro().activeThreadSnapshotJson(JSON.stringify(input)),
        );
    },

    async activeThreadApplyEvent(
        input: ClientActiveThreadEventRequest,
    ): Promise<ClientActiveThreadEventResult> {
        return parsePioneerClientResponse<ClientActiveThreadEventResult>(
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

    async prepareVoiceComposerSnapshot(
        input: ClientPrepareVoiceComposerSnapshotRequest,
    ): Promise<PreparedVoiceComposerSnapshot> {
        return parsePioneerClientResponse<PreparedVoiceComposerSnapshot>(
            await getPioneerClientNitro().prepareVoiceComposerSnapshotJson(JSON.stringify(input)),
        );
    },

    async activeThreadCancelTurn(
        input: ClientActiveThreadCancelTurnRequest,
    ): Promise<ClientActiveThreadCancelTurnResult> {
        return parsePioneerClientResponse<ClientActiveThreadCancelTurnResult>(
            await getPioneerClientNitro().activeThreadCancelTurnJson(JSON.stringify(input)),
        );
    },

    async activeThreadUnsubscribeOrClose(
        input: ClientActiveThreadUnsubscribeRequest,
    ): Promise<ClientActiveThreadUnsubscribeResult> {
        return parsePioneerClientResponse<ClientActiveThreadUnsubscribeResult>(
            await getPioneerClientNitro().activeThreadUnsubscribeOrCloseJson(JSON.stringify(input)),
        );
    },

    async activeThreadClear(): Promise<ClientActiveThreadClearResult> {
        return parsePioneerClientResponse<ClientActiveThreadClearResult>(
            await getPioneerClientNitro().activeThreadClearJson(),
        );
    },
};
