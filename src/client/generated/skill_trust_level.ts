/* eslint-disable */

export type SkillTrustLevel =
  | ('Internal' | 'Verified' | 'Community' | 'Untrusted' | 'None')
  | {
      Other: string;
    };
