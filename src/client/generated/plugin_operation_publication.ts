/* eslint-disable */

export type SkillId = string;

/**
 * A parent's operation outcome is independent of other visible parents.
 */
export interface PluginOperationPublication {
  busy: boolean;
  error?: string | null;
  generation: number;
  native_operation_id?: number | null;
  origin: PluginCommandOrigin;
  result?: PluginsMutationResponse | null;
  uncertain: boolean;
  [k: string]: unknown;
}
/**
 * Captured connection and effective authorization at the shell submission.
 */
export interface PluginCommandOrigin {
  authorization_sequence: number;
  connection_generation: number;
  connection_id?: number | null;
  [k: string]: unknown;
}
export interface PluginsMutationResponse {
  plugin?: PluginItem | null;
  removed: boolean;
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
