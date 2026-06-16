/* eslint-disable */

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
export type McpScopeKind = 'workspace' | 'user';
export type ThreadMode = 'Chat' | 'Agent';

export interface ClientActiveThreadSendTextRequest {
  attachments?: ComposerAttachment[];
  capabilities?: ComposerCapability[];
  expanded_keys?: string[];
  selected_mode?: ThreadMode | null;
  selected_model?: string | null;
  selected_provider?: string | null;
  text: string;
  thread_id?: string | null;
  workspace_id?: string | null;
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
