import { useLocalSearchParams } from 'expo-router';
import Stack from 'expo-router/js-stack';

import ThreadScreen from '@/screens/thread';
import { useThreadScreen } from '@/screens/thread/hooks';

const normalizeRouteParam = (value: string | string[] | undefined): string | null => {
    const raw = Array.isArray(value) ? value[0] : value;
    const normalized = raw?.trim();
    return normalized ? normalized : null;
};

const ChildThreadRoute = () => {
    const { options } = useThreadScreen({ navigation: 'stack' });
    const params = useLocalSearchParams<{
        threadId?: string | string[];
        parentThreadId?: string | string[];
        taskTitle?: string | string[];
    }>();

    return (
        <>
            <Stack.Screen options={options} />
            <ThreadScreen
                threadId={normalizeRouteParam(params.threadId)}
                parentThreadId={normalizeRouteParam(params.parentThreadId)}
                taskTitle={normalizeRouteParam(params.taskTitle)}
            />
        </>
    );
};

export default ChildThreadRoute;
