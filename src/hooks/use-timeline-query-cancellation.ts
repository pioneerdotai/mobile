import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
    cancelTimelineQueriesExceptThread,
    cancelTimelineQueriesForThread,
    removeTimelineQueriesForThread,
} from '@/services/threads/timeline-query';

export const useTimelineQueryCancellation = (threadId: string | null, active: boolean) => {
    const queryClient = useQueryClient();
    const previousThreadIdRef = useRef<string | null>(null);

    useEffect(() => {
        const previousThreadId = previousThreadIdRef.current;

        if (previousThreadId && previousThreadId !== threadId) {
            void cancelTimelineQueriesForThread(queryClient, previousThreadId).finally(() => {
                removeTimelineQueriesForThread(queryClient, previousThreadId);
            });
        }

        previousThreadIdRef.current = threadId;

        if (!active) {
            if (threadId) {
                void cancelTimelineQueriesForThread(queryClient, threadId).finally(() => {
                    removeTimelineQueriesForThread(queryClient, threadId);
                });
            }
            return;
        }

        void cancelTimelineQueriesExceptThread(queryClient, threadId);

        return () => {
            if (threadId) {
                void cancelTimelineQueriesForThread(queryClient, threadId).finally(() => {
                    removeTimelineQueriesForThread(queryClient, threadId);
                });
            }
        };
    }, [active, queryClient, threadId]);
};
