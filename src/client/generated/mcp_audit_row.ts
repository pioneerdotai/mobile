/* eslint-disable */

export type McpAuditAction =
  | (
      | 'Install'
      | 'Update'
      | 'Uninstall'
      | 'Policy'
      | 'Start'
      | 'Started'
      | 'StartFailed'
      | 'Stop'
      | 'Stopped'
      | 'Restart'
      | 'CatalogRefreshed'
      | 'Call'
      | 'CallCompleted'
      | 'CallFailed'
      | 'None'
    )
  | {
      Other: string;
    };
export type McpAuditDecision =
  | ('Allowed' | 'Blocked' | 'Warning' | 'None')
  | {
      Other: string;
    };
export type McpPresentationTone = 'Default' | 'Muted' | 'Success' | 'Warning' | 'Danger';
export type McpAuditDetailsSummary =
  | 'Empty'
  | {
      ObjectPairs: [unknown, unknown][];
    }
  | {
      ArrayLen: number;
    }
  | {
      Value: McpJsonValuePreview;
    };
export type McpJsonValuePreview =
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

export interface McpAuditRow {
  action: McpAuditAction;
  created_at: number;
  decision: McpAuditDecision;
  decision_tone: McpPresentationTone;
  details_summary: McpAuditDetailsSummary;
  raw_tool_name?: string | null;
  reason_code?: string | null;
  [k: string]: unknown;
}
