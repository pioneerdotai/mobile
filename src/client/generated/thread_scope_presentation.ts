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
  can_control_cli_runtime: boolean;
  can_create_task: boolean;
  can_manage_private_participants: boolean;
  can_manage_thread: boolean;
  can_move: boolean;
  can_read: boolean;
  can_read_artifacts: boolean;
  can_respond_to_agent_requests: boolean;
  can_start_turn: boolean;
  can_write: boolean;
  can_write_artifacts: boolean;
}
