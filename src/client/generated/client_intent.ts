/* eslint-disable */

export type ClientIntent =
  | {
      intent: AdministrationPresentationIntent;
      kind: 'administration_presentation';
      [k: string]: unknown;
    }
  | {
      command: AdministrationCommand;
      kind: 'administration_command';
      [k: string]: unknown;
    }
  | {
      intent: AdministrationPageIntent;
      kind: 'administration_page';
      [k: string]: unknown;
    }
  | {
      intent: ProviderPresentationIntent;
      kind: 'provider_presentation';
      [k: string]: unknown;
    }
  | {
      command: ProviderCommand;
      kind: 'provider_command';
      [k: string]: unknown;
    }
  | {
      intent: ProviderCollectionIntent;
      kind: 'provider_collection';
      [k: string]: unknown;
    }
  | {
      intent: ProviderRuntimeIntent;
      kind: 'provider_runtime';
      [k: string]: unknown;
    }
  | {
      intent: ArtifactIntent;
      kind: 'artifact';
      [k: string]: unknown;
    }
  | {
      intent: ThreadMemberIntent;
      kind: 'thread_member';
      [k: string]: unknown;
    }
  | {
      intent: ThreadCapabilityIntent;
      kind: 'thread_capability';
      [k: string]: unknown;
    }
  | {
      intent: TurnCancellationIntent;
      kind: 'turn_cancellation';
      [k: string]: unknown;
    }
  | {
      intent: ComposerModelPickerIntent;
      kind: 'composer_model_picker';
      [k: string]: unknown;
    }
  | {
      intent: ComposerCatalogIntent;
      kind: 'composer_catalog';
      [k: string]: unknown;
    }
  | {
      intent: MessageRevisionIntent;
      kind: 'message_revisions';
      [k: string]: unknown;
    }
  | {
      intent: MessageDeletionIntent;
      kind: 'message_deletion';
      [k: string]: unknown;
    }
  | {
      intent: ApprovalActionIntent;
      kind: 'approval_action';
      [k: string]: unknown;
    }
  | {
      intent: TaskReviewIntent;
      kind: 'task_review';
      [k: string]: unknown;
    }
  | {
      intent: ComposerIntent;
      kind: 'composer';
      [k: string]: unknown;
    }
  | {
      intent: WorkspaceIntent;
      kind: 'workspace';
      [k: string]: unknown;
    }
  | {
      intent: TaskNotificationIntent;
      kind: 'task_notification';
      [k: string]: unknown;
    }
  | {
      expected_revision?: number | null;
      intent: NavigationIntent;
      kind: 'navigation';
      [k: string]: unknown;
    }
  | {
      kind: 'refresh_timeline';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      collapsed_row_ids: string[];
      kind: 'set_timeline_expansion';
      row_ids: string[];
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      intent: TimelineIntent;
      kind: 'timeline';
      [k: string]: unknown;
    }
  | {
      demand: ClientDemand;
      generation: number;
      kind: 'set_scope_demand';
      scope: ClientScope;
      [k: string]: unknown;
    };
export type AdministrationPresentationIntent =
  | {
      generation: number;
      kind: 'copy_activation';
      [k: string]: unknown;
    }
  | {
      generation: number;
      kind: 'dismiss_activation';
      [k: string]: unknown;
    };
export type AdministrationCommand =
  | {
      kind: 'create_invitation';
      params: InvitationCreateParams;
      [k: string]: unknown;
    }
  | {
      kind: 'revoke_invitation';
      params: InvitationRevokeParams;
      [k: string]: unknown;
    }
  | {
      kind: 'suspend_member';
      params: MemberSuspendParams;
      [k: string]: unknown;
    }
  | {
      kind: 'restore_member';
      params: MemberRestoreParams;
      [k: string]: unknown;
    }
  | {
      kind: 'remove_member';
      params: MemberRemoveParams;
      [k: string]: unknown;
    }
  | {
      kind: 'create_recovery_device';
      params: MemberDeviceCreateParams;
      [k: string]: unknown;
    }
  | {
      kind: 'add_workspace_member';
      params: WorkspaceMemberAddParams;
      [k: string]: unknown;
    }
  | {
      kind: 'remove_workspace_member';
      params: WorkspaceMemberRemoveParams;
      [k: string]: unknown;
    }
  | {
      kind: 'set_member_workspaces';
      params: {
        principal_id: PrincipalId;
        selected: WorkspaceId[];
        [k: string]: unknown;
      };
      [k: string]: unknown;
    };
export type RoleKey = string;
export type WorkspaceId = string;
export type InvitationId = string;
export type PrincipalStatus = 'active' | 'suspended' | 'removed';
export type PrincipalId = string;
export type AdministrationPageIntent =
  | {
      kind: 'observe';
      page: AdministrationPage;
      [k: string]: unknown;
    }
  | {
      kind: 'release';
      page: AdministrationPage;
      [k: string]: unknown;
    }
  | {
      kind: 'refresh';
      page: AdministrationPage;
      [k: string]: unknown;
    }
  | {
      kind: 'next';
      page: AdministrationPage;
      [k: string]: unknown;
    };
export type AdministrationPage =
  | {
      kind: 'members';
      [k: string]: unknown;
    }
  | {
      kind: 'member_directory';
      [k: string]: unknown;
    }
  | {
      kind: 'invitations';
      [k: string]: unknown;
    }
  | {
      kind: 'workspace_members';
      workspace_id: WorkspaceId;
      [k: string]: unknown;
    };
export type ProviderPresentationIntent =
  | {
      kind: 'copy_diagnostics';
      runtime_id: string;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'open_path';
      path: string;
      workspace_id: string;
      [k: string]: unknown;
    };
export type ProviderCommand =
  | {
      kind: 'configure';
      params: ProviderConfigureParams;
      [k: string]: unknown;
    }
  | {
      kind: 'disconnect';
      params: ProviderDeleteApiKeyParams;
      [k: string]: unknown;
    }
  | {
      kind: 'connect';
      params: CLIRuntimeLoginStartParams;
      [k: string]: unknown;
    }
  | {
      kind: 'set_runtime_proxy';
      params: CLIRuntimeProxySetParams;
      [k: string]: unknown;
    }
  | {
      kind: 'remove_runtime_proxy';
      params: CLIRuntimeProxyDeleteParams;
      [k: string]: unknown;
    }
  | {
      kind: 'save_runtime';
      params: {
        draft: CLIRuntimeProviderDraft;
        workspace_id: string;
        [k: string]: unknown;
      };
      [k: string]: unknown;
    }
  | {
      kind: 'set_runtime_enabled';
      params: {
        enabled: boolean;
        runtime_id: string;
        workspace_id: string;
        [k: string]: unknown;
      };
      [k: string]: unknown;
    };
export type CLIAgentRuntimeKind = 'codex' | 'claude';
export type CLIRuntimeProviderDraftMode =
  | 'Create'
  | {
      Edit: {
        original_id: string;
        [k: string]: unknown;
      };
    }
  | {
      Duplicate: {
        source_id: string;
        [k: string]: unknown;
      };
    };
export type ProviderCollectionIntent =
  | {
      key: ProviderCollectionKey;
      kind: 'observe';
      [k: string]: unknown;
    }
  | {
      key: ProviderCollectionKey;
      kind: 'release';
      [k: string]: unknown;
    }
  | {
      key: ProviderCollectionKey;
      kind: 'refresh';
      [k: string]: unknown;
    };
export type ProviderCollection =
  | {
      kind: 'catalog';
      [k: string]: unknown;
    }
  | {
      kind: 'models';
      provider: string;
      purpose: ProviderModelKind;
      [k: string]: unknown;
    };
export type ProviderModelKind = 'chat' | 'embeddings' | 'transcription';
export type ProviderRuntimeIntent =
  | {
      kind: 'observe';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'release';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'refresh';
      workspace_id: string;
      [k: string]: unknown;
    };
export type ArtifactIntent =
  | {
      kind: 'observe';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'retry';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      action: ArtifactActionKind;
      artifact_id: string;
      kind: 'begin_action';
      thread_id: string;
      version_id?: string | null;
      [k: string]: unknown;
    }
  | {
      identity: ArtifactActionIdentity;
      kind: 'claim_presentation';
      [k: string]: unknown;
    }
  | {
      error?: string | null;
      identity: ArtifactActionIdentity;
      kind: 'complete_presentation';
      [k: string]: unknown;
    }
  | {
      code: string;
      identity: ArtifactActionIdentity;
      kind: 'fail_preparation';
      [k: string]: unknown;
    }
  | {
      identity: ArtifactActionIdentity;
      kind: 'cancel_action';
      [k: string]: unknown;
    };
export type ArtifactActionKind = 'open' | 'share' | 'download' | 'reveal';
export type ThreadMemberIntent =
  | {
      kind: 'observe';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'retry';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      action: ThreadScopeAction;
      kind: 'perform';
      thread_id: string;
      [k: string]: unknown;
    };
export type ThreadScopeAction =
  | {
      kind: 'list_participants';
      [k: string]: unknown;
    }
  | {
      kind: 'add_participant';
      principal_id: PrincipalId;
      [k: string]: unknown;
    }
  | {
      kind: 'remove_participant';
      principal_id: PrincipalId;
      [k: string]: unknown;
    }
  | {
      kind: 'update_visibility';
      visibility: ThreadVisibility;
      [k: string]: unknown;
    };
/**
 * User-selectable visibility for ordinary user threads.
 *
 * Internal task/system threads deliberately have no public selectable value.
 */
export type ThreadVisibility = 'private' | 'workspace';
export type ThreadCapabilityIntent =
  | {
      kind: 'observe';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'retry';
      thread_id: string;
      [k: string]: unknown;
    };
export type ComposerModelPickerIntent =
  | {
      deferred: boolean;
      draft_id: number;
      kind: 'open';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'select_provider';
      provider: string;
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'select_model';
      model: string;
      [k: string]: unknown;
    }
  | {
      effort?: string | null;
      identity: ComposerOperationIdentity;
      kind: 'select_reasoning_effort';
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'retry_providers';
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'retry_models';
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'commit';
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'close';
      [k: string]: unknown;
    };
export type ComposerCatalogIntent =
  | {
      draft_id: number;
      key: string;
      kind: 'remove_skill_chip';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      catalog: ComposerCatalogKind;
      draft_id: number;
      kind: 'observe';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      catalog: ComposerCatalogKind;
      draft_id: number;
      kind: 'retry';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      deferred: boolean;
      draft_id: number;
      kind: 'open_picker';
      picker: ComposerPickerKind;
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'toggle_skill';
      selection: ComposerSkillSelection;
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      key: string;
      kind: 'toggle_mcp';
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'commit_picker';
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'close_picker';
      [k: string]: unknown;
    };
export type ComposerCatalogKind =
  | {
      kind: 'skills';
      [k: string]: unknown;
    }
  | {
      kind: 'mcp_servers';
      [k: string]: unknown;
    }
  | {
      kind: 'mcp_tools';
      server_id: string;
      [k: string]: unknown;
    };
export type ComposerPickerKind = 'skills' | 'mcp';
export type ComposerSkillSelection =
  | {
      kind: 'skill';
      pack_id?: SkillPackId | null;
      skill_id: SkillId;
      [k: string]: unknown;
    }
  | {
      kind: 'skill_pack';
      pack_id: SkillPackId;
      [k: string]: unknown;
    };
export type SkillPackId = string;
export type SkillId = string;
export type MessageRevisionIntent =
  | {
      kind: 'open';
      thread_id: string;
      turn_id: string;
      [k: string]: unknown;
    }
  | {
      identity: MessageRevisionIdentity;
      kind: 'more';
      [k: string]: unknown;
    }
  | {
      identity: MessageRevisionIdentity;
      kind: 'retry';
      [k: string]: unknown;
    }
  | {
      identity: MessageRevisionIdentity;
      kind: 'close';
      [k: string]: unknown;
    };
export type MessageDeletionIntent =
  | {
      expected_revision: number;
      kind: 'begin';
      thread_id: string;
      turn_id: string;
      [k: string]: unknown;
    }
  | {
      identity: MessageDeletionIdentity;
      kind: 'confirm';
      [k: string]: unknown;
    }
  | {
      identity: MessageDeletionIdentity;
      kind: 'cancel';
      [k: string]: unknown;
    };
export type ApprovalActionIntent =
  | {
      kind: 'observe';
      request_id: string;
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'respond';
      request_generation: number;
      request_id: string;
      resolution: PendingRequestResolution;
      thread_id: string;
      [k: string]: unknown;
    };
export type PendingRequestResolution =
  | {
      resolution: 'allow';
      [k: string]: unknown;
    }
  | {
      resolution: 'allow_for_turn';
      [k: string]: unknown;
    }
  | {
      resolution: 'allow_for_session';
      [k: string]: unknown;
    }
  | {
      reason?: string | null;
      resolution: 'deny';
      [k: string]: unknown;
    }
  | {
      resolution: 'cancel';
      [k: string]: unknown;
    }
  | {
      resolution: 'answered';
      response?: unknown;
      [k: string]: unknown;
    }
  | {
      resolution: 'expired';
      [k: string]: unknown;
    };
export type TaskReviewIntent =
  | {
      candidate_id: string;
      kind: 'observe';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      action: TaskReviewAction;
      candidate_id: string;
      feedback?: string | null;
      kind: 'perform';
      reason?: string | null;
      thread_id: string;
      [k: string]: unknown;
    };
export type TaskReviewAction = 'Accept' | 'Revise' | 'Cancel';
export type ComposerIntent =
  | {
      kind: 'activate';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      demand: ComposerVoiceReadinessDemand;
      draft_id: number;
      kind: 'set_voice_readiness_demand';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      draft_id: number;
      kind: 'sync_model_selection';
      reset: boolean;
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      draft_id: number;
      kind: 'retry_runtime_selection';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      draft_id: number;
      kind: 'retry_model_display';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'commit_voice_capture';
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'voice_finalized';
      response: VoiceSessionFinalizeResponse;
      [k: string]: unknown;
    }
  | {
      draft_id: number;
      kind: 'start_message_edit';
      thread_id: string;
      turn_id: string;
      [k: string]: unknown;
    }
  | {
      draft_id: number;
      kind: 'submit_steer';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      draft_id: number;
      kind: 'submit_message_edit';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'start_voice_capture';
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'finalize_voice_capture';
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'voice_session_started';
      session_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'clear_all';
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'prepare_operation';
      [k: string]: unknown;
    }
  | {
      identity: ComposerOperationIdentity;
      kind: 'upload_operation';
      [k: string]: unknown;
    }
  | {
      draft_id: number;
      kind: 'begin_operation';
      operation: ComposerOperationKind;
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      completion: ComposerOperationCompletion;
      identity: ComposerOperationIdentity;
      kind: 'complete_operation';
      [k: string]: unknown;
    }
  | {
      defaults: ComposerDomainState;
      kind: 'open';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      draft_id: number;
      kind: 'edit_text';
      text: string;
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      action: ComposerDomainAction;
      draft_id: number;
      kind: 'domain';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      draft_id: number;
      kind: 'clear';
      thread_id: string;
      [k: string]: unknown;
    };
export type ComposerVoiceReadinessDemand = 'suspended' | 'until_ready' | 'while_visible';
export type VoiceStatus =
  | ('disabled' | 'unavailable' | 'model_loading' | 'ready' | 'busy' | 'recording' | 'transcribing' | 'error')
  | 'model_downloading';
export type ComposerOperationKind = 'send' | 'edit_message' | 'steer' | 'voice' | 'pick_files' | 'pick_media';
export type ComposerOperationCompletion =
  | {
      kind: 'voice_prepared';
      snapshot: PreparedVoiceComposerSnapshot;
      [k: string]: unknown;
    }
  | {
      artifacts: (ArtifactRef | null)[];
      kind: 'uploaded';
      [k: string]: unknown;
    }
  | {
      attachments: ComposerAttachment[];
      kind: 'files_selected';
      [k: string]: unknown;
    }
  | {
      kind: 'sent';
      [k: string]: unknown;
    }
  | {
      conflicted: boolean;
      kind: 'message_edit_failed';
      [k: string]: unknown;
    }
  | {
      kind: 'failed';
      message: string;
      [k: string]: unknown;
    }
  | {
      kind: 'cancelled';
      [k: string]: unknown;
    };
export type ArtifactKind =
  | 'file'
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'pdf'
  | 'spreadsheet'
  | 'archive'
  | 'json'
  | 'generated_image'
  | 'screenshot'
  | 'workspace_file'
  | 'directory_manifest'
  | 'unknown';
export type ArtifactProjectionKind = 'plain_text' | 'thumbnail' | 'json_summary' | 'pdf_text';
export type ArtifactProjectionStatus = 'pending' | 'ready' | 'failed' | 'stale';
export type ArtifactStatus = 'ready' | 'pending' | 'quarantined' | 'deleted' | 'missing_external_source' | 'failed';
export type ComposerAttachmentKind = 'Image' | 'File' | 'Audio' | 'Video';
export type ComposerAttachmentUploadState =
  | ('Local' | 'Uploading')
  | {
      Uploaded: {
        artifact: ArtifactRef;
        [k: string]: unknown;
      };
    }
  | {
      Failed: {
        error: string;
        [k: string]: unknown;
      };
    };
export type TurnCapabilityKind =
  | {
      packId?: SkillPackId | null;
      skillId: SkillId;
      type: 'skill';
      [k: string]: unknown;
    }
  | {
      packId: SkillPackId;
      type: 'skillPack';
      [k: string]: unknown;
    }
  | {
      name: string;
      scopeKind: McpScopeKind;
      type: 'mcpServer';
      [k: string]: unknown;
    }
  | {
      rawToolName: string;
      scopeKind: McpScopeKind;
      serverName: string;
      type: 'mcpTool';
      [k: string]: unknown;
    };
export type McpScopeKind = 'workspace' | 'user';
export type AgentExecutionBackend =
  | {
      provider: string;
      type: 'apiProvider';
      [k: string]: unknown;
    }
  | {
      runtime_id: string;
      runtime_kind: CLIAgentRuntimeKind;
      type: 'cliAgentRuntime';
      [k: string]: unknown;
    }
  | {
      runtime_id: string;
      type: 'acpAgentRuntime';
      [k: string]: unknown;
    };
export type ThreadMode = ('Message' | 'Agent') | 'Chat';
export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
export type UserInput =
  | {
      text: string;
      textElements?: TextElement[];
      type: 'text';
      [k: string]: unknown;
    }
  | {
      type: 'image';
      url: string;
      [k: string]: unknown;
    }
  | {
      path: string;
      type: 'localImage';
      [k: string]: unknown;
    }
  | {
      type: 'file';
      url: string;
      [k: string]: unknown;
    }
  | {
      path: string;
      type: 'localFile';
      [k: string]: unknown;
    }
  | {
      type: 'audio';
      url: string;
      [k: string]: unknown;
    }
  | {
      path: string;
      type: 'localAudio';
      [k: string]: unknown;
    }
  | {
      type: 'video';
      url: string;
      [k: string]: unknown;
    }
  | {
      path: string;
      type: 'localVideo';
      [k: string]: unknown;
    }
  | {
      artifactId: string;
      type: 'artifact';
      versionId?: string | null;
      [k: string]: unknown;
    }
  | {
      name: string;
      path: string;
      type: 'mention';
      [k: string]: unknown;
    };
export type SandboxMode = 'FullAccess';
export type ComposerCapabilityKind =
  | {
      Skill: {
        owner?: string | null;
        skill_id: SkillId;
        slug: string;
        source_kind: string;
        [k: string]: unknown;
      };
    }
  | {
      McpServer: {
        name: string;
        scope_kind: McpScopeKind;
        [k: string]: unknown;
      };
    }
  | {
      McpTool: {
        raw_tool_name: string;
        scope_kind: McpScopeKind;
        server_name: string;
        [k: string]: unknown;
      };
    };
export type ComposerCapabilityTargetKind = 'native' | 'cli';
export type ComposerDomainAction =
  | (
      | 'MarkAttachmentsUploading'
      | 'ClearReplyTarget'
      | 'ClearReasoningEffort'
      | 'ClearPayload'
      | 'SendSucceeded'
      | 'SendFailed'
    )
  | {
      SetAttachments: {
        attachments: ComposerAttachment[];
        [k: string]: unknown;
      };
    }
  | {
      AddAttachment: {
        attachment: ComposerAttachment;
        [k: string]: unknown;
      };
    }
  | {
      AddArtifactAttachment: {
        artifact: ArtifactRef;
        [k: string]: unknown;
      };
    }
  | {
      RemoveAttachmentAt: {
        index: number;
        [k: string]: unknown;
      };
    }
  | {
      RemoveAttachment: {
        path: string;
        [k: string]: unknown;
      };
    }
  | {
      MarkAttachmentsFailed: {
        error: string;
        [k: string]: unknown;
      };
    }
  | {
      ApplyUploadedAttachments: {
        artifacts: (ArtifactRef | null)[];
        [k: string]: unknown;
      };
    }
  | {
      SetCapabilities: {
        capabilities: ComposerCapability[];
        [k: string]: unknown;
      };
    }
  | {
      AddCapability: {
        capability: ComposerCapability;
        [k: string]: unknown;
      };
    }
  | {
      AddCapabilities: {
        capabilities: ComposerCapability[];
        [k: string]: unknown;
      };
    }
  | {
      ToggleMcpSelection: {
        key: string;
        server_rows: SelectableMcpCapability[];
        tool_rows: SelectableMcpCapability[];
        [k: string]: unknown;
      };
    }
  | {
      RemoveSkillSelection: {
        selection: ComposerSkillSelection;
        [k: string]: unknown;
      };
    }
  | {
      RemoveCapability: {
        id: string;
        [k: string]: unknown;
      };
    }
  | {
      RemoveCapabilityAt: {
        index: number;
        [k: string]: unknown;
      };
    }
  | {
      SetSkillSelections: {
        selections: ComposerSkillSelection[];
        [k: string]: unknown;
      };
    }
  | {
      ToggleSkillSelection: {
        picker: ComposerSkillPickerProjection;
        selection: ComposerSkillSelection;
        [k: string]: unknown;
      };
    }
  | {
      SetModeFromUser: {
        mode: ThreadMode;
        [k: string]: unknown;
      };
    }
  | {
      SetReplyTarget: {
        target: ComposerReplyTarget;
        [k: string]: unknown;
      };
    }
  | {
      SelectMention: {
        candidate: ComposerMentionCandidate;
        [k: string]: unknown;
      };
    }
  | {
      RemoveMention: {
        principal_id: PrincipalId;
        [k: string]: unknown;
      };
    }
  | {
      ReconcileMentionsWithText: {
        text: string;
        [k: string]: unknown;
      };
    }
  | {
      SetPermissionMode: {
        mode: TurnPermissionMode;
        [k: string]: unknown;
      };
    }
  | {
      SetModelSelectionFromUser: {
        capability_target?: ComposerCapabilityTarget | null;
        model?: string | null;
        provider?: string | null;
        [k: string]: unknown;
      };
    }
  | {
      SetReasoningEffortFromUser: {
        effort?: string | null;
        [k: string]: unknown;
      };
    }
  | {
      SyncResolvedModelSelection: {
        capability_target?: ComposerCapabilityTarget | null;
        selection?: ComposerModelSelection | null;
        [k: string]: unknown;
      };
    }
  | {
      ResetModelSelection: {
        capability_target?: ComposerCapabilityTarget | null;
        selection?: ComposerModelSelection | null;
        [k: string]: unknown;
      };
    }
  | {
      SyncCapabilityTarget: {
        provider?: string | null;
        target: ComposerCapabilityTarget;
        [k: string]: unknown;
      };
    }
  | {
      Reset: {
        defaults: ComposerDomainState;
        [k: string]: unknown;
      };
    };
export type McpCapabilityUnavailableReason =
  'DisabledByPolicy' | 'RuntimeUnavailable' | 'RuntimeNotReady' | 'NoToolCatalog';
export type SkillCapabilityUnavailableReason =
  | 'DisabledByPolicy'
  | {
      Inactive: {
        status_reason?: string | null;
        [k: string]: unknown;
      };
    };
export type WorkspaceIntent =
  | {
      kind: 'create_workspace';
      name: string;
      [k: string]: unknown;
    }
  | {
      kind: 'rename_workspace';
      name: string;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'new_thread';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'select_thread';
      thread_id: string;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'select_workspace';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'rename_thread';
      name: string;
      thread_id: string;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'delete_thread';
      thread_id: string;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      folder_id?: string | null;
      kind: 'move_thread';
      thread_id: string;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'create_folder';
      name: string;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      folder_id: string;
      kind: 'rename_folder';
      name: string;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      folder_id: string;
      kind: 'delete_folder';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      folder_id: string;
      kind: 'move_folder';
      parent_folder_id?: string | null;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      folder_id?: string | null;
      kind: 'remove_agents_document';
      workspace_id: string;
      [k: string]: unknown;
    };
export type TaskNotificationIntent =
  | {
      kind: 'refresh';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'dismiss';
      notification_id: string;
      revision: number;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'retry';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'open';
      notification_id: string;
      revision: number;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      completion: TaskNotificationCompletion;
      effect: TaskNotificationEffect;
      kind: 'native_completion';
      workspace_id: string;
      [k: string]: unknown;
    };
export type TaskNotificationCompletion = 'activated' | 'dismissed';
export type NavigationIntent =
  | {
      kind: 'open_agents_document';
      scope: AgentsDocEditorScope;
      [k: string]: unknown;
    }
  | {
      kind: 'set_administration_route';
      route: AdministrationRoute;
      [k: string]: unknown;
    }
  | {
      kind: 'set_settings_route';
      route: SettingsRoute;
      [k: string]: unknown;
    }
  | {
      filter: ProviderFilter;
      kind: 'set_providers_route';
      [k: string]: unknown;
    }
  | {
      kind: 'set_mcp_route';
      server_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'set_skills_route';
      skill_id?: SkillId | null;
      [k: string]: unknown;
    }
  | {
      kind: 'select_workspace';
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'select_thread';
      thread_id?: string | null;
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      destination: SemanticDestination;
      kind: 'navigate';
      [k: string]: unknown;
    }
  | {
      kind: 'remember_draft';
      thread_id?: string | null;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'remember_last';
      thread_id?: string | null;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'promote_thread';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      entry: TaskThreadLineage;
      kind: 'push_task_thread';
      [k: string]: unknown;
    }
  | {
      kind: 'pop_task_thread';
      [k: string]: unknown;
    }
  | {
      kind: 'clear_lineage';
      [k: string]: unknown;
    }
  | {
      kind: 'reset';
      [k: string]: unknown;
    };
export type AgentsDocEditorScope =
  | {
      kind: 'root';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      folder_id: string;
      kind: 'folder';
      workspace_id: string;
      [k: string]: unknown;
    };
export type AdministrationRoute = 'Members' | 'Invitations';
export type SettingsRoute = 'General' | 'Account' | 'Memory' | 'SelfImprovement';
export type ProviderFilter = 'Api' | 'Connected' | 'Cli';
export type SemanticDestination =
  | {
      kind: 'threads';
      [k: string]: unknown;
    }
  | {
      kind: 'agents_document';
      [k: string]: unknown;
    }
  | {
      filter: ProviderFilter;
      kind: 'providers';
      [k: string]: unknown;
    }
  | {
      kind: 'administration';
      route: AdministrationRoute;
      [k: string]: unknown;
    }
  | {
      kind: 'mcp';
      server_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'skills';
      skill_id?: SkillId | null;
      [k: string]: unknown;
    }
  | {
      kind: 'settings';
      route: SettingsRoute;
      [k: string]: unknown;
    };
export type TimelineIntent =
  | {
      consumer_id: string;
      generation: number;
      kind: 'consume_scroll';
      scroll_generation: number;
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      demand: TimelineDemand;
      kind: 'update';
      [k: string]: unknown;
    }
  | {
      consumer_id: string;
      generation: number;
      kind: 'exit';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      consumer_id: string;
      generation: number;
      kind: 'retry';
      thread_id: string;
      [k: string]: unknown;
    };
export type ClientDemand = 'suspended' | 'visible' | 'prefetch';
export type ClientScope =
  | {
      kind: 'session';
      [k: string]: unknown;
    }
  | {
      kind: 'navigation';
      [k: string]: unknown;
    }
  | {
      kind: 'sidebar_summary';
      thread_id: string;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'workspace_tree';
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'task_inbox';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'task';
      task_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'thread';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'timeline';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'composer';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'thread_member';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'thread_capability';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_cancellation';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'composer_model_picker';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'composer_catalog';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'message_deletion';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'message_revisions';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'approval_action';
      request_id: string;
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      candidate_id: string;
      kind: 'task_review';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'pending_request';
      thread_id?: string | null;
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'artifact';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'avatar';
      principal_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'administration_operation';
      [k: string]: unknown;
    }
  | {
      kind: 'administration_page';
      page: AdministrationPage;
      [k: string]: unknown;
    }
  | {
      kind: 'provider';
      [k: string]: unknown;
    }
  | {
      kind: 'provider_operation';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      key: ProviderCollectionKey;
      kind: 'provider_collection';
      [k: string]: unknown;
    }
  | {
      kind: 'provider_runtime';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'administration';
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'mcp';
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'skills';
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'settings';
      [k: string]: unknown;
    }
  | {
      kind: 'onboarding_invitation';
      [k: string]: unknown;
    }
  | {
      kind: 'agents_document';
      workspace_id: string;
      [k: string]: unknown;
    };

export interface InvitationCreateParams {
  role_key: RoleKey;
  /**
   * @minItems 1
   * @maxItems 64
   */
  workspace_ids: [WorkspaceId, ...WorkspaceId[]];
}
export interface InvitationRevokeParams {
  invitation_id: InvitationId;
}
export interface MemberSuspendParams {
  expected_status?: PrincipalStatus | null;
  principal_id: PrincipalId;
}
export interface MemberRestoreParams {
  expected_status?: PrincipalStatus | null;
  principal_id: PrincipalId;
}
export interface MemberRemoveParams {
  expected_status?: PrincipalStatus | null;
  principal_id: PrincipalId;
}
export interface MemberDeviceCreateParams {
  principal_id: PrincipalId;
}
export interface WorkspaceMemberAddParams {
  principal_id: PrincipalId;
  workspace_id: WorkspaceId;
}
export interface WorkspaceMemberRemoveParams {
  principal_id: PrincipalId;
  workspace_id: WorkspaceId;
}
export interface ProviderConfigureParams {
  api_key?: string | null;
  clear_proxy?: boolean;
  provider: string;
  proxy_url?: string | null;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ProviderDeleteApiKeyParams {
  provider: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface CLIRuntimeLoginStartParams {
  login_type?: 'chatgptDeviceCode' | 'chatgpt';
  runtime_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface CLIRuntimeProxySetParams {
  proxy_url: string;
  runtime_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface CLIRuntimeProxyDeleteParams {
  runtime_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface CLIRuntimeProviderDraft {
  binary_path: string;
  display_name: string;
  enabled: boolean;
  home_path: string;
  id: string;
  kind: CLIAgentRuntimeKind;
  mode: CLIRuntimeProviderDraftMode;
  /**
   * Stable agent presentation nickname.  The UI does not expose this
   * field yet, but edits must preserve the gateway-owned value.
   */
  nickname?: string;
  shadow_home_path: string;
  [k: string]: unknown;
}
export interface ProviderCollectionKey {
  collection: ProviderCollection;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ArtifactActionIdentity {
  artifact_id: string;
  generation: number;
  thread_id: string;
  version_id?: string | null;
  [k: string]: unknown;
}
export interface TurnCancellationIntent {
  reason?: string | null;
  thread_id: string;
  [k: string]: unknown;
}
export interface ComposerOperationIdentity {
  draft_id: number;
  generation: number;
  thread_id: string;
  [k: string]: unknown;
}
export interface MessageRevisionIdentity {
  generation: number;
  thread_id: string;
  turn_id: string;
  [k: string]: unknown;
}
export interface MessageDeletionIdentity {
  generation: number;
  thread_id: string;
  [k: string]: unknown;
}
export interface VoiceSessionFinalizeResponse {
  status: VoiceStatus;
  [k: string]: unknown;
}
export interface PreparedVoiceComposerSnapshot {
  attachments: PreparedComposerAttachment[];
  context: VoiceTurnContext;
  locked_attachment_count: number;
  locked_capability_count: number;
  uploaded_attachment_artifacts: (ArtifactRef | null)[];
  [k: string]: unknown;
}
export interface PreparedComposerAttachment {
  artifact?: ArtifactRef | null;
  attachment: ComposerAttachment;
  [k: string]: unknown;
}
export interface ArtifactRef {
  artifact_id: string;
  display_name: string;
  kind: ArtifactKind;
  mime_type?: string | null;
  preview?: ArtifactPreviewRef | null;
  sha256?: string | null;
  size_bytes?: number | null;
  status: ArtifactStatus;
  version_id?: string | null;
  [k: string]: unknown;
}
export interface ArtifactPreviewRef {
  artifact_id: string;
  blob_id?: string | null;
  mime_type?: string | null;
  projection_kind: ArtifactProjectionKind;
  sha256?: string | null;
  size_bytes?: number | null;
  status: ArtifactProjectionStatus;
  version_id: string;
  [k: string]: unknown;
}
export interface ComposerAttachment {
  file_name: string;
  kind: ComposerAttachmentKind;
  path: string;
  upload_state: ComposerAttachmentUploadState;
  [k: string]: unknown;
}
/**
 * Frozen non-audio composer context for voice turn materialization.
 *
 * `prepared_input` is for existing prepared `UserInput` references such as
 * artifacts/local attachment references. It must not contain the future voice
 * transcript; the gateway prepends the transcript as `UserInput::Text` after
 * successful transcription.
 */
export interface VoiceTurnContext {
  /**
   * Selected skills, MCP tools/servers and related turn capabilities.
   */
  capabilities?: TurnCapability[];
  cli_runtime_options?: TurnCLIRuntimeOptions | null;
  execution_backend?: AgentExecutionBackend | null;
  mode?: ThreadMode | null;
  model?: string | null;
  model_provider?: string | null;
  /**
   * Agent permission profile for the eventual turn.
   *
   * This is not the platform microphone permission. Microphone permission
   * stays client/platform-local and is reported through voice status/errors.
   */
  permission_profile?: TurnPermissionProfileSelection | null;
  /**
   * Existing prepared composer inputs such as artifact/file references.
   *
   * This vector must not contain audio bytes or the future transcript. On
   * cancel, dropping this context must not create a turn; already completed
   * upload/cache side effects are handled by the existing attachment flow.
   */
  prepared_input?: UserInput[];
  reasoning?: TurnReasoningSelection | null;
  sandbox_policy?: SandboxPolicy | null;
  /**
   * Thread that receives the gateway-created turn after transcription.
   */
  thread_id: string;
  /**
   * Client-planned turn id reserved before any audio chunk is accepted.
   */
  turn_id: string;
  /**
   * Workspace active when the voice session starts.
   *
   * `TurnStartParams` is still thread-scoped; the gateway keeps the
   * workspace here to validate/session-route the frozen voice context.
   */
  workspace_id: string;
  [k: string]: unknown;
}
export interface TurnCapability {
  id: string;
  kind: TurnCapabilityKind;
  label?: string | null;
  [k: string]: unknown;
}
export interface TurnCLIRuntimeOptions {
  effort?: string | null;
  personality?: string | null;
  sandbox?: unknown;
  steer_if_active?: boolean | null;
  summary?: string | null;
  [k: string]: unknown;
}
export interface TurnPermissionProfileSelection {
  mode: TurnPermissionMode;
  [k: string]: unknown;
}
export interface TextElement {
  byte_range: ByteRange;
  placeholder?: string | null;
  [k: string]: unknown;
}
export interface ByteRange {
  end: number;
  start: number;
  [k: string]: unknown;
}
export interface TurnReasoningSelection {
  /**
   * String-valued because CLI runtimes may advertise efforts newer than
   * Pioneer API-provider adapters understand.
   */
  effort: string;
  [k: string]: unknown;
}
export interface SandboxPolicy {
  mode: SandboxMode;
  [k: string]: unknown;
}
export interface ComposerDomainState {
  attachments?: ComposerAttachment[];
  capabilities?: ComposerCapability[];
  capability_target: ComposerCapabilityTarget;
  mode_manually_selected?: boolean;
  model_manually_selected?: boolean;
  reply_target?: ComposerReplyTarget | null;
  selected_mentions?: ComposerMentionSelection[];
  selected_mode?: ('Message' | 'Agent') | 'Chat';
  selected_model?: string | null;
  selected_permission_mode?: 'full_access' | 'auto_accept_edits' | 'supervised';
  selected_provider?: string | null;
  selected_reasoning_effort?: string | null;
  skill_selections?: ComposerSkillSelection[];
}
export interface ComposerCapability {
  id: string;
  kind: ComposerCapabilityKind;
  label: string;
  [k: string]: unknown;
}
/**
 * Capability eligibility context.
 *
 * The target kind exists only because native skills retain their current
 * source policy while CLI skills must be exportable. Capability support is
 * represented exclusively by [`ComposerCapabilityPolicy`].
 */
export interface ComposerCapabilityTarget {
  kind: ComposerCapabilityTargetKind;
  supports_mcp_tools: boolean;
  supports_skills: boolean;
}
export interface ComposerReplyTarget {
  author_display_name?: string | null;
  preview?: string | null;
  turn_id: string;
}
export interface ComposerMentionSelection {
  display_name: string;
  nickname: string;
  principal_id: PrincipalId;
  text_token: string;
}
export interface SelectableMcpCapability {
  description: string;
  key: string;
  label: string;
  raw_tool_name?: string | null;
  scope_kind: McpScopeKind;
  selectable: boolean;
  server_id: string;
  server_name: string;
  tools_count?: number | null;
  unavailable_reason?: McpCapabilityUnavailableReason | null;
  [k: string]: unknown;
}
export interface ComposerSkillPickerProjection {
  packs: SelectableSkillPackCapability[];
  standalone: SelectableSkillCapability[];
  [k: string]: unknown;
}
export interface SelectableSkillPackCapability {
  children: SelectablePackedSkillCapability[];
  key: string;
  label: string;
  pack_id: SkillPackId;
  selectable: boolean;
  [k: string]: unknown;
}
export interface SelectablePackedSkillCapability {
  member_key: string;
  pack_id: SkillPackId;
  skill: SelectableSkillCapability;
  [k: string]: unknown;
}
export interface SelectableSkillCapability {
  description: string;
  display_name: string;
  key: string;
  label: string;
  owner?: string | null;
  selectable: boolean;
  skill_id: SkillId;
  slug: string;
  source_kind: string;
  unavailable_reason?: SkillCapabilityUnavailableReason | null;
  [k: string]: unknown;
}
export interface ComposerMentionCandidate {
  avatar_revision?: string | null;
  display_name: string;
  nickname: string;
  principal_id: PrincipalId;
}
export interface ComposerModelSelection {
  model: string;
  provider: string;
  selected_reasoning_effort?: string | null;
  [k: string]: unknown;
}
export interface TaskNotificationEffect {
  notification_id: string;
  revision: number;
  task_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TaskThreadLineage {
  child_thread_id: string;
  parent_thread_id: string;
  title: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TimelineDemand {
  after: boolean;
  before: boolean;
  boundary_request_limit: number;
  consumer_id: string;
  generation: number;
  latest_user_turn_id?: string | null;
  prefetch_on_visibility: boolean;
  presented_rows: boolean;
  read_requires_unread?: boolean;
  row_ids: string[];
  scroll_generation: number;
  source_revision: number;
  thread_id: string;
  threshold: number;
  viewed_through_turn_id?: string | null;
  work: boolean;
  [k: string]: unknown;
}
