import { ChevronRight, FileText, Folder } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

import type { Thread, ThreadFolder } from '@/client';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { threadTitle } from '@/services/threads/tree';

type ThreadTreeFolderRowProps = {
    folder: ThreadFolder;
    onPress?: () => void;
};

type ThreadTreeAgentsDocRowProps = {
    label: string;
    onPress?: () => void;
};

type ThreadTreeThreadRowProps = {
    thread: Thread;
    untitledLabel: string;
    unreadCount?: number;
    onPress?: () => void;
};

const ThreadTreeFolderRow = ({ folder, onPress }: ThreadTreeFolderRowProps) => {
    const { theme } = useUnistyles();

    const content = (
        <>
            <Box style={styles.leadingIconContainer}>
                <Folder size={theme.space(4)} color={theme.colors.typography} />
            </Box>
            <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.itemTitle, styles.folderTitle]}
            >
                {folder.name}
            </Text>
            {onPress ? (
                <ChevronRight size={theme.space(5.5)} color={theme.colors.typography} />
            ) : null}
        </>
    );

    if (onPress) {
        return (
            <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
                {content}
            </Pressable>
        );
    }

    return <HStack style={styles.row}>{content}</HStack>;
};

const ThreadTreeAgentsDocRow = ({ label, onPress }: ThreadTreeAgentsDocRowProps) => {
    const { theme } = useUnistyles();

    const content = (
        <>
            <Box style={styles.leadingIconContainer}>
                <FileText size={theme.space(4)} color={theme.colors.typography} />
            </Box>
            <VStack style={styles.textContainer}>
                <HStack style={styles.titleLine}>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.itemTitle}>
                        {label}
                    </Text>
                </HStack>
            </VStack>
        </>
    );

    if (onPress) {
        return (
            <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
                {content}
            </Pressable>
        );
    }

    return <HStack style={styles.row}>{content}</HStack>;
};

const ThreadTreeThreadRow = ({
    thread,
    untitledLabel,
    unreadCount = 0,
    onPress,
}: ThreadTreeThreadRowProps) => {
    const { t } = useTranslation('threads');
    const visibleUnreadCount = Math.max(0, Math.trunc(unreadCount));
    const content = (
        <HStack style={styles.row}>
            <VStack style={styles.textContainer}>
                <HStack style={styles.titleLine}>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.itemTitle}>
                        {threadTitle(thread, untitledLabel)}
                    </Text>
                    {visibleUnreadCount > 0 ? (
                        <Box
                            accessible
                            accessibilityLabel={t('threadUnreadCount', {
                                count: visibleUnreadCount,
                            })}
                            style={styles.unreadBadge}
                        >
                            <Text style={styles.unreadBadgeText}>{visibleUnreadCount}</Text>
                        </Box>
                    ) : null}
                </HStack>
            </VStack>
        </HStack>
    );

    if (onPress) {
        return (
            <Pressable accessibilityRole="button" onPress={onPress}>
                {content}
            </Pressable>
        );
    }

    return content;
};

const styles = StyleSheet.create((theme, rt) => ({
    row: {
        height: theme.space(12),
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space(2),
    },
    leadingIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeLeadingIconContainer: {
        backgroundColor: rt.themeName === 'dark' ? theme.colors.lime[950] : theme.colors.lime[100],
    },
    textContainer: {
        flex: 1,
        minWidth: 0,
        gap: theme.space(1),
    },
    titleLine: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        gap: theme.space(2),
    },
    itemTitle: {
        flex: 1,
        minWidth: 0,
        fontSize: theme.fontSize.default.fontSize,
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.default.fontWeight,
    },
    folderTitle: {
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
    unreadBadge: {
        minWidth: theme.space(6),
        height: theme.space(6),
        paddingHorizontal: theme.space(1.25),
        borderRadius: theme.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.muted,
    },
    unreadBadgeText: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
        opacity: 0.6,
    },
    meta: {
        flexShrink: 0,
        maxWidth: theme.space(28),
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.fontSize,
        color: theme.colors.typography,
        opacity: 0.55,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    preview: {
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.fontSize,
        color: theme.colors.typography,
        opacity: 0.6,
    },
}));

export { ThreadTreeAgentsDocRow, ThreadTreeFolderRow, ThreadTreeThreadRow };
