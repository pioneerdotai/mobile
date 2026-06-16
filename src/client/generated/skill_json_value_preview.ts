/* eslint-disable */

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
