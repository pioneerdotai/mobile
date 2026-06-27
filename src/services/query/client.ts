import { QueryClient } from '@tanstack/react-query';

import { installTimelineQueryDefaults } from '@/services/threads/timeline-query';

export const pioneerQueryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 1_000,
            gcTime: 5 * 60 * 1_000,
        },
        mutations: {
            retry: false,
        },
    },
});

installTimelineQueryDefaults(pioneerQueryClient);
