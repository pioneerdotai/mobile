/* eslint-disable */

export type SkillId = string;
export interface SkillCatalogState {
  catalog: SkillListItem[];
  error?: string | null;
  health_details: {
    [k: string]: SkillHealthItem;
  };
  installed: SkillListItem[];
  loading: boolean;
  pending_actions: SkillId[];
  poller_started: boolean;
  refresh_requested: boolean;
  selected_target?: SkillId | null;
  [k: string]: unknown;
}
export interface SkillListItem {
  description: string;
  display_name: string;
  fingerprint: string;
  health: SkillHealthSummary;
  install: SkillInstallState;
  owner?: string | null;
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
export interface SkillPolicyState {
  allow_implicit_invocation: boolean;
  allow_implicit_invocation_editable?: boolean;
  enabled: boolean;
  [k: string]: unknown;
}
export interface SkillHealthItem {
  dependency_diagnostics?: SkillDependencyDiagnostic[];
  recent_audit?: SkillAuditTimelineItem[];
  security_findings?: SkillSecurityFinding[];
  owner?: string | null;
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
