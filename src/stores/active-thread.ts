import { create } from 'zustand';

import type {
    ClientActiveThreadSnapshot,
    ComposerAttachment,
    ComposerCapability,
    ThreadMode,
    TurnPermissionMode,
} from '@/client';
import { isCliRuntimeProvider } from '@/services/providers/cli-runtime';

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
    showComposerPermissionModeSwitcher: boolean;
    expandedKeys: string[];
    composerModeThreadId: string | null;
    composerSelectedMode: ThreadMode;
    composerModeManuallySelected: boolean;
    composerSelectedProvider: string | null;
    composerSelectedModel: string | null;
    composerSelectedReasoningEffort: string | null;
    composerSelectedPermissionMode: TurnPermissionMode;
    defaultComposerProvider: string | null;
    defaultComposerModel: string | null;
    defaultComposerReasoningEffort: string | null;
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
    setComposerPermissionModeSwitcherOpen: (open: boolean) => void;
    setComposerMode: (mode: ThreadMode) => void;
    syncComposerMode: (threadId: string | null, mode: ThreadMode) => void;
    clearComposerPayload: () => void;
    setExpandedKeys: (keys: string[]) => void;
    setComposerModelSelectionFromUser: (provider: string | null, model: string | null) => void;
    setComposerReasoningEffortFromUser: (effort: string | null) => void;
    setComposerPermissionMode: (mode: TurnPermissionMode) => void;
    beginDefaultComposerModelSelectionRefresh: (workspaceId: string) => void;
    completeDefaultComposerModelSelectionRefresh: (workspaceId: string) => void;
    resetDefaultComposerModelSelection: () => void;
    syncDefaultComposerModelSelection: (
        workspaceId: string,
        provider: string | null,
        model: string | null,
        reasoningEffort?: string | null,
    ) => void;
    syncComposerModelSelection: (
        provider: string | null,
        model: string | null,
        reasoningEffort?: string | null,
    ) => void;
    reset: (composerModeContext?: ComposerModeContext) => void;
};

type ComposerModeContext = {
    threadId: string | null;
    mode: ThreadMode;
};

const DEFAULT_COMPOSER_MODE: ThreadMode = 'Agent';
const DEFAULT_COMPOSER_PERMISSION_MODE: TurnPermissionMode = 'full_access';

const normalizeReasoningEffort = (effort: string | null | undefined): string | null => {
    const trimmed = effort?.trim();

    return trimmed ? trimmed : null;
};

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
    showComposerPermissionModeSwitcher: false,
    expandedKeys: [],
    composerModeThreadId: null,
    composerSelectedMode: DEFAULT_COMPOSER_MODE,
    composerModeManuallySelected: false,
    composerSelectedProvider: null,
    composerSelectedModel: null,
    composerSelectedReasoningEffort: null,
    composerSelectedPermissionMode: DEFAULT_COMPOSER_PERMISSION_MODE,
    defaultComposerProvider: null,
    defaultComposerModel: null,
    defaultComposerReasoningEffort: null,
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

    setComposerPermissionModeSwitcherOpen: (showComposerPermissionModeSwitcher) => {
        set({ showComposerPermissionModeSwitcher });
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
        set((state) => {
            const modelSelectionChanged =
                state.composerSelectedProvider !== composerSelectedProvider ||
                state.composerSelectedModel !== composerSelectedModel;

            return {
                composerSelectedProvider,
                composerSelectedModel,
                composerSelectedReasoningEffort: modelSelectionChanged
                    ? null
                    : state.composerSelectedReasoningEffort,
                composerModelManuallySelected: true,
                composerError: null,
                ...(isCliRuntimeProvider(composerSelectedProvider)
                    ? {
                          composerCapabilities: [],
                      }
                    : {}),
            };
        });
    },

    setComposerReasoningEffortFromUser: (composerSelectedReasoningEffort) => {
        set({ composerSelectedReasoningEffort });
    },

    setComposerPermissionMode: (composerSelectedPermissionMode) => {
        set({
            composerSelectedPermissionMode,
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
                          composerSelectedReasoningEffort: null,
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
            composerSelectedReasoningEffort: null,
            composerSelectedPermissionMode: DEFAULT_COMPOSER_PERMISSION_MODE,
            defaultComposerProvider: null,
            defaultComposerModel: null,
            defaultComposerReasoningEffort: null,
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
        defaultComposerReasoningEffort,
    ) => {
        set((state) => {
            const normalizedReasoningEffort = normalizeReasoningEffort(
                defaultComposerReasoningEffort,
            );

            return {
                defaultComposerWorkspaceId,
                defaultComposerProvider,
                defaultComposerModel,
                defaultComposerReasoningEffort: normalizedReasoningEffort,
                defaultComposerSelectionLoading: false,
                ...(state.composerModelManuallySelected
                    ? {}
                    : {
                          composerSelectedProvider: defaultComposerProvider,
                          composerSelectedModel: defaultComposerModel,
                          composerSelectedReasoningEffort: normalizedReasoningEffort,
                          ...(isCliRuntimeProvider(defaultComposerProvider)
                              ? {
                                    composerCapabilities: [],
                                }
                              : {}),
                      }),
            };
        });
    },

    syncComposerModelSelection: (
        composerSelectedProvider,
        composerSelectedModel,
        composerSelectedReasoningEffort,
    ) => {
        set((state) => {
            if (state.composerModelManuallySelected) {
                return state;
            }

            return {
                composerSelectedProvider,
                composerSelectedModel,
                composerSelectedReasoningEffort: normalizeReasoningEffort(
                    composerSelectedReasoningEffort,
                ),
                ...(isCliRuntimeProvider(composerSelectedProvider)
                    ? {
                          composerCapabilities: [],
                      }
                    : {}),
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
            showComposerPermissionModeSwitcher: false,
            expandedKeys: [],
            composerModeThreadId: composerModeContext?.threadId ?? null,
            composerSelectedMode: composerModeContext?.mode ?? DEFAULT_COMPOSER_MODE,
            composerModeManuallySelected: false,
            composerSelectedProvider: state.defaultComposerProvider,
            composerSelectedModel: state.defaultComposerModel,
            composerSelectedReasoningEffort: state.defaultComposerReasoningEffort,
            composerSelectedPermissionMode: DEFAULT_COMPOSER_PERMISSION_MODE,
            composerModelManuallySelected: false,
        }));
    },
}));
