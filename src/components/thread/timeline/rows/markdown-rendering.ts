import type { MarkdownMark } from '@/client/generated/client_active_thread_snapshot';

export type MarkdownTextSegment = {
    text: string;
    marks: MarkdownMark[];
};

export const normalizeMarkdownCodeText = (text?: string | null): string => {
    const normalized = (text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return normalized.length > 0 ? normalized : ' ';
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
