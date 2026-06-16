/* eslint-disable */

export type ArtifactActionStatus =
  | ('Queued' | 'Downloading' | 'Verifying' | 'Opening' | 'Revealing')
  | {
      Failed: string;
    };
