import { useLocalSearchParams } from 'expo-router';

import ThreadScreen from '@/screens/thread';

const normalizeRouteParam = (value: string | string[] | undefined): string | null => {
    const raw = Array.isArray(value) ? value[0] : value;
    const normalized = raw?.trim();
    return normalized ? normalized : null;
};

const ExistingThreadRoute = () => {
    const params = useLocalSearchParams<{
        threadId?: string | string[];
        parentThreadId?: string | string[];
        taskTitle?: string | string[];
    }>();
    return (
        <ThreadScreen
            threadId={normalizeRouteParam(params.threadId)}
            parentThreadId={normalizeRouteParam(params.parentThreadId)}
            taskTitle={normalizeRouteParam(params.taskTitle)}
        />
    );
};

export default ExistingThreadRoute;
