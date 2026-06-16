/* eslint-disable */

export interface SkillDetailDiagnostics {
  dependency_diagnostics: SkillDependencyDiagnostic[];
  recent_audit: SkillAuditTimelineItem[];
  security_findings: SkillSecurityFinding[];
  trust_gate: SkillTrustGateStatus[];
  validation_issues: SkillValidationDiagnostic[];
  [k: string]: unknown;
}
export interface SkillDependencyDiagnostic {
  hint: string;
  kind: string;
  name: string;
  status: string;
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
export interface SkillSecurityFinding {
  message: string;
  path?: string | null;
  rule_id: string;
  severity: string;
  [k: string]: unknown;
}
export interface SkillTrustGateStatus {
  allowed: boolean;
  minimum_trust: string;
  tool_kind: string;
  [k: string]: unknown;
}
export interface SkillValidationDiagnostic {
  code: string;
  field_path?: string | null;
  level: string;
  message: string;
  [k: string]: unknown;
}
