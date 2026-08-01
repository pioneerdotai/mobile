/* eslint-disable */

export type PrincipalStatus = 'active' | 'suspended' | 'removed';
export type PrincipalId = string;

export interface MemberRemoveParams {
  expected_status?: PrincipalStatus | null;
  principal_id: PrincipalId;
}
