import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Stack from 'expo-router/js-stack';
import { StyleSheet } from 'react-native-unistyles';
import { useQueryClient } from '@tanstack/react-query';

import type { Thread } from '@/client';
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

const NewThreadRoute = () => {
    const queryClient = useQueryClient();
    const connectionId = useGatewayStore((state) => state.connectionId);
    const connectionState = useGatewayStore((state) => state.connectionState);
    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const workspaceError = useWorkspaceStore((state) => state.error);
    const [draft, setDraft] = useState<DraftRouteState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { options } = useThreadScreen({ threadId: draft?.threadId ?? null });
    const sequenceRef = useRef(0);
    const routeError =
        error ??
        (workspaceError ? `Failed to load workspace: ${workspaceError}` : null) ??
        (connectionState === 'Disconnected' ? 'Gateway disconnected' : null);
    const draftReady = Boolean(
        draft && draft.connectionId === connectionId && draft.workspaceId === activeWorkspaceId,
    );

    useEffect(() => {
        if (connectionState !== 'Connected' || connectionId === null || !activeWorkspaceId) {
            return;
        }

        const sequence = sequenceRef.current + 1;
        sequenceRef.current = sequence;

        void openOrCreateNewThread({
            workspace_id: activeWorkspaceId,
            expanded_keys: useActiveThreadStore.getState().expandedKeys,
        })
            .then((snapshot) => {
                if (
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
            .catch((caught) => {
                if (sequenceRef.current !== sequence) {
                    return;
                }

                setDraft(null);
                setError(caught instanceof Error ? caught.message : 'Failed to open draft thread');
            });
    }, [activeWorkspaceId, connectionId, connectionState, queryClient]);

    let content;
    if (routeError) {
        content = (
            <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 }}>
                <Text>{routeError}</Text>
            </View>
        );
    } else if (!draft || !draftReady) {
        content = <View style={styles.pendingDraft} />;
    } else {
        content = <ThreadScreen threadId={draft.threadId} initialThread={draft.thread} />;
    }

    return (
        <>
            <Stack.Screen options={options} />
            {content}
        </>
    );
};

const styles = StyleSheet.create((theme) => ({
    pendingDraft: {
        flex: 1,
        backgroundColor: theme.colors.muted,
    },
}));

export default NewThreadRoute;
