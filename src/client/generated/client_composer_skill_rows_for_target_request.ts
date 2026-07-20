/* eslint-disable */

export type SkillCapabilityUnavailableReason =
  | 'DisabledByPolicy'
  | {
      Inactive: {
        status_reason?: string | null;
        [k: string]: unknown;
      };
    };
export type ComposerCapabilityTargetKind = 'native' | 'cli';

export interface ClientComposerSkillRowsForTargetRequest {
  rows?: SelectableSkillCapability[];
  target: ComposerCapabilityTarget;
}
export interface SelectableSkillCapability {
  description: string;
  key: string;
  label: string;
  selectable: boolean;
  slug: string;
  source_kind: string;
  unavailable_reason?: SkillCapabilityUnavailableReason | null;
  [k: string]: unknown;
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
