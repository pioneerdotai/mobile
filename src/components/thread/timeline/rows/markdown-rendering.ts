import type { MarkdownPresentation } from '@/client/generated/timeline_snapshot';

/** Renderer selection only; normalization and semantic identity belong to Client. */
export const markdownSource = (
    text: string,
    document: MarkdownPresentation | null | undefined,
    streaming: boolean,
): string => {
    if (streaming && text.trim().length > 0) return text;
    if (document && document.nodes.length > 0) return document.source;
    return text.trim().length > 0 ? text : ' ';
};
