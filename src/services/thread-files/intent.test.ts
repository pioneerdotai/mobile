import { describe, expect, it, jest } from '@jest/globals';

import {
    isTimelineLocalFileHref,
    registerThreadFileIntent,
    releaseThreadFileIntent,
    resolveThreadFileIntent,
} from './intent';

jest.mock('nanoid', () => ({ nanoid: () => 'opaque-intent-id' }));

describe('thread file intents', () => {
    it.each([
        '/Users/alexander/project/main.rs:12:3',
        'file:///Users/alexander/project/main.rs#L12C3',
        'C:\\project\\main.ts:12',
        '\\\\server\\share\\main.py',
    ])('recognizes local file href %s', (href) => {
        expect(isTimelineLocalFileHref(href)).toBe(true);
    });

    it.each(['https://example.com/file.ts', '../file.ts', 'src/file.ts', ' file.ts', ''])(
        'rejects non-local href %s',
        (href) => expect(isTimelineLocalFileHref(href)).toBe(false),
    );

    it('keeps the sensitive href behind an opaque, expiring route id', () => {
        const intent = {
            threadId: 'thread',
            turnId: 'turn',
            itemId: 'item',
            href: '/private/workspace/main.rs',
        };
        const id = registerThreadFileIntent(intent, 1_000);

        expect(id).toBe('opaque-intent-id');
        expect(id).not.toContain('main.rs');
        expect(resolveThreadFileIntent(id, 2_000)).toEqual(intent);
        expect(resolveThreadFileIntent(id, 5 * 60 * 1000 + 1_001)).toBeNull();

        releaseThreadFileIntent(id);
    });
});
