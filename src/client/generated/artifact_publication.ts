/* eslint-disable */

export type ArtifactActionKind = 'open' | 'share' | 'download' | 'reveal';
export type ArtifactActionState =
  | {
      kind: 'preparing';
      [k: string]: unknown;
    }
  | {
      kind: 'resolving';
      [k: string]: unknown;
    }
  | {
      kind: 'verifying';
      [k: string]: unknown;
    }
  | {
      kind: 'ready';
      [k: string]: unknown;
    }
  | {
      kind: 'presenting';
      [k: string]: unknown;
    }
  | {
      kind: 'completed';
      [k: string]: unknown;
    }
  | {
      code: string;
      kind: 'failed';
      [k: string]: unknown;
    }
  | {
      kind: 'cancelled';
      [k: string]: unknown;
    };
export type ArtifactDownloadState = 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled';
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
export type ArtifactPreviewRequestState =
  | {
      kind: 'loading';
      [k: string]: unknown;
    }
  | {
      kind: 'ready';
      paths: ArtifactPreviewImagePaths;
      [k: string]: unknown;
    }
  | {
      kind: 'failed';
      [k: string]: unknown;
    }
  | {
      kind: 'cancelled';
      [k: string]: unknown;
    };
export type ArtifactReadState =
  | {
      kind: 'idle';
      [k: string]: unknown;
    }
  | {
      kind: 'loading';
      [k: string]: unknown;
    }
  | {
      kind: 'ready';
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

export interface ArtifactPublication {
  actions: ArtifactActionPublication[];
  downloads: ArtifactDownloadPublication[];
  generation: number;
  items: ArtifactSummary[];
  previews: ArtifactPreviewPublication[];
  request: ArtifactReadState;
  revision: number;
  thread_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ArtifactActionPublication {
  action: ArtifactActionKind;
  download?: ArtifactDownloadIdentity | null;
  expires_at?: number | null;
  identity: ArtifactActionIdentity;
  local_file?: ArtifactLocalFile | null;
  state: ArtifactActionState;
  target: ArtifactDownloadTarget;
  [k: string]: unknown;
}
export interface ArtifactDownloadIdentity {
  generation: number;
  operation_id: string;
  [k: string]: unknown;
}
export interface ArtifactActionIdentity {
  artifact_id: string;
  generation: number;
  thread_id: string;
  version_id?: string | null;
  [k: string]: unknown;
}
export interface ArtifactLocalFile {
  path: string;
  sha256: string;
  size_bytes?: number | null;
  [k: string]: unknown;
}
export interface ArtifactDownloadTarget {
  artifact_id: string;
  thread_id?: string | null;
  version_id?: string | null;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ArtifactDownloadPublication {
  downloaded_bytes: number;
  error_code?: string | null;
  identity: ArtifactDownloadIdentity;
  resumed_from_bytes: number;
  state: ArtifactDownloadState;
  target: ArtifactDownloadTarget;
  total_bytes: number;
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
export interface ArtifactPreviewPublication {
  artifact: ArtifactRef;
  generation: number;
  state: ArtifactPreviewRequestState;
  [k: string]: unknown;
}
export interface ArtifactPreviewImagePaths {
  detail_path: string;
  square_path: string;
  [k: string]: unknown;
}
