/* eslint-disable */

export interface RuntimeCapabilities {
  supports_approvals: boolean;
  supports_apps: boolean;
  supports_auth_management: boolean;
  supports_command_approvals: boolean;
  supports_compaction: boolean;
  supports_diff_updates: boolean;
  supports_file_change_approvals: boolean;
  supports_fork: boolean;
  supports_generated_schema_probe: boolean;
  supports_goal: boolean;
  supports_history_read: boolean;
  supports_interrupt: boolean;
  supports_model_list: boolean;
  supports_resume: boolean;
  supports_review: boolean;
  supports_skills?: boolean;
  supports_steer: boolean;
  supports_thread_archive: boolean;
  supports_threads: boolean;
  supports_user_input_requests: boolean;
  [k: string]: unknown;
}
