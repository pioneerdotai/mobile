/* eslint-disable */

export type ClientComposerCapabilitiesUpdateAction =
  | {
      Add: {
        capability: ComposerCapability;
        [k: string]: unknown;
      };
    }
  | {
      Remove: {
        id: string;
        [k: string]: unknown;
      };
    }
  | {
      RemoveAt: {
        index: number;
        [k: string]: unknown;
      };
    };
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

export interface ClientComposerCapabilitiesUpdateRequest {
  action: ClientComposerCapabilitiesUpdateAction;
  capabilities: ComposerCapability[];
}
export interface ComposerCapability {
  id: string;
  kind: ComposerCapabilityKind;
  label: string;
  [k: string]: unknown;
}
