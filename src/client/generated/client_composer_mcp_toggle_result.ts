/* eslint-disable */

export type ComposerCapabilityKind =
  | {
      Skill: {
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
export type McpScopeKind = 'workspace' | 'user';

export interface ClientComposerMcpToggleResult {
  capabilities: ComposerCapability[];
  collapse_active_server: boolean;
  selected_keys: string[];
  [k: string]: unknown;
}
export interface ComposerCapability {
  id: string;
  kind: ComposerCapabilityKind;
  label: string;
  [k: string]: unknown;
}
