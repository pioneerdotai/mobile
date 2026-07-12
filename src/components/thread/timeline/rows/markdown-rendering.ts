import type {
    MarkdownBlock,
    MarkdownDocument,
    MarkdownInline1,
    MarkdownList,
    MarkdownMark,
} from '@/client/generated/client_active_thread_snapshot';

export type MarkdownTextSegment = {
    text: string;
    marks: MarkdownMark[];
};

export const normalizeMarkdownCodeText = (text?: string | null): string => {
    return (text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

type RuntimeInline = MarkdownInline1 & {
    text?: string;
    marks?: MarkdownMark[];
};

type RuntimeListItem = {
    blocks?: MarkdownBlock[];
    checked?: boolean | null;
};

type RuntimeList = MarkdownList & {
    items?: RuntimeListItem[];
    ordered?: boolean;
    start?: number;
};

const EMPTY_MARKDOWN_BLOCKS: MarkdownBlock[] = [];
const FENCE_LANGUAGE_ENCODER = new TextEncoder();
const FENCE_WHITESPACE = /\s/u;

export const markdownSource = (
    text: string,
    document: MarkdownDocument | null | undefined,
    streaming: boolean,
): string => {
    if (streaming && text.trim().length > 0) return text;
    const blocks = document?.blocks ?? EMPTY_MARKDOWN_BLOCKS;
    if (blocks.length > 0) return serializeMarkdownBlocks(blocks);
    return text.trim().length > 0 ? text : ' ';
};

export const serializeMarkdownBlocks = (blocks: readonly MarkdownBlock[]): string =>
    blocks.map(serializeMarkdownBlock).join('\n\n').trim() || ' ';

const serializeMarkdownBlock = (block: MarkdownBlock): string => {
    switch (block.type) {
        case 'paragraph':
            return serializeInline(block as unknown as RuntimeInline);
        case 'heading': {
            const heading = block as { content?: RuntimeInline; level?: number };
            const level = Math.max(1, Math.min(6, heading.level ?? 4));
            return `${'#'.repeat(level)} ${serializeInline(heading.content ?? { text: '' })}`;
        }
        case 'list':
            return serializeList(block as RuntimeList);
        case 'quote':
            return serializeMarkdownBlocks(block.blocks ?? EMPTY_MARKDOWN_BLOCKS)
                .split('\n')
                .map((line) => `> ${line}`)
                .join('\n');
        case 'code': {
            const source = normalizeMarkdownCodeText(block.text);
            const fence = '`'.repeat(Math.max(3, longestBacktickRun(source) + 1));
            const language = normalizeFenceLanguage(block.language);
            return `${fence}${language}\n${source}\n${fence}`;
        }
        case 'rule':
            return '---';
    }
};

const longestBacktickRun = (source: string): number => {
    let longest = 0;
    let current = 0;
    for (const character of source) {
        if (character === '`') {
            current += 1;
            longest = Math.max(longest, current);
        } else {
            current = 0;
        }
    }
    return longest;
};

const normalizeFenceLanguage = (language?: string | null): string => {
    let started = false;
    let result = '';
    let bytes = 0;
    for (const character of language ?? '') {
        if (FENCE_WHITESPACE.test(character)) {
            if (started) break;
            continue;
        }
        started = true;
        const codePoint = character.codePointAt(0) ?? 0;
        if (character === '`' || codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)) {
            continue;
        }
        const width = FENCE_LANGUAGE_ENCODER.encode(character).length;
        if (bytes + width > 64) break;
        result += character;
        bytes += width;
    }
    return result;
};

const serializeList = (list: RuntimeList): string => {
    const items = list.items ?? [];
    const start = typeof list.start === 'number' ? list.start : 1;
    return items
        .map((item, index) => {
            const prefix =
                item.checked != null
                    ? item.checked
                        ? '- [x]'
                        : '- [ ]'
                    : list.ordered
                      ? `${start + index}.`
                      : '-';
            const continuationIndent = ' '.repeat(prefix.length + 1);
            const content = serializeMarkdownBlocks(item.blocks ?? EMPTY_MARKDOWN_BLOCKS)
                .split('\n')
                .map((line, lineIndex) => (lineIndex === 0 ? line : `${continuationIndent}${line}`))
                .join('\n');
            return `${prefix} ${content}`;
        })
        .join('\n');
};

const serializeInline = (inline: RuntimeInline): string => {
    const rawText = inline.text && inline.text.length > 0 ? inline.text : ' ';
    return splitMarkedText(rawText, inline.marks ?? [])
        .map(serializeSegment)
        .join('');
};

const serializeSegment = (segment: MarkdownTextSegment): string =>
    segment.marks.reduce((value, mark) => applyMarkdownMark(value, mark), segment.text);

const applyMarkdownMark = (value: string, mark: MarkdownMark): string => {
    switch (mark.kind.type) {
        case 'bold':
            return `**${value}**`;
        case 'italic':
            return `*${value}*`;
        case 'strike':
            return `~~${value}~~`;
        case 'code':
            return `\`${value.replace(/`/g, '\\`')}\``;
        case 'link':
            return `[${value}](${mark.kind.url})`;
    }
};

export const splitMarkedText = (text: string, marks: MarkdownMark[]): MarkdownTextSegment[] => {
    if (marks.length === 0) {
        return [{ text, marks: [] }];
    }

    const normalized = marks
        .map((mark) => ({
            mark,
            start: byteOffsetToCodeUnitIndex(text, mark.start),
            end: byteOffsetToCodeUnitIndex(text, mark.end),
        }))
        .filter(({ start, end }) => start < end);

    if (normalized.length === 0) {
        return [{ text, marks: [] }];
    }

    const boundaries = new Set<number>([0, text.length]);
    for (const mark of normalized) {
        boundaries.add(mark.start);
        boundaries.add(mark.end);
    }

    const sortedBoundaries = [...boundaries].sort((a, b) => a - b);
    const segments: MarkdownTextSegment[] = [];

    for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
        const start = sortedBoundaries[index];
        const end = sortedBoundaries[index + 1];
        if (start === end) {
            continue;
        }

        segments.push({
            text: text.slice(start, end),
            marks: normalized
                .filter((mark) => mark.start <= start && mark.end >= end)
                .map((mark) => mark.mark),
        });
    }

    return segments;
};

const byteOffsetToCodeUnitIndex = (text: string, offset: number) => {
    const target = Math.max(0, offset);
    let bytes = 0;
    let index = 0;

    while (index < text.length) {
        const codePoint = text.codePointAt(index) ?? 0;
        const codeUnitLength = codePoint > 0xffff ? 2 : 1;
        const byteLength = utf8ByteLength(codePoint);

        if (bytes + byteLength > target) {
            return index;
        }

        bytes += byteLength;
        index += codeUnitLength;
    }

    return text.length;
};

const utf8ByteLength = (codePoint: number) => {
    if (codePoint <= 0x7f) {
        return 1;
    }
    if (codePoint <= 0x7ff) {
        return 2;
    }
    if (codePoint <= 0xffff) {
        return 3;
    }
    return 4;
};
