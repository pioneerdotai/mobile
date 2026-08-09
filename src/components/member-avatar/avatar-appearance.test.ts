import { describe, expect, it } from '@jest/globals';

import { avatarFallbackAppearance, avatarInitials } from './avatar-appearance';

describe('member avatar appearance', () => {
    it('matches gpui-component initials behavior', () => {
        expect(avatarInitials('Jason Lee')).toBe('JL');
        expect(avatarInitials('Alice')).toBe('AL');
        expect(avatarInitials('')).toBe('?');
    });

    it('keeps fallback colors stable for the same initials', () => {
        expect(avatarFallbackAppearance('Alice')).toEqual(avatarFallbackAppearance('Alfred'));
    });

    it('selects content-dependent fallback colors from the avatar hue wheel', () => {
        const appearances = ['Alice', 'Bob', 'Charlie', 'Dora'].map(avatarFallbackAppearance);

        expect(
            new Set(appearances.map(({ backgroundColor }) => backgroundColor)).size,
        ).toBeGreaterThan(1);
        for (const appearance of appearances) {
            expect(appearance.backgroundColor).toMatch(/^hsla\(/u);
            expect(appearance.textColor).toMatch(/^hsl\(/u);
        }
    });
});
