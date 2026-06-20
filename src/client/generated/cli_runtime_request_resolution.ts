/* eslint-disable */

export type CLIRuntimeRequestResolution =
  | {
      status: 'approved';
      [k: string]: unknown;
    }
  | {
      reason?: string | null;
      status: 'denied';
      [k: string]: unknown;
    }
  | {
      status: 'cancelled';
      [k: string]: unknown;
    }
  | {
      response?: unknown;
      status: 'answered';
      [k: string]: unknown;
    }
  | {
      status: 'expired';
      [k: string]: unknown;
    }
  | {
      message: string;
      status: 'error';
      [k: string]: unknown;
    };
