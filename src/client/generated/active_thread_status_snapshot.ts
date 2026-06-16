/* eslint-disable */

export type ActiveThreadStatusSnapshot =
  | (
      | 'GatewayDisconnected'
      | 'StartingThread'
      | 'FinishingTurn'
      | 'PreviousTurnFailed'
      | 'TurnCancelled'
      | 'TurnCompleted'
      | 'Ready'
      | 'StartingTurn'
      | 'AgentProcessing'
    )
  | {
      TurnRunning: {
        turn_id: string;
        [k: string]: unknown;
      };
    };
