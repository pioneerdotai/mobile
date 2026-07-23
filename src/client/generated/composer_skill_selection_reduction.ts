/* eslint-disable */

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
export type SkillPackId = string;
export type SkillId = string;

export interface ComposerSkillSelectionReduction {
  changed: boolean;
  selections: ComposerSkillSelection[];
  [k: string]: unknown;
}
