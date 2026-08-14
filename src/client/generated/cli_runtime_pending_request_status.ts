/* eslint-disable */

export type CLIRuntimePendingRequestStatus =
  | 'pending'
  | 'response_accepted'
  | 'delivering'
  | 'delivery_failed'
  | 'answered'
  | 'resolved'
  | 'cancelled'
  | 'expired';
