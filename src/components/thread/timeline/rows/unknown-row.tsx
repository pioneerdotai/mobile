import { CircleHelp } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';

import { HeaderText, StatusPill, TimelineCard, useToneColor } from './status';

type UnknownRowProps = {
    row: Extract<TimelineRow, { type: 'unknown' }>;
};

export const UnknownRow = ({ row }: UnknownRowProps) => {
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');
    const iconColor = useToneColor('neutral');

    return (
        <TimelineCard tone="neutral">
            <HStack style={styles.header}>
                <CircleHelp size={theme.space(4)} color={iconColor} />
                <HeaderText>{row.label || t('timelineUnknownItem')}</HeaderText>
                <StatusPill status="unsupported" tone="neutral" />
            </HStack>
            <Text numberOfLines={1} style={styles.idText}>
                {row.itemId ?? row.turnId ?? row.key}
            </Text>
        </TimelineCard>
    );
};

const styles = StyleSheet.create((theme) => ({
    header: {
        alignItems: 'center',
        gap: theme.space(2),
    },
    idText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
}));
