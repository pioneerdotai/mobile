/* eslint-disable */

export type McpAuditDetailsSummary =
  | 'Empty'
  | {
      ObjectPairs: [unknown, unknown][];
    }
  | {
      ArrayLen: number;
    }
  | {
      Value: McpJsonValuePreview;
    };
export type McpJsonValuePreview =
  | ('None' | 'EmptyArray' | 'EmptyObject')
  | {
      Text: string;
    }
  | {
      Bool: boolean;
    }
  | {
      Number: string;
    }
  | {
      ArrayLen: number;
    }
  | {
      ObjectKeys: number;
    };
