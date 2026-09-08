/* eslint-disable */

export type ThreadMemberReadState =
  | {
      kind: 'idle';
      [k: string]: unknown;
    }
  | {
      kind: 'loading';
      [k: string]: unknown;
    }
  | {
      kind: 'ready';
      [k: string]: unknown;
    }
  | {
      kind: 'failed';
      message: string;
      [k: string]: unknown;
    };
export type PrincipalKind = 'superuser' | 'user';
export type PrincipalId = string;
export type RoleKey = string;
export type PrincipalStatus = 'active' | 'suspended' | 'removed';
export type ThreadVisibilityPresentation = 'private' | 'workspace' | 'unknown';
export type ThreadMemberRequestState =
  | {
      action: ThreadScopeAction;
      kind: 'loading';
      [k: string]: unknown;
    }
  | {
      kind: 'ready';
      [k: string]: unknown;
    }
  | {
      action: ThreadScopeAction;
      kind: 'failed';
      message: string;
      [k: string]: unknown;
    }
  | {
      kind: 'cancelled';
      [k: string]: unknown;
    };
export type ThreadScopeAction =
  | {
      kind: 'list_participants';
      [k: string]: unknown;
    }
  | {
      kind: 'add_participant';
      principal_id: PrincipalId;
      [k: string]: unknown;
    }
  | {
      kind: 'remove_participant';
      principal_id: PrincipalId;
      [k: string]: unknown;
    }
  | {
      kind: 'update_visibility';
      visibility: ThreadVisibility;
      [k: string]: unknown;
    };
/**
 * User-selectable visibility for ordinary user threads.
 *
 * Internal task/system threads deliberately have no public selectable value.
 */
export type ThreadVisibility = 'private' | 'workspace';

export interface ThreadMemberPublication {
  directory_request: ThreadMemberReadState;
  generation: number;
  member_directory: MemberSummary[];
  mention_candidates: ComposerMentionCandidate[];
  participants: ThreadParticipantSummary[];
  participants_request: ThreadMemberReadState;
  presentation?: ThreadScopePresentation | null;
  request: ThreadMemberRequestState;
  revision: number;
  thread_id: string;
  workspace_id: string;
  workspace_members: MemberSummary[];
  workspace_request: ThreadMemberReadState;
  [k: string]: unknown;
}
export interface MemberSummary {
  avatar_revision?: string | null;
  display_name: string;
  kind: PrincipalKind;
  /**
   * Server-owned target trait. Clients may combine it with caller
   * capabilities for presentation, but never infer it from identity kind
   * or a well-known role key.
   */
  lifecycle_managed: boolean;
  nickname: string;
  principal_id: PrincipalId;
  role: AuthorizationRolePresentation;
  role_key?: RoleKey | null;
  status: PrincipalStatus;
  [k: string]: unknown;
}
/**
 * Server-owned role label. Clients display it verbatim and never infer
 * role semantics from `kind` or a well-known key.
 */
export interface AuthorizationRolePresentation {
  built_in: boolean;
  description: string;
  display_name: string;
  key: string;
}
export interface ComposerMentionCandidate {
  avatar_revision?: string | null;
  display_name: string;
  nickname: string;
  principal_id: PrincipalId;
}
export interface ThreadParticipantSummary {
  principal_id: PrincipalId;
  [k: string]: unknown;
}
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
  can_bind_artifacts: boolean;
  can_cancel_agent_execution: boolean;
  can_cancel_tasks: boolean;
  can_control_cli_runtime: boolean;
  can_create_task: boolean;
  can_manage_private_participants: boolean;
  can_manage_thread: boolean;
  can_move: boolean;
  can_observe_agent_execution: boolean;
  can_read: boolean;
  can_read_artifacts: boolean;
  can_respond_to_agent_requests: boolean;
  can_resume_agent_execution: boolean;
  can_review_tasks: boolean;
  can_start_turn: boolean;
  can_steer_agent_execution: boolean;
  can_write: boolean;
  can_write_artifacts: boolean;
}
