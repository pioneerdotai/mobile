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

    if (row.streaming) {
        return (
            <VStack style={styles.container}>
                {hasText && <MarkdownContent text={row.text} document={row.markdown} />}
                <HStack style={styles.runningRow}>
                    <HStack style={styles.headerLabel}>
                        <Spinner size={theme.space(4)} color={iconColor} />
                        <Text numberOfLines={1} style={styles.runningTitle}>
                            {t('timelineThinking')}
                        </Text>
                    </HStack>
                    {!!row.elapsedLabel && (
                        <Text numberOfLines={1} style={styles.elapsed}>
                            {row.elapsedLabel}
                        </Text>
                    )}
                </HStack>
            </VStack>
        );
    }

    return (
        <VStack style={styles.container}>
            <Pressable
                accessibilityRole="button"
                disabled={!hasText}
                onPress={onToggle}
                style={({ pressed }) => [styles.header, pressed && styles.pressed]}
            >
                <HStack style={styles.headerLabel}>
                    <Lightbulb size={iconSize} color={iconColor} />
                    <Text numberOfLines={1} style={styles.title}>
                        {t('timelineThought')}
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
                    <MarkdownContent text={row.text} document={row.markdown} tone="muted" />
                </Box>
            )}
        </VStack>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: {
        width: '100%',
        maxWidth: '100%',
        paddingVertical: theme.space(2),
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
    runningRow: {
        minHeight: theme.space(9),
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(3),
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
