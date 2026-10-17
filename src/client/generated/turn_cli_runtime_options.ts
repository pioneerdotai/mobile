/* eslint-disable */

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

export interface TurnCLIRuntimeOptions {
  acp_configuration?: AcpTurnConfiguration | null;
  effort?: string | null;
  personality?: string | null;
  sandbox?: unknown;
  steer_if_active?: boolean | null;
  summary?: string | null;
  [k: string]: unknown;
}
/**
 * Selection captured from a version-checked preparation, then frozen with the
 * existing launch/input. The actual admitted session revalidates descriptor
 * identity and every opaque value before dispatch. No elevated instructions.
 */
export interface AcpTurnConfiguration {
  additional_directories?: string[];
  configuration_replay?: AcpConfigurationChoice[];
  continuation_requested?: boolean;
  descriptor_fingerprint: string;
  expected: AcpConfigurationVersion;
  initial_descriptor_fingerprint?: string;
  mode?: string | null;
  session_id: string;
  values: {
    [k: string]: SessionConfigOptionValue;
  };
  [k: string]: unknown;
}
/**
 * An actually applied choice, in receive order. The descriptor identity is
 * checked before replay; opaque ids never determine dependency ordering.
 */
export interface AcpConfigurationChoice {
  config_id: string;
  descriptor_fingerprint: string;
  value: SessionConfigOptionValue;
  [k: string]: unknown;
}
export interface AcpConfigurationVersion {
  connection_id: string;
  revision: number;
  [k: string]: unknown;
}
