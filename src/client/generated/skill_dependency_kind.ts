/* eslint-disable */

export type SkillDependencyKind =
  | ('Bin' | 'Env' | 'ApiKey' | 'Command' | 'Mcp' | 'Tool')
  | {
      Other: string;
    };
