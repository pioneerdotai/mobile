/* eslint-disable */

export type ArtifactPresentationBlockReason = 'capability_denied' | 'disconnected';

export interface ArtifactPresentationPolicy {
  can_attach: boolean;
  can_download: boolean;
  can_list: boolean;
  can_open: boolean;
  can_share: boolean;
  read_block_reason?: ArtifactPresentationBlockReason | null;
  write_block_reason?: ArtifactPresentationBlockReason | null;
}
