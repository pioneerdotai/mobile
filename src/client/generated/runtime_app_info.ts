/* eslint-disable */

export interface RuntimeAppInfo {
  account_label?: string | null;
  description?: string | null;
  enabled?: boolean;
  id: string;
  name: string;
  payload?: unknown;
  status?: string | null;
  [k: string]: unknown;
}
