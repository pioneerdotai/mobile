/* eslint-disable */

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
