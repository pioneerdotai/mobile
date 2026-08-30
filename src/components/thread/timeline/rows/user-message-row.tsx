import {
    Download,
    FileAudio,
    FileText,
    Image as ImageIcon,
    Video,
    X,
    Zap,
} from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { TimelineRow, TimelineUserAttachment } from '@/services/threads/conversation/timeline';
import {
    mobileArtifactActionKey,
    type MobileArtifactActionState,
} from '@/services/artifacts/mobile-action-state';
import { McpIcon } from '@/components/icons/mcp-icon';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';

import { MarkdownContent } from './markdown-content';
import { stableOutlineWidth } from '@/helpers/styles';
import {
    TIMELINE_AVATAR_RAIL_WIDTH_UNITS,
    TIMELINE_AVATAR_SIZE_UNITS,
    TIMELINE_GROUP_VERTICAL_PADDING_UNITS,
    isCurrentPrincipalUserMessage,
} from '../timeline-grouping';
import { timelineTextBottomMargin } from '../timeline-text-layout';
import {
    timelineAgentAuthorLabel,
    timelineAgentAuthorPresentation,
} from '../timeline-author-label';

type UserMessageRowProps = {
    row: Extract<TimelineRow, { type: 'user-message' }>;
    artifactWorkspaceId?: string | null;
    onOpenArtifact?: (artifactId: string, versionId: string | null) => void;
    onShareArtifact?: (artifactId: string, versionId: string | null) => void;
    onCancelArtifactDownload?: (
        artifactId: string,
        versionId: string | null,
        operationId: string,
    ) => void;
    artifactActionStateByKey?: Readonly<Record<string, MobileArtifactActionState>>;
    currentPrincipalId?: string | null;
    onLongPress?: (row: Extract<TimelineRow, { type: 'user-message' }>) => void;
    onOpenLocalFile?: (href: string) => void;
    textSelectionEnabled?: boolean;
    compactTopSpacing?: boolean;
};

export const UserMessageRow = ({
    row,
    artifactWorkspaceId,
    onOpenArtifact,
    onShareArtifact,
    onCancelArtifactDownload,
    artifactActionStateByKey,
    currentPrincipalId,
    onLongPress,
    onOpenLocalFile,
    textSelectionEnabled = true,
    compactTopSpacing = false,
}: UserMessageRowProps) => {
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');

    const attachmentIconSize = theme.space(3.5);
    const attachmentIconColor = theme.colors.textMuted;
    const isCurrentPrincipal = isCurrentPrincipalUserMessage(row, currentPrincipalId);
    const showAuthor = !isCurrentPrincipal && !compactTopSpacing;

    const agentAuthor = timelineAgentAuthorPresentation(row.author);
    const agentAuthorLabel = timelineAgentAuthorLabel(row.author);
    const isUnknownAgent = row.author?.actor.kind === 'agent_execution' && !agentAuthor;
    const authorLabel =
        agentAuthorLabel ??
        (isUnknownAgent
            ? t('modeAgentLabel')
            : row.author
              ? `${row.author.display_name} · @${row.author.nickname}`
              : t('timelineMessageUnknownAuthor'));
    const replyLabel = row.reply
        ? row.replyState === 'deleted'
            ? t('timelineMessageReplyDeleted')
            : row.replyState === 'unavailable'
              ? t('timelineMessageReplyUnavailable')
              : (row.reply.text ?? t('timelineMessageReplyUnavailable'))
        : null;

    return (
        <Pressable
            delayLongPress={300}
            onLongPress={onLongPress ? () => onLongPress(row) : undefined}
            style={[
                styles.container,
                compactTopSpacing && { paddingTop: 0 },
                !isCurrentPrincipal && styles.containerOther,
            ]}
        >
            {showAuthor ? (
                <HStack accessible accessibilityLabel={authorLabel} style={styles.author}>
                    {agentAuthor ? (
                        <>
                            <Text numberOfLines={1} style={styles.authorName}>
                                {agentAuthor.displayName}
                            </Text>
                            {agentAuthor.nickname ? (
                                <Text numberOfLines={1} style={styles.authorNickname}>
                                    @{agentAuthor.nickname}
                                </Text>
                            ) : null}
                        </>
                    ) : isUnknownAgent ? (
                        <Text numberOfLines={1} style={styles.authorName}>
                            {t('modeAgentLabel')}
                        </Text>
                    ) : row.author ? (
                        <>
                            <Text numberOfLines={1} style={styles.authorName}>
                                {row.author.display_name}
                            </Text>
                            <Text numberOfLines={1} style={styles.authorNickname}>
                                @{row.author.nickname}
                            </Text>
                        </>
                    ) : (
                        <Text numberOfLines={1} style={styles.authorName}>
                            {t('timelineMessageUnknownAuthor')}
                        </Text>
                    )}
                </HStack>
            ) : null}
            {replyLabel ? (
                <Box
                    accessible
                    accessibilityLabel={replyLabel}
                    nativeID={`timeline-reply-${row.reply?.turnId ?? 'unavailable'}`}
                    style={styles.reply}
                >
                    <Text numberOfLines={3} style={styles.replyText}>
                        {replyLabel}
                    </Text>
                </Box>
            ) : null}
            {!row.deleted && row.attachments.length > 0 && (
                <HStack
                    style={[styles.attachments, !isCurrentPrincipal && styles.attachmentsOther]}
                >
                    {row.attachments.map((attachment) => {
                        const artifactId = attachment.artifact?.artifact_id ?? null;
                        const versionId = attachment.artifact?.version_id ?? null;
                        const actionState =
                            artifactId && artifactWorkspaceId
                                ? (artifactActionStateByKey?.[
                                      mobileArtifactActionKey(
                                          artifactWorkspaceId,
                                          artifactId,
                                          versionId,
                                      )
                                  ] ?? { kind: 'idle' as const })
                                : { kind: 'idle' as const };
                        const busy = ['opening', 'downloading', 'sharing'].includes(
                            actionState.kind,
                        );
                        const actionLabel = artifactActionLabel(actionState, t);
                        const canOpenArtifact =
                            attachment.kind === 'artifact' && !!artifactId && !!onOpenArtifact;
                        const chipContent = (
                            <>
                                <UserAttachmentIcon
                                    attachment={attachment}
                                    color={attachmentIconColor}
                                    size={attachmentIconSize}
                                />
                                <Text numberOfLines={1} style={styles.attachmentText}>
                                    {attachment.label}
                                </Text>
                            </>
                        );

                        return canOpenArtifact ? (
                            <HStack key={attachment.id} style={styles.artifactAttachment}>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={t('artifacts:open')}
                                    disabled={busy}
                                    onPress={() => onOpenArtifact?.(artifactId, versionId)}
                                    style={({ pressed }) => [
                                        styles.attachmentChip,
                                        styles.attachmentChipInteractive,
                                        busy && styles.actionDisabled,
                                        pressed && styles.attachmentChipPressed,
                                    ]}
                                >
                                    {chipContent}
                                    {actionLabel ? (
                                        <Text numberOfLines={1} style={styles.actionStatus}>
                                            {actionLabel}
                                        </Text>
                                    ) : null}
                                </Pressable>
                                {actionState.kind === 'downloading' ? (
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={t('artifacts:cancel')}
                                        onPress={() =>
                                            onCancelArtifactDownload?.(
                                                artifactId,
                                                versionId,
                                                actionState.operationId,
                                            )
                                        }
                                        style={styles.artifactAction}
                                    >
                                        <X size={attachmentIconSize} color={attachmentIconColor} />
                                    </Pressable>
                                ) : (
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={t('artifacts:downloadAndShare')}
                                        disabled={busy || !onShareArtifact}
                                        onPress={() => onShareArtifact?.(artifactId, versionId)}
                                        style={[
                                            styles.artifactAction,
                                            (busy || !onShareArtifact) && styles.actionDisabled,
                                        ]}
                                    >
                                        <Download
                                            size={attachmentIconSize}
                                            color={attachmentIconColor}
                                        />
                                    </Pressable>
                                )}
                            </HStack>
                        ) : (
                            <HStack key={attachment.id} style={styles.attachmentChip}>
                                {chipContent}
                            </HStack>
                        );
                    })}
                </HStack>
            )}
            {row.deleted ? (
                <Box style={isCurrentPrincipal ? styles.bubble : styles.otherMessage}>
                    <Text style={styles.deleted}>{t('timelineMessageDeleted')}</Text>
                </Box>
            ) : !!row.text.trim() ? (
                <Box style={isCurrentPrincipal ? styles.bubble : styles.otherMessage}>
                    <MarkdownContent
                        text={row.text}
                        tone={isCurrentPrincipal ? 'inverted' : 'default'}
                        selectable={textSelectionEnabled}
                        onOpenLocalFile={onOpenLocalFile}
                    />
                </Box>
            ) : null}
        </Pressable>
    );
};

const UserAttachmentIcon = ({
    attachment,
    color,
    size,
}: {
    attachment: TimelineUserAttachment;
    color: string;
    size: number;
}) => {
    switch (attachment.kind) {
        case 'skill':
            return <Zap size={size} color={color} />;
        case 'mcp':
            return <McpIcon size={size} color={color} />;
        case 'image':
            return <ImageIcon size={size} color={color} />;
        case 'audio':
            return <FileAudio size={size} color={color} />;
        case 'video':
            return <Video size={size} color={color} />;
        case 'artifact':
        case 'file':
            return <FileText size={size} color={color} />;
    }
};

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

const styles = StyleSheet.create((theme) => ({
    container: {
        width: '100%',
        flexDirection: 'column',
        alignItems: 'flex-end',
        paddingVertical: theme.space(TIMELINE_GROUP_VERTICAL_PADDING_UNITS),
    },
    containerOther: {
        alignItems: 'flex-start',
        paddingLeft: theme.space(TIMELINE_AVATAR_RAIL_WIDTH_UNITS),
    },
    author: {
        maxWidth: '82%',
        minHeight: theme.space(TIMELINE_AVATAR_SIZE_UNITS),
        alignItems: 'center',
        gap: theme.space(2),
        marginBottom: theme.space(1.5),
    },
    authorName: {
        minWidth: 0,
        flexShrink: 1,
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    authorNickname: {
        minWidth: 0,
        flexShrink: 1,
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        opacity: 0.6,
    },
    reply: {
        maxWidth: '82%',
        paddingHorizontal: theme.space(3),
        paddingVertical: theme.space(2),
        marginBottom: theme.space(2),
    },
    replyText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
    deleted: {
        color: theme.colors.textMuted,
        fontStyle: 'italic',
    },
    attachments: {
        maxWidth: '82%',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: theme.space(1.5),
        marginBottom: theme.space(2),
    },
    attachmentsOther: {
        width: '100%',
        maxWidth: '100%',
        justifyContent: 'flex-start',
    },
    artifactAttachment: {
        alignItems: 'center',
        gap: theme.space(1),
    },
    attachmentChip: {
        maxWidth: theme.space(55),
        minHeight: theme.space(7.5),
        alignItems: 'center',
        gap: theme.space(1.5),
        borderWidth: stableOutlineWidth,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.space(2),
    },
    attachmentChipInteractive: {
        backgroundColor: theme.colors.background,
    },
    attachmentChipPressed: {
        opacity: 0.82,
    },
    attachmentText: {
        flexShrink: 1,
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
    actionStatus: {
        maxWidth: theme.space(36),
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
    artifactAction: {
        width: theme.space(7.5),
        height: theme.space(7.5),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: stableOutlineWidth,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.background,
    },
    actionDisabled: {
        opacity: 0.4,
    },
    bubble: {
        maxWidth: '82%',
        minWidth: 0,
        borderRadius: theme.radius['2xl'],
        backgroundColor: theme.colors.foreground,
        paddingHorizontal: theme.space(3.5),
        paddingVertical: theme.space(3),
    },
    otherMessage: {
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        marginBottom: timelineTextBottomMargin(theme.fontSize.default),
    },
}));
