import { useThreadOpeningRoute } from '@/services/telemetry/thread-opening';
import { useCallback, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/js-stack';
import { Text, View } from 'react-native';

import ThreadScreen from '@/screens/thread';
import { useActiveThreadSnapshotQuery } from '@/hooks/use-active-thread-snapshot-query';
import { useThreadScreen } from '@/screens/thread/hooks';

const normalizeRouteParam = (value: string | string[] | undefined): string | null => {
    const raw = Array.isArray(value) ? value[0] : value;
    const normalized = raw?.trim();
    return normalized ? normalized : null;
};

const InvalidThreadRoute = () => {
    return (
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
            <Text>Invalid thread</Text>
        </View>
    );
};

export const ExistingThreadRoute = ({ backToInbox = false }: { backToInbox?: boolean }) => {
    const params = useLocalSearchParams<{
        threadId?: string | string[];
        parentThreadId?: string | string[];
        taskTitle?: string | string[];
    }>();
    const threadId = normalizeRouteParam(params.threadId);
    const openingAttempt = useThreadOpeningRoute(threadId);
    const [actionsOpen, setActionsOpen] = useState(false);
    const openActions = useCallback(() => setActionsOpen(true), []);
    const closeActions = useCallback(() => setActionsOpen(false), []);
    const openMembers = useCallback(() => {
        if (!threadId) return;
        router.push({
            pathname: backToInbox ? '/inbox/members/[threadId]' : '/thread/members/[threadId]',
            params: { threadId },
        });
    }, [threadId, backToInbox]);
    const { data: callThread } = useActiveThreadSnapshotQuery(threadId);
    const callWorkspace = callThread?.workspace_id;
    const callTitle = callThread?.thread?.name?.trim() || callThread?.thread?.preview.trim();
    const callable =
        callThread?.thread_id === threadId &&
        callThread?.thread != null &&
        callThread.thread.status !== 'Closed';
    const callTarget = useMemo(
        () =>
            callable && callWorkspace && threadId && !normalizeRouteParam(params.parentThreadId)
                ? {
                      workspace_id: callWorkspace,
                      thread_id: threadId,
                      title: callTitle ?? undefined,
                  }
                : null,
        [callable, callWorkspace, threadId, params.parentThreadId, callTitle],
    );
    const { options } = useThreadScreen({
        navigation: 'stack',
        backToInbox,
        threadId,
        callTarget,
        onActionsPress: threadId ? openActions : undefined,
    });

    return (
        <>
            <Stack.Screen options={options} />
            {threadId ? (
                <ThreadScreen
                    threadId={threadId}
                    openingAttempt={openingAttempt}
                    threadActionsOpen={actionsOpen}
                    onThreadActionsClose={closeActions}
                    onOpenMembers={openMembers}
                />
            ) : (
                <InvalidThreadRoute />
            )}
        </>
    );
};

export default ExistingThreadRoute;
