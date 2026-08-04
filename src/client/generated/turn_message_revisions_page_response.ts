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
export type UserInput =
  | {
      text: string;
      textElements?: TextElement[];
      type: 'text';
      [k: string]: unknown;
    }
  | {
      type: 'image';
      url: string;
      [k: string]: unknown;
    }
  | {
      path: string;
      type: 'localImage';
      [k: string]: unknown;
    }
  | {
      type: 'file';
      url: string;
      [k: string]: unknown;
    }
  | {
      path: string;
      type: 'localFile';
      [k: string]: unknown;
    }
  | {
      type: 'audio';
      url: string;
      [k: string]: unknown;
    }
  | {
      path: string;
      type: 'localAudio';
      [k: string]: unknown;
    }
  | {
      type: 'video';
      url: string;
      [k: string]: unknown;
    }
  | {
      path: string;
      type: 'localVideo';
      [k: string]: unknown;
    }
  | {
      artifactId: string;
      type: 'artifact';
      versionId?: string | null;
      [k: string]: unknown;
    }
  | {
      name: string;
      path: string;
      type: 'mention';
      [k: string]: unknown;
    };

export interface TurnMessageRevisionsPageResponse {
  next_cursor?: string | null;
  revisions?: TurnMessageRevision[];
  thread_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TurnMessageRevision {
  change_kind: TurnMessageRevisionChangeKind;
  changed_by: PersistedActorRef;
  created_at: number;
  /**
   * `None` is the intentional content-redacted representation.
   */
  input?: UserInput[] | null;
  mentions?: TurnMention[];
  revision: number;
  turn_id: string;
  [k: string]: unknown;
}
export interface TextElement {
  byte_range: ByteRange;
  placeholder?: string | null;
  [k: string]: unknown;
}
export interface ByteRange {
  end: number;
  start: number;
  [k: string]: unknown;
}
export interface TurnMention {
  nickname: string;
  principal_id: PrincipalId;
  [k: string]: unknown;
}
