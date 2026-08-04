/* eslint-disable */

export type ArtifactActionStatus =
  | ('Queued' | 'Verifying' | 'Opening' | 'Revealing')
  | {
      Downloading: {
        downloaded_bytes: number;
        total_bytes: number;
        [k: string]: unknown;
      };
    }
  | {
      Failed: string;
    };
