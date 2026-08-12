import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { ThreadTreeList } from '@/components/thread-tree/thread-tree-list';
import { Title } from '@/components/typography/title';
import type { Thread } from '@/client';
import { useAdministrationCapabilities } from '@/hooks/use-administration-capabilities';
import { useThreadTreeLevel } from '@/hooks/use-thread-tree';

type ThreadTreeLevelScreenProps = {
    folderId: string | null;
};

const ThreadFolderScreen = ({ folderId }: ThreadTreeLevelScreenProps) => {
    const { t } = useTranslation('threads');
    const router = useRouter();
    const capabilities = useAdministrationCapabilities();
    const canManageWorkspace = capabilities.data?.can_manage_workspace ?? false;
    const {
        currentFolder,
        currentAgentsDocSummary,
        folders,
        threads,
        unreadByThreadId,
        loading,
        error,
    } = useThreadTreeLevel(folderId);

    const title = currentFolder?.name.trim() || t('title');
    const agentsDocWorkspaceId = currentAgentsDocSummary?.workspace_id ?? null;
    const agentsDocFolderId = currentAgentsDocSummary?.folder_id ?? null;

    const openFolder = (nextFolderId: string) => {
        router.push({
            pathname: '/threads/[folderId]',
            params: { folderId: nextFolderId },
        });
    };

    const openThread = (thread: Thread) => {
        router.push({
            pathname: '/thread/[threadId]',
            params: { threadId: thread.id },
        });
    };

    const openAgentsDoc = () => {
        if (!agentsDocWorkspaceId) {
            return;
        }

        router.push({
            pathname: '/agents-doc',
            params: {
                workspaceId: agentsDocWorkspaceId,
                folderId: agentsDocFolderId ?? '',
            },
        });
    };

    return (
        <ThreadTreeList
            agentsDocLabel={t('agentsDoc')}
            contentContainerStyle={styles.contentContainer}
            emptyLabel={t('emptyLevelTitle')}
            error={error}
            errorLabel={t('loadFailed')}
            folders={folders}
            header={
                <VStack style={styles.titleContainer}>
                    <Title type="h2">{title}</Title>
                    <Text style={styles.subtitle}>{t('title')}</Text>
                </VStack>
            }
            loading={loading}
            onAgentsDocPress={canManageWorkspace ? openAgentsDoc : undefined}
            onFolderPress={openFolder}
            onThreadPress={openThread}
            showAgentsDoc={canManageWorkspace && !!currentAgentsDocSummary}
            style={styles.container}
            threads={threads}
            unreadByThreadId={unreadByThreadId}
            untitledLabel={t('untitled')}
        />
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    contentContainer: {
        flexGrow: 1,
        paddingTop: theme.screenContentPadding('root').paddingTop,
        paddingHorizontal: theme.space(4),
        paddingBottom: rt.insets.bottom + theme.space(20),
    },
    titleContainer: {
        gap: theme.space(2),
        marginBottom: theme.space(5),
    },
    subtitle: {
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.fontSize,
        color: theme.colors.typography,
        opacity: 0.6,
    },
}));

export default ThreadFolderScreen;
