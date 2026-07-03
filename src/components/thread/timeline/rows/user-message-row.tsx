import { FileAudio, FileText, Image as ImageIcon, Video, Zap } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { TimelineRow, TimelineUserAttachment } from '@/services/threads/conversation/timeline';
import { McpIcon } from '@/components/icons/mcp-icon';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';

import { MarkdownContent } from './markdown-content';
import { TimelineCopyButton } from './timeline-copy-button';
import { stableOutlineWidth } from '@/helpers/styles';

type UserMessageRowProps = {
    row: Extract<TimelineRow, { type: 'user-message' }>;
    onOpenArtifact?: (artifactId: string) => void;
};

export const UserMessageRow = ({ row, onOpenArtifact }: UserMessageRowProps) => {
    const { theme } = useUnistyles();

    const attachmentIconSize = theme.space(3.5);
    const attachmentIconColor = theme.colors.textMuted;

    return (
        <VStack style={styles.container}>
            {row.attachments.length > 0 && (
                <HStack style={styles.attachments}>
                    {row.attachments.map((attachment) => {
                        const artifactId = attachment.artifact?.artifact_id ?? null;
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
                            <Pressable
                                key={attachment.id}
                                accessibilityRole="button"
                                onPress={() => onOpenArtifact?.(artifactId)}
                                style={({ pressed }) => [
                                    styles.attachmentChip,
                                    styles.attachmentChipInteractive,
                                    pressed && styles.attachmentChipPressed,
                                ]}
                            >
                                {chipContent}
                            </Pressable>
                        ) : (
                            <HStack key={attachment.id} style={styles.attachmentChip}>
                                {chipContent}
                            </HStack>
                        );
                    })}
                </HStack>
            )}
            {!!row.text.trim() && (
                <Box style={styles.bubble}>
                    <MarkdownContent text={row.text} tone="inverted" />
                </Box>
            )}
            <HStack style={styles.actionRow}>
                {!!row.timestampLabel && (
                    <Text numberOfLines={1} style={styles.timestamp}>
                        {row.timestampLabel}
                    </Text>
                )}
                <TimelineCopyButton value={row.text} />
            </HStack>
        </VStack>
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

const styles = StyleSheet.create((theme) => ({
    container: {
        width: '100%',
        alignItems: 'flex-end',
        paddingVertical: theme.space(3.5),
    },
    attachments: {
        maxWidth: '82%',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: theme.space(1.5),
        marginBottom: theme.space(2),
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
    bubble: {
        maxWidth: '82%',
        minWidth: 0,
        borderRadius: theme.radius['2xl'],
        backgroundColor: theme.colors.foreground,
        paddingHorizontal: theme.space(3.5),
        paddingTop: theme.space(2),
        paddingBottom: theme.space(3),
    },
    actionRow: {
        minHeight: theme.space(7.5),
        maxWidth: '82%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: theme.space(1.5),
        marginTop: theme.space(0.5),
    },
    timestamp: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
}));
