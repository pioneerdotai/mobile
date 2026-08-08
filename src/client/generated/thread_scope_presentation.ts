/* eslint-disable */

export type PrincipalId = string;
export type ThreadVisibilityPresentation = 'private' | 'workspace' | 'unknown';

export interface ThreadScopePresentation {
  candidate_members: ThreadParticipantRow[];
  capabilities: ThreadPresentationCapabilities;
  is_closed: boolean;
  is_user_thread: boolean;
  participants: ThreadParticipantRow[];
  show_workspace_explanation: boolean;
  visibility: ThreadVisibilityPresentation;
}
export interface ThreadParticipantRow {
  avatar_revision?: string | null;
  can_remove: boolean;
  display_name: string;
  is_current_principal: boolean;
  nickname: string;
  principal_id: PrincipalId;
}
export interface ThreadPresentationCapabilities {
  can_manage_private_participants: boolean;
  can_manage_thread: boolean;
}
