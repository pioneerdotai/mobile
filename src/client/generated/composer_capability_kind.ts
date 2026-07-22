/* eslint-disable */

export type ComposerCapabilityKind =
  | {
      Skill: {
        owner?: string | null;
        skill_id: SkillId;
        slug: string;
        source_kind: string;
        [k: string]: unknown;
      };
    }
  | {
      McpServer: {
        name: string;
        scope_kind: McpScopeKind;
        [k: string]: unknown;
      };
    }
  | {
      McpTool: {
        raw_tool_name: string;
        scope_kind: McpScopeKind;
        server_name: string;
        [k: string]: unknown;
      };
    };
export type SkillId = string;
export type McpScopeKind = 'workspace' | 'user';
