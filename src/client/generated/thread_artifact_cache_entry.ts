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
export type ArtifactBindingKind =
  | 'user_input'
  | 'agent_output'
  | 'tool_output'
  | 'task_result'
  | 'task_result_candidate'
  | 'context_attachment'
  | 'derived_from'
  | 'preview'
  | 'manual_attach'
  | 'draft_upload';
export type ArtifactBindingDirection = 'input' | 'output' | 'context' | 'derived';
export type ArtifactRole = 'user' | 'assistant' | 'tool' | 'system' | 'task';
export type ArtifactCreatedByKind = 'user' | 'agent' | 'tool' | 'task' | 'system' | 'import' | 'external_agent';

export interface ThreadArtifactCacheEntry {
  error?: string | null;
  items: ArtifactSummary[];
  loaded: boolean;
  [k: string]: unknown;
}
export interface ArtifactSummary {
  artifact: ArtifactRef;
  bindings?: ArtifactBindingSummary[];
  created_at: number;
  created_by_actor_id?: string | null;
  created_by_kind: ArtifactCreatedByKind;
  metadata?: {
    [k: string]: unknown;
  };
  primary_thread_id?: string | null;
  updated_at: number;
  workspace_id: string;
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
export interface ArtifactBindingSummary {
  binding_id: string;
  binding_kind: ArtifactBindingKind;
  created_at: number;
  direction: ArtifactBindingDirection;
  item_index?: number | null;
  message_id?: string | null;
  role?: ArtifactRole | null;
  task_id?: string | null;
  task_run_id?: string | null;
  thread_id?: string | null;
  tool_call_id?: string | null;
  turn_id?: string | null;
  turn_item_id?: string | null;
  workspace_id: string;
  [k: string]: unknown;
}
