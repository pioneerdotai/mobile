/* eslint-disable */

export type McpAuditDecision =
  | ('Allowed' | 'Blocked' | 'Warning' | 'None')
  | {
      Other: string;
    };
