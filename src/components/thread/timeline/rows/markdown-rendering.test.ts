import { describe, expect, it } from '@jest/globals';
import type { MarkdownPresentation } from '@/client/generated/timeline_snapshot';
import { markdownSource } from './markdown-rendering';
import wire from '@/client/fixtures/markdown-presentation-wire.json';

describe('Client Markdown presentation', () => {
    const document = wire as MarkdownPresentation;
    it('consumes canonical source without normalizing or changing semantic identity', () => {
        expect(markdownSource('', document, false)).toBe(document.source);
        expect(document.document_id).toBe(wire.document_id);
        expect(document.nodes[0].id).toBe(1);
    });
    it('preserves the streaming and empty renderer policies', () => {
        expect(markdownSource('partial **', document, true)).toBe('partial **');
        expect(markdownSource('', undefined, false)).toBe(' ');
    });
});
