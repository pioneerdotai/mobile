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
  std::shared_ptr<margelo::nitro::Promise<std::string>> clientShutdownJson() override;
  std::string clientScopeAcquireJson(const std::string& inputJson) override;
  std::string clientScopeReleaseJson(const std::string& inputJson) override;
  std::string clientIntentDispatchJson(const std::string& inputJson) override;
  std::string clientScopedSnapshotJson(const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewaySessionValidateJson(const std::string& inputJson) override;
  std::string clientChangeBatchJson(const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> clientWaitPublicationsJson(const std::string& inputJson) override;
  std::string clientEffectCompleteJson(const std::string& inputJson) override;
  std::string clientEffectCancelJson(const std::string& inputJson) override;
  std::string clientSequenceGapResnapshotJson(const std::string& inputJson) override;
  std::string mobileStartupRecordJson(const std::string& inputJson) override;
  std::string diagnosticsDrainJson() override;
  std::string gatewayLoadRegistryV3Json(const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayDeviceActivationPresentationJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayDeviceActivationParseJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayAuthMeJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayAuthorizationCapabilitiesJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> invitationPresentationJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> invitationCreateJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> memberAvatarCacheJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> agentAvatarCacheJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> memberDeviceCreateJson(
      const std::string& inputJson) override;
  std::string gatewayTransportReserveJson(const std::string& inputJson) override;
  std::string gatewayTransportReleaseJson(const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayTransportWaitJson(const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> artifactViewOpenJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> threadFileViewOpenJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> artifactDownloadJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> workspaceBootstrapJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> workspaceSwitchJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> workspaceCreateJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> workspaceRenameJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> composerVoiceCapturePlanJson(
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
  std::string pendingRequestPresentationJson(const std::string& inputJson) override;
  std::string principalPresentationCapabilitiesJson(const std::string& inputJson) override;
  std::string artifactPresentationPolicyJson(const std::string& inputJson) override;
  std::string currentPrincipalPresentationJson(const std::string& inputJson) override;
  std::string sessionListRowPresentationJson(const std::string& inputJson) override;
  std::string threadCreateVisibilityPlanJson(const std::string& inputJson) override;
  std::string memberPresentationJson(const std::string& inputJson) override;
  std::string composerAttachmentFromPathJson(const std::string& inputJson) override;
  std::string composerSkillPackPickerJson(
      const std::string& inputJson) override;
  std::string composerSkillChipsJson(const std::string& inputJson) override;
  std::string composerCapabilityTargetJson(const std::string& inputJson) override;
  std::string composerCapabilityMenuVisibilityJson(const std::string& inputJson) override;
  std::string composerSubmissionPlanJson(const std::string& inputJson) override;
  std::string composerSkillRowsForTargetJson(const std::string& inputJson) override;
  std::string composerFilterMcpRowsJson(const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> threadTreeRefreshJson(
      const std::string& inputJson) override;
  std::string threadTreeLevelJson(const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> activeThreadOpenJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> activeThreadOpenByIdJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> activeThreadOpenOrCreateNewJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> activeThreadSendTextJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> prepareVoiceComposerSnapshotJson(
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
  std::shared_ptr<margelo::nitro::Promise<std::string>> callWithClientAsyncSensitive(
      char* (*operation)(PioneerClientFfi*, const char*),
      const std::string& payload);
  std::shared_ptr<margelo::nitro::Promise<std::string>> callWithClientAsync(
      char* (*operation)(PioneerClientFfi*));
  void destroyClient();

  static std::string takeOwnedCString(char* value);
};

} // namespace margelo::nitro::pioneer::client
