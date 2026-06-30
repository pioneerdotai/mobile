/* eslint-disable */

export type TurnPermissionApprovalResolution = 'allow_once' | 'allow_for_turn' | 'deny' | 'cancelled' | 'expired';

export interface TurnPermissionRequestResolvedNotification {
  request_id: string;
  resolution: TurnPermissionApprovalResolution;
  thread_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
