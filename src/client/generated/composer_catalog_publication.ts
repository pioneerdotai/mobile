/* eslint-disable */

export type ComposerCatalogRequestState =
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
export type SkillId = string;
export type McpScopeKind = 'workspace' | 'user';
export type McpCapabilityUnavailableReason =
  'DisabledByPolicy' | 'RuntimeUnavailable' | 'RuntimeNotReady' | 'NoToolCatalog';
export type ComposerPickerKind = 'apps' | 'plugins' | 'skills' | 'mcp';
export type ComposerPickerSelection =
  | {
      capabilities: ComposerCapability[];
      kind: 'apps';
      [k: string]: unknown;
    }
  | {
      kind: 'immediate';
      [k: string]: unknown;
    }
  | {
      capabilities: ComposerCapability[];
      kind: 'plugins';
      [k: string]: unknown;
    }
  | {
      kind: 'skills';
      selections: ComposerSkillSelection[];
      [k: string]: unknown;
    }
  | {
      kind: 'mcp';
      selected: string[];
      [k: string]: unknown;
    };
export type ComposerCapabilityKind =
  | {
      App: {
        app_id: string;
        dark_icon?: ImageReference | null;
        expected_revision: number;
        icon?: ImageReference | null;
        [k: string]: unknown;
      };
    }
  | {
      Plugin: {
        expected_revision: number;
        icon?: ImageReference | null;
        plugin_id: string;
        [k: string]: unknown;
      };
    }
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
/**
 * Product identity is distinct even when installation mechanics are shared.
 */
export type PackageKind = 'plugin' | 'app';

export interface ComposerCatalogPublication {
  app_request: ComposerCatalogRequest;
  apps: PluginItem[];
  draft_id: number;
  mcp_request: ComposerCatalogRequest;
  mcp_servers: SelectableMcpCapability[];
  mcp_tools: SelectableMcpCapability[];
  plugin_request: ComposerCatalogRequest;
  plugins: PluginItem[];
  revision: number;
  session?: ComposerPickerSession | null;
  skill_request: ComposerCatalogRequest;
  skills: SkillManagementProjection;
  thread_id: string;
  tool_requests: {
    [k: string]: ComposerCatalogRequest;
  };
  [k: string]: unknown;
}
export interface ComposerCatalogRequest {
  generation: number;
  state: ComposerCatalogRequestState;
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
export interface ComposerPickerSession {
  identity: ComposerOperationIdentity;
  kind: ComposerPickerKind;
  selection: ComposerPickerSelection;
  [k: string]: unknown;
}
export interface ComposerOperationIdentity {
  draft_id: number;
  generation: number;
  thread_id: string;
  [k: string]: unknown;
}
export interface ComposerCapability {
  id: string;
  kind: ComposerCapabilityKind;
  label: string;
  [k: string]: unknown;
}
export interface SkillManagementProjection {
  packs: SkillPackManagementRow[];
  standalone: SkillListItem[];
  [k: string]: unknown;
}
export interface SkillPackManagementRow {
  attachable: boolean;
  children: SkillListItem[];
  pack: SkillPackInstallationItem;
  [k: string]: unknown;
}
export interface SkillListItem {
  description: string;
  display_name: string;
  fingerprint: string;
  health: SkillHealthSummary;
  install: SkillInstallState;
  owner?: string | null;
  pack?: SkillPackMembership | null;
  package_owner?: PackageOwner | null;
  plugin_owner?: PluginOwner | null;
  policy: SkillPolicyState;
  skill_id: SkillId;
  slug: string;
  source_kind: string;
  status: string;
  status_reason?: string | null;
  trust_level: string;
  version?: string | null;
  [k: string]: unknown;
}
export interface SkillHealthSummary {
  dependency_failures?: SkillDependencyDiagnostic[];
  security_blocks?: SkillSecurityFinding[];
  status: string;
  validation_issues?: SkillValidationDiagnostic[];
  [k: string]: unknown;
}
export interface SkillDependencyDiagnostic {
  hint: string;
  kind: string;
  name: string;
  status: string;
  [k: string]: unknown;
}
export interface SkillSecurityFinding {
  message: string;
  path?: string | null;
  rule_id: string;
  severity: string;
  [k: string]: unknown;
}
export interface SkillValidationDiagnostic {
  code: string;
  field_path?: string | null;
  level: string;
  message: string;
  [k: string]: unknown;
}
export interface SkillInstallState {
  install_path?: string | null;
  installed: boolean;
  lifecycle_editable?: boolean;
  managed: boolean;
  updated_at?: number | null;
  [k: string]: unknown;
}
export interface SkillPackMembership {
  member_key: string;
  pack_id: SkillPackId;
  [k: string]: unknown;
}
export interface PackageOwner {
  kind: PackageKind;
  member_key: string;
  package_id: string;
  [k: string]: unknown;
}
export interface PluginOwner {
  member_key: string;
  plugin_id: string;
  [k: string]: unknown;
}
export interface SkillPolicyState {
  allow_implicit_invocation: boolean;
  allow_implicit_invocation_editable?: boolean;
  enabled: boolean;
  [k: string]: unknown;
}
export interface SkillPackInstallationItem {
  created_at: number;
  id: SkillPackId;
  name: string;
  source_kind: string;
  updated_at: number;
  [k: string]: unknown;
}
