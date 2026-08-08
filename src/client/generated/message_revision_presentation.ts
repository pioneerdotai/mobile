/* eslint-disable */

export type TurnMessageRevisionChangeKind = 'edit' | 'delete';
export type PersistedActorRef =
  | {
      id: PrincipalId;
      kind: 'principal';
      [k: string]: unknown;
    }
  | {
      kind: 'system';
      [k: string]: unknown;
    };
export type PrincipalId = string;

export interface MessageRevisionPresentation {
  change_kind: TurnMessageRevisionChangeKind;
  changed_by: PersistedActorRef;
  content_redacted: boolean;
  created_at: number;
  mentions?: TurnMention[];
  revision: number;
  text?: string | null;
}
export interface TurnMention {
  nickname: string;
  principal_id: PrincipalId;
  [k: string]: unknown;
}
