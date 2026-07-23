/* eslint-disable */

export type ComposerSkillChipKind = 'skill_pack' | 'packed_skill' | 'standalone_skill';
export type SkillPackId = string;
export type SkillId = string;

export interface ComposerSkillChip {
  key: string;
  kind: ComposerSkillChipKind;
  label: string;
  pack_id?: SkillPackId | null;
  skill_id?: SkillId | null;
  [k: string]: unknown;
}
