import { useCallback, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import Stack from 'expo-router/js-stack';
import { Text, View } from 'react-native';

import ThreadScreen from '@/screens/thread';
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

const ExistingThreadRoute = () => {
    const params = useLocalSearchParams<{
        threadId?: string | string[];
        parentThreadId?: string | string[];
        taskTitle?: string | string[];
    }>();
    const threadId = normalizeRouteParam(params.threadId);
    const [actionsOpen, setActionsOpen] = useState(false);
    const openActions = useCallback(() => setActionsOpen(true), []);
    const closeActions = useCallback(() => setActionsOpen(false), []);
    const openMembers = useCallback(() => {
        if (!threadId) return;
        router.push({
            pathname: './members/[threadId]',
            params: { threadId },
        });
    }, [threadId]);
    const { options } = useThreadScreen({
        navigation: 'stack',
        threadId,
        onActionsPress: threadId ? openActions : undefined,
    });

    return (
        <>
            <Stack.Screen options={options} />
            {threadId ? (
                <ThreadScreen
                    threadId={threadId}
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
