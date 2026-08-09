import { useMemo } from 'react';
import {
    EnrichedMarkdownText,
    type CodeBlockHeaderConfig,
    type CodeBlockScrollConfig,
    type CodeHighlightingConfig,
    type MarkdownStyle,
} from 'react-native-enriched-markdown';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import remend from 'remend';
import type { RemendOptions } from 'remend';

import type { MarkdownDocument } from '@/client/generated/client_active_thread_snapshot';

import { markdownSource } from './markdown-rendering';

type MarkdownContentProps = {
    text: string;
    document?: MarkdownDocument | null;
    tone?: 'default' | 'muted' | 'inverted';
    selectable?: boolean;
    streaming?: boolean;
    highlightCodeBlocks?: boolean;
};
const MARKDOWN_FLAGS = {
    latexMath: false,
};
const STREAMING_REMEND_CONFIG: RemendOptions = {
    bold: true,
    italic: true,
    boldItalic: true,
    strikethrough: true,
    links: true,
    linkMode: 'text-only',
    images: true,
    inlineCode: true,
    katex: false,
    setextHeadings: true,
};

export const MarkdownContent = ({
    text,
    document,
    tone = 'default',
    selectable = true,
    streaming = false,
    highlightCodeBlocks = false,
}: MarkdownContentProps) => {
    const { theme, rt } = useUnistyles();
    const { t } = useTranslation('threads');
    const markdown = useMemo(
        () => markdownSource(text, document, streaming),
        [document, streaming, text],
    );
    const renderedMarkdown = useMemo(
        () => (streaming ? remend(markdown, STREAMING_REMEND_CONFIG) : markdown),
        [markdown, streaming],
    );
    const markdownStyle = useMemo(() => timelineMarkdownStyle({ theme, tone }), [theme, tone]);

    const codeHighlighting = useMemo<CodeHighlightingConfig | undefined>(
        () =>
            highlightCodeBlocks
                ? {
                      theme: rt.themeName === 'dark' ? 'catppuccin-frappe' : 'catppuccin-latte',
                  }
                : undefined,
        [highlightCodeBlocks, rt.themeName],
    );

    const codeBlockHeader = useMemo<CodeBlockHeaderConfig>(
        () => ({
            showLanguage: true,
            showCopyButton: true,
            color: theme.colors.typography,
            fontSize: theme.fontSize.xs.fontSize,
            height: theme.space(5),
            gap: theme.space(2),
            horizontalPadding: theme.space(3),
            iconSize: theme.space(3),
            opacity: 0.6,
            copyAccessibilityLabel: t('timelineCopy'),
            copiedAccessibilityLabel: t('timelineCopied'),
        }),
        [t, theme],
    );
    const codeBlockScroll = useMemo<CodeBlockScrollConfig>(
        () => ({
            enabled: true,
            showsHorizontalScrollIndicator: false,
        }),
        [],
    );

    return (
        <EnrichedMarkdownText
            key={selectable ? 'selection-enabled' : 'selection-disabled'}
            allowTrailingMargin={false}
            containerStyle={styles.document}
            codeBlockHeader={codeBlockHeader}
            codeBlockScroll={codeBlockScroll}
            codeHighlighting={codeHighlighting}
            flavor="github"
            markdown={renderedMarkdown}
            markdownStyle={markdownStyle}
            md4cFlags={MARKDOWN_FLAGS}
            selectable={selectable}
            selectionColor={theme.colors.infoText}
            selectionHandleColor={theme.colors.infoText}
            selectionMenuConfig={selectionMenuConfig}
            streamingAnimation={streaming}
        />
    );
};

const selectionMenuConfig = {
    copyAsMarkdown: { enabled: true },
    copyImageUrl: { enabled: false },
};

type TimelineMarkdownStyleInput = {
    theme: ReturnType<typeof useUnistyles>['theme'];
    tone: NonNullable<MarkdownContentProps['tone']>;
};

const timelineMarkdownStyle = ({ theme, tone }: TimelineMarkdownStyleInput): MarkdownStyle => {
    const textColor =
        tone === 'muted'
            ? theme.colors.textMuted
            : tone === 'inverted'
              ? theme.colors.userBubbleForeground
              : theme.colors.typography;

    return {
        paragraph: {
            color: textColor,
            fontSize: theme.fontSize.default.fontSize,
            lineHeight: theme.fontSize.default.lineHeight,
            marginTop: 0,
            marginBottom: theme.space(2),
        },
        h1: {
            color: textColor,
            fontSize: theme.fontSize['2xl'].fontSize,
            fontWeight: markdownFontWeight(theme.fontWeight.bold),
            lineHeight: theme.fontSize['2xl'].lineHeight,
            marginTop: theme.space(5),
            marginBottom: theme.space(2),
        },
        h2: {
            color: textColor,
            fontSize: theme.fontSize.xl.fontSize,
            fontWeight: markdownFontWeight(theme.fontWeight.bold),
            lineHeight: theme.fontSize.xl.lineHeight,
            marginTop: theme.space(5),
            marginBottom: theme.space(2),
        },
        h3: {
            color: textColor,
            fontSize: theme.fontSize.lg.fontSize,
            fontWeight: markdownFontWeight(theme.fontWeight.semibold),
            lineHeight: theme.fontSize.lg.lineHeight,
            marginTop: theme.space(5),
            marginBottom: theme.space(2),
        },
        h4: {
            color: textColor,
            fontSize: theme.fontSize.default.fontSize,
            fontWeight: markdownFontWeight(theme.fontWeight.semibold),
            lineHeight: theme.fontSize.default.lineHeight,
            marginTop: theme.space(5),
            marginBottom: theme.space(2),
        },
        h5: {
            color: textColor,
            fontSize: theme.fontSize.default.fontSize,
            fontWeight: markdownFontWeight(theme.fontWeight.semibold),
            lineHeight: theme.fontSize.default.lineHeight,
            marginTop: theme.space(5),
            marginBottom: theme.space(2),
        },
        h6: {
            color: textColor,
            fontSize: theme.fontSize.sm.fontSize,
            fontWeight: markdownFontWeight(theme.fontWeight.semibold),
            lineHeight: theme.fontSize.sm.lineHeight,
            marginTop: theme.space(5),
            marginBottom: theme.space(2),
        },
        blockquote: {
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
            borderWidth: 1,
            color: tone === 'inverted' ? theme.colors.userBubbleForeground : theme.colors.textMuted,
            fontSize: theme.fontSize.default.fontSize,
            gapWidth: theme.space(3),
            lineHeight: theme.fontSize.default.lineHeight,
            marginTop: 0,
            marginBottom: theme.space(2),
        },
        list: {
            bulletColor:
                tone === 'inverted' ? theme.colors.userBubbleForeground : theme.colors.textMuted,
            color: textColor,
            fontSize: theme.fontSize.default.fontSize,
            gapWidth: theme.space(2),
            lineHeight: theme.fontSize.default.lineHeight,
            markerColor:
                tone === 'inverted' ? theme.colors.userBubbleForeground : theme.colors.textMuted,
            markerFontWeight: markdownFontWeight(theme.fontWeight.medium),
            markerMinWidth: theme.space(7),
            marginLeft: 0,
            marginTop: 0,
            marginBottom: theme.space(2),
        },
        codeBlock: {
            backgroundColor: theme.colors.background,
            borderRadius: theme.radius['2xl'],
            borderWidth: 0,
            color: textColor,
            fontFamily: 'Menlo',
            fontSize: theme.fontSize.sm.fontSize,
            lineHeight: theme.fontSize.sm.lineHeight,
            marginTop: 0,
            marginBottom: theme.space(3),
            padding: theme.space(3),
        },
        code: {
            backgroundColor: theme.colors.surfaceMuted,
            color: textColor,
            fontFamily: 'Menlo',
            fontSize: theme.fontSize.sm.fontSize,
        },
        link: {
            color: tone === 'inverted' ? theme.colors.userBubbleForeground : theme.colors.infoText,
            underline: true,
        },
        strong: {
            color: textColor,
            fontWeight: 'bold',
        },
        em: {
            color: textColor,
            fontStyle: 'italic',
        },
        strikethrough: {
            color: theme.colors.textMuted,
        },
        underline: {
            color: textColor,
        },
        thematicBreak: {
            color: theme.colors.border,
            height: theme.space(0.25),
            marginTop: theme.space(5),
            marginBottom: theme.space(5),
        },
        table: {
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            cellPaddingHorizontal: theme.space(2),
            cellPaddingVertical: theme.space(1.5),
            color: textColor,
            fontSize: theme.fontSize.sm.fontSize,
            headerBackgroundColor: theme.colors.surfaceMuted,
            headerTextColor: textColor,
            lineHeight: theme.fontSize.sm.lineHeight,
            marginTop: 0,
            marginBottom: theme.space(2),
            rowEvenBackgroundColor: 'transparent',
            rowOddBackgroundColor: theme.colors.surfaceMuted,
        },
        taskList: {
            borderColor: theme.colors.border,
            checkedColor: theme.colors.infoText,
            checkedStrikethrough: false,
            checkedTextColor: theme.colors.textMuted,
            checkmarkColor: theme.colors.userBubbleForeground,
        },
    };
};

const markdownFontWeight = (value: { fontWeight: string | number }): string =>
    String(value.fontWeight);

const styles = StyleSheet.create(() => ({
    document: {
        width: '100%',
        maxWidth: '100%',
    },
}));
