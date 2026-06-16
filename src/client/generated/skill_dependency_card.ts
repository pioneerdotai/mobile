/* eslint-disable */

export type SkillDependencyKind =
  | ('Bin' | 'Env' | 'ApiKey' | 'Command' | 'Mcp' | 'Tool')
  | {
      Other: string;
    };
export type SkillDependencyStatus = 'Ready' | 'Missing' | 'Blocked' | 'Warning' | 'Unknown';

export interface SkillDependencyCard {
  action_hint?: string | null;
  kind: SkillDependencyKind;
  requirement_name?: string | null;
  status: SkillDependencyStatus;
  [k: string]: unknown;
}
