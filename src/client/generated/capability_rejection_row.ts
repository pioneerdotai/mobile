/* eslint-disable */

export type CapabilityRejectionKind = 'Skill' | 'McpServer' | 'McpTool' | 'Capability';
export type CapabilityRejectionLabel =
  | ('Skill' | 'McpServer' | 'McpTool' | 'Capability')
  | {
      Text: string;
    };

export interface CapabilityRejectionRow {
  kind: CapabilityRejectionKind;
  label: CapabilityRejectionLabel;
  message: string;
  [k: string]: unknown;
}
