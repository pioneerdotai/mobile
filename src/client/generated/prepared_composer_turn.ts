/* eslint-disable */

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
export type SkillPackId = string;
export type SkillId = string;
export type McpScopeKind = 'workspace' | 'user';
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
export type UserMessageAttachment =
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
      artifact: ArtifactRef;
      type: 'artifact';
      [k: string]: unknown;
    }
  | {
      capability: TurnSkillCapabilitySummary;
      type: 'skill';
      [k: string]: unknown;
    }
  | {
      capability: TurnSkillPackCapabilitySummary;
      type: 'skillPack';
      [k: string]: unknown;
    }
  | {
      capability: TurnMcpServerCapabilitySummary;
      type: 'mcpServer';
      [k: string]: unknown;
    }
  | {
      capability: TurnMcpToolCapabilitySummary;
      type: 'mcpTool';
      [k: string]: unknown;
    };

export interface PreparedComposerTurn {
  attachments: PreparedComposerAttachment[];
  capabilities: TurnCapability[];
  input: UserInput[];
  user_attachments: UserMessageAttachment[];
  user_message_text: string;
  user_text: string;
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
export interface TurnCapability {
  id: string;
  kind: TurnCapabilityKind;
  label?: string | null;
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
export interface TurnSkillCapabilitySummary {
  label: string;
  owner?: string | null;
  pack?: TurnSkillPackPresentationSummary | null;
  skillId: SkillId;
  slug: string;
  sourceKind: string;
  [k: string]: unknown;
}
export interface TurnSkillPackPresentationSummary {
  label: string;
  packId: SkillPackId;
  [k: string]: unknown;
}
export interface TurnSkillPackCapabilitySummary {
  label: string;
  packId: SkillPackId;
  [k: string]: unknown;
}
export interface TurnMcpServerCapabilitySummary {
  id: string;
  label: string;
  name: string;
  scopeKind: McpScopeKind;
  [k: string]: unknown;
}
export interface TurnMcpToolCapabilitySummary {
  id: string;
  label: string;
  rawToolName: string;
  scopeKind: McpScopeKind;
  serverName: string;
  [k: string]: unknown;
}
