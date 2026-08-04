/* eslint-disable */

export type ComposerDomainAction =
  | ('MarkAttachmentsUploading' | 'ClearReasoningEffort' | 'ClearPayload')
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
export type SkillId = string;
export type McpScopeKind = 'workspace' | 'user';
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
export type SkillCapabilityUnavailableReason =
  | 'DisabledByPolicy'
  | {
      Inactive: {
        status_reason?: string | null;
        [k: string]: unknown;
      };
    };
export type ThreadMode = ('Message' | 'Agent') | 'Chat';
export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
export type ComposerCapabilityTargetKind = 'native' | 'cli';

export interface ClientComposerDomainTransitionRequest {
  action: ComposerDomainAction;
  state: ComposerDomainState;
}
export interface ComposerAttachment {
  file_name: string;
  kind: ComposerAttachmentKind;
  path: string;
  upload_state: ComposerAttachmentUploadState;
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
export interface ComposerCapability {
  id: string;
  kind: ComposerCapabilityKind;
  label: string;
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
export interface ComposerModelSelection {
  model: string;
  provider: string;
  selected_reasoning_effort?: string | null;
  [k: string]: unknown;
}
export interface ComposerDomainState {
  attachments?: ComposerAttachment[];
  capabilities?: ComposerCapability[];
  capability_target: ComposerCapabilityTarget;
  mode_manually_selected?: boolean;
  model_manually_selected?: boolean;
  selected_mode?: ('Message' | 'Agent') | 'Chat';
  selected_model?: string | null;
  selected_permission_mode?: 'full_access' | 'auto_accept_edits' | 'supervised';
  selected_provider?: string | null;
  selected_reasoning_effort?: string | null;
  skill_selections?: ComposerSkillSelection[];
}
