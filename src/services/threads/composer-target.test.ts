import { describe, expect, it } from '@jest/globals';

import { composerTargetThreadIsActive } from './composer-target';

describe('composer async target guard', () => {
    it('accepts only the same non-null composer thread', () => {
        expect(composerTargetThreadIsActive('thread-a', 'thread-a')).toBe(true);
        expect(composerTargetThreadIsActive('thread-a', 'thread-b')).toBe(false);
        expect(composerTargetThreadIsActive(null, null)).toBe(false);
        expect(composerTargetThreadIsActive('thread-a', null)).toBe(false);
    });
});
