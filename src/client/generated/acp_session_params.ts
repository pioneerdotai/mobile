/* eslint-disable */

export type AcpSessionOperation =
  | {
      additional_directories?: string[];
      type: 'prepare';
      [k: string]: unknown;
    }
  | {
      config_id: string;
      expected: AcpConfigurationVersion;
      session_id: string;
      type: 'set_option';
      value: SessionConfigOptionValue;
      [k: string]: unknown;
    }
  | {
      expected: AcpConfigurationVersion;
      mode_id: string;
      session_id: string;
      type: 'set_mode';
      [k: string]: unknown;
    }
  | {
      method_id: string;
      type: 'authenticate';
      [k: string]: unknown;
    }
  | {
      columns: number;
      expected_generation: number;
      method_id: string;
      rows: number;
      terminal_id: string;
      type: 'terminal_auth_start';
      [k: string]: unknown;
    }
  | {
      data: string;
      terminal_id: string;
      type: 'terminal_auth_input';
      [k: string]: unknown;
    }
  | {
      terminal_id: string;
      type: 'terminal_auth_output';
      [k: string]: unknown;
    }
  | {
      expected_generation: number;
      terminal_id: string;
      type: 'terminal_auth_close';
      [k: string]: unknown;
    }
  | {
      type: 'logout';
      [k: string]: unknown;
    }
  | {
      cursor?: string | null;
      cwd?: string | null;
      type: 'list';
      [k: string]: unknown;
    }
  | {
      session_id: string;
      type: 'load';
      [k: string]: unknown;
    }
  | {
      session_id: string;
      type: 'resume';
      [k: string]: unknown;
    }
  | {
      session_id: string;
      type: 'delete';
      [k: string]: unknown;
    }
  | {
      session_id: string;
      type: 'close';
      [k: string]: unknown;
    }
  | {
      type: 'snapshot';
      [k: string]: unknown;
    };
/**
 * The value to set for a session configuration option.
 *
 * The `type` field acts as the discriminator in the serialized JSON form.
 * When no `type` is present, the value is treated as a [`SessionConfigValueId`]
 * via the [`ValueId`](Self::ValueId) fallback variant.
 *
 * The `type` discriminator describes the *shape* of the value, not the option
 * kind. For example every option kind that picks from a list of ids
 * (`select`, `radio`, …) would use [`ValueId`](Self::ValueId), while a
 * future freeform text option would get its own variant.
 */
export type SessionConfigOptionValue =
  | {
      type: 'boolean';
      /**
       * The boolean value.
       */
      value: boolean;
      [k: string]: unknown;
    }
  | {
      /**
       * The value ID.
       */
      value: string;
      [k: string]: unknown;
    };

export interface AcpSessionParams {
  operation: AcpSessionOperation;
  runtime_id: string;
  thread_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface AcpConfigurationVersion {
  connection_id: string;
  revision: number;
  [k: string]: unknown;
}
