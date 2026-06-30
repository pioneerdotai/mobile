/* eslint-disable */

export type TurnPermissionApprovalResolution = 'allow_once' | 'allow_for_turn' | 'deny' | 'cancelled' | 'expired';

export interface TurnPermissionRequestRespondResponse {
  request_id: string;
  resolution: TurnPermissionApprovalResolution;
  [k: string]: unknown;
}
