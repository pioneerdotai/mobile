/* eslint-disable */

export interface GatewaySettingsUpdatePlan {
  snapshot: GatewaySettingsSnapshot;
  update: GatewaySettingsUpdate;
  [k: string]: unknown;
}
export interface GatewaySettingsSnapshot {
  general?: GatewayGeneralSettings;
  memory: GatewayMemorySettings;
  [k: string]: unknown;
}
export interface GatewayGeneralSettings {
  keepawake?: boolean;
  preflight_model?: GatewayMemoryModelSelection;
  [k: string]: unknown;
}
export interface GatewayMemoryModelSelection {
  model?: string | null;
  model_provider?: string | null;
  source?: 'thread' | 'custom';
  [k: string]: unknown;
}
export interface GatewayMemorySettings {
  active_recall_enabled: boolean;
  background_extraction_enabled: boolean;
  debug_trace_enabled: boolean;
  deterministic_recall_enabled: boolean;
  enabled: boolean;
  proactive_writes_enabled: boolean;
  proactive_writes_model?: GatewayMemoryModelSelection1;
  strict_diagnostics_enabled: boolean;
  tools_enabled: boolean;
  [k: string]: unknown;
}
export interface GatewayMemoryModelSelection1 {
  model?: string | null;
  model_provider?: string | null;
  source?: 'thread' | 'custom';
  [k: string]: unknown;
}
export interface GatewaySettingsUpdate {
  general?: GatewayGeneralSettingsUpdate | null;
  memory?: GatewayMemorySettings | null;
  [k: string]: unknown;
}
export interface GatewayGeneralSettingsUpdate {
  keepawake?: boolean | null;
  preflight_model?: GatewayMemoryModelSelection2 | null;
  [k: string]: unknown;
}
export interface GatewayMemoryModelSelection2 {
  model?: string | null;
  model_provider?: string | null;
  source?: 'thread' | 'custom';
  [k: string]: unknown;
}
