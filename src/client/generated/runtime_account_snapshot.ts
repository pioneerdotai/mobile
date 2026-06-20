/* eslint-disable */

export interface RuntimeAccountSnapshot {
  account_id?: string | null;
  auth_method?: string | null;
  authenticated: boolean;
  display_name?: string | null;
  email?: string | null;
  plan?: string | null;
  [k: string]: unknown;
}
