/* eslint-disable */

export type McpCapabilityKind = 'Tools' | 'Resources' | 'ResourceTemplates' | 'Prompts';

export interface McpCapabilityCount {
  count: number;
  kind: McpCapabilityKind;
  [k: string]: unknown;
}
