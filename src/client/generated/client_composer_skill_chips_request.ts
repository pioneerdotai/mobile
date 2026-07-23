/* eslint-disable */

export type SkillPackId = string;
export type SkillId = string;
export type SkillCapabilityUnavailableReason =
  | 'DisabledByPolicy'
  | {
      Inactive: {
        status_reason?: string | null;
        [k: string]: unknown;
      };
    };
export type ComposerSkillSelection =
  | {
      kind: 'skill';
      pack_id?: SkillPackId | null;
      skill_id: SkillId;
      [k: string]: unknown;
    }
  | {
      kind: 'skill_pack';
      pack_id: SkillPackId;
      [k: string]: unknown;
    };

export interface ClientComposerSkillChipsRequest {
  picker: ComposerSkillPickerProjection;
  selections: ComposerSkillSelection[];
}
export interface ComposerSkillPickerProjection {
  packs: SelectableSkillPackCapability[];
  standalone: SelectableSkillCapability[];
  [k: string]: unknown;
}
export interface SelectableSkillPackCapability {
  children: SelectablePackedSkillCapability[];
  key: string;
  label: string;
  pack_id: SkillPackId;
  selectable: boolean;
  [k: string]: unknown;
}
export interface SelectablePackedSkillCapability {
  member_key: string;
  pack_id: SkillPackId;
  skill: SelectableSkillCapability;
  [k: string]: unknown;
}
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
