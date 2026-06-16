/* eslint-disable */

export type SkillSourceKind =
  | ('System' | 'User' | 'Registry')
  | {
      Other: string;
    };
export type SkillStatus =
  | ('Active' | 'Blocked' | 'Disabled')
  | {
      Other: string;
    };
export type SkillDiagnosticsTone = 'Default' | 'Muted' | 'Success' | 'Warning' | 'Danger';
export type SkillTrustLevel =
  | ('Internal' | 'Verified' | 'Community' | 'Untrusted' | 'None')
  | {
      Other: string;
    };

export interface SkillSummaryPresentation {
  fingerprint_short: string;
  slug: SkillSlugPresentation;
  source: SkillSourceKind;
  status: SkillStatus;
  status_tone: SkillDiagnosticsTone;
  trust: SkillTrustLevel;
  version?: string | null;
  [k: string]: unknown;
}
export interface SkillSlugPresentation {
  owner?: string | null;
  slug: string;
  [k: string]: unknown;
}
