/* eslint-disable */

export type ClientEffect =
  | (
      | 'RefreshWorkspaceList'
      | 'RefreshGatewaySettings'
      | 'RefreshProviderLists'
      | 'QueueSkillsRefresh'
      | 'EnqueueInFlightTurnsForResume'
    )
  | {
      UnsubscribeThreads: {
        thread_ids: string[];
        [k: string]: unknown;
      };
    };
export type ClientTransitionOutcome = 'changed' | 'noop' | 'stale' | 'rejected';

export interface ClientTransitionDto {
  effects: ClientEffectPlan[];
  outcome: ClientTransitionOutcome;
  schema_version: number;
  sequence: number;
  [k: string]: unknown;
}
export interface ClientEffectPlan {
  effect: ClientEffect;
  generation: number;
  operation_id: string;
  [k: string]: unknown;
}
