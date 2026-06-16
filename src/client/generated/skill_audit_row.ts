/* eslint-disable */

export type SkillAuditAction =
  | 'Install'
  | 'Update'
  | 'Uninstall'
  | 'ResolveAllowed'
  | 'ResolveBlocked'
  | 'RuntimeAllowed'
  | 'RuntimeBlocked'
  | 'SecurityWarn'
  | 'None';
export type SkillAuditDecision = 'Allowed' | 'Blocked' | 'Warning' | 'None';
export type SkillDiagnosticsTone = 'Default' | 'Muted' | 'Success' | 'Warning' | 'Danger';
export type SkillAuditDetailsSummary =
  | 'Empty'
  | {
      Text: string;
    }
  | {
      ObjectPairs: [unknown, unknown][];
    }
  | {
      ArrayLen: number;
    }
  | {
      Value: SkillJsonValuePreview;
    };
export type SkillJsonValuePreview =
  | ('None' | 'EmptyArray' | 'EmptyObject')
  | {
      Text: string;
    }
  | {
      Bool: boolean;
    }
  | {
      Number: string;
    }
  | {
      ArrayLen: number;
    }
  | {
      ObjectKeys: number;
    };

export interface SkillAuditRow {
  action: SkillAuditAction;
  created_at: number;
  decision: SkillAuditDecision;
  decision_tone: SkillDiagnosticsTone;
  details_summary: SkillAuditDetailsSummary;
  reason_code?: string | null;
  [k: string]: unknown;
}
