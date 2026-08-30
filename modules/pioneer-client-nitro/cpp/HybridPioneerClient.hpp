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
  std::string mobileStartupRecordJson(const std::string& inputJson) override;
  std::string diagnosticsDrainJson() override;
  std::string gatewayLoadRegistryV3Json(const std::string& inputJson) override;
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
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewaySessionLifecycleReduceJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayDeviceActivationPresentationJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayDeviceActivationParseJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayAuthRefreshJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayAuthDeviceActivateJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayAuthSessionCleanupJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayAuthMeJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayAuthorizationCapabilitiesJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayAuthProfileUpdateJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayAuthSessionListJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayAuthSessionRevokeJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayAuthLogoutJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayAuthDeviceCreateJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> invitationPresentationJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> invitationPreviewJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> invitationAcceptJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> invitationCommitTakeRefreshJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> invitationCommitSecureStorageCommittedJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> invitationCommitRegistryCommittedJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> invitationCommitSecureStorageFailedJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> invitationCommitRegistryFailedJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> invitationCreateJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> invitationListJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> invitationRevokeJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> memberListJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> memberAvatarCacheJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> agentAvatarCacheJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> memberSuspendJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> memberRestoreJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> memberRemoveJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> memberDeviceCreateJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> workspaceMemberListJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> workspaceMemberAddJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> workspaceMemberRemoveJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> threadParticipantsListJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> threadUpdateJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> threadParticipantAddJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> threadParticipantRemoveJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewaySessionReplaceAccessJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewaySettingsGetJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewaySettingsUpdateJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayNextEventsJson() override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> gatewayDisconnectJson() override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> artifactViewOpenJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> threadFileViewOpenJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> artifactDownloadJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> artifactDownloadProgressJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> artifactDownloadCancelJson(
      const std::string& inputJson) override;
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
  std::shared_ptr<margelo::nitro::Promise<std::string>> taskAcceptJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> taskReviseJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> taskCancelJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> taskUserNotificationListJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> taskUserNotificationAcknowledgeJson(
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
  std::string composerTurnModeOptionsJson() override;
  std::string principalPresentationCapabilitiesJson(const std::string& inputJson) override;
  std::string authorizationProjectionAcceptJson(const std::string& inputJson) override;
  std::string artifactPresentationPolicyJson(const std::string& inputJson) override;
  std::string reconcileExecutionDraftJson(const std::string& inputJson) override;
  std::string currentPrincipalPresentationJson(const std::string& inputJson) override;
  std::string sessionListRowPresentationJson(const std::string& inputJson) override;
  std::string threadScopePresentationJson(const std::string& inputJson) override;
  std::string threadCreateVisibilityPlanJson(const std::string& inputJson) override;
  std::string threadScopeMutationPlanJson(const std::string& inputJson) override;
  std::string memberPresentationJson(const std::string& inputJson) override;
  std::string invitationListRowJson(const std::string& inputJson) override;
  std::string administrationConflictRefetchJson(const std::string& inputJson) override;
  std::string composerAttachmentFromPathJson(const std::string& inputJson) override;
  std::string composerAttachmentsUpdateJson(const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> composerSkillPickerRowsJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> composerMcpPickerRowsJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> composerSkillPackPickerJson(
      const std::string& inputJson) override;
  std::string composerSkillSelectionToggleJson(const std::string& inputJson) override;
  std::string composerSkillChipsJson(const std::string& inputJson) override;
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
  std::shared_ptr<margelo::nitro::Promise<std::string>> turnMessageEditJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> turnMessageDeleteJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> turnMessageRevisionsPageJson(
      const std::string& inputJson) override;
  std::string messageRevisionPagePresentationJson(const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> threadReadJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> turnWorkPageJson(
      const std::string& inputJson) override;
  std::shared_ptr<margelo::nitro::Promise<std::string>> turnWorkItemsGetJson(
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
  std::shared_ptr<margelo::nitro::Promise<std::string>> callWithClientAsyncSensitive(
      char* (*operation)(PioneerClientFfi*, const char*),
      const std::string& payload);
  std::shared_ptr<margelo::nitro::Promise<std::string>> callWithClientAsync(
      char* (*operation)(PioneerClientFfi*));
  void destroyClient();

  static std::string takeOwnedCString(char* value);
};

} // namespace margelo::nitro::pioneer::client
