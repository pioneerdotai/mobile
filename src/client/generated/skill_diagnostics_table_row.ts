/* eslint-disable */

export type SkillDiagnosticsTone = 'Default' | 'Muted' | 'Success' | 'Warning' | 'Danger';

export interface SkillDiagnosticsTableRow {
  cells: SkillDiagnosticsTableCell[];
  [k: string]: unknown;
}
export interface SkillDiagnosticsTableCell {
  text: string;
  tone: SkillDiagnosticsTone;
  tooltip?: string | null;
  [k: string]: unknown;
}
