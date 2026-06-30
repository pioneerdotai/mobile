/* eslint-disable */

export type PendingRequestActionKind = 'cancel_turn' | 'deny' | 'allow' | 'allow_for_turn' | 'answer';
export type PendingRequestResolution =
  | {
      resolution: 'allow';
      [k: string]: unknown;
    }
  | {
      resolution: 'allow_for_turn';
      [k: string]: unknown;
    }
  | {
      resolution: 'allow_for_session';
      [k: string]: unknown;
    }
  | {
      reason?: string | null;
      resolution: 'deny';
      [k: string]: unknown;
    }
  | {
      resolution: 'cancel';
      [k: string]: unknown;
    }
  | {
      resolution: 'answered';
      response?: unknown;
      [k: string]: unknown;
    }
  | {
      resolution: 'expired';
      [k: string]: unknown;
    };
export type PendingRequestDetailStyle = 'field' | 'diff';

export interface PendingRequestPresentation {
  actions: PendingRequestAvailableAction[];
  details: PendingRequestDetailRow[];
  kind_label: string;
  message?: string | null;
  origin_label: string;
  title: string;
  user_input_questions: PendingRequestUserInputQuestion[];
  [k: string]: unknown;
}
export interface PendingRequestAvailableAction {
  kind: PendingRequestActionKind;
  resolution?: PendingRequestResolution | null;
  [k: string]: unknown;
}
export interface PendingRequestDetailRow {
  label: string;
  monospace: boolean;
  style: PendingRequestDetailStyle;
  value: string;
  [k: string]: unknown;
}
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
