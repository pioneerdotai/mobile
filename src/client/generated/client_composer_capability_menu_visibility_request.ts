/* eslint-disable */

export type ComposerCapabilityTargetKind = 'native' | 'cli';

export interface ClientComposerCapabilityMenuVisibilityRequest {
  target: ComposerCapabilityTarget;
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
