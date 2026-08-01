/* eslint-disable */

export type PrincipalStatus = 'active' | 'suspended' | 'removed';
export type PrincipalId = string;

export interface MemberSuspendParams {
  expected_status?: PrincipalStatus | null;
  principal_id: PrincipalId;
}
