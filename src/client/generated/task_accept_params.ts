/* eslint-disable */

export interface TaskAcceptParams {
  candidateId: string;
  reason?: string | null;
  runId: string;
  taskId: string;
  [k: string]: unknown;
}
