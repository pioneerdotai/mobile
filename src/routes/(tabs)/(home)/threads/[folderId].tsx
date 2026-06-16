import { useLocalSearchParams } from 'expo-router';

import ThreadFolderScreen from '@/screens/threads/folder';

const normalizeRouteParam = (value: string | string[] | undefined): string | null => {
    const raw = Array.isArray(value) ? value[0] : value;
    const normalized = raw?.trim();
    return normalized ? normalized : null;
};

const ThreadFolderRoute = () => {
    const params = useLocalSearchParams<{ folderId?: string | string[] }>();

    return <ThreadFolderScreen folderId={normalizeRouteParam(params.folderId)} />;
};

export default ThreadFolderRoute;
