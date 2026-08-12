import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Stack from 'expo-router/js-stack';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native-unistyles';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { pioneerClient, type Thread } from '@/client';
import { useAuthorizationCapabilitySnapshot } from '@/hooks/use-administration-capabilities';
import ThreadScreen from '@/screens/thread';
import { useThreadScreen } from '@/screens/thread/hooks';
import { openOrCreateNewThread } from '@/services/threads/active';
import { cacheActiveThreadSnapshot } from '@/services/threads/timeline-query';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';
import { useWorkspaceStore } from '@/stores/workspace';

type DraftRouteState = {
    connectionId: number;
    workspaceId: string;
    threadId: string;
    thread: Thread | null;
};

type NewThreadDraftRouteProps = {
    activeWorkspaceId: string | null;
    capabilitySnapshot: ReturnType<typeof useAuthorizationCapabilitySnapshot>;
};

const NewThreadDraftRoute = ({
    activeWorkspaceId,
    capabilitySnapshot,
}: NewThreadDraftRouteProps) => {
    const { t } = useTranslation('threads');
    const queryClient = useQueryClient();
    const connectionId = useGatewayStore((state) => state.connectionId);
    const connectionState = useGatewayStore((state) => state.connectionState);
    const workspaceError = useWorkspaceStore((state) => state.error);
    const [draft, setDraft] = useState<DraftRouteState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const sequenceRef = useRef(0);
    const draftReady = Boolean(
        draft && draft.connectionId === connectionId && draft.workspaceId === activeWorkspaceId,
    );
    const [actionsOpen, setActionsOpen] = useState(false);
    const openActions = useCallback(() => setActionsOpen(true), []);
    const closeActions = useCallback(() => setActionsOpen(false), []);
    const openMembers = useCallback(() => {
        if (!draftReady || !draft?.threadId) return;
        router.push({
            pathname: './members/[threadId]',
            params: { threadId: draft.threadId },
        });
    }, [draft, draftReady]);
    const { options } = useThreadScreen({
        threadId: draft?.threadId ?? null,
        onActionsPress: draftReady ? openActions : undefined,
    });
    const visibilityPlan = useMemo(() => {
        const capabilities = capabilitySnapshot.data?.workspace?.capabilities;
        if (!capabilities) return null;
        try {
            return pioneerClient.threadCreateVisibilityPlan({
                capabilities,
                origin_kind: 'collaborative',
            });
        } catch {
            return null;
        }
    }, [capabilitySnapshot.data]);
    const visibilityPlanUnavailable = Boolean(
        (capabilitySnapshot.isError && !capabilitySnapshot.data) ||
        (capabilitySnapshot.data && (!visibilityPlan || visibilityPlan.options.length === 0)),
    );
    const routeError =
        error ??
        (workspaceError || visibilityPlanUnavailable ? t('createThreadFailed') : null) ??
        (connectionState === 'Disconnected' ? t('disconnected') : null);
    const selectedVisibility = visibilityPlan?.default_visibility ?? 'private';

    useEffect(() => {
        if (
            draftReady ||
            !visibilityPlan ||
            connectionState !== 'Connected' ||
            connectionId === null ||
            !activeWorkspaceId ||
            !selectedVisibility
        ) {
            return;
        }

        let cancelled = false;
        const sequence = sequenceRef.current + 1;
        sequenceRef.current = sequence;

        void openOrCreateNewThread({
            workspace_id: activeWorkspaceId,
            visibility: selectedVisibility,
            expanded_keys: useActiveThreadStore.getState().expandedKeys,
        })
            .then((snapshot) => {
                if (
                    cancelled ||
                    sequenceRef.current !== sequence ||
                    useGatewayStore.getState().connectionId !== connectionId ||
                    useWorkspaceStore.getState().activeWorkspaceId !== activeWorkspaceId
                ) {
                    return;
                }

                if (!snapshot.thread_id) {
                    throw new Error('draft thread id is required');
                }

                cacheActiveThreadSnapshot(queryClient, snapshot);
                setError(null);
                setDraft({
                    connectionId,
                    workspaceId: activeWorkspaceId,
                    threadId: snapshot.thread_id,
                    thread: snapshot.thread ?? null,
                });
            })
            .catch(() => {
                if (cancelled || sequenceRef.current !== sequence) {
                    return;
                }

                setDraft(null);
                setError(t('createThreadFailed'));
            });

        return () => {
            cancelled = true;
            if (sequenceRef.current === sequence) {
                sequenceRef.current += 1;
            }
        };
    }, [
        activeWorkspaceId,
        connectionId,
        connectionState,
        draftReady,
        queryClient,
        selectedVisibility,
        t,
        visibilityPlan,
    ]);

    let content;
    if (routeError) {
        content = (
            <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 }}>
                <Text accessibilityRole="alert">{routeError}</Text>
            </View>
        );
    } else if (capabilitySnapshot.isPending || !visibilityPlan) {
        content = <View style={styles.pendingDraft} />;
    } else if (!draft || !draftReady) {
        content = <View style={styles.pendingDraft} />;
    } else {
        content = (
            <ThreadScreen
                threadId={draft.threadId}
                initialThread={draft.thread}
                threadActionsOpen={actionsOpen}
                onThreadActionsClose={closeActions}
                onOpenMembers={openMembers}
            />
        );
    }

    return (
        <>
            <Stack.Screen options={options} />
            {content}
        </>
    );
};

const NewThreadRoute = () => {
    const capabilitySnapshot = useAuthorizationCapabilitySnapshot();
    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const contextKey = [
        capabilitySnapshot.data?.principal_id ?? '',
        capabilitySnapshot.data?.role_key ?? '',
        activeWorkspaceId ?? '',
    ].join(':');

    return (
        <NewThreadDraftRoute
            key={contextKey}
            activeWorkspaceId={activeWorkspaceId}
            capabilitySnapshot={capabilitySnapshot}
        />
    );
};

const styles = StyleSheet.create((theme) => ({
    pendingDraft: {
        flex: 1,
        backgroundColor: theme.colors.muted,
    },
}));

export default NewThreadRoute;
