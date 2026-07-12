import { describe, expect, it } from '@jest/globals';

import type { MarkdownBlock } from '@/client/generated/client_active_thread_snapshot';

import { serializeMarkdownBlocks } from './markdown-rendering';

describe('timeline Markdown code serialization', () => {
    const code = (text: string, language = 'ts') =>
        ({ type: 'code', text, language }) as unknown as MarkdownBlock;

    it('preserves authoritative terminal newlines plus one structural newline', () => {
        expect(serializeMarkdownBlocks([code('value')])).toBe('```ts\nvalue\n```');
        expect(serializeMarkdownBlocks([code('value\n')])).toBe('```ts\nvalue\n\n```');
        expect(serializeMarkdownBlocks([code('')])).toBe('```ts\n\n```');
    });

    it('uses a fence longer than any backtick run in source', () => {
        expect(serializeMarkdownBlocks([code('before ``` after')])).toBe(
            '````ts\nbefore ``` after\n````',
        );
    });

    it('normalizes CRLF without trimming code and sanitizes the info token', () => {
        expect(serializeMarkdownBlocks([code('\tvalue  \r\n', 'ts`\nignored')])).toBe(
            '```ts\n\tvalue  \n\n```',
        );
    });

    it('keeps fenced blocks nested under multi-digit ordered-list markers', () => {
        const list = {
            type: 'list',
            ordered: true,
            start: 10,
            items: [{ blocks: [code('fn main() {}', 'rs')] }],
        } as unknown as MarkdownBlock;
        expect(serializeMarkdownBlocks([list])).toBe('10. ```rs\n    fn main() {}\n    ```');
    });
});
