import { Fragment, useMemo, type ReactNode } from 'react';
import { type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type {
    MarkdownBlock,
    MarkdownDocument,
    MarkdownInline1,
    MarkdownList,
    MarkdownMark,
} from '@/client/generated/client_active_thread_snapshot';

import { normalizeMarkdownCodeText, splitMarkedText } from './markdown-rendering';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';

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
};

type MarkdownTextVariant = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'heading';
type MarkdownBlockSpacing = 'none' | 'small' | 'large';

const EMPTY_MARKDOWN_BLOCKS: MarkdownBlock[] = [];

export const MarkdownContent = ({
    text,
    document,
    tone = 'default',
    selectable = false,
}: MarkdownContentProps) => {
    const blocks = document?.blocks ?? EMPTY_MARKDOWN_BLOCKS;

    return useMemo(() => {
        if (blocks.length === 0) {
            return renderInline({ text }, 'paragraph', tone, 'plain', selectable);
        }

        return (
            <VStack style={styles.document}>
                {blocks.map((block, index) => (
                    <Fragment key={`block:${index}`}>
                        {renderBlock(
                            block,
                            tone,
                            selectable,
                            `block:${index}`,
                            blocks[index - 1],
                            index,
                        )}
                    </Fragment>
                ))}
            </VStack>
        );
    }, [blocks, selectable, text, tone]);
};

const renderBlock = (
    block: MarkdownBlock,
    tone: MarkdownContentProps['tone'],
    selectable: boolean,
    keyPrefix: string,
    previous?: MarkdownBlock,
    index = 0,
): ReactNode => {
    const blockType = readBlockType(block);
    const spacing = markdownBlockSpacing(previous, block, index);
    const blockStyle = blockSpacingStyle(spacing);

    switch (blockType) {
        case 'paragraph':
            return (
                <Box style={blockStyle}>
                    {renderInline(block as RuntimeInline, 'paragraph', tone, keyPrefix, selectable)}
                </Box>
            );
        case 'heading': {
            const heading = block as { content?: RuntimeInline; level?: number };
            return (
                <Box style={blockStyle}>
                    {renderInline(
                        heading.content ?? { text: '' },
                        headingVariant(heading.level),
                        tone,
                        keyPrefix,
                        selectable,
                    )}
                </Box>
            );
        }
        case 'list':
            return (
                <Box style={blockStyle}>
                    {renderList(block as RuntimeList, tone, selectable, keyPrefix)}
                </Box>
            );
        case 'quote': {
            const quote = block as { blocks?: MarkdownBlock[] };
            return (
                <VStack style={[styles.quote, blockStyle]}>
                    {(quote.blocks ?? []).map((quoteBlock, quoteIndex, quoteBlocks) => (
                        <Fragment key={`${keyPrefix}:quote:${quoteIndex}`}>
                            {renderBlock(
                                quoteBlock,
                                tone,
                                selectable,
                                `${keyPrefix}:quote:${quoteIndex}`,
                                quoteBlocks[quoteIndex - 1],
                                quoteIndex,
                            )}
                        </Fragment>
                    ))}
                </VStack>
            );
        }
        case 'code': {
            const code = block as { language?: string | null; text?: string };
            return (
                <VStack style={[styles.codeBlock, blockStyle]}>
                    {!!code.language?.trim() && (
                        <Text style={styles.codeLanguage}>{code.language.trim()}</Text>
                    )}
                    <ScrollView
                        nestedScrollEnabled
                        style={styles.codeVerticalScroller}
                        contentContainerStyle={styles.codeVerticalContent}
                    >
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator
                            contentContainerStyle={styles.codeScroller}
                        >
                            <Text selectable={selectable} style={styles.codeText}>
                                {normalizeMarkdownCodeText(code.text)}
                            </Text>
                        </ScrollView>
                    </ScrollView>
                </VStack>
            );
        }
        case 'rule':
            return <Box style={[styles.rule, blockStyle]} />;
        default:
            return (
                <Box style={blockStyle}>
                    {renderInline({ text: '' }, 'paragraph', tone, keyPrefix, selectable)}
                </Box>
            );
    }
};

const renderList = (
    list: RuntimeList,
    tone: MarkdownContentProps['tone'],
    selectable: boolean,
    keyPrefix: string,
): ReactNode => {
    const items = list.items ?? [];
    const start = typeof list.start === 'number' ? list.start : 1;

    return (
        <VStack style={styles.list}>
            {items.map((item, index) => {
                const prefix =
                    item.checked != null
                        ? item.checked
                            ? '[x]'
                            : '[ ]'
                        : list.ordered
                          ? `${start + index}.`
                          : '\u2022';
                const blocks = item.blocks ?? [];

                return (
                    <HStack key={`${keyPrefix}:item:${index}`} style={styles.listItem}>
                        <Text style={[styles.listPrefix, toneStyle(tone)]}>{prefix}</Text>
                        <VStack style={styles.listContent}>
                            {blocks.map((block, blockIndex) => (
                                <Fragment key={`${keyPrefix}:item:${index}:block:${blockIndex}`}>
                                    {renderBlock(
                                        block,
                                        tone,
                                        selectable,
                                        `${keyPrefix}:item:${index}:block:${blockIndex}`,
                                        blocks[blockIndex - 1],
                                        blockIndex,
                                    )}
                                </Fragment>
                            ))}
                        </VStack>
                    </HStack>
                );
            })}
        </VStack>
    );
};

const renderInline = (
    inline: RuntimeInline,
    variant: MarkdownTextVariant,
    tone: MarkdownContentProps['tone'],
    keyPrefix: string,
    selectable: boolean,
): ReactNode => {
    const rawText = inline.text && inline.text.length > 0 ? inline.text : ' ';
    const segments = splitMarkedText(rawText, inline.marks ?? []);
    const baseStyle = [styles.inlineBase, variantStyle(variant), toneStyle(tone)];

    if (segments.length === 1 && segments[0]?.marks.length === 0) {
        return (
            <Text selectable={selectable} style={baseStyle}>
                {rawText}
            </Text>
        );
    }

    return (
        <Text selectable={selectable} style={baseStyle}>
            {segments.map((segment, index) => (
                <Text
                    key={`${keyPrefix}:segment:${index}`}
                    style={[toneStyle(tone), segment.marks.map(markStyle)]}
                >
                    {segment.text}
                </Text>
            ))}
        </Text>
    );
};

const readBlockType = (block?: MarkdownBlock): string | undefined => {
    return (block as { type?: string } | undefined)?.type;
};

const headingVariant = (level?: number): MarkdownTextVariant => {
    switch (level) {
        case 1:
            return 'heading1';
        case 2:
            return 'heading2';
        case 3:
            return 'heading3';
        default:
            return 'heading';
    }
};

const markdownBlockSpacing = (
    previous: MarkdownBlock | undefined,
    current: MarkdownBlock,
    index: number,
): MarkdownBlockSpacing => {
    if (index === 0) {
        return 'none';
    }

    if (readBlockType(previous) === 'rule' || readBlockType(current) === 'rule') {
        return 'large';
    }

    if (readBlockType(current) === 'heading') {
        return 'large';
    }

    return 'small';
};

const blockSpacingStyle = (spacing: MarkdownBlockSpacing): StyleProp<ViewStyle> => {
    switch (spacing) {
        case 'large':
            return styles.blockSpacingLarge;
        case 'small':
            return styles.blockSpacingSmall;
        case 'none':
            return undefined;
    }
};

const markStyle = (mark: MarkdownMark): StyleProp<TextStyle> => {
    switch (mark.kind.type) {
        case 'bold':
            return styles.bold;
        case 'italic':
            return styles.italic;
        case 'strike':
            return styles.strike;
        case 'code':
            return styles.inlineCode;
        case 'link':
            return styles.link;
    }
};

const variantStyle = (variant: MarkdownTextVariant): StyleProp<TextStyle> => {
    switch (variant) {
        case 'heading1':
            return styles.heading1;
        case 'heading2':
            return styles.heading2;
        case 'heading3':
            return styles.heading3;
        case 'heading':
            return styles.heading;
        case 'paragraph':
            return styles.paragraph;
    }
};

const toneStyle = (tone: MarkdownContentProps['tone']): StyleProp<TextStyle> => {
    switch (tone) {
        case 'muted':
            return styles.mutedText;
        case 'inverted':
            return styles.invertedText;
        case 'default':
            return styles.defaultText;
    }
};

const styles = StyleSheet.create((theme) => ({
    document: {
        width: '100%',
        maxWidth: '100%',
    },
    inlineBase: {
        flexShrink: 1,
    },
    blockSpacingSmall: {
        marginTop: theme.space(2),
    },
    blockSpacingLarge: {
        marginTop: theme.space(5),
    },
    paragraph: {
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
    },
    heading1: {
        fontSize: theme.fontSize['2xl'].fontSize,
        lineHeight: theme.fontSize['2xl'].lineHeight,
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
    heading2: {
        fontSize: theme.fontSize.xl.fontSize,
        lineHeight: theme.fontSize.xl.lineHeight,
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
    heading3: {
        fontSize: theme.fontSize.lg.fontSize,
        lineHeight: theme.fontSize.lg.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    heading: {
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    defaultText: {
        color: theme.colors.text,
    },
    mutedText: {
        color: theme.colors.textMuted,
    },
    invertedText: {
        color: theme.colors.userBubbleForeground,
    },
    bold: {
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
    italic: {
        fontStyle: 'italic',
    },
    strike: {
        textDecorationLine: 'line-through',
    },
    inlineCode: {
        backgroundColor: theme.colors.surfaceMuted,
        color: theme.colors.text,
        fontFamily: 'monospace',
        fontSize: theme.fontSize.sm.fontSize,
    },
    link: {
        color: theme.colors.infoText,
        textDecorationLine: 'underline',
    },
    list: {
        gap: theme.space(1.5),
        width: '100%',
    },
    listItem: {
        width: '100%',
        alignItems: 'flex-start',
        gap: theme.space(2),
    },
    listPrefix: {
        width: theme.space(7),
        textAlign: 'right',
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
        opacity: 0.72,
    },
    listContent: {
        flex: 1,
        minWidth: 0,
    },
    quote: {
        width: '100%',
        maxWidth: '100%',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surfaceMuted,
        paddingHorizontal: theme.space(3),
        paddingVertical: theme.space(2.5),
    },
    codeBlock: {
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surfaceMuted,
        overflow: 'hidden',
        paddingTop: theme.space(2.5),
        gap: theme.space(2),
    },
    codeLanguage: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        paddingHorizontal: theme.space(3),
    },
    codeVerticalScroller: {
        maxHeight: theme.space(90),
        maxWidth: '100%',
    },
    codeVerticalContent: {
        minHeight: theme.space(9),
    },
    codeScroller: {
        paddingHorizontal: theme.space(3),
        paddingBottom: theme.space(3),
    },
    codeText: {
        color: theme.colors.text,
        fontFamily: 'Menlo',
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    rule: {
        height: theme.space(0.25),
        width: '100%',
        backgroundColor: theme.colors.border,
    },
}));
