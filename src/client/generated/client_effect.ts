/* eslint-disable */

export type ClientEffect =
  | ('RefreshWorkspaceList' | 'RefreshGatewaySettings' | 'QueueSkillsRefresh' | 'EnqueueInFlightTurnsForResume')
  | {
      UnsubscribeThreads: {
        thread_ids: string[];
        [k: string]: unknown;
      };
    };
