import { create } from 'zustand';

import type {
    ClientActiveThreadSnapshot,
    ComposerAttachment,
    ComposerCapability,
    ThreadMode,
} from '@/client';

type ActiveThreadStoreState = {
    snapshot: ClientActiveThreadSnapshot | null;
    loading: boolean;
    error: string | null;
    sending: boolean;
    composerError: string | null;
    composerAttachments: ComposerAttachment[];
    composerCapabilities: ComposerCapability[];
    showComposerAttachmentMenu: boolean;
    showComposerModeSwitcher: boolean;
    expandedKeys: string[];
    composerModeThreadId: string | null;
    composerSelectedMode: ThreadMode;
    composerModeManuallySelected: boolean;
    composerSelectedProvider: string | null;
    composerSelectedModel: string | null;
    defaultComposerProvider: string | null;
    defaultComposerModel: string | null;
    defaultComposerWorkspaceId: string | null;
    defaultComposerSelectionLoading: boolean;
    composerModelManuallySelected: boolean;
    setSnapshot: (snapshot: ClientActiveThreadSnapshot) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setSending: (sending: boolean) => void;
    setComposerError: (error: string | null) => void;
    setComposerAttachments: (attachments: ComposerAttachment[]) => void;
    setComposerCapabilities: (capabilities: ComposerCapability[]) => void;
    setComposerAttachmentMenuOpen: (open: boolean) => void;
    setComposerModeSwitcherOpen: (open: boolean) => void;
    setComposerMode: (mode: ThreadMode) => void;
    syncComposerMode: (threadId: string | null, mode: ThreadMode) => void;
    clearComposerPayload: () => void;
    setExpandedKeys: (keys: string[]) => void;
    setComposerModelSelectionFromUser: (provider: string | null, model: string | null) => void;
    beginDefaultComposerModelSelectionRefresh: (workspaceId: string) => void;
    completeDefaultComposerModelSelectionRefresh: (workspaceId: string) => void;
    resetDefaultComposerModelSelection: () => void;
    syncDefaultComposerModelSelection: (
        workspaceId: string,
        provider: string | null,
        model: string | null,
    ) => void;
    syncComposerModelSelection: (provider: string | null, model: string | null) => void;
    reset: (composerModeContext?: ComposerModeContext) => void;
};

type ComposerModeContext = {
    threadId: string | null;
    mode: ThreadMode;
};

const DEFAULT_COMPOSER_MODE: ThreadMode = 'Agent';

export const useActiveThreadStore = create<ActiveThreadStoreState>((set) => ({
    snapshot: null,
    loading: false,
    error: null,
    sending: false,
    composerError: null,
    composerAttachments: [],
    composerCapabilities: [],
    showComposerAttachmentMenu: false,
    showComposerModeSwitcher: false,
    expandedKeys: [],
    composerModeThreadId: null,
    composerSelectedMode: DEFAULT_COMPOSER_MODE,
    composerModeManuallySelected: false,
    composerSelectedProvider: null,
    composerSelectedModel: null,
    defaultComposerProvider: null,
    defaultComposerModel: null,
    defaultComposerWorkspaceId: null,
    defaultComposerSelectionLoading: true,
    composerModelManuallySelected: false,

    setSnapshot: (snapshot) => {
        set((state) => {
            const thread = snapshot.thread;
            const nextState: Partial<ActiveThreadStoreState> = {
                snapshot,
                error: null,
            };

            if (
                thread &&
                !(state.composerModeThreadId === thread.id && state.composerModeManuallySelected)
            ) {
                nextState.composerModeThreadId = thread.id;
                nextState.composerSelectedMode = thread.mode;
                nextState.composerModeManuallySelected = false;
            }

            return nextState;
        });
    },

    setLoading: (loading) => {
        set({ loading });
    },

    setError: (error) => {
        set({ error });
    },

    setSending: (sending) => {
        set({ sending });
    },

    setComposerError: (composerError) => {
        set({ composerError });
    },

    setComposerAttachments: (composerAttachments) => {
        set({ composerAttachments, composerError: null });
    },

    setComposerCapabilities: (composerCapabilities) => {
        set({ composerCapabilities, composerError: null });
    },

    setComposerAttachmentMenuOpen: (showComposerAttachmentMenu) => {
        set({ showComposerAttachmentMenu });
    },

    setComposerModeSwitcherOpen: (showComposerModeSwitcher) => {
        set({ showComposerModeSwitcher });
    },

    setComposerMode: (composerSelectedMode) => {
        set({
            composerSelectedMode,
            composerModeManuallySelected: true,
        });
    },

    syncComposerMode: (threadId, mode) => {
        set((state) => {
            if (state.composerModeThreadId === threadId && state.composerModeManuallySelected) {
                return state;
            }

            if (
                state.composerModeThreadId === threadId &&
                state.composerSelectedMode === mode &&
                !state.composerModeManuallySelected
            ) {
                return state;
            }

            return {
                composerModeThreadId: threadId,
                composerSelectedMode: mode,
                composerModeManuallySelected: false,
            };
        });
    },

    clearComposerPayload: () => {
        set({
            composerAttachments: [],
            composerCapabilities: [],
            composerError: null,
        });
    },

    setExpandedKeys: (expandedKeys) => {
        set({ expandedKeys });
    },

    setComposerModelSelectionFromUser: (composerSelectedProvider, composerSelectedModel) => {
        set({
            composerSelectedProvider,
            composerSelectedModel,
            composerModelManuallySelected: true,
            composerError: null,
        });
    },

    beginDefaultComposerModelSelectionRefresh: (workspaceId) => {
        set((state) => {
            const workspaceChanged = state.defaultComposerWorkspaceId !== workspaceId;

            return {
                defaultComposerWorkspaceId: workspaceId,
                defaultComposerSelectionLoading: true,
                ...(workspaceChanged && !state.composerModelManuallySelected
                    ? {
                          composerSelectedProvider: null,
                          composerSelectedModel: null,
                      }
                    : {}),
            };
        });
    },

    completeDefaultComposerModelSelectionRefresh: (workspaceId) => {
        set((state) => {
            if (state.defaultComposerWorkspaceId !== workspaceId) {
                return state;
            }

            return {
                defaultComposerSelectionLoading: false,
            };
        });
    },

    resetDefaultComposerModelSelection: () => {
        set({
            composerSelectedProvider: null,
            composerSelectedModel: null,
            defaultComposerProvider: null,
            defaultComposerModel: null,
            defaultComposerWorkspaceId: null,
            defaultComposerSelectionLoading: true,
            composerModelManuallySelected: false,
            composerError: null,
        });
    },

    syncDefaultComposerModelSelection: (
        defaultComposerWorkspaceId,
        defaultComposerProvider,
        defaultComposerModel,
    ) => {
        set((state) => ({
            defaultComposerWorkspaceId,
            defaultComposerProvider,
            defaultComposerModel,
            defaultComposerSelectionLoading: false,
            ...(state.composerModelManuallySelected
                ? {}
                : {
                      composerSelectedProvider: defaultComposerProvider,
                      composerSelectedModel: defaultComposerModel,
                  }),
        }));
    },

    syncComposerModelSelection: (composerSelectedProvider, composerSelectedModel) => {
        set((state) => {
            if (state.composerModelManuallySelected) {
                return state;
            }

            return {
                composerSelectedProvider,
                composerSelectedModel,
            };
        });
    },

    reset: (composerModeContext) => {
        set((state) => ({
            snapshot: null,
            loading: false,
            error: null,
            sending: false,
            composerError: null,
            composerAttachments: [],
            composerCapabilities: [],
            showComposerAttachmentMenu: false,
            showComposerModeSwitcher: false,
            expandedKeys: [],
            composerModeThreadId: composerModeContext?.threadId ?? null,
            composerSelectedMode: composerModeContext?.mode ?? DEFAULT_COMPOSER_MODE,
            composerModeManuallySelected: false,
            composerSelectedProvider: state.defaultComposerProvider,
            composerSelectedModel: state.defaultComposerModel,
            composerModelManuallySelected: false,
        }));
    },
}));
