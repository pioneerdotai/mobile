/* eslint-disable */

export type RuntimeDiagnosticLevel = 'info' | 'warning' | 'error';

export interface CLIRuntimeListModelsResponse {
  diagnostics?: RuntimeDiagnostic[];
  models: RuntimeModelInfo[];
  refreshed_at_unix_ms?: number | null;
  runtime_id: string;
  [k: string]: unknown;
}
export interface RuntimeDiagnostic {
  code: string;
  level: RuntimeDiagnosticLevel;
  message: string;
  [k: string]: unknown;
}
export interface RuntimeModelInfo {
  active?: boolean | null;
  description?: string | null;
  effort_options?: string[];
  family?: string | null;
  id: string;
  input_modalities?: string[];
  is_custom?: boolean;
  max_input_tokens?: number | null;
  max_output_tokens?: number | null;
  name?: string | null;
  output_modalities?: string[];
  supports_reasoning?: boolean | null;
  supports_vision?: boolean | null;
  [k: string]: unknown;
}
