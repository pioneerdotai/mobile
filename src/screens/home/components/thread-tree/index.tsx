import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';

import { HStack } from '@/components/primitives/hstack';
import { VStack } from '@/components/primitives/vstack';
import { ThreadTreeList } from '@/components/thread-tree/thread-tree-list';
import type { Thread } from '@/client';
import { useGateway } from '@/hooks/use-gateway';
import { useThreadTreeLevel } from '@/hooks/use-thread-tree';
import { useWorkspace } from '@/hooks/use-workspace';
import { useHideAppSplashWhen } from '@/services/app-splash';
import { Title } from '@/components/typography/title';

import { Workspace } from '../workspace';

const ThreadTree = () => {
    const { t } = useTranslation('threads');
    const router = useRouter();
    const { connectionState } = useGateway();
    const { activeWorkspaceId } = useWorkspace();
    const { currentAgentsDocSummary, folders, threads, loading, error, workspaceId } =
        useThreadTreeLevel(null);
    const ready = connectionState === 'Connected' && !!activeWorkspaceId;
    const treeReady =
        ready && activeWorkspaceId !== null && (workspaceId === activeWorkspaceId || !!error);
    const initialScreenReady = treeReady || connectionState === 'Disconnected';

    useHideAppSplashWhen(initialScreenReady);

    const openFolder = (folderId: string) => {
        router.push({
            pathname: '/threads/[folderId]',
            params: { folderId },
        });
    };

    const openThread = (thread: Thread) => {
        router.push({
            pathname: '/thread/[threadId]',
            params: { threadId: thread.id },
        });
    };

    const openAgentsDoc = () => {
        if (!activeWorkspaceId) {
            return;
        }

        router.push({
            pathname: '/agents-doc',
            params: {
                workspaceId: activeWorkspaceId,
            },
        });
    };

    if (!ready) {
        return null;
    }

    return (
        <ThreadTreeList
            agentsDocLabel={t('agentsDoc')}
            contentContainerStyle={styles.contentContainer}
            emptyLabel={t('emptyLevelTitle')}
            error={error}
            errorLabel={t('loadFailed')}
            folders={folders}
            header={
                <VStack style={styles.headerContent}>
                    <Workspace />
                    <HStack style={styles.header}>
                        <Title type="h2">{t('title')}</Title>
                    </HStack>
                </VStack>
            }
            loading={loading}
            onAgentsDocPress={openAgentsDoc}
            onFolderPress={openFolder}
            onThreadPress={openThread}
            showAgentsDoc={!!currentAgentsDocSummary}
            style={styles.container}
            threads={threads}
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
    headerContent: {
        gap: theme.space(5),
        marginBottom: theme.space(2),
    },
    header: {
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: theme.space(5),
    },
}));

export { ThreadTree };
