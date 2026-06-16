/* eslint-disable */

export type McpAuditAction =
  | (
      | 'Install'
      | 'Update'
      | 'Uninstall'
      | 'Policy'
      | 'Start'
      | 'Started'
      | 'StartFailed'
      | 'Stop'
      | 'Stopped'
      | 'Restart'
      | 'CatalogRefreshed'
      | 'Call'
      | 'CallCompleted'
      | 'CallFailed'
      | 'None'
    )
  | {
      Other: string;
    };
