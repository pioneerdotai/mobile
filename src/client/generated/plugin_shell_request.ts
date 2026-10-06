/* eslint-disable */

export type PluginShellRequest =
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
export type SkillUploadTarget =
  | {
      kind: 'plugin_install';
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
    };
export type SkillId = string;
export type SkillPackId = string;
