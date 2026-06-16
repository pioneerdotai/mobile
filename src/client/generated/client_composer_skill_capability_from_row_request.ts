/* eslint-disable */

export type SkillCapabilityUnavailableReason =
  | 'DisabledByPolicy'
  | {
      Inactive: {
        status_reason?: string | null;
        [k: string]: unknown;
      };
    };

export interface ClientComposerSkillCapabilityFromRowRequest {
  row: SelectableSkillCapability;
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
