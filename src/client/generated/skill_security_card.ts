/* eslint-disable */

export type SkillSecuritySeverity =
  | ('Critical' | 'High' | 'Medium' | 'Low' | 'Info' | 'None')
  | {
      Other: string;
    };
export type SkillDiagnosticsTone = 'Default' | 'Muted' | 'Success' | 'Warning' | 'Danger';

export interface SkillSecurityCard {
  location?: string | null;
  message?: string | null;
  rule_id?: string | null;
  severity: SkillSecuritySeverity;
  severity_tone: SkillDiagnosticsTone;
  [k: string]: unknown;
}
