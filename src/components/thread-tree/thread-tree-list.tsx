import { useCallback, useMemo } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { ReactElement } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { Thread, ThreadFolder } from '@/client';
import Spinner from '@/components/feedback/spinner';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import {
    ThreadTreeAgentsDocRow,
    ThreadTreeFolderRow,
    ThreadTreeThreadRow,
} from '@/components/thread-tree/thread-tree-row';

type ThreadTreeListRow =
    | {
          id: string;
          type: 'agentsDoc';
      }
    | {
          id: string;
          type: 'folder';
          folder: ThreadFolder;
      }
    | {
          id: string;
          type: 'thread';
          thread: Thread;
      };

type ThreadTreeListProps = {
    agentsDocLabel: string;
    contentContainerStyle?: StyleProp<ViewStyle>;
    emptyLabel: string;
    error?: unknown;
    errorLabel: string;
    folders: ThreadFolder[];
    header?: ReactElement | null;
    loading: boolean;
    onAgentsDocPress?: () => void;
    onFolderPress: (folderId: string) => void;
    onThreadPress?: (thread: Thread) => void;
    showAgentsDoc: boolean;
    style?: ViewStyle;
    threads: Thread[];
    untitledLabel: string;
};

const keyExtractor = (item: ThreadTreeListRow) => item.id;

const getItemType = (item: ThreadTreeListRow) => item.type;

const ThreadTreeListState = ({
    emptyLabel,
    error,
    errorLabel,
    loading,
}: Pick<ThreadTreeListProps, 'emptyLabel' | 'error' | 'errorLabel' | 'loading'>) => {
    const { theme } = useUnistyles();

    return (
        <VStack style={styles.stateContainer}>
            {loading ? <Spinner size={theme.space(5)} color={theme.colors.typography} /> : null}
            {!loading && error ? <Text style={styles.error}>{errorLabel}</Text> : null}
            {!loading && !error ? <Text style={styles.emptyTitle}>{emptyLabel}</Text> : null}
        </VStack>
    );
};

const ThreadTreeList = ({
    agentsDocLabel,
    contentContainerStyle,
    emptyLabel,
    error,
    errorLabel,
    folders,
    header,
    loading,
    onAgentsDocPress,
    onFolderPress,
    onThreadPress,
    showAgentsDoc,
    style,
    threads,
    untitledLabel,
}: ThreadTreeListProps) => {
    const { theme, rt } = useUnistyles();
    const rows = useMemo<ThreadTreeListRow[]>(() => {
        const nextRows: ThreadTreeListRow[] = [];

        if (showAgentsDoc) {
            nextRows.push({
                id: 'agents-doc',
                type: 'agentsDoc',
            });
        }

        nextRows.push(
            ...folders.map((folder) => ({
                id: `folder:${folder.id}`,
                type: 'folder' as const,
                folder,
            })),
            ...threads.map((thread) => ({
                id: `thread:${thread.id}`,
                type: 'thread' as const,
                thread,
            })),
        );

        return nextRows;
    }, [folders, showAgentsDoc, threads]);

    const renderItem = useCallback<ListRenderItem<ThreadTreeListRow>>(
        ({ item }) => {
            if (item.type === 'agentsDoc') {
                return <ThreadTreeAgentsDocRow label={agentsDocLabel} onPress={onAgentsDocPress} />;
            }

            if (item.type === 'folder') {
                return (
                    <ThreadTreeFolderRow
                        folder={item.folder}
                        onPress={() => onFolderPress(item.folder.id)}
                    />
                );
            }

            return (
                <ThreadTreeThreadRow
                    thread={item.thread}
                    untitledLabel={untitledLabel}
                    onPress={onThreadPress ? () => onThreadPress(item.thread) : undefined}
                />
            );
        },
        [agentsDocLabel, onAgentsDocPress, onFolderPress, onThreadPress, untitledLabel],
    );

    return (
        <FlashList
            alwaysBounceVertical={false}
            contentContainerStyle={contentContainerStyle}
            data={rows}
            getItemType={getItemType}
            keyExtractor={keyExtractor}
            extraData={rt.themeName}
            ListEmptyComponent={
                <ThreadTreeListState
                    emptyLabel={emptyLabel}
                    error={error}
                    errorLabel={errorLabel}
                    loading={loading}
                />
            }
            ListHeaderComponent={header}
            maintainVisibleContentPosition={{
                disabled: true,
            }}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            style={{ ...style, backgroundColor: theme.colors.background }}
        />
    );
};

const styles = StyleSheet.create((theme) => ({
    stateContainer: {
        alignItems: 'center',
        flex: 1,
        gap: theme.space(1),
        justifyContent: 'center',
        minHeight: theme.space(40),
        paddingHorizontal: theme.space(4),
    },
    emptyTitle: {
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.fontSize,
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.semibold.fontWeight,
        textAlign: 'center',
    },
    error: {
        ...theme.fontSize.sm,
        color: theme.colors.dangerText,
        fontWeight: theme.fontWeight.medium.fontWeight,
        textAlign: 'center',
    },
}));

export { ThreadTreeList };
