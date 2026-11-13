/* eslint-disable */

export type SkillId = string;

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
