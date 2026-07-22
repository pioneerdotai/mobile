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
export type ComposerCapabilityRemovalReason =
  'skills_unsupported' | 'skill_source_not_exportable' | 'mcp_tools_unsupported';
export type ComposerCapabilityTargetKind = 'native' | 'cli';

export interface ComposerCapabilityPresentation {
  capabilities: ComposerCapability[];
  has_composer_payload: boolean;
  menu_visibility: ComposerCapabilityMenuVisibility;
  removed: RemovedComposerCapability[];
  target: ComposerCapabilityTarget;
}
export interface ComposerCapability {
  id: string;
  kind: ComposerCapabilityKind;
  label: string;
  [k: string]: unknown;
}
export interface ComposerCapabilityMenuVisibility {
  any: boolean;
  mcp: boolean;
  skills: boolean;
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
