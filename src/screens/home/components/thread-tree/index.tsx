import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { useShallow } from 'zustand/react/shallow';

import { HStack } from '@/components/primitives/hstack';
import { Box } from '@/components/primitives/box';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { ThreadTreeList } from '@/components/thread-tree/thread-tree-list';
import { CreateButton } from '@/components/buttons/create';
import type { Thread } from '@/client';
import { useEditor } from '@/hooks/use-editor';
import { useThreadTreeLevel } from '@/hooks/use-thread-tree';
import { useWorkspace } from '@/hooks/use-workspace';
import { useGatewayStore } from '@/stores/gateway';
import { Title } from '@/components/typography/title';

import { Workspace } from '../workspace';

const ThreadTree = () => {
    const { t } = useTranslation(['threads', 'gateway']);
    const router = useRouter();
    const { navigate } = useEditor();
    const { activeWorkspaceId, bootstrappedConnectionId } = useWorkspace();
    const { activeGatewayId, connectionId, connectionState, terminalReason } = useGatewayStore(
        useShallow((state) => {
            const activeGateway = (state.registry.remotes ?? []).find(
                (gateway) => gateway.id === state.registry.active_gateway_id,
            );
            return {
                activeGatewayId: activeGateway?.id ?? null,
                connectionId: state.connectionId,
                connectionState: state.connectionState,
                terminalReason: state.sessionTerminalReason,
            };
        }),
    );
    const hasActiveGateway = activeGatewayId !== null;
    const requiresAuthentication = hasActiveGateway && terminalReason !== null;
    const workspaceReady =
        connectionState === 'Connected' &&
        connectionId !== null &&
        bootstrappedConnectionId === connectionId &&
        activeWorkspaceId !== null;
    const canBrowseThreads = hasActiveGateway && !requiresAuthentication && workspaceReady;
    const showGatewayAction = !hasActiveGateway || requiresAuthentication;
    const { currentAgentsDocSummary, folders, threads, unreadByThreadId, loading, error } =
        useThreadTreeLevel(null);

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

    const openGatewayEditor = () => {
        if (activeGatewayId && terminalReason) {
            navigate({
                type: 'gateway__authenticate',
                payload: { gatewayId: activeGatewayId },
            });
            return;
        }
        navigate({ type: 'gateway__create' });
    };

    return (
        <Box style={styles.container}>
            <ThreadTreeList
                agentsDocLabel={t('agentsDoc')}
                contentContainerStyle={styles.contentContainer}
                emptyLabel={t('emptyLevelTitle')}
                error={canBrowseThreads ? error : null}
                errorLabel={t('loadFailed')}
                folders={canBrowseThreads ? folders : []}
                header={
                    canBrowseThreads ? (
                        <VStack style={styles.headerContent}>
                            <Workspace />
                            <HStack style={styles.header}>
                                <Title type="h2">{t('title')}</Title>
                            </HStack>
                        </VStack>
                    ) : null
                }
                hideEmptyState={!canBrowseThreads}
                loading={canBrowseThreads && loading}
                onAgentsDocPress={openAgentsDoc}
                onFolderPress={openFolder}
                onThreadPress={openThread}
                showAgentsDoc={canBrowseThreads && !!currentAgentsDocSummary}
                style={styles.list}
                threads={canBrowseThreads ? threads : []}
                unreadByThreadId={canBrowseThreads ? unreadByThreadId : {}}
                untitledLabel={t('untitled')}
            />
            {showGatewayAction ? (
                <Box pointerEvents="box-none" style={styles.gatewayCreateOverlay}>
                    <VStack style={styles.gatewayCreateContent}>
                        <VStack style={styles.gatewayCreateMessage}>
                            {terminalReason ? (
                                <Text style={styles.gatewayCreateTitle}>
                                    {t(`terminal.${terminalReason}.title`, { ns: 'gateway' })}
                                </Text>
                            ) : null}
                            <Text style={styles.gatewayCreateDescription}>
                                {terminalReason
                                    ? t(`terminal.${terminalReason}.description`, {
                                          ns: 'gateway',
                                      })
                                    : t('noGatewayDescription')}
                            </Text>
                        </VStack>
                        <CreateButton
                            accessibilityLabel={
                                terminalReason
                                    ? t('terminal.activateAction', { ns: 'gateway' })
                                    : t('noGatewayAction')
                            }
                            onPressHandler={openGatewayEditor}
                        />
                    </VStack>
                </Box>
            ) : null}
        </Box>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    list: {
        flex: 1,
    },
    gatewayCreateOverlay: {
        position: 'absolute',
        inset: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gatewayCreateContent: {
        alignItems: 'center',
        gap: theme.space(8),
        paddingHorizontal: theme.space(8),
    },
    gatewayCreateMessage: {
        alignItems: 'center',
        gap: theme.space(2),
    },
    gatewayCreateTitle: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.xl.fontSize,
        fontWeight: theme.fontWeight.bold.fontWeight,
        textAlign: 'center',
    },
    gatewayCreateDescription: {
        color: theme.colors.typography,
        opacity: 0.6,
        textAlign: 'center',
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
