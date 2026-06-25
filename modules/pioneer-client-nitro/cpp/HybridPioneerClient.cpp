#include "HybridPioneerClient.hpp"

#include <stdexcept>

namespace margelo::nitro::pioneer::client {

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

std::string HybridPioneerClient::diagnosticsDrainJson() {
  return callWithClient(pioneer_client_ffi_diagnostics_drain);
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
HybridPioneerClient::gatewayConnectJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_gateway_connect, inputJson);
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
HybridPioneerClient::providerListModelsJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_provider_list_models, inputJson);
}

std::shared_ptr<margelo::nitro::Promise<std::string>>
HybridPioneerClient::providerModelDisplayJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_provider_model_display, inputJson);
}

std::string HybridPioneerClient::reasoningEffortRowsJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_reasoning_effort_rows, inputJson);
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

std::string HybridPioneerClient::composerCapabilitiesUpdateJson(const std::string& inputJson) {
  return callWithClient(pioneer_client_ffi_composer_capabilities_update, inputJson);
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
HybridPioneerClient::activeThreadCancelTurnJson(const std::string& inputJson) {
  return callWithClientAsync(pioneer_client_ffi_active_thread_cancel_turn, inputJson);
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
