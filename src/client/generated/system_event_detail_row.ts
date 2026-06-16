/* eslint-disable */

export type SystemEventDetailLabel =
  | 'Window'
  | 'Status'
  | 'Reason'
  | 'WindowExhaustion'
  | 'Checkpoint'
  | 'PreviousWindow'
  | 'Limit'
  | 'AgentRounds'
  | 'ToolCalls'
  | 'ProviderTokens'
  | 'TotalWindows'
  | 'CheckpointKind'
  | 'CheckpointSize';
export type SystemEventDetailValue =
  | {
      Text: string;
    }
  | {
      WindowIndex: number;
    }
  | {
      Bytes: number;
    };

export interface SystemEventDetailRow {
  label: SystemEventDetailLabel;
  value: SystemEventDetailValue;
  [k: string]: unknown;
}
