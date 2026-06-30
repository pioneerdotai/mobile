/* eslint-disable */

export type PendingRequestDetailStyle = 'field' | 'diff';

export interface PendingRequestDetailRow {
  label: string;
  monospace: boolean;
  style: PendingRequestDetailStyle;
  value: string;
  [k: string]: unknown;
}
