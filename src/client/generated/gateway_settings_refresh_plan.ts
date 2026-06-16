/* eslint-disable */

export type GatewaySettingsRefreshPlan =
  | 'SkipAlreadyLoading'
  | {
      Send: GatewaySettingsActionScope;
    }
  | {
      Unavailable: GatewaySettingsRefreshUnavailable;
    };
export type GatewaySettingsRefreshUnavailable = 'GatewayNotConnected';

export interface GatewaySettingsActionScope {
  connection_epoch: number;
  connection_id: number;
  [k: string]: unknown;
}
