/* eslint-disable */

export interface ClientAccessChangePlanRequestDto {
  active_thread_id?: string | null;
  active_workspace_id?: string | null;
  change_sequence: number;
  connection_generation: number;
  known_threads: ThreadAuthorizationScope[];
  schema_version: number;
}
export interface ThreadAuthorizationScope {
  thread_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
