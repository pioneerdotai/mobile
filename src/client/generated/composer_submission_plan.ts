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
export type ComposerCapabilityRemovalReason =
  'skills_unsupported' | 'skill_source_not_exportable' | 'mcp_tools_unsupported';
export type ComposerCapabilityTargetKind = 'native' | 'cli';

export interface ComposerSubmissionPlan {
  capabilities: ComposerCapability[];
  has_composer_payload: boolean;
  removed: RemovedComposerCapability[];
  target: ComposerCapabilityTarget;
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
export interface RemovedComposerCapability {
  capability: ComposerCapability;
  reason: ComposerCapabilityRemovalReason;
}
/**
 * Capability eligibility context.
 *
 * The target kind exists only because native skills retain their current
 * source policy while CLI skills must be exportable. Capability support is
 * represented exclusively by [`ComposerCapabilityPolicy`].
 */
export interface ComposerCapabilityTarget {
  kind: ComposerCapabilityTargetKind;
  supports_mcp_tools: boolean;
  supports_skills: boolean;
}
