#pragma once

#include "HybridPioneerClientSpec.hpp"
#include "pioneer_client_ffi.h"

#include <NitroModules/ArrayBuffer.hpp>
#include <memory>
#include <mutex>
#include <shared_mutex>
#include <string>
#include <vector>

namespace margelo::nitro::pioneer::client {

class PioneerClientHolder {
public:
  PioneerClientHolder();
  ~PioneerClientHolder();

  std::string call(char* (*operation)(PioneerClientFfi*));
  std::string call(char* (*operation)(PioneerClientFfi*, const char*), const std::string& payload);
  std::string call(
      char* (*operation)(PioneerClientFfi*, const char*, const uint8_t*, size_t),
      const std::string& payload,
      const std::vector<uint8_t>& bytes);
  void destroy();

private:
  std::shared_mutex mutex_;
  PioneerClientFfi* client_;
};

class HybridPioneerClient : public HybridPioneerClientSpec {
  friend class PioneerClientHolder;

public:
  HybridPioneerClient();
  ~HybridPioneerClient() override;

  std::string versionJson() override;
  std::string initializeJson(const std::string& configJson) override;
  std::string diagnosticsDrainJson() override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayValidateRemoteJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayPlanAddRemoteJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayPlanAddAndActivateRemoteRegistryJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayPlanActivateRegistryJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayPlanUpdateRemoteRegistryJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayPlanDeleteRemoteRegistryJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayPlanSetWorkspaceRegistryJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayConnectJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewaySettingsGetJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewaySettingsUpdateJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayNextEventsJson() override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayDisconnectJson() override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> workspaceBootstrapJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> workspaceSwitchJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> workspaceCreateJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> workspaceRenameJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> providerListJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> cliRuntimeListJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> cliRuntimeRefreshJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> cliRuntimeListModelsJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> cliRuntimeThreadBindingGetJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> cliRuntimeThreadCompactJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> cliRuntimeTurnSteerJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> cliRuntimeReviewStartJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> cliRuntimeRequestRespondJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> turnPermissionRequestRespondJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> voiceStatusJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> voiceSessionStartJson(
      const std::string& inputJson) override;
  std::string voiceAudioChunkJson(
      const std::string& inputJson,
      const std::shared_ptr<margelo::nitro::ArrayBuffer>& pcmChunk) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> voiceSessionFinalizeJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> voiceSessionCancelJson(
      const std::string& inputJson) override;
  std::string pendingRequestResponsePlanJson(const std::string& inputJson) override;
  std::string pendingRequestPresentationJson(const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> providerListModelsJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> providerListTranscriptionModelsJson(
      const std::string& inputJson) override;
  std::string voiceInputSettingsPlanJson(const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> providerModelDisplayJson(
      const std::string& inputJson) override;
  std::string reasoningEffortRowsJson(const std::string& inputJson) override;
  std::string composerPermissionModeOptionsJson() override;
  std::string composerAttachmentFromPathJson(const std::string& inputJson) override;
  std::string composerAttachmentsUpdateJson(const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> composerSkillPickerRowsJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> composerMcpPickerRowsJson(
      const std::string& inputJson) override;
  std::string composerCapabilitiesUpdateJson(const std::string& inputJson) override;
  std::string composerCapabilityTargetJson(const std::string& inputJson) override;
  std::string composerCapabilityMenuVisibilityJson(const std::string& inputJson) override;
  std::string composerSubmissionPlanJson(const std::string& inputJson) override;
  std::string composerDomainTransitionJson(const std::string& inputJson) override;
  std::string composerDraftLifecycleTransitionJson(const std::string& inputJson) override;
  std::string composerSkillRowsForTargetJson(const std::string& inputJson) override;
  std::string composerSkillCapabilityFromRowJson(const std::string& inputJson) override;
  std::string composerMcpCapabilityFromRowJson(const std::string& inputJson) override;
  std::string composerSkillToggleJson(const std::string& inputJson) override;
  std::string composerMcpToggleJson(const std::string& inputJson) override;
  std::string composerFilterSkillRowsJson(const std::string& inputJson) override;
  std::string composerFilterMcpRowsJson(const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> threadTreeRefreshJson(
      const std::string& inputJson) override;
  std::string threadTreeLevelJson(const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> threadTimelinePageJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> turnWorkPageJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> agentsDocGetJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> agentsDocSaveJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> agentsDocArchiveJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> activeThreadOpenJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> activeThreadOpenByIdJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> activeThreadEnsureWorkspaceDraftJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> activeThreadOpenOrCreateNewJson(
      const std::string& inputJson) override;
  std::string activeThreadSnapshotJson(const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> activeThreadApplyEventJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> activeThreadSendTextJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> prepareVoiceComposerSnapshotJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> activeThreadCancelTurnJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> activeThreadUnsubscribeOrCloseJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> activeThreadClearJson() override;

private:
  std::shared_ptr<PioneerClientHolder> holder_;

  std::string callWithClient(char* (*operation)(PioneerClientFfi*));
  std::string callWithClient(char* (*operation)(PioneerClientFfi*, const char*), const std::string& payload);
  std::string callWithClient(
      char* (*operation)(PioneerClientFfi*, const char*, const uint8_t*, size_t),
      const std::string& payload,
      const std::vector<uint8_t>& bytes);
  std::shared_ptr<margelo::nitro::Promise<std::string>> callWithClientAsync(
      char* (*operation)(PioneerClientFfi*, const char*),
      const std::string& payload);
  std::shared_ptr<margelo::nitro::Promise<std::string>> callWithClientAsync(
      char* (*operation)(PioneerClientFfi*));
  void destroyClient();

  static std::string takeOwnedCString(char* value);
};

} // namespace margelo::nitro::pioneer::client
