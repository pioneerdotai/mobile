/* eslint-disable */

export type DeviceId = string;
export type GatewayId = string;
export type PrincipalKind = 'superuser' | 'user';
export type PrincipalId = string;
export type RoleKey = string;
export type PrincipalStatus = 'active' | 'suspended' | 'removed';
export type AuthSessionId = string;
export type WorkspaceId = string;

export interface ClientInvitationRegistryWrite {
  device_id: DeviceId;
  gateway_id: GatewayId;
  member: MemberSummary;
  principal_id: PrincipalId;
  session_id: AuthSessionId;
  workspace_ids: WorkspaceId[];
  [k: string]: unknown;
}
export interface MemberSummary {
  avatar_revision?: string | null;
  display_name: string;
  kind: PrincipalKind;
  nickname: string;
  principal_id: PrincipalId;
  role_key?: RoleKey | null;
  status: PrincipalStatus;
  [k: string]: unknown;
}
