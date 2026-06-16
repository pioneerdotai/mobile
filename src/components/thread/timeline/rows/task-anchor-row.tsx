import { Info } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';

type TaskAnchorRowProps = {
    row: Extract<TimelineRow, { type: 'task-anchor' }>;
};

export const TaskAnchorRow = ({ row }: TaskAnchorRowProps) => {
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');

    return (
        <HStack style={styles.container}>
            <Info size={theme.space(4)} color={theme.colors.textMuted} />
            <VStack style={styles.body}>
                <Text numberOfLines={1} style={styles.title}>
                    {row.title || t('timelineTask')}
                </Text>
                <Text numberOfLines={1} style={styles.status}>
                    {formatTaskStatus(row.status, t('timelineTask'))}
                </Text>
            </VStack>
        </HStack>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: {
        width: '100%',
        maxWidth: '100%',
        minHeight: theme.space(9),
        alignItems: 'center',
        gap: theme.space(2),
        paddingVertical: theme.space(2),
    },
    body: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    status: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
}));

const formatTaskStatus = (status: string, fallback: string) => {
    const words = status.replace(/[_-]/g, ' ').trim();

    return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}` : fallback;
};
