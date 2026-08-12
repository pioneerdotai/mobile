/* eslint-disable */

export interface TaskReviseParams {
  additionalInstructions?: string[];
  candidateId: string;
  feedback: string;
  runId: string;
  taskId: string;
  [k: string]: unknown;
}
