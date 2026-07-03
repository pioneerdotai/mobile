import { useLocalSearchParams } from 'expo-router';
import Stack from 'expo-router/js-stack';
import { Text, View } from 'react-native';

import ThreadScreen from '@/screens/thread';
import { useThreadScreen } from '@/screens/thread/hooks';
import { useHideAppSplashWhen } from '@/services/app-splash';

const normalizeRouteParam = (value: string | string[] | undefined): string | null => {
    const raw = Array.isArray(value) ? value[0] : value;
    const normalized = raw?.trim();
    return normalized ? normalized : null;
};

const InvalidThreadRoute = () => {
    useHideAppSplashWhen(true);

    return (
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
            <Text>Invalid thread</Text>
        </View>
    );
};

const ExistingThreadRoute = () => {
    const { options } = useThreadScreen({ navigation: 'stack' });
    const params = useLocalSearchParams<{
        threadId?: string | string[];
        parentThreadId?: string | string[];
        taskTitle?: string | string[];
    }>();
    const threadId = normalizeRouteParam(params.threadId);

    return (
        <>
            <Stack.Screen options={options} />
            {threadId ? (
                <ThreadScreen
                    threadId={threadId}
                    parentThreadId={normalizeRouteParam(params.parentThreadId)}
                />
            ) : (
                <InvalidThreadRoute />
            )}
        </>
    );
};

export default ExistingThreadRoute;
