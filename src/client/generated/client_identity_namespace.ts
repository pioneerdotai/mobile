/* eslint-disable */

export type ClientFeature =
  | 'session'
  | 'navigation'
  | 'workspace_tree'
  | 'task'
  | 'thread'
  | 'timeline'
  | 'composer'
  | 'pending_request'
  | 'artifact'
  | 'avatar'
  | 'provider'
  | 'administration'
  | 'mcp'
  | 'skills'
  | 'settings'
  | 'onboarding_invitation'
  | 'agents_document'
  | 'desktop_update';

export interface ClientIdentityNamespace {
  feature: ClientFeature;
  list?: string | null;
  [k: string]: unknown;
}
