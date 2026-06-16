/* eslint-disable */

export type SkillTrustGateDecision = 'Allowed' | 'Blocked';
export type SkillDiagnosticsTone = 'Default' | 'Muted' | 'Success' | 'Warning' | 'Danger';
export type SkillTrustLevel =
  | ('Internal' | 'Verified' | 'Community' | 'Untrusted' | 'None')
  | {
      Other: string;
    };
export type SkillTrustGateToolKind =
  | ('Shell' | 'Http' | 'FunctionProxy' | 'Mcp' | 'None')
  | {
      Other: string;
    };

export interface SkillTrustGateCard {
  decision: SkillTrustGateDecision;
  decision_tone: SkillDiagnosticsTone;
  minimum_trust: SkillTrustLevel;
  tool_kind: SkillTrustGateToolKind;
  [k: string]: unknown;
}
