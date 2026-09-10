/* eslint-disable */

export interface DeviceActivationPublication {
  error?: string | null;
  generation: number;
  loading: boolean;
  ready: boolean;
  [k: string]: unknown;
}
