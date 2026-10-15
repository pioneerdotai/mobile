import { describe, expect, it } from '@jest/globals';
import { nextThreadVisibility } from './scope';

describe('thread visibility presentation', () => {
    it('toggles only user-selectable visibility values', () => {
        expect(nextThreadVisibility('private')).toBe('workspace');
        expect(nextThreadVisibility('workspace')).toBe('private');
        expect(nextThreadVisibility(null)).toBeNull();
        expect(nextThreadVisibility(undefined)).toBeNull();
    });
});
