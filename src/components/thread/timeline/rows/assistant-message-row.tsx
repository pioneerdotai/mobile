import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ChevronDown, ChevronUp, MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import Spinner from '@/components/feedback/spinner';

import { MarkdownContent } from './markdown-content';
import { TimelineCopyButton } from './timeline-copy-button';

type AssistantMessageRowProps = {
    row: Extract<TimelineRow, { type: 'assistant-message' }>;
    expanded: boolean;
    onToggle: () => void;
};

export const AssistantMessageRow = ({ row, expanded, onToggle }: AssistantMessageRowProps) => {
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');

    const hasText = row.text.trim().length > 0 || (row.markdown?.blocks?.length ?? 0) > 0;
    const iconSize = theme.space(4);
    const activityColor = theme.colors.textMuted;
    const showActionRow = row.phase !== 'commentary';

    if (row.taskTimeline) {
        return (
            <VStack style={styles.taskContainer}>
                <Pressable
                    accessibilityRole="button"
                    onPress={onToggle}
                    style={({ pressed }) => [styles.taskHeader, pressed && styles.pressed]}
                >
                    <HStack style={styles.taskTitleWrap}>
                        <MessageCircle size={iconSize} color={theme.colors.textMuted} />
                        <Text numberOfLines={1} style={styles.taskTitle}>
                            {t('timelineSubagentAnswered')}
                        </Text>
                    </HStack>
                    <HStack style={styles.taskMeta}>
                        {!!row.elapsedLabel && (
                            <Text numberOfLines={1} style={styles.taskElapsed}>
                                {row.elapsedLabel}
                            </Text>
                        )}
                        <TimelineCopyButton value={row.text} />
                        {expanded ? (
                            <ChevronUp size={iconSize} color={theme.colors.textMuted} />
                        ) : (
                            <ChevronDown size={iconSize} color={theme.colors.textMuted} />
                        )}
                    </HStack>
                </Pressable>
                {expanded && hasText && (
                    <Box style={styles.taskBody}>
                        <MarkdownContent text={row.text} document={row.markdown} />
                    </Box>
                )}
            </VStack>
        );
    }

    return (
        <VStack style={[styles.container, row.streaming && styles.streamingContainer]}>
            {hasText ? (
                <MarkdownContent
                    text={row.text}
                    document={row.markdown}
                    streaming={row.streaming}
                />
            ) : row.streaming ? (
                <Spinner color={activityColor} />
            ) : null}
            {showActionRow && (
                <HStack style={styles.actionRow}>
                    {!!row.timestampLabel && (
                        <Text numberOfLines={1} style={styles.timestamp}>
                            {row.timestampLabel}
                        </Text>
                    )}
                    <TimelineCopyButton value={row.text} />
                </HStack>
            )}
        </VStack>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: {
        width: '100%',
        maxWidth: '100%',
        paddingVertical: theme.space(3),
        paddingRight: theme.space(3),
    },
    streamingContainer: {
        opacity: 0.92,
    },
    streamingIndicator: {
        alignSelf: 'flex-start',
        marginTop: theme.space(2),
    },
    taskContainer: {
        width: '100%',
        maxWidth: '100%',
        paddingVertical: theme.space(2),
        gap: theme.space(2),
    },
    taskHeader: {
        minHeight: theme.space(9),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(3),
        opacity: 0.68,
    },
    pressed: {
        opacity: 0.88,
    },
    taskTitleWrap: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        gap: theme.space(2),
    },
    taskTitle: {
        flex: 1,
        minWidth: 0,
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    taskMeta: {
        alignItems: 'center',
        gap: theme.space(2),
    },
    taskElapsed: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    taskBody: {
        paddingVertical: theme.space(0.5),
    },
    actionRow: {
        minHeight: theme.space(7.5),
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: theme.space(1.5),
        marginTop: theme.space(0.5),
    },
    timestamp: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
}));
