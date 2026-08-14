import { describe, expect, it } from '@jest/globals';

import type { ComposerPermissionModeOption } from '@/client';

import {
    composerPermissionModeIsAllowed,
    reconcileComposerPermissionMode,
} from './permission-modes';

const options: ComposerPermissionModeOption[] = [
    { mode: 'full_access', label: 'Full', description: 'Full' },
    { mode: 'auto_accept_edits', label: 'Edits', description: 'Edits' },
    { mode: 'supervised', label: 'Supervised', description: 'Supervised' },
];

describe('agent permission mode capability projection', () => {
    it('reconciles a selection against the Gateway-projected options', () => {
        const projected = options.filter((option) => option.mode === 'supervised');

        expect(projected.map((option) => option.mode)).toEqual(['supervised']);
        expect(reconcileComposerPermissionMode('full_access', projected)).toBe('supervised');
        expect(composerPermissionModeIsAllowed('full_access', projected)).toBe(false);
        expect(composerPermissionModeIsAllowed('supervised', projected)).toBe(true);
    });

    it('keeps an allowed selection without interpreting the role', () => {
        expect(reconcileComposerPermissionMode('auto_accept_edits', options)).toBe(
            'auto_accept_edits',
        );
    });

    it('fails closed while the capability projection is unavailable', () => {
        expect(reconcileComposerPermissionMode('full_access', [])).toBeNull();
        expect(composerPermissionModeIsAllowed('full_access', [])).toBe(false);
    });
});
