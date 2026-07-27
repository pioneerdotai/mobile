import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { RunningActivityContent } from './running-row';

type TaskAnchorRowProps = {
    row: Extract<TimelineRow, { type: 'task-anchor' }>;
    onOpenTaskThread?: (row: Extract<TimelineRow, { type: 'task-anchor' }>) => void;
};

export const TaskAnchorRow = ({ row, onOpenTaskThread }: TaskAnchorRowProps) => {
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');
    const detail = row.errorPreview ?? row.progressPreview;
    const canOpen = Boolean(row.childThreadId && onOpenTaskThread);
    const running = row.status.toLowerCase() === 'running';

    return (
        <Pressable
            accessibilityRole={canOpen ? 'button' : undefined}
            disabled={!canOpen}
            onPress={() => onOpenTaskThread?.(row)}
            style={({ pressed }) => [styles.card, canOpen && pressed ? styles.pressed : null]}
        >
            <VStack style={styles.container}>
                <HStack style={styles.header}>
                    <Text numberOfLines={1} style={styles.title}>
                        {row.title || t('timelineTask')}
                    </Text>
                    <ChevronRight size={theme.space(4)} color={theme.colors.textMuted} />
                </HStack>
                <VStack style={styles.divider} />
                <VStack style={styles.statusSection}>
                    {running ? (
                        <RunningActivityContent elapsedLabel={row.elapsedLabel} />
                    ) : (
                        <Text numberOfLines={1} style={styles.status}>
                            {formatTaskStatus(row.status, t('timelineTask'))}
                        </Text>
                    )}
                    {detail ? (
                        <Text numberOfLines={2} style={styles.detail}>
                            {detail}
                        </Text>
                    ) : null}
                </VStack>
            </VStack>
        </Pressable>
    );
};

const styles = StyleSheet.create((theme) => ({
    card: {
        width: '100%',
        maxWidth: '100%',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius['2xl'],
        paddingHorizontal: theme.space(4),
        paddingVertical: theme.space(2.5),
        backgroundColor: theme.colors.background,
    },
    pressed: {
        backgroundColor: theme.colors.surfaceMuted,
    },
    container: {
        width: '100%',
        maxWidth: '100%',
    },
    header: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(2),
    },
    title: {
        flex: 1,
        minWidth: 0,
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        ...theme.fontWeight.medium,
    },
    divider: {
        width: '100%',
        height: 1,
        marginTop: theme.space(2),
        backgroundColor: theme.colors.border,
    },
    statusSection: {
        width: '100%',
        paddingVertical: theme.space(2),
        gap: theme.space(1),
    },
    status: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        ...theme.fontWeight.semibold,
    },
    detail: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        opacity: 0.82,
    },
}));

const formatTaskStatus = (status: string, fallback: string) => {
    const words = status.replace(/[_-]/g, ' ').trim();

    return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}` : fallback;
};
