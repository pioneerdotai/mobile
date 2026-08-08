/* eslint-disable */

export type PrincipalId = string;

export interface ComposerMentionCandidate {
  avatar_revision?: string | null;
  display_name: string;
  nickname: string;
  principal_id: PrincipalId;
}
