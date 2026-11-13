/* eslint-disable */

export type PluginShellRequest =
  | {
      kind: 'parent_snapshot';
      plugin_id: string;
      workspace_id: string;
    }
  | {
      intent: PluginIntent;
      kind: 'parent_command';
      origin: PluginCommandOrigin;
      plugin_id: string;
      workspace_id: string;
    }
  | {
      kind: 'configure_oauth';
      redirect_uri: string;
    }
  | {
      kind: 'poll_oauth';
    }
  | {
      draft_id: number;
      kind: 'composer_picker';
      query: string;
      thread_id: string;
    }
  | {
      kind: 'oauth_callback';
      url: string;
    }
  | {
      cancelled: boolean;
      flow_id: string;
      kind: 'browser_result';
    }
  | {
      expected_connection: number;
      file_uri: string;
      kind: 'start_archive';
      target: SkillUploadTarget;
      workspace_id: string;
    }
  | {
      kind: 'cancel_upload';
      operation_id: number;
      workspace_id: string;
    };
export type PluginIntent =
  | {
      kind: 'observe';
      plugin_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'close';
      [k: string]: unknown;
    }
  | {
      enabled: boolean;
      expected_revision: number;
      kind: 'set_enabled';
      plugin_id: string;
      [k: string]: unknown;
    }
  | {
      expected_revision: number;
      intent: PluginManagementIntent;
      kind: 'mutate';
      plugin_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'install';
      upload_operation: number;
      [k: string]: unknown;
    }
  | {
      confirm_changes: boolean;
      kind: 'apply_update';
      upload_operation: number;
      [k: string]: unknown;
    }
  | {
      allow_implicit_invocation: boolean;
      enabled: boolean;
      kind: 'skill';
      skill_id: SkillId;
      [k: string]: unknown;
    }
  | {
      kind: 'remove_skill';
      skill_id: SkillId;
      [k: string]: unknown;
    }
  | {
      body: string;
      kind: 'configure_mcp';
      server_id: string;
      [k: string]: unknown;
    }
  | {
      intent: McpIntent;
      kind: 'mcp';
      [k: string]: unknown;
    };
export type PluginManagementIntent =
  | {
      action: 'update';
      confirm_changes: boolean;
      expected_fingerprint: string;
      upload_id: string;
    }
  | {
      action: 'retry';
      components: PluginComponentKey[];
      restore_removed: boolean;
    }
  | {
      action: 'continue';
    }
  | {
      action: 'remove';
      purge_data: boolean;
    };
export type SkillId = string;
export type McpIntent =
  | {
      kind: 'retry_authorization_browser';
      server_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'sign_in';
      server_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'disconnect';
      server_id: string;
      [k: string]: unknown;
    }
  | {
      flow_id: string;
      kind: 'cancel_authorization';
      server_id: string;
      [k: string]: unknown;
    }
  | {
      allow_implicit_invocation: boolean;
      enabled: boolean;
      kind: 'policy';
      server_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'restart';
      server_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'remove';
      server_id: string;
      [k: string]: unknown;
    }
  | {
      config_json: string;
      kind: 'configure';
      [k: string]: unknown;
    };
export type SkillUploadTarget =
  | {
      kind: 'plugin_install';
      [k: string]: unknown;
    }
  | {
      kind: 'install';
      [k: string]: unknown;
    }
  | {
      kind: 'update';
      skill_id: SkillId;
      [k: string]: unknown;
    }
  | {
      kind: 'update_pack';
      pack_id: SkillPackId;
      [k: string]: unknown;
    }
  | {
      kind: 'plugin_preview';
      [k: string]: unknown;
    }
  | {
      expected_revision: number;
      kind: 'plugin_update_preview';
      plugin_id: string;
      [k: string]: unknown;
    };
export type SkillPackId = string;

export interface PluginComponentKey {
  kind: string;
  member_key: string;
}
export interface PluginCommandOrigin {
  authorization_sequence: number;
  connection_generation: number;
  connection_id?: number | null;
  [k: string]: unknown;
}
