/* eslint-disable */

export type SkillId = string;
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
export type McpScopeKind = 'workspace' | 'user';

export interface ClientComposerSubmissionPlanRequest {
  capabilities?: ComposerCapability[];
  has_attachments?: boolean;
  provider?: string | null;
  text?: string;
}
export interface ComposerCapability {
  id: string;
  kind: ComposerCapabilityKind;
  label: string;
  [k: string]: unknown;
}
