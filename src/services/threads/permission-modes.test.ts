import { describe, expect, it } from '@jest/globals';

import type { ComposerPermissionModeOption, TurnPermissionMode } from '@/client';

import {
    allowedComposerPermissionModeOptions,
    composerPermissionModeIsAllowed,
    reconcileComposerPermissionMode,
} from './permission-modes';

const options: ComposerPermissionModeOption[] = [
    { mode: 'full_access', label: 'Full', description: 'Full' },
    { mode: 'auto_accept_edits', label: 'Edits', description: 'Edits' },
    { mode: 'supervised', label: 'Supervised', description: 'Supervised' },
];

describe('agent permission mode capability projection', () => {
    it('keeps only Gateway-advertised modes for a Member', () => {
        const projected = allowedComposerPermissionModeOptions(options, ['supervised']);

        expect(projected.map((option) => option.mode)).toEqual(['supervised']);
        expect(reconcileComposerPermissionMode('full_access', projected)).toBe('supervised');
        expect(composerPermissionModeIsAllowed('full_access', projected)).toBe(false);
        expect(composerPermissionModeIsAllowed('supervised', projected)).toBe(true);
    });

    it('keeps every advertised mode for a superuser', () => {
        const allowed: TurnPermissionMode[] = ['full_access', 'auto_accept_edits', 'supervised'];
        const projected = allowedComposerPermissionModeOptions(options, allowed);

        expect(projected).toEqual(options);
        expect(reconcileComposerPermissionMode('auto_accept_edits', projected)).toBe(
            'auto_accept_edits',
        );
    });

    it('fails closed while the capability projection is unavailable', () => {
        expect(allowedComposerPermissionModeOptions(options, undefined)).toEqual([]);
        expect(reconcileComposerPermissionMode('full_access', [])).toBeNull();
        expect(composerPermissionModeIsAllowed('full_access', [])).toBe(false);
    });
});
