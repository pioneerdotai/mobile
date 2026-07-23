import { describe, expect, it } from '@jest/globals';

import type { ComposerSkillPickerProjection, ComposerSkillSelection } from '@/client';

import { skillSelectionRequestFields } from './skill-selection-request';

describe('mobile skill selection request fields', () => {
    it('preserves full, partial, and standalone intent without expanding packs', () => {
        const selections: ComposerSkillSelection[] = [
            { kind: 'skill_pack', pack_id: 'PPPPPPPPPPPPPPPPPPPPP' },
            {
                kind: 'skill',
                skill_id: 'SSSSSSSSSSSSSSSSSSSSS',
                pack_id: 'QQQQQQQQQQQQQQQQQQQQQ',
            },
            {
                kind: 'skill',
                skill_id: 'TTTTTTTTTTTTTTTTTTTTT',
                pack_id: null,
            },
        ];
        const picker: ComposerSkillPickerProjection = { packs: [], standalone: [] };

        expect(skillSelectionRequestFields(selections, picker)).toEqual({
            skill_selections: selections,
            skill_picker: picker,
        });
    });
});
