import { useMemo } from 'react';
import { EnrichedMarkdownText, type MarkdownStyle } from 'react-native-enriched-markdown';
import { StreamdownText } from 'react-native-streamdown';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type {
    MarkdownBlock,
    MarkdownDocument,
    MarkdownInline1,
    MarkdownList,
    MarkdownMark,
} from '@/client/generated/client_active_thread_snapshot';

import { normalizeMarkdownCodeText, splitMarkedText } from './markdown-rendering';

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

type MarkdownContentProps = {
    text: string;
    document?: MarkdownDocument | null;
    tone?: 'default' | 'muted' | 'inverted';
    selectable?: boolean;
    streaming?: boolean;
};

const EMPTY_MARKDOWN_BLOCKS: MarkdownBlock[] = [];
const MARKDOWN_FLAGS = {
    latexMath: false,
};
const STREAMDOWN_REMEND_CONFIG = {
    katex: false,
};

export const MarkdownContent = ({
    text,
    document,
    tone = 'default',
    selectable = true,
    streaming = false,
}: MarkdownContentProps) => {
    const { theme } = useUnistyles();
    const markdown = useMemo(
        () => markdownSource(text, document, streaming),
        [document, streaming, text],
    );
    const markdownStyle = useMemo(
        () =>
            timelineMarkdownStyle({
                tone,
                text: toneTextColor(tone, theme),
                textMuted: theme.colors.textMuted,
                border: theme.colors.border,
                surfaceMuted: theme.colors.surfaceMuted,
                infoText: theme.colors.infoText,
                userBubbleForeground: theme.colors.userBubbleForeground,
                fontSize: theme.fontSize,
                fontWeight: theme.fontWeight,
                radius: theme.radius,
                space: theme.space,
            }),
        [theme, tone],
    );

    if (streaming) {
        return (
            <StreamdownText
                allowTrailingMargin={false}
                containerStyle={styles.document}
                flavor="github"
                markdown={markdown}
                markdownStyle={markdownStyle}
                md4cFlags={MARKDOWN_FLAGS}
                remendConfig={STREAMDOWN_REMEND_CONFIG}
                selectable={selectable}
                selectionColor={theme.colors.infoText}
                selectionHandleColor={theme.colors.infoText}
                selectionMenuConfig={selectionMenuConfig}
            />
        );
    }

    return (
        <EnrichedMarkdownText
            allowTrailingMargin={false}
            containerStyle={styles.document}
            flavor="github"
            markdown={markdown}
            markdownStyle={markdownStyle}
            md4cFlags={MARKDOWN_FLAGS}
            selectable={selectable}
            selectionColor={theme.colors.infoText}
            selectionHandleColor={theme.colors.infoText}
            selectionMenuConfig={selectionMenuConfig}
        />
    );
};

const selectionMenuConfig = {
    copyAsMarkdown: true,
    copyImageUrl: false,
};

const markdownSource = (
    text: string,
    document: MarkdownDocument | null | undefined,
    streaming: boolean,
): string => {
    if (streaming && text.trim().length > 0) {
        return text;
    }

    const blocks = document?.blocks ?? EMPTY_MARKDOWN_BLOCKS;
    if (blocks.length > 0) {
        return serializeBlocks(blocks);
    }

    return text.trim().length > 0 ? text : ' ';
};

const serializeBlocks = (blocks: readonly MarkdownBlock[]): string => {
    return (
        blocks
            .map((block) => serializeBlock(block))
            .join('\n\n')
            .trim() || ' '
    );
};

const serializeBlock = (block: MarkdownBlock): string => {
    switch (readBlockType(block)) {
        case 'paragraph':
            return serializeInline(block as RuntimeInline);
        case 'heading': {
            const heading = block as { content?: RuntimeInline; level?: number };
            const level = Math.max(1, Math.min(6, heading.level ?? 4));
            return `${'#'.repeat(level)} ${serializeInline(heading.content ?? { text: '' })}`;
        }
        case 'list':
            return serializeList(block as RuntimeList);
        case 'quote': {
            const quote = block as { blocks?: MarkdownBlock[] };
            return serializeBlocks(quote.blocks ?? EMPTY_MARKDOWN_BLOCKS)
                .split('\n')
                .map((line) => `> ${line}`)
                .join('\n');
        }
        case 'code': {
            const code = block as { language?: string | null; text?: string };
            const language = code.language?.trim() ?? '';
            return `\`\`\`${language}\n${normalizeMarkdownCodeText(code.text)}\n\`\`\``;
        }
        case 'rule':
            return '---';
        default:
            return '';
    }
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
            const content = serializeBlocks(item.blocks ?? EMPTY_MARKDOWN_BLOCKS)
                .split('\n')
                .map((line, lineIndex) => (lineIndex === 0 ? line : `  ${line}`))
                .join('\n');

            return `${prefix} ${content}`;
        })
        .join('\n');
};

const serializeInline = (inline: RuntimeInline): string => {
    const rawText = inline.text && inline.text.length > 0 ? inline.text : ' ';
    const segments = splitMarkedText(rawText, inline.marks ?? []);

    return segments.map(serializeSegment).join('');
};

const serializeSegment = (segment: { text: string; marks: MarkdownMark[] }): string => {
    return segment.marks.reduce((value, mark) => applyMarkdownMark(value, mark), segment.text);
};

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

const readBlockType = (block?: MarkdownBlock): string | undefined => {
    return (block as { type?: string } | undefined)?.type;
};

type TimelineMarkdownStyleInput = {
    tone: MarkdownContentProps['tone'];
    text: string;
    textMuted: string;
    border: string;
    surfaceMuted: string;
    infoText: string;
    userBubbleForeground: string;
    fontSize: Record<string, { fontSize: number; lineHeight: number }>;
    fontWeight: Record<string, { fontWeight: string | number }>;
    radius: Record<string, number>;
    space: (value: number) => number;
};

const timelineMarkdownStyle = ({
    tone,
    text,
    textMuted,
    border,
    surfaceMuted,
    infoText,
    userBubbleForeground,
    fontSize,
    fontWeight,
    radius,
    space,
}: TimelineMarkdownStyleInput): MarkdownStyle => ({
    paragraph: {
        color: text,
        fontSize: fontSize.default.fontSize,
        lineHeight: fontSize.default.lineHeight,
        marginTop: 0,
        marginBottom: space(2),
    },
    h1: {
        color: text,
        fontSize: fontSize['2xl'].fontSize,
        fontWeight: markdownFontWeight(fontWeight.bold),
        lineHeight: fontSize['2xl'].lineHeight,
        marginTop: space(5),
        marginBottom: space(2),
    },
    h2: {
        color: text,
        fontSize: fontSize.xl.fontSize,
        fontWeight: markdownFontWeight(fontWeight.bold),
        lineHeight: fontSize.xl.lineHeight,
        marginTop: space(5),
        marginBottom: space(2),
    },
    h3: {
        color: text,
        fontSize: fontSize.lg.fontSize,
        fontWeight: markdownFontWeight(fontWeight.semibold),
        lineHeight: fontSize.lg.lineHeight,
        marginTop: space(5),
        marginBottom: space(2),
    },
    h4: {
        color: text,
        fontSize: fontSize.default.fontSize,
        fontWeight: markdownFontWeight(fontWeight.semibold),
        lineHeight: fontSize.default.lineHeight,
        marginTop: space(5),
        marginBottom: space(2),
    },
    h5: {
        color: text,
        fontSize: fontSize.default.fontSize,
        fontWeight: markdownFontWeight(fontWeight.semibold),
        lineHeight: fontSize.default.lineHeight,
        marginTop: space(5),
        marginBottom: space(2),
    },
    h6: {
        color: textMuted,
        fontSize: fontSize.sm.fontSize,
        fontWeight: markdownFontWeight(fontWeight.semibold),
        lineHeight: fontSize.sm.lineHeight,
        marginTop: space(5),
        marginBottom: space(2),
    },
    blockquote: {
        backgroundColor: surfaceMuted,
        borderColor: border,
        borderWidth: 1,
        color: tone === 'inverted' ? userBubbleForeground : textMuted,
        fontSize: fontSize.default.fontSize,
        gapWidth: space(3),
        lineHeight: fontSize.default.lineHeight,
        marginTop: 0,
        marginBottom: space(2),
    },
    list: {
        bulletColor: tone === 'inverted' ? userBubbleForeground : textMuted,
        color: text,
        fontSize: fontSize.default.fontSize,
        gapWidth: space(2),
        lineHeight: fontSize.default.lineHeight,
        markerColor: tone === 'inverted' ? userBubbleForeground : textMuted,
        markerFontWeight: markdownFontWeight(fontWeight.medium),
        markerMinWidth: space(7),
        marginLeft: 0,
        marginTop: 0,
        marginBottom: space(2),
    },
    codeBlock: {
        backgroundColor: surfaceMuted,
        borderColor: border,
        borderRadius: radius.lg,
        borderWidth: 1,
        color: tone === 'inverted' ? userBubbleForeground : text,
        fontFamily: 'Menlo',
        fontSize: fontSize.sm.fontSize,
        lineHeight: fontSize.sm.lineHeight,
        marginTop: 0,
        marginBottom: space(2),
        padding: space(3),
    },
    code: {
        backgroundColor: surfaceMuted,
        color: tone === 'inverted' ? userBubbleForeground : text,
        fontFamily: 'Menlo',
        fontSize: fontSize.sm.fontSize,
    },
    link: {
        color: tone === 'inverted' ? userBubbleForeground : infoText,
        underline: true,
    },
    strong: {
        color: text,
        fontWeight: 'bold',
    },
    em: {
        color: text,
        fontStyle: 'italic',
    },
    strikethrough: {
        color: textMuted,
    },
    underline: {
        color: text,
    },
    thematicBreak: {
        color: border,
        height: space(0.25),
        marginTop: space(5),
        marginBottom: space(5),
    },
    table: {
        borderColor: border,
        borderRadius: radius.lg,
        borderWidth: 1,
        cellPaddingHorizontal: space(2),
        cellPaddingVertical: space(1.5),
        color: text,
        fontSize: fontSize.sm.fontSize,
        headerBackgroundColor: surfaceMuted,
        headerTextColor: text,
        lineHeight: fontSize.sm.lineHeight,
        marginTop: 0,
        marginBottom: space(2),
        rowEvenBackgroundColor: 'transparent',
        rowOddBackgroundColor: surfaceMuted,
    },
    taskList: {
        borderColor: border,
        checkedColor: infoText,
        checkedStrikethrough: false,
        checkedTextColor: textMuted,
        checkmarkColor: tone === 'inverted' ? text : userBubbleForeground,
    },
});

const toneTextColor = (
    tone: MarkdownContentProps['tone'],
    theme: ReturnType<typeof useUnistyles>['theme'],
): string => {
    switch (tone) {
        case 'muted':
            return theme.colors.textMuted;
        case 'inverted':
            return theme.colors.userBubbleForeground;
        case 'default':
        default:
            return theme.colors.text;
    }
};

const markdownFontWeight = (value: { fontWeight: string | number }): string =>
    String(value.fontWeight);

const styles = StyleSheet.create(() => ({
    document: {
        width: '100%',
        maxWidth: '100%',
    },
}));
