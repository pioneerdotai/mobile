import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useShallow } from 'zustand/react/shallow';
import { GalleryVerticalEnd } from 'lucide-react-native';

import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { Pressable } from '@/components/primitives/pressable';
import { useGateway } from '@/hooks/use-gateway';
import { useWorkspace } from '@/hooks/use-workspace';
import type { WorkspaceOperationErrorCode } from '@/services/workspace/management';
import { useWorkspaceStore } from '@/stores/workspace';

const workspaceErrorTranslationKeys: Record<WorkspaceOperationErrorCode, string> = {
    gatewayNotFound: 'errors.gatewayNotFound',
    gatewayNotConnected: 'errors.gatewayNotConnected',
    bootstrapFailed: 'errors.bootstrapFailed',
    selectFailed: 'errors.selectFailed',
    createFailed: 'errors.createFailed',
    renameFailed: 'errors.renameFailed',
    emptyName: 'errors.emptyName',
    busy: 'errors.busy',
    unknownTarget: 'errors.unknownTarget',
};

const workspaceDisplayName = (name: string) => {
    return name.trim();
};

const Workspace = () => {
    const { t } = useTranslation('workspace');
    const { theme, rt } = useUnistyles();
    const { connectionState } = useGateway();
    const { workspaces, activeWorkspaceId, loading, error: storeError } = useWorkspace();
    const { setWorkspaceSwitcherOpen } = useWorkspaceStore(
        useShallow((state) => ({
            setWorkspaceSwitcherOpen: state.setWorkspaceSwitcherOpen,
        })),
    );

    const activeWorkspaces = useMemo(
        () => workspaces.filter((workspace) => workspace.is_active),
        [workspaces],
    );

    const activeWorkspace = useMemo(
        () =>
            activeWorkspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
            activeWorkspaces[0] ??
            null,
        [activeWorkspaceId, activeWorkspaces],
    );

    const connected = connectionState === 'Connected';
    const empty = connected && !loading && !activeWorkspace;
    const initialLoading = connected && loading && !activeWorkspace;

    const workspaceErrorMessage = useCallback(
        (code: WorkspaceOperationErrorCode) => {
            return t(workspaceErrorTranslationKeys[code]);
        },
        [t],
    );

    const handleWorkspaceSwitcherOpen = useCallback(
        () => setWorkspaceSwitcherOpen(true),
        [setWorkspaceSwitcherOpen],
    );

    const errorMessage = storeError ? workspaceErrorMessage(storeError) : null;

    const activeWorkspaceName = activeWorkspace
        ? workspaceDisplayName(activeWorkspace.name) || t('untitled')
        : null;

    return (
        <VStack style={styles.content}>
            {!connected ? (
                <>
                    <Text style={styles.emptyTitle}>{t('gatewayOfflineTitle')}</Text>
                    <Text style={styles.emptyDescription}>{t('gatewayOfflineDescription')}</Text>
                </>
            ) : null}

            {initialLoading ? <Text style={styles.emptyTitle}>{t('loading')}</Text> : null}

            {empty ? (
                <>
                    <Text style={styles.emptyTitle}>{t('emptyTitle')}</Text>
                    <Text style={styles.emptyDescription}>{t('emptyDescription')}</Text>
                </>
            ) : null}

            {connected && activeWorkspace ? (
                <Pressable
                    disabled={loading}
                    onPress={handleWorkspaceSwitcherOpen}
                    accessibilityRole="button"
                    accessibilityLabel={t('selectAction')}
                >
                    <HStack style={styles.workspaceContainer}>
                        <Box style={styles.workspaceIconContainer}>
                            <GalleryVerticalEnd
                                size={theme.space(5)}
                                color={
                                    rt.themeName === 'dark'
                                        ? theme.colors.white
                                        : theme.colors.typography
                                }
                            />
                        </Box>
                        <VStack style={styles.workspaceNameContainer}>
                            <Text style={styles.workspaceName}>{activeWorkspaceName}</Text>
                            <Text style={styles.workspaceId}>{t('title')}</Text>
                        </VStack>
                    </HStack>
                </Pressable>
            ) : null}

            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        </VStack>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    content: {
        gap: theme.space(2),
        backgroundColor: theme.colors.foreground,
        borderRadius: theme.radius['3xl'],
        textAlign: 'center',
        padding: theme.space(3),
        overflow: 'hidden',
    },
    title: {
        fontSize: theme.fontSize['2xl'].fontSize,
        lineHeight: theme.fontSize['2xl'].fontSize,
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
    subtitle: {
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.fontSize,
        color: theme.colors.typography,
        opacity: 0.6,
    },
    workspaceContainer: {
        gap: theme.space(2),
        alignItems: 'center',
    },
    workspaceIconContainer: {
        height: theme.space(10),
        width: theme.space(10),
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius['2xl'],
        justifyContent: 'center',
        alignItems: 'center',
    },
    workspaceNameContainer: {
        paddingTop: theme.space(0.5),
        gap: theme.space(1),
    },
    workspaceName: {
        flexShrink: 1,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.fontSize,
        color: rt.themeName === 'dark' ? theme.colors.neutral[950] : theme.colors.white,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    workspaceId: {
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.fontSize,
        color: rt.themeName === 'dark' ? theme.colors.neutral[950] : theme.colors.white,
        opacity: 0.6,
    },
    emptyTitle: {
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.fontSize,
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.semibold.fontWeight,
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.fontSize,
        color: theme.colors.typography,
        opacity: 0.6,
        textAlign: 'center',
    },
    error: {
        ...theme.fontSize.sm,
        color: theme.colors.dangerText,
        fontWeight: theme.fontWeight.medium.fontWeight,
        textAlign: 'center',
    },
}));

export { Workspace };
