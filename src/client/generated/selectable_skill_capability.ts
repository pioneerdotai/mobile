/* eslint-disable */

export type SkillId = string;
export type SkillCapabilityUnavailableReason =
  | 'DisabledByPolicy'
  | {
      Inactive: {
        status_reason?: string | null;
        [k: string]: unknown;
      };
    };

export interface SelectableSkillCapability {
  description: string;
  display_name: string;
  key: string;
  label: string;
  owner?: string | null;
  selectable: boolean;
  skill_id: SkillId;
  slug: string;
  source_kind: string;
  unavailable_reason?: SkillCapabilityUnavailableReason | null;
  [k: string]: unknown;
}
