/* eslint-disable */

export type SkillUploadFailure =
  | 'source_unavailable'
  | 'source_changed'
  | 'source_too_large'
  | 'invalid_package'
  | 'gateway_unavailable'
  | 'access_denied'
  | 'busy'
  | 'unknown';
export type SkillId = string;
export type SkillUploadState =
  'preparing' | 'starting' | 'uploading' | 'finishing' | 'applying' | 'succeeded' | 'failed' | 'cancelled';
export type SkillUploadTarget =
  | {
      kind: 'plugin_install';
      [k: string]: unknown;
    }
  | {
      kind: 'install';
      [k: string]: unknown;
    }
  | {
      kind: 'update';
      skill_id: SkillId;
      [k: string]: unknown;
    }
  | {
      kind: 'update_pack';
      pack_id: SkillPackId;
      [k: string]: unknown;
    }
  | {
      kind: 'plugin_preview';
      [k: string]: unknown;
    }
  | {
      expected_revision: number;
      kind: 'plugin_update_preview';
      plugin_id: string;
      [k: string]: unknown;
    };
export type SkillPackId = string;

export interface SkillUploadPublication {
  failure?: SkillUploadFailure | null;
  generation: number;
  mutation_uncertain: boolean;
  operation_id: number;
  pack: boolean;
  plugin_preview?: PluginPreviewPublication | null;
  plugin_result?: PluginItem | null;
  plugin_update_preview?: PluginUpdatePreviewPublication | null;
  revision: number;
  sent_bytes: number;
  state: SkillUploadState;
  target: SkillUploadTarget;
  total_bytes: number;
  [k: string]: unknown;
}
export interface PluginPreviewPublication {
  package: PluginsPreviewResponse;
  upload_id: string;
  [k: string]: unknown;
}
export interface PluginsPreviewResponse {
  components: PluginComponentItem[];
  description?: string | null;
  diagnostics: PluginDiagnostic[];
  fingerprint: string;
  name: string;
  version?: string | null;
  [k: string]: unknown;
}
export interface PluginComponentItem {
  diagnostic?: string | null;
  kind: string;
  mcp_installation_id?: string | null;
  member_key: string;
  runtime_status?: string | null;
  skill_id?: SkillId | null;
  status: string;
  [k: string]: unknown;
}
export interface PluginDiagnostic {
  code: string;
  message: string;
  path: string;
  [k: string]: unknown;
}
export interface PluginItem {
  components: PluginComponentItem[];
  description?: string | null;
  diagnostics: PluginDiagnostic[];
  enabled: boolean;
  id: string;
  name: string;
  revision: number;
  state: string;
  status: string;
  version?: string | null;
  metadata?: PluginMetadata;
  allow_implicit_invocation?: boolean;
  [k: string]: unknown;
}
export interface PluginMetadata {
  display_name?: string | null;
  short_description?: string | null;
  description?: string | null;
  long_description?: string | null;
  developer_name?: string | null;
  homepage?: string | null;
  repository?: string | null;
  documentation_url?: string | null;
  support_url?: string | null;
  privacy_policy_url?: string | null;
  terms_of_service_url?: string | null;
  license?: string | null;
  category?: string | null;
  brand_color?: string | null;
  author?: PluginAuthor;
  keywords?: string[];
  default_prompts?: string[];
  logo?: ImageReference | null;
  composer_icon?: ImageReference | null;
  [k: string]: unknown;
}
/**
 * Authored presentation only. None of these fields grant execution authority.
 */
export interface PluginAuthor {
  name?: string | null;
  email?: string | null;
  url?: string | null;
  [k: string]: unknown;
}
/**
 * Immutable image reference. Gateway inventory exposes a native storage link, never image bytes.
 */
export interface ImageReference {
  path: string;
  revision: string;
  [k: string]: unknown;
}
export interface PluginUpdatePreviewPublication {
  preview: PluginsUpdatePreviewResponse;
  upload_id: string;
  [k: string]: unknown;
}
export interface PluginsUpdatePreviewResponse {
  added: PluginComponentKey[];
  /**
   * Conservative disclosure of changed MCP configurations that may need sign-in.
   */
  authorization_changes: PluginComponentKey[];
  identity_resets: PluginComponentKey[];
  package: PluginsPreviewResponse;
  removed: PluginComponentKey[];
  supporting_files_changed?: boolean;
  updated: PluginComponentKey[];
  [k: string]: unknown;
}
export interface PluginComponentKey {
  kind: string;
  member_key: string;
}
