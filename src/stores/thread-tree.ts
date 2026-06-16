import { create } from 'zustand';

import type { ClientThreadTreeSnapshot } from '@/client';

type ThreadTreeStoreState = {
    snapshot: ClientThreadTreeSnapshot | null;
    workspaceId: string | null;
    loading: boolean;
    error: string | null;
    setSnapshot: (snapshot: ClientThreadTreeSnapshot) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    reset: () => void;
};

export const useThreadTreeStore = create<ThreadTreeStoreState>((set) => ({
    snapshot: null,
    workspaceId: null,
    loading: false,
    error: null,

    setSnapshot: (snapshot) => {
        set({
            snapshot,
            workspaceId: snapshot.workspace_id,
            error: null,
        });
    },

    setLoading: (loading) => {
        set({ loading });
    },

    setError: (error) => {
        set({ error });
    },

    reset: () => {
        set({
            snapshot: null,
            workspaceId: null,
            loading: false,
            error: null,
        });
    },
}));
