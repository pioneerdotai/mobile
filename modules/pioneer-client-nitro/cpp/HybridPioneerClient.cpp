#include "HybridPioneerClient.hpp"

#include <algorithm>
#include <stdexcept>

namespace margelo::nitro::pioneer::client {

namespace {

void wipeString(std::string& value) noexcept {
  if (!value.empty()) {
    volatile char* bytes = value.data();
    for (size_t index = 0; index < value.size(); ++index) {
      bytes[index] = '\0';
    }
  }
  value.clear();
}

} // namespace

PioneerClientHolder::PioneerClientHolder()
    : client_(pioneer_client_ffi_client_create()) {
  if (client_ == nullptr) {
    throw std::runtime_error("failed to create pioneer client runtime");
  }
}

PioneerClientHolder::~PioneerClientHolder() {
  destroy();
}

std::string PioneerClientHolder::call(char* (*operation)(PioneerClientFfi*)) {
  std::shared_lock<std::shared_mutex> lock(mutex_);
  if (client_ == nullptr) {
    throw std::runtime_error("pioneer client runtime has been disposed");
  }
  return HybridPioneerClient::takeOwnedCString(operation(client_));
}

std::string PioneerClientHolder::call(
    char* (*operation)(PioneerClientFfi*, const char*),
    const std::string& payload) {
  std::shared_lock<std::shared_mutex> lock(mutex_);
  if (client_ == nullptr) {
    throw std::runtime_error("pioneer client runtime has been disposed");
  }
  return HybridPioneerClient::takeOwnedCString(operation(client_, payload.c_str()));
}

std::string PioneerClientHolder::call(
    char* (*operation)(PioneerClientFfi*, const char*, const uint8_t*, size_t),
    const std::string& payload,
    const std::vector<uint8_t>& bytes) {
  std::shared_lock<std::shared_mutex> lock(mutex_);
  if (client_ == nullptr) {
    throw std::runtime_error("pioneer client runtime has been disposed");
  }
  const uint8_t* data = bytes.empty() ? nullptr : bytes.data();
  return HybridPioneerClient::takeOwnedCString(
      operation(client_, payload.c_str(), data, bytes.size()));
}

void PioneerClientHolder::destroy() {
  std::unique_lock<std::shared_mutex> lock(mutex_);
  if (client_ != nullptr) {
    pioneer_client_ffi_client_destroy(client_);
    client_ = nullptr;
  }
}

HybridPioneerClient::HybridPioneerClient()
    : HybridObject(TAG), holder_(std::make_shared<PioneerClientHolder>()) {}

HybridPioneerClient::~HybridPioneerClient() {
  destroyClient();
}

std::string HybridPioneerClient::versionJson() {
  return takeOwnedCString(pioneer_client_ffi_version());
}

std::string HybridPioneerClient::initializeJson(const std::string& configJson) {
  return callWithClient(pioneer_client_ffi_client_initialize, configJson);
}

std::string HybridPioneerClient::mobileStartupRecordJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_mobile_startup_record, inputJson);
}

std::string HybridPioneerClient::diagnosticsDrainJson() {
  return callWithClient(pioneer_client_ffi_diagnostics_drain);
}

std::string HybridPioneerClient::gatewayLoadRegistryV3Json(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_gateway_load_registry_v3, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayValidateRemoteJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_validate_remote, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayPlanAddRemoteJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_plan_add_remote, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayPlanAddAndActivateRemoteRegistryJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_plan_add_and_activate_remote_registry, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayPlanActivateRegistryJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_plan_activate_registry, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayPlanUpdateRemoteRegistryJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_plan_update_remote_registry, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayPlanDeleteRemoteRegistryJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_plan_delete_remote_registry, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayPlanSetWorkspaceRegistryJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_plan_set_workspace_registry, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewaySessionLifecycleReduceJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_session_lifecycle_reduce, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayDeviceActivationPresentationJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_gateway_device_activation_presentation, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayDeviceActivationParseJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_gateway_device_activation_parse, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayAuthRefreshJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_gateway_auth_refresh, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayAuthDeviceActivateJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_gateway_auth_device_activate, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayAuthSessionCleanupJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_gateway_auth_session_cleanup, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayAuthMeJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_auth_me, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayAuthorizationCapabilitiesJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_authorization_capabilities, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayAuthProfileUpdateJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_auth_profile_update, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayAuthSessionListJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_auth_session_list, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayAuthSessionRevokeJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_auth_session_revoke, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayAuthLogoutJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_auth_logout, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayAuthDeviceCreateJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_auth_device_create, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::invitationPresentationJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_invitation_presentation, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::invitationPreviewJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_invitation_preview, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::invitationAcceptJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_invitation_accept, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::invitationCommitTakeRefreshJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_invitation_commit_take_refresh, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::invitationCommitSecureStorageCommittedJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_invitation_commit_secure_storage_committed, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::invitationCommitRegistryCommittedJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_invitation_commit_registry_committed, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::invitationCommitSecureStorageFailedJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_invitation_commit_secure_storage_failed, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::invitationCommitRegistryFailedJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_invitation_commit_registry_failed, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::invitationCreateJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_invitation_create, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::invitationListJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_invitation_list, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::invitationRevokeJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_invitation_revoke, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::memberListJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_member_list, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::memberAvatarCacheJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_member_avatar_cache, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::agentAvatarCacheJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_agent_avatar_cache, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::memberSuspendJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_member_suspend, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::memberRestoreJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_member_restore, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::memberRemoveJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_member_remove, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::memberDeviceCreateJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_member_device_create, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::workspaceMemberListJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_workspace_member_list, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::workspaceMemberAddJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_workspace_member_add, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::workspaceMemberRemoveJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_workspace_member_remove, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::threadParticipantsListJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_thread_participants_list, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::threadUpdateJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_thread_update, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::threadParticipantAddJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_thread_participant_add, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::threadParticipantRemoveJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_thread_participant_remove, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewaySessionReplaceAccessJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_gateway_session_replace_access, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewaySettingsGetJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_settings_get, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewaySettingsUpdateJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_settings_update, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayNextEventsJson() {
  return callWithClientAsync(pioneer_client_ffi_gateway_next_events);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayDisconnectJson() {
  return callWithClientAsync(pioneer_client_ffi_gateway_disconnect);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::artifactViewOpenJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_artifact_view_open, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::artifactDownloadJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_artifact_download, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::artifactDownloadProgressJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_artifact_download_progress, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::artifactDownloadCancelJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_artifact_download_cancel, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::workspaceBootstrapJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_workspace_bootstrap, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::workspaceSwitchJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_workspace_switch, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::workspaceCreateJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_workspace_create, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::workspaceRenameJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_workspace_rename, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::providerListJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_provider_list, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::cliRuntimeListJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_cli_runtime_list, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::cliRuntimeRefreshJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_cli_runtime_refresh, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::cliRuntimeListModelsJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_cli_runtime_list_models, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::cliRuntimeThreadBindingGetJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_cli_runtime_thread_binding_get, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::cliRuntimeThreadCompactJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_cli_runtime_thread_compact, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::cliRuntimeTurnSteerJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_cli_runtime_turn_steer, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::cliRuntimeReviewStartJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_cli_runtime_review_start, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::cliRuntimeRequestRespondJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_cli_runtime_request_respond, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::turnPermissionRequestRespondJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_turn_permission_request_respond, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::taskAcceptJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_task_accept, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::taskReviseJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_task_revise, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::taskCancelJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_task_cancel, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::taskUserNotificationListJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_task_user_notification_list, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::taskUserNotificationAcknowledgeJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_task_user_notification_acknowledge, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::voiceStatusJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_voice_status, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::voiceSessionStartJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_voice_session_start, inputJson);
}

std::string HybridPioneerClient::voiceAudioChunkJson(
    const std::string& inputJson,
    const std::shared_ptr<margelo::nitro::ArrayBuffer>& pcmChunk) {
  if (!pcmChunk) {
    throw std::runtime_error("voice audio chunk buffer is required");
  }

  const auto size = pcmChunk->size();
  std::vector<uint8_t> bytes(size);
  if (size > 0) {
    const auto* data = pcmChunk->data();
    if (data == nullptr) {
      throw std::runtime_error("voice audio chunk buffer has null data");
    }
    std::copy(data, data + size, bytes.begin());
  }

  return callWithClient(pioneer_client_ffi_voice_audio_chunk, inputJson, bytes);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::voiceSessionFinalizeJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_voice_session_finalize, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::voiceSessionCancelJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_voice_session_cancel, inputJson);
}

std::string HybridPioneerClient::pendingRequestResponsePlanJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_pending_request_response_plan, inputJson);
}

std::string HybridPioneerClient::pendingRequestPresentationJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_pending_request_presentation, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::providerListModelsJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_provider_list_models, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::providerListTranscriptionModelsJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_provider_list_transcription_models, inputJson);
}

std::string HybridPioneerClient::voiceInputSettingsPlanJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_voice_input_settings_plan, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::providerModelDisplayJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_provider_model_display, inputJson);
}

std::string HybridPioneerClient::reasoningEffortRowsJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_reasoning_effort_rows, inputJson);
}

std::string HybridPioneerClient::composerTurnModeOptionsJson() {
  return callWithClient(pioneer_client_ffi_composer_turn_mode_options);
}

std::string HybridPioneerClient::principalPresentationCapabilitiesJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_principal_presentation_capabilities, inputJson);
}

std::string HybridPioneerClient::authorizationProjectionAcceptJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_authorization_projection_accept, inputJson);
}

std::string HybridPioneerClient::artifactPresentationPolicyJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_artifact_presentation_policy, inputJson);
}

std::string HybridPioneerClient::reconcileExecutionDraftJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_reconcile_execution_draft, inputJson);
}

std::string HybridPioneerClient::currentPrincipalPresentationJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_current_principal_presentation, inputJson);
}

std::string HybridPioneerClient::sessionListRowPresentationJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_session_list_row_presentation, inputJson);
}

std::string HybridPioneerClient::threadScopePresentationJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_thread_scope_presentation, inputJson);
}

std::string HybridPioneerClient::threadCreateVisibilityPlanJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_thread_create_visibility_plan, inputJson);
}

std::string HybridPioneerClient::threadScopeMutationPlanJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_thread_scope_mutation_plan, inputJson);
}

std::string HybridPioneerClient::memberPresentationJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_member_presentation, inputJson);
}

std::string HybridPioneerClient::invitationListRowJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_invitation_list_row, inputJson);
}

std::string HybridPioneerClient::administrationConflictRefetchJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_administration_conflict_refetch, inputJson);
}

std::string HybridPioneerClient::composerAttachmentFromPathJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_attachment_from_path, inputJson);
}

std::string HybridPioneerClient::composerAttachmentsUpdateJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_attachments_update, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::composerSkillPickerRowsJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_composer_skill_picker_rows, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::composerMcpPickerRowsJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_composer_mcp_picker_rows, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::composerSkillPackPickerJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_composer_skill_pack_picker, inputJson);
}

std::string HybridPioneerClient::composerSkillSelectionToggleJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_skill_selection_toggle, inputJson);
}

std::string HybridPioneerClient::composerSkillChipsJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_skill_chips, inputJson);
}

std::string HybridPioneerClient::composerCapabilitiesUpdateJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_capabilities_update, inputJson);
}

std::string HybridPioneerClient::composerCapabilityTargetJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_capability_target, inputJson);
}

std::string HybridPioneerClient::composerCapabilityMenuVisibilityJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_capability_menu_visibility, inputJson);
}

std::string HybridPioneerClient::composerSubmissionPlanJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_submission_plan, inputJson);
}

std::string HybridPioneerClient::composerDomainTransitionJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_domain_transition, inputJson);
}

std::string HybridPioneerClient::composerDraftLifecycleTransitionJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_draft_lifecycle_transition, inputJson);
}

std::string HybridPioneerClient::composerSkillRowsForTargetJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_skill_rows_for_target, inputJson);
}

std::string HybridPioneerClient::composerSkillCapabilityFromRowJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_skill_capability_from_row, inputJson);
}

std::string HybridPioneerClient::composerMcpCapabilityFromRowJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_mcp_capability_from_row, inputJson);
}

std::string HybridPioneerClient::composerSkillToggleJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_skill_toggle, inputJson);
}

std::string HybridPioneerClient::composerMcpToggleJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_mcp_toggle, inputJson);
}

std::string HybridPioneerClient::composerFilterSkillRowsJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_filter_skill_rows, inputJson);
}

std::string HybridPioneerClient::composerFilterMcpRowsJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_filter_mcp_rows, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::threadTreeRefreshJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_thread_tree_refresh, inputJson);
}

std::string HybridPioneerClient::threadTreeLevelJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_thread_tree_level, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::threadTimelinePageJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_thread_timeline_page, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::turnMessageEditJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_turn_message_edit, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::turnMessageDeleteJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_turn_message_delete, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::turnMessageRevisionsPageJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_turn_message_revisions_page, inputJson);
}

std::string HybridPioneerClient::messageRevisionPagePresentationJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_message_revision_page_presentation, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::threadReadJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_thread_read, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::turnWorkPageJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_turn_work_page, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::turnWorkItemsGetJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_turn_work_items_get, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::agentsDocGetJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_agents_doc_get, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::agentsDocSaveJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_agents_doc_save, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::agentsDocArchiveJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_agents_doc_archive, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::activeThreadOpenJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_active_thread_open, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::activeThreadOpenByIdJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_active_thread_open_by_id, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::activeThreadEnsureWorkspaceDraftJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_active_thread_ensure_workspace_draft, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::activeThreadOpenOrCreateNewJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_active_thread_open_or_create_new, inputJson);
}

std::string HybridPioneerClient::activeThreadSnapshotJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_active_thread_snapshot, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::activeThreadApplyEventJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_active_thread_apply_event, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::activeThreadSendTextJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_active_thread_send_text, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::prepareVoiceComposerSnapshotJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_prepare_voice_composer_snapshot, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::activeThreadCancelTurnJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_active_thread_cancel_turn, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::activeThreadUnsubscribeOrCloseJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_active_thread_unsubscribe_or_close, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::activeThreadClearJson() {
  return callWithClientAsync(pioneer_client_ffi_active_thread_clear);
}

std::string HybridPioneerClient::callWithClient(char* (*operation)(PioneerClientFfi*)) {
  if (!holder_) {
    throw std::runtime_error("pioneer client runtime has been disposed");
  }
  return holder_->call(operation);
}

std::string HybridPioneerClient::callWithClient(
    char* (*operation)(PioneerClientFfi*, const char*),
    const std::string& payload) {
  if (!holder_) {
    throw std::runtime_error("pioneer client runtime has been disposed");
  }
  return holder_->call(operation, payload);
}

std::string HybridPioneerClient::callWithClient(
    char* (*operation)(PioneerClientFfi*, const char*, const uint8_t*, size_t),
    const std::string& payload,
    const std::vector<uint8_t>& bytes) {
  if (!holder_) {
    throw std::runtime_error("pioneer client runtime has been disposed");
  }
  return holder_->call(operation, payload, bytes);
}

std::shared_ptr<margelo::nitro::Promise<std::string>> HybridPioneerClient::callWithClientAsync(
    char* (*operation)(PioneerClientFfi*, const char*),
    const std::string& payload) {
  if (!holder_) {
    return margelo::nitro::Promise<std::string>::rejected(
        std::make_exception_ptr(std::runtime_error("pioneer client runtime has been disposed")));
  }

  auto holder = holder_;
  return margelo::nitro::Promise<std::string>::async([holder, operation, payload]() {
    return holder->call(operation, payload);
  });
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::callWithClientAsyncSensitive(
    char* (*operation)(PioneerClientFfi*, const char*),
    const std::string& payload) {
  if (!holder_) {
    return margelo::nitro::Promise<std::string>::rejected(
        std::make_exception_ptr(std::runtime_error("pioneer client runtime has been disposed")));
  }

  auto holder = holder_;
  auto ownedPayload = payload;
  return margelo::nitro::Promise<std::string>::async(
      [holder, operation, payload = std::move(ownedPayload)]() mutable {
        try {
          auto result = holder->call(operation, payload);
          wipeString(payload);
          return result;
        } catch (...) {
          wipeString(payload);
          throw;
        }
      });
}

std::shared_ptr<margelo::nitro::Promise<std::string>> HybridPioneerClient::callWithClientAsync(
    char* (*operation)(PioneerClientFfi*)) {
  if (!holder_) {
    return margelo::nitro::Promise<std::string>::rejected(
        std::make_exception_ptr(std::runtime_error("pioneer client runtime has been disposed")));
  }

  auto holder = holder_;
  return margelo::nitro::Promise<std::string>::async([holder, operation]() {
    return holder->call(operation);
  });
}

void HybridPioneerClient::destroyClient() {
  if (holder_) {
    holder_->destroy();
    holder_.reset();
  }
}

std::string HybridPioneerClient::takeOwnedCString(char* value) {
  if (value == nullptr) {
    throw std::runtime_error("pioneer client returned a null response");
  }

  std::string result(value);
  pioneer_client_ffi_string_destroy(value);
  return result;
}

} // namespace margelo::nitro::pioneer::client
