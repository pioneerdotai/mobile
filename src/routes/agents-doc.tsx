import { router, useLocalSearchParams } from 'expo-router';
import Stack from 'expo-router/js-stack';
import { useRef, useState } from 'react';

import AgentsDocScreen from '@/screens/agents-doc';
import type { AgentsDocScreenHandle } from '@/screens/agents-doc';
import { useAgentsDocScreen } from '@/screens/agents-doc/hooks';
import type { AgentsDocHeaderState } from '@/screens/agents-doc/hooks';

const normalizeRouteParam = (value: string | string[] | undefined): string | null => {
    const raw = Array.isArray(value) ? value[0] : value;
    const normalized = raw?.trim();
    return normalized ? normalized : null;
};

const AgentsDocRoute = () => {
    const screenRef = useRef<AgentsDocScreenHandle>(null);
    const [saveStatus, setSaveStatus] = useState<AgentsDocHeaderState | null>(null);
    const params = useLocalSearchParams<{
        workspaceId?: string | string[];
        folderId?: string | string[];
    }>();
    const workspaceId = normalizeRouteParam(params.workspaceId);

    const close = () => {
        if (screenRef.current) {
            screenRef.current.close();
            return;
        }

        if (router.canGoBack()) router.back();
        else router.navigate('/');
    };

    const { options } = useAgentsDocScreen({
        onClose: close,
        saveStatus,
    });

    if (!workspaceId) {
        return null;
    }

    return (
        <>
            <Stack.Screen options={options} />
            <AgentsDocScreen
                ref={screenRef}
                workspaceId={workspaceId}
                folderId={normalizeRouteParam(params.folderId)}
                onSaveStatusChange={setSaveStatus}
            />
        </>
    );
};

export default AgentsDocRoute;
