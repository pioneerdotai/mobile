import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import Spinner from '@/components/feedback/spinner';

import { MarkdownContent } from './markdown-content';
import { TIMELINE_TECHNICAL_ROW_VERTICAL_PADDING_UNITS } from '../timeline-grouping';

type ReasoningRowProps = {
    row: Extract<TimelineRow, { type: 'reasoning' }>;
    expanded: boolean;
    onToggle: () => void;
};

export const ReasoningRow = ({ row, expanded, onToggle }: ReasoningRowProps) => {
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');

    const hasText = row.text.trim().length > 0 || (row.markdown?.blocks?.length ?? 0) > 0;
    const iconSize = theme.space(4);
    const iconColor = theme.colors.typography;

    return (
        <VStack style={styles.container}>
            <Pressable
                accessibilityRole="button"
                disabled={!hasText}
                onPress={onToggle}
                style={({ pressed }) => [
                    styles.header,
                    row.streaming && styles.activeHeader,
                    pressed && styles.pressed,
                ]}
            >
                <HStack style={styles.headerLabel}>
                    {row.streaming ? (
                        <Spinner size={iconSize} color={iconColor} />
                    ) : (
                        <Lightbulb size={iconSize} color={iconColor} />
                    )}
                    <Text
                        numberOfLines={1}
                        style={row.streaming ? styles.runningTitle : styles.title}
                    >
                        {row.streaming ? t('timelineThinking') : t('timelineThought')}
                    </Text>
                </HStack>
                <HStack style={styles.meta}>
                    {!!row.elapsedLabel && (
                        <Text numberOfLines={1} style={styles.elapsed}>
                            {row.elapsedLabel}
                        </Text>
                    )}
                    {hasText &&
                        (expanded ? (
                            <ChevronUp size={iconSize} color={iconColor} />
                        ) : (
                            <ChevronDown size={iconSize} color={iconColor} />
                        ))}
                </HStack>
            </Pressable>
            {expanded && hasText && (
                <Box style={styles.body}>
                    <MarkdownContent
                        text={row.text}
                        document={row.markdown}
                        streaming={row.streaming}
                        highlightCodeBlocks
                        tone="muted"
                    />
                </Box>
            )}
        </VStack>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: {
        width: '100%',
        maxWidth: '100%',
        paddingVertical: theme.space(TIMELINE_TECHNICAL_ROW_VERTICAL_PADDING_UNITS),
        gap: theme.space(3),
    },
    header: {
        minHeight: theme.space(9),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(3),
        opacity: 0.6,
    },
    activeHeader: {
        opacity: 1,
    },
    pressed: {
        opacity: 0.8,
    },
    headerLabel: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        gap: theme.space(2),
    },
    title: {
        flexShrink: 1,
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    runningTitle: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    meta: {
        alignItems: 'center',
        gap: theme.space(2),
    },
    elapsed: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    body: {
        paddingVertical: theme.space(0.5),
    },
}));
