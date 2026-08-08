/* eslint-disable */

export type SessionStatusPresentation = 'active' | 'pending' | 'expired' | 'revoked';

export interface SessionListRowPresentation {
  actionable: boolean;
  status: SessionStatusPresentation;
}
