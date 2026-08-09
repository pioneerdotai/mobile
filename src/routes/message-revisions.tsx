import { useLocalSearchParams } from 'expo-router';
import Stack from 'expo-router/js-stack';

import MessageRevisionsScreen from '@/screens/message-revisions';
import { useThreadScreen } from '@/screens/thread/hooks';

const normalizeRouteParam = (value: string | string[] | undefined): string | null => {
    const raw = Array.isArray(value) ? value[0] : value;
    const normalized = raw?.trim();
    return normalized ? normalized : null;
};

const MessageRevisionsRoute = () => {
    const params = useLocalSearchParams<{
        threadId?: string | string[];
        turnId?: string | string[];
    }>();
    const threadId = normalizeRouteParam(params.threadId);
    const turnId = normalizeRouteParam(params.turnId);
    const { options } = useThreadScreen({
        navigation: 'modal',
        threadId,
        showScopeAction: false,
    });

    return (
        <>
            <Stack.Screen options={options} />
            {threadId && turnId ? (
                <MessageRevisionsScreen
                    key={`${threadId}:${turnId}`}
                    threadId={threadId}
                    turnId={turnId}
                />
            ) : null}
        </>
    );
};

export default MessageRevisionsRoute;
