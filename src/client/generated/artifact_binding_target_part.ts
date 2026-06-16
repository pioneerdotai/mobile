/* eslint-disable */

export type ArtifactBindingTargetKind = 'Thread' | 'Turn' | 'Message' | 'Task' | 'Tool';

export interface ArtifactBindingTargetPart {
  id: string;
  kind: ArtifactBindingTargetKind;
  [k: string]: unknown;
}
