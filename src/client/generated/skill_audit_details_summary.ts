/* eslint-disable */

export type SkillAuditDetailsSummary =
  | 'Empty'
  | {
      Text: string;
    }
  | {
      ObjectPairs: [unknown, unknown][];
    }
  | {
      ArrayLen: number;
    }
  | {
      Value: SkillJsonValuePreview;
    };
export type SkillJsonValuePreview =
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
