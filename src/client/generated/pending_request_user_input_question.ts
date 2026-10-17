/* eslint-disable */

export interface PendingRequestUserInputQuestion {
  header?: string | null;
  id: string;
  is_secret: boolean;
  options: PendingRequestUserInputOption[];
  question: string;
  value_schema?: unknown;
  [k: string]: unknown;
}
export interface PendingRequestUserInputOption {
  description?: string | null;
  label: string;
  value?: string | null;
  [k: string]: unknown;
}
