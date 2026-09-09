/* eslint-disable */

export type SkillUploadState =
  'preparing' | 'starting' | 'uploading' | 'finishing' | 'applying' | 'succeeded' | 'failed' | 'cancelled';
export type SkillUploadTarget =
  | {
      kind: 'install';
      [k: string]: unknown;
    }
  | {
      kind: 'update';
      skill_id: SkillId;
      [k: string]: unknown;
    }
  | {
      kind: 'update_pack';
      pack_id: SkillPackId;
      [k: string]: unknown;
    };
export type SkillId = string;
export type SkillPackId = string;

export interface SkillUploadPublication {
  generation: number;
  operation_id: number;
  pack: boolean;
  revision: number;
  sent_bytes: number;
  state: SkillUploadState;
  target: SkillUploadTarget;
  total_bytes: number;
  [k: string]: unknown;
}
