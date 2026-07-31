import { useCallback } from 'react';

import { pioneerQueryClient } from '@/services/query/client';
import { clearActiveThread } from '@/services/threads/active';
import { clearThreadQueryCache } from '@/services/threads/timeline-query';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useThreadTreeStore } from '@/stores/thread-tree';

export const useActiveThreadCleanup = () => {
    return useCallback(async (): Promise<void> => {
        try {
            await clearActiveThread();
        } catch {
            // Desktop treats thread/unsubscribe as best-effort during context cleanup.
        } finally {
            await clearThreadQueryCache(pioneerQueryClient);
            useActiveThreadStore.getState().reset();
            useActiveThreadStore.getState().resetDefaultComposerModelSelection();
            useThreadTreeStore.getState().reset();
        }
    }, []);
};
