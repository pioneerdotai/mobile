/* eslint-disable */

export type ComposerAttachmentKind = 'Image' | 'File' | 'Audio' | 'Video';

export interface ClientComposerAttachmentFromPathRequest {
  file_name?: string | null;
  kind?: ComposerAttachmentKind | null;
  path: string;
}
