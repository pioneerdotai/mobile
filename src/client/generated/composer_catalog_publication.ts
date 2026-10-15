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
export type McpScopeKind = 'workspace' | 'user';
export type McpCapabilityUnavailableReason =
  'DisabledByPolicy' | 'RuntimeUnavailable' | 'RuntimeNotReady' | 'NoToolCatalog';
export type ComposerPickerKind = 'skills' | 'mcp';
export type ComposerPickerSelection =
  | {
      kind: 'immediate';
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
export type SkillId = string;

export interface ComposerCatalogPublication {
  draft_id: number;
  mcp_request: ComposerCatalogRequest;
  mcp_servers: SelectableMcpCapability[];
  mcp_tools: SelectableMcpCapability[];
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
