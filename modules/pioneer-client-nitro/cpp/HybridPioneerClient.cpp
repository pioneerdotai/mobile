#include "HybridPioneerClient.hpp"

#include <algorithm>
#include <atomic>
#include <stdexcept>

namespace margelo::nitro::pioneer::client {

namespace {

std::shared_ptr<PioneerClientHolder> processHolder() {
  static auto holder = std::make_shared<PioneerClientHolder>();
  return holder;
}
std::shared_ptr<void> reserveAsync(bool delivery, bool control = false) {
  static std::atomic<size_t> requests{0};
  static std::atomic<size_t> waits{0};
  static std::atomic<size_t> controls{0};
  auto* count = control ? &controls : delivery ? &waits : &requests;
  const size_t limit = delivery || control ? 1 : 64;
  size_t current = count->load();
  do {
    if (current >= limit) throw std::runtime_error("client_boundary_overloaded");
  } while (!count->compare_exchange_weak(current, current + 1));
  return std::shared_ptr<void>(count, [count](void*) { count->fetch_sub(1); });
}

void validatePayloadSize(size_t size) {
  if (size > 8 * 1024 * 1024) throw std::runtime_error("client_input_capacity_exceeded");
}

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
  validatePayloadSize(payload.size());
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
  {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    if (client_ != nullptr) {
      // Wake native event and publication waits before waiting for their readers.
      char* response = pioneer_client_ffi_client_shutdown(client_, "{}");
      pioneer_client_ffi_string_destroy(response);
    }
  }
  std::unique_lock<std::shared_mutex> lock(mutex_);
  if (client_ != nullptr) {
    pioneer_client_ffi_client_destroy(client_);
    client_ = nullptr;
  }
}

HybridPioneerClient::HybridPioneerClient()
    : HybridObject(TAG), holder_(processHolder()) {}

HybridPioneerClient::~HybridPioneerClient() {
  destroyClient();
}

std::string HybridPioneerClient::versionJson() {
  return takeOwnedCString(pioneer_client_ffi_version());
}

std::string HybridPioneerClient::initializeJson(const std::string& configJson) {
  return callWithClient(pioneer_client_ffi_client_initialize, configJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>> HybridPioneerClient::clientShutdownJson() {
  return callWithClientAsync(pioneer_client_ffi_client_shutdown, "{}");
}

std::string HybridPioneerClient::clientScopeAcquireJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_client_scope_acquire, inputJson);
}

std::string HybridPioneerClient::clientScopeReleaseJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_client_scope_release, inputJson);
}

std::string HybridPioneerClient::clientIntentDispatchJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_client_intent_dispatch, inputJson);
}

std::string HybridPioneerClient::clientScopedSnapshotJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_client_scoped_snapshot, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewaySessionValidateJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_gateway_session_validate, inputJson);
}

std::string HybridPioneerClient::clientChangeBatchJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_client_change_batch, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::clientWaitPublicationsJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_client_wait_publications, inputJson);
}

std::string HybridPioneerClient::clientEffectCompleteJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_client_effect_complete, inputJson);
}

std::string HybridPioneerClient::clientEffectCancelJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_client_effect_cancel, inputJson);
}

std::string HybridPioneerClient::clientSequenceGapResnapshotJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_client_sequence_gap_resnapshot, inputJson);
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
HybridPioneerClient::gatewayDeviceActivationPresentationJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_gateway_device_activation_presentation, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayDeviceActivationParseJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_gateway_device_activation_parse, inputJson);
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
HybridPioneerClient::invitationPresentationJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_invitation_presentation, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::invitationCreateJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_invitation_create, inputJson);
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
HybridPioneerClient::memberDeviceCreateJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_member_device_create, inputJson);
}

std::string HybridPioneerClient::gatewayTransportReserveJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_gateway_transport_reserve, inputJson);
}

std::string HybridPioneerClient::gatewayTransportReleaseJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_gateway_transport_release, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::gatewayTransportWaitJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_transport_wait, inputJson);
}





std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::artifactViewOpenJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_artifact_view_open, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::threadFileViewOpenJson(const std::string& inputJson) {
  return callWithClientAsyncSensitive(pioneer_client_ffi_thread_file_view_open, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::artifactDownloadJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_artifact_download, inputJson);
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
HybridPioneerClient::composerVoiceCapturePlanJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_composer_voice_capture_plan, inputJson);
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
  validatePayloadSize(size);
  validatePayloadSize(inputJson.size());
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

std::string HybridPioneerClient::pendingRequestPresentationJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_pending_request_presentation, inputJson);
}


std::string HybridPioneerClient::principalPresentationCapabilitiesJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_principal_presentation_capabilities, inputJson);
}

std::string HybridPioneerClient::artifactPresentationPolicyJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_artifact_presentation_policy, inputJson);
}

std::string HybridPioneerClient::currentPrincipalPresentationJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_current_principal_presentation, inputJson);
}

std::string HybridPioneerClient::sessionListRowPresentationJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_session_list_row_presentation, inputJson);
}

std::string HybridPioneerClient::threadCreateVisibilityPlanJson(
    const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_thread_create_visibility_plan, inputJson);
}

std::string HybridPioneerClient::memberPresentationJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_member_presentation, inputJson);
}

std::string HybridPioneerClient::composerAttachmentFromPathJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_attachment_from_path, inputJson);
}

std::string HybridPioneerClient::composerSkillPackPickerJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_skill_pack_picker, inputJson);
}

std::string HybridPioneerClient::composerSkillChipsJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_skill_chips, inputJson);
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

std::string HybridPioneerClient::composerSkillRowsForTargetJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_skill_rows_for_target, inputJson);
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
HybridPioneerClient::activeThreadOpenJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_active_thread_open, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::activeThreadOpenByIdJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_active_thread_open_by_id, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::activeThreadOpenOrCreateNewJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_active_thread_open_or_create_new, inputJson);
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
  validatePayloadSize(payload.size());
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
  validatePayloadSize(payload.size());
  if (!holder_) {
    return margelo::nitro::Promise<std::string>::rejected(
        std::make_exception_ptr(std::runtime_error("pioneer client runtime has been disposed")));
  }

  auto holder = holder_;
  auto lease = reserveAsync(operation == pioneer_client_ffi_client_wait_publications, operation == pioneer_client_ffi_client_shutdown);
  return margelo::nitro::Promise<std::string>::async([holder, lease, operation, payload]() {
    return holder->call(operation, payload);
  });
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::callWithClientAsyncSensitive(
    char* (*operation)(PioneerClientFfi*, const char*),
    const std::string& payload) {
  validatePayloadSize(payload.size());
  if (!holder_) {
    return margelo::nitro::Promise<std::string>::rejected(
        std::make_exception_ptr(std::runtime_error("pioneer client runtime has been disposed")));
  }

  auto holder = holder_;
  auto lease = reserveAsync(false);
  auto ownedPayload = payload;
  return margelo::nitro::Promise<std::string>::async(
      [holder, lease, operation, payload = std::move(ownedPayload)]() mutable {
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
  auto lease = reserveAsync(false);
  return margelo::nitro::Promise<std::string>::async([holder, lease, operation]() {
    return holder->call(operation);
  });
}

void HybridPioneerClient::destroyClient() {
  if (holder_) {
    holder_.reset();
  }
}

std::string HybridPioneerClient::takeOwnedCString(char* value) {
  if (value == nullptr) {
    throw std::runtime_error("pioneer client returned a null response");
  }

  std::unique_ptr<char, decltype(&pioneer_client_ffi_string_destroy)> owned(value, pioneer_client_ffi_string_destroy);
  return std::string(owned.get());
}

} // namespace margelo::nitro::pioneer::client
