import { describe, expect, it, jest } from '@jest/globals';

import type { ComposerSkillPickerProjection } from '@/client';

import { buildComposerSkillDisplayRows, composerSkillSelectionKey } from './index';

jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: (styles: unknown) => styles },
    useUnistyles: () => ({ theme: {} }),
}));
jest.mock('lucide-react-native', () => ({
    ChevronDown: () => null,
    ChevronUp: () => null,
}));
jest.mock('@/client', () => ({ pioneerClient: {} }));
jest.mock('@/components/feedback/spinner', () => () => null);

const picker: ComposerSkillPickerProjection = {
    packs: [
        {
            key: 'skill_pack:PPPPPPPPPPPPPPPPPPPPP',
            pack_id: 'PPPPPPPPPPPPPPPPPPPPP',
            label: 'Writing',
            selectable: true,
            children: [
                {
                    pack_id: 'PPPPPPPPPPPPPPPPPPPPP',
                    member_key: 'editor',
                    skill: {
                        key: 'skill:SSSSSSSSSSSSSSSSSSSSS',
                        skill_id: 'SSSSSSSSSSSSSSSSSSSSS',
                        label: 'Writing / Editor',
                        display_name: 'Editor',
                        slug: 'editor',
                        description: '',
                        owner: null,
                        source_kind: 'workspace',
                        selectable: true,
                        unavailable_reason: null,
                    },
                },
            ],
        },
        {
            key: 'skill_pack:EEEEEEEEEEEEEEEEEEEEE',
            pack_id: 'EEEEEEEEEEEEEEEEEEEEE',
            label: 'Empty',
            selectable: false,
            children: [],
        },
    ],
    standalone: [
        {
            key: 'skill:TTTTTTTTTTTTTTTTTTTTT',
            skill_id: 'TTTTTTTTTTTTTTTTTTTTT',
            label: 'Standalone',
            display_name: 'Standalone',
            slug: 'standalone',
            description: '',
            owner: null,
            source_kind: 'workspace',
            selectable: true,
            unavailable_reason: null,
        },
    ],
};

describe('mobile skill pack picker presentation', () => {
    it('keeps pack children collapsed until their parent is expanded', () => {
        expect(
            buildComposerSkillDisplayRows(picker, new Set(), false).map((row) => row.type),
        ).toEqual(['pack', 'pack', 'standalone_skill']);
        expect(
            buildComposerSkillDisplayRows(picker, new Set(['PPPPPPPPPPPPPPPPPPPPP']), false).map(
                (row) => row.type,
            ),
        ).toEqual(['pack', 'packed_skill', 'pack', 'standalone_skill']);
    });

    it('keeps empty packs visible and projected as unselectable', () => {
        const emptyPackRow = buildComposerSkillDisplayRows(picker, new Set(), false).find(
            (row) => row.type === 'pack' && row.pack.pack_id === 'EEEEEEEEEEEEEEEEEEEEE',
        );

        expect(emptyPackRow).toMatchObject({
            type: 'pack',
            pack: {
                label: 'Empty',
                selectable: false,
                children: [],
            },
        });
    });

    it('shows projected matching children while searching', () => {
        expect(
            buildComposerSkillDisplayRows(picker, new Set(), true).map((row) => row.type),
        ).toEqual(['pack', 'packed_skill', 'pack', 'standalone_skill']);
    });

    it('uses the shared stable key forms for full, packed, and standalone intent', () => {
        expect(
            composerSkillSelectionKey({
                kind: 'skill_pack',
                pack_id: 'PPPPPPPPPPPPPPPPPPPPP',
            }),
        ).toBe('skill_pack:PPPPPPPPPPPPPPPPPPPPP');
        expect(
            composerSkillSelectionKey({
                kind: 'skill',
                skill_id: 'SSSSSSSSSSSSSSSSSSSSS',
                pack_id: 'PPPPPPPPPPPPPPPPPPPPP',
            }),
        ).toBe('skill:SSSSSSSSSSSSSSSSSSSSS');
        expect(
            composerSkillSelectionKey({
                kind: 'skill',
                skill_id: 'TTTTTTTTTTTTTTTTTTTTT',
                pack_id: null,
            }),
        ).toBe('skill:TTTTTTTTTTTTTTTTTTTTT');
    });
});
