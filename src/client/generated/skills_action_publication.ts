/* eslint-disable */

export type SkillsActionKind = 'policy' | 'remove' | 'remove_pack';
export type SkillsActionState = 'pending' | 'succeeded' | 'failed' | 'cancelled';

export interface SkillsActionPublication {
  kind: SkillsActionKind;
  operation_id: number;
  revision: number;
  state: SkillsActionState;
  [k: string]: unknown;
}
