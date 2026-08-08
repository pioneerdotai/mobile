import { describe, expect, it } from '@jest/globals';

import { THREAD_MODE_OPTIONS } from './options';

describe('mobile thread mode options', () => {
    it('exposes exactly Message, Chat, and Agent in product order', () => {
        expect(THREAD_MODE_OPTIONS).toEqual(['Message', 'Chat', 'Agent']);
    });
});
