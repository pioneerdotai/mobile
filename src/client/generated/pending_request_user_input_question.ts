/* eslint-disable */

export interface PendingRequestUserInputQuestion {
  header?: string | null;
  id: string;
  is_secret: boolean;
  options: PendingRequestUserInputOption[];
  question: string;
  [k: string]: unknown;
}
export interface PendingRequestUserInputOption {
  description?: string | null;
  label: string;
  [k: string]: unknown;
}
