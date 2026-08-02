import { Download, Eye, FileText, X } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import type { MobileArtifactActionState } from '@/services/artifacts/mobile-action-state';

import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';

import { HeaderText, StatusPill, TimelineCard, useToneColor, toneFromStatus } from './status';

type ArtifactRowProps = {
    row: Extract<TimelineRow, { type: 'artifact' }>;
    actionState?: MobileArtifactActionState;
    onOpen?: (artifactId: string, versionId: string | null) => void;
    onShare?: (artifactId: string, versionId: string | null) => void;
    onCancelDownload?: (artifactId: string, versionId: string | null, operationId: string) => void;
};

export const ArtifactRow = ({
    row,
    actionState = { kind: 'idle' },
    onOpen,
    onShare,
    onCancelDownload,
}: ArtifactRowProps) => {
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');

    const tone = toneFromStatus(row.status);
    const iconColor = useToneColor(tone);
    const iconSize = theme.space(4);
    const actionIconSize = theme.space(3.75);
    const actionIconColor = theme.colors.textMuted;
    const busy = ['opening', 'downloading', 'sharing'].includes(actionState.kind);
    const actionLabel = artifactActionLabel(actionState, t);

    return (
        <TimelineCard tone={tone}>
            <HStack style={styles.header}>
                <FileText size={iconSize} color={iconColor} />
                <HeaderText>{row.displayName || t('timelineArtifact')}</HeaderText>
                <StatusPill status={row.status} tone={tone} />
            </HStack>
            <HStack style={styles.footer}>
                <Box style={styles.artifactStatus}>
                    <Text numberOfLines={1} style={styles.artifactId}>
                        {row.artifactId}
                    </Text>
                    {actionLabel ? (
                        <Text numberOfLines={1} style={styles.actionStatus}>
                            {actionLabel}
                        </Text>
                    ) : null}
                </Box>
                <HStack style={styles.actions}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('artifacts:open')}
                        disabled={busy || !onOpen}
                        onPress={() => onOpen?.(row.artifactId, null)}
                        style={[styles.actionIcon, (busy || !onOpen) && styles.actionIconDisabled]}
                    >
                        <Eye size={actionIconSize} color={actionIconColor} />
                    </Pressable>
                    {actionState.kind === 'downloading' ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('artifacts:cancel')}
                            onPress={() =>
                                onCancelDownload?.(row.artifactId, null, actionState.operationId)
                            }
                            style={styles.actionIcon}
                        >
                            <X size={actionIconSize} color={actionIconColor} />
                        </Pressable>
                    ) : (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('artifacts:downloadAndShare')}
                            disabled={busy || !onShare}
                            onPress={() => onShare?.(row.artifactId, null)}
                            style={[
                                styles.actionIcon,
                                (busy || !onShare) && styles.actionIconDisabled,
                            ]}
                        >
                            <Download size={actionIconSize} color={actionIconColor} />
                        </Pressable>
                    )}
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
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
    artifactStatus: {
        flex: 1,
        gap: theme.space(0.5),
    },
    actionStatus: {
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
    actionIconDisabled: {
        opacity: 0.35,
    },
}));

const artifactActionLabel = (state: MobileArtifactActionState, t: TFunction): string | null => {
    switch (state.kind) {
        case 'idle':
            return null;
        case 'opening':
            return t('artifacts:opening');
        case 'downloading': {
            const percent =
                state.totalBytes > 0
                    ? Math.min(100, Math.floor((state.downloadedBytes * 100) / state.totalBytes))
                    : 0;
            return t('artifacts:downloading', { percent });
        }
        case 'sharing':
            return t('artifacts:sharing');
        case 'failed':
            return t(`artifacts:actionErrors.${state.code}`);
    }
};
