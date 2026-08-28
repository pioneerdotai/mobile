import { useCallback, useMemo } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
    EnrichedMarkdownText,
    type MarkdownStyle,
    type TextSelectionMenuConfig,
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
    const markdownStyle = useMemo(
        () => timelineMarkdownStyle({ theme, tone, dark: rt.themeName === 'dark' }),
        [rt.themeName, theme, tone],
    );
    const selectionMenuConfig = useMemo<TextSelectionMenuConfig>(
        () => ({
            copy: { label: t('timelineCopy') },
            copyAsMarkdown: { enabled: true },
            copyImageUrl: { enabled: false },
        }),
        [t],
    );
    const handleCopyPress = useCallback(
        () => AccessibilityInfo.announceForAccessibility(t('timelineCopied')),
        [t],
    );

    return (
        <EnrichedMarkdownText
            key={selectable ? 'selection-enabled' : 'selection-disabled'}
            allowTrailingMargin={false}
            containerStyle={styles.document}
            flavor="github"
            markdown={renderedMarkdown}
            markdownStyle={markdownStyle}
            md4cFlags={MARKDOWN_FLAGS}
            onCopyPress={handleCopyPress}
            selectable={selectable}
            selectionColor={theme.colors.infoText}
            selectionHandleColor={theme.colors.infoText}
            selectionMenuConfig={selectionMenuConfig}
            streamingAnimation={streaming}
        />
    );
};

type TimelineMarkdownStyleInput = {
    theme: ReturnType<typeof useUnistyles>['theme'];
    tone: NonNullable<MarkdownContentProps['tone']>;
    dark: boolean;
};

const timelineMarkdownStyle = ({
    theme,
    tone,
    dark,
}: TimelineMarkdownStyleInput): MarkdownStyle => {
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
            syntaxColors: dark ? CATPPUCCIN_FRAPPE_SYNTAX_COLORS : CATPPUCCIN_LATTE_SYNTAX_COLORS,
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

const CATPPUCCIN_LATTE_SYNTAX_COLORS = {
    keyword: '#8839ef',
    operator: '#179299',
    punctuation: '#7c7f93',
    string: '#40a02b',
    number: '#fe640b',
    constant: '#fe640b',
    comment: '#9ca0b0',
    function: '#1e66f5',
    type: '#df8e1d',
    variable: '#4c4f69',
    property: '#209fb5',
    tag: '#d20f39',
    attribute: '#179299',
    embedded: '#7287fd',
} satisfies NonNullable<NonNullable<MarkdownStyle['codeBlock']>['syntaxColors']>;

const CATPPUCCIN_FRAPPE_SYNTAX_COLORS = {
    keyword: '#ca9ee6',
    operator: '#81c8be',
    punctuation: '#949cbb',
    string: '#a6d189',
    number: '#ef9f76',
    constant: '#ef9f76',
    comment: '#737994',
    function: '#8caaee',
    type: '#e5c890',
    variable: '#c6d0f5',
    property: '#85c1dc',
    tag: '#e78284',
    attribute: '#81c8be',
    embedded: '#babbf1',
} satisfies NonNullable<NonNullable<MarkdownStyle['codeBlock']>['syntaxColors']>;

const markdownFontWeight = (value: { fontWeight: string | number }): string =>
    String(value.fontWeight);

const styles = StyleSheet.create(() => ({
    document: {
        width: '100%',
        maxWidth: '100%',
    },
}));
