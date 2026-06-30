/* eslint-disable */

export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';

export interface ComposerPermissionModeOption {
  description: string;
  label: string;
  mode: TurnPermissionMode;
  [k: string]: unknown;
}
