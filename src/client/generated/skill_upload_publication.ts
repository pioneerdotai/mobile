/* eslint-disable */

/**
 * Stable, secret-free upload failures shared by all shells.
 */
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
      kind: 'app_preview';
      [k: string]: unknown;
    }
  | {
      app_id: string;
      expected_revision: number;
      kind: 'app_update_preview';
      [k: string]: unknown;
    }
  | {
      kind: 'plugin_install';
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
    };
export type SkillPackId = string;

export interface SkillUploadPublication {
  failure?: SkillUploadFailure | null;
  generation: number;
  /**
   * Apply was dispatched without an authoritative result; retained identity is retryable.
   */
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
  /**
   * Authored package description, bounded by the Gateway; absent for old peers.
   */
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
  allow_implicit_invocation?: boolean;
  components: PluginComponentItem[];
  /**
   * Authored package description, bounded by the Gateway; absent for old peers.
   */
  description?: string | null;
  diagnostics: PluginDiagnostic[];
  enabled: boolean;
  id: string;
  metadata?: PluginMetadata;
  name: string;
  revision: number;
  state: string;
  status: string;
  version?: string | null;
  [k: string]: unknown;
}
export interface PluginMetadata {
  app?: AppMetadata | null;
  author?: PluginAuthor;
  brand_color?: string | null;
  category?: string | null;
  composer_icon?: ImageReference | null;
  default_prompts?: string[];
  description?: string | null;
  developer_name?: string | null;
  display_name?: string | null;
  documentation_url?: string | null;
  homepage?: string | null;
  keywords?: string[];
  license?: string | null;
  logo?: ImageReference | null;
  long_description?: string | null;
  privacy_policy_url?: string | null;
  repository?: string | null;
  short_description?: string | null;
  support_url?: string | null;
  terms_of_service_url?: string | null;
  [k: string]: unknown;
}
/**
 * Verified presentation snapshot only; native authority remains in components.
 */
export interface AppMetadata {
  categories: string[];
  composer_icon?: AppThemedIcon | null;
  default_locale?: string | null;
  developer_logo?: AppThemedIcon | null;
  developer_url?: string | null;
  has_ui?: boolean;
  icon?: AppThemedIcon | null;
  localizations: {
    [k: string]: AppLocalization;
  };
  [k: string]: unknown;
}
export interface AppThemedIcon {
  dark: ImageReference;
  light: ImageReference;
  [k: string]: unknown;
}
/**
 * Immutable image reference. Published paths are authenticated Gateway storage links.
 */
export interface ImageReference {
  path: string;
  revision: string;
  [k: string]: unknown;
}
export interface AppLocalization {
  longDescription?: string | null;
  name?: string | null;
  shortDescription?: string | null;
  [k: string]: unknown;
}
/**
 * Authored presentation only. None of these fields grant execution authority.
 */
export interface PluginAuthor {
  email?: string | null;
  name?: string | null;
  url?: string | null;
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
  /**
   * Package bytes changed outside a changed member (for example shared assets).
   */
  supporting_files_changed?: boolean;
  updated: PluginComponentKey[];
  [k: string]: unknown;
}
export interface PluginComponentKey {
  kind: string;
  member_key: string;
}
