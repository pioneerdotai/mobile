/* eslint-disable */

export type ProfileAvatarSelection =
  | {
      kind: 'unchanged';
      [k: string]: unknown;
    }
  | {
      kind: 'remove';
      [k: string]: unknown;
    }
  | {
      kind: 'selected';
      preview: string;
      [k: string]: unknown;
    };
export type ProfileEditorSection = 'account' | 'profile' | 'username';

export interface ProfilePublication {
  avatar: ProfileAvatarSelection;
  dirty: boolean;
  edit_revision: number;
  error?: string | null;
  first_name: string;
  has_saved_avatar: boolean;
  last_name: string;
  nickname: string;
  nickname_editing: boolean;
  nickname_valid: boolean;
  owner_generation: number;
  pending: boolean;
  principal_id?: string | null;
  saved_revision: number;
  section: ProfileEditorSection;
  valid: boolean;
  [k: string]: unknown;
}
