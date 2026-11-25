/* eslint-disable */

export type ComposerCapabilityKind =
  | {
      App: {
        app_id: string;
        dark_icon?: ImageReference | null;
        expected_revision: number;
        icon?: ImageReference | null;
        [k: string]: unknown;
      };
    }
  | {
      Plugin: {
        expected_revision: number;
        icon?: ImageReference | null;
        plugin_id: string;
        [k: string]: unknown;
      };
    }
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
/**
 * Immutable image reference. Published paths are authenticated Gateway storage links.
 */
export interface ImageReference {
  path: string;
  revision: string;
  [k: string]: unknown;
}
