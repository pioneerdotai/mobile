import { Download, Eye, FileText } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

import type { TimelineRow } from '@/services/threads/conversation/timeline';

import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';

import { HeaderText, StatusPill, TimelineCard, useToneColor, toneFromStatus } from './status';

type ArtifactRowProps = {
    row: Extract<TimelineRow, { type: 'artifact' }>;
};

export const ArtifactRow = ({ row }: ArtifactRowProps) => {
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');

    const tone = toneFromStatus(row.status);
    const iconColor = useToneColor(tone);
    const iconSize = theme.space(4);
    const actionIconSize = theme.space(3.75);
    const actionIconColor = theme.colors.textMuted;

    return (
        <TimelineCard tone={tone}>
            <HStack style={styles.header}>
                <FileText size={iconSize} color={iconColor} />
                <HeaderText>{row.displayName || t('timelineArtifact')}</HeaderText>
                <StatusPill status={row.status} tone={tone} />
            </HStack>
            <HStack style={styles.footer}>
                <Text numberOfLines={1} style={styles.artifactId}>
                    {row.artifactId}
                </Text>
                <HStack style={styles.actions}>
                    <Box style={styles.actionIcon}>
                        <Eye size={actionIconSize} color={actionIconColor} />
                    </Box>
                    <Box style={styles.actionIcon}>
                        <Download size={actionIconSize} color={actionIconColor} />
                    </Box>
                </HStack>
            </HStack>
        </TimelineCard>
    );
};

const styles = StyleSheet.create((theme) => ({
    header: {
        alignItems: 'center',
        gap: theme.space(2),
    },
    footer: {
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(3),
    },
    artifactId: {
        flex: 1,
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
    actions: {
        gap: theme.space(1.5),
    },
    actionIcon: {
        width: theme.space(7),
        height: theme.space(7),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surface,
        opacity: 0.72,
    },
}));
