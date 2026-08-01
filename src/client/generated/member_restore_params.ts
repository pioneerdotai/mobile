/* eslint-disable */

export type PrincipalStatus = 'active' | 'suspended' | 'removed';
export type PrincipalId = string;

export interface MemberRestoreParams {
  expected_status?: PrincipalStatus | null;
  principal_id: PrincipalId;
}
