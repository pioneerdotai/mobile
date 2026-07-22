/* eslint-disable */

export type ComposerCapabilityKind =
  | {
      Skill: {
        owner?: string | null;
        skill_id: SkillId;
        slug: string;
        source_kind: string;
        [k: string]: unknown;
      };
    }
  | {
      McpServer: {
        name: string;
        scope_kind: McpScopeKind;
        [k: string]: unknown;
      };
    }
  | {
      McpTool: {
        raw_tool_name: string;
        scope_kind: McpScopeKind;
        server_name: string;
        [k: string]: unknown;
      };
    };
export type SkillId = string;
export type McpScopeKind = 'workspace' | 'user';
export type McpCapabilityUnavailableReason =
  'DisabledByPolicy' | 'RuntimeUnavailable' | 'RuntimeNotReady' | 'NoToolCatalog';

export interface ClientComposerMcpToggleRequest {
  capabilities: ComposerCapability[];
  row: SelectableMcpCapability;
  selected_keys: string[];
  server_rows: SelectableMcpCapability[];
  tool_rows: SelectableMcpCapability[];
}
export interface ComposerCapability {
  id: string;
  kind: ComposerCapabilityKind;
  label: string;
  [k: string]: unknown;
}
export interface SelectableMcpCapability {
  description: string;
  key: string;
  label: string;
  raw_tool_name?: string | null;
  scope_kind: McpScopeKind;
  selectable: boolean;
  server_id: string;
  server_name: string;
  tools_count?: number | null;
  unavailable_reason?: McpCapabilityUnavailableReason | null;
  [k: string]: unknown;
}
