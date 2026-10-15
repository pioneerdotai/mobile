/* eslint-disable */

export interface ClientEffectCancellationDto {
  cancellation: ClientEffectCancellation;
  schema_version: number;
}
export interface ClientEffectCancellation {
  generation: number;
  operation_id: string;
  [k: string]: unknown;
}
