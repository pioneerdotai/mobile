/* eslint-disable */

export type SkillId = string;
export type SkillPackId = string;

export interface ReconciledSkillsSnapshot {
  selected_target?: SkillId | null;
  selected_target_cleared: boolean;
  snapshot: SkillsCatalogSnapshot;
  [k: string]: unknown;
}
export interface SkillsCatalogSnapshot {
  catalog: SkillListItem[];
  health_details: {
    [k: string]: SkillHealthItem;
  };
  installed: SkillListItem[];
  management?: SkillManagementProjection;
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
/**
 * This interface was referenced by `undefined`'s JSON-Schema definition
 * via the `patternProperty` "^[A-Za-z0-9]{21}$".
 */
export interface SkillHealthItem {
  dependency_diagnostics?: SkillDependencyDiagnostic[];
  owner?: string | null;
  recent_audit?: SkillAuditTimelineItem[];
  security_findings?: SkillSecurityFinding[];
  skill_id: SkillId;
  slug: string;
  source_kind: string;
  trust_gate?: SkillTrustGateStatus[];
  trust_level: string;
  validation_issues?: SkillValidationDiagnostic[];
  [k: string]: unknown;
}
export interface SkillAuditTimelineItem {
  action: string;
  created_at: number;
  decision: string;
  details_json: string;
  reason_code?: string | null;
  [k: string]: unknown;
}
export interface SkillTrustGateStatus {
  allowed: boolean;
  minimum_trust: string;
  tool_kind: string;
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
export interface SkillPackInstallationItem {
  created_at: number;
  id: SkillPackId;
  name: string;
  source_kind: string;
  updated_at: number;
  [k: string]: unknown;
}
