import { create } from 'zustand';

import type {
    ClientActiveThreadSnapshot,
    ComposerAttachment,
    ComposerCapability,
    ThreadMode,
    TurnPermissionMode,
} from '@/client';
import {
    filterComposerCapabilitiesForTarget,
    isCliRuntimeProvider,
    type ComposerCapabilityTarget,
} from '@/services/providers/cli-runtime';

type ActiveThreadStoreState = {
    snapshot: ClientActiveThreadSnapshot | null;
    loading: boolean;
    error: string | null;
    sending: boolean;
    activeComposerThreadId: string | null;
    composerDrafts: Record<string, ComposerDraftState>;
    composerText: string;
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
    composerCapabilityTarget: ComposerCapabilityTarget;
    composerSelectedModel: string | null;
    composerSelectedReasoningEffort: string | null;
    composerSelectedPermissionMode: TurnPermissionMode;
    defaultComposerProvider: string | null;
    defaultComposerCapabilityTarget: ComposerCapabilityTarget;
    defaultComposerModel: string | null;
    defaultComposerReasoningEffort: string | null;
    defaultComposerWorkspaceId: string | null;
    defaultComposerSelectionLoading: boolean;
    composerModelManuallySelected: boolean;
    activateComposerThread: (threadId: string) => void;
    setSnapshot: (snapshot: ClientActiveThreadSnapshot) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setSending: (sending: boolean) => void;
    setComposerText: (text: string) => void;
    setComposerError: (error: string | null) => void;
    setComposerAttachments: (attachments: ComposerAttachment[]) => void;
    setComposerCapabilities: (capabilities: ComposerCapability[]) => void;
    setComposerAttachmentMenuOpen: (open: boolean) => void;
    setComposerModeSwitcherOpen: (open: boolean) => void;
    setComposerPermissionModeSwitcherOpen: (open: boolean) => void;
    setComposerMode: (mode: ThreadMode) => void;
    clearComposerPayload: () => void;
    setExpandedKeys: (keys: string[]) => void;
    setComposerModelSelectionFromUser: (
        provider: string | null,
        model: string | null,
        capabilityTarget?: ComposerCapabilityTarget,
        capabilitiesRemovedMessage?: string,
    ) => void;
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
        capabilityTarget?: ComposerCapabilityTarget,
    ) => void;
    syncComposerModelSelection: (
        provider: string | null,
        model: string | null,
        reasoningEffort?: string | null,
        capabilityTarget?: ComposerCapabilityTarget,
        capabilitiesRemovedMessage?: string,
    ) => void;
    reset: (composerModeContext?: ComposerModeContext) => void;
};

type ComposerModeContext = {
    threadId: string | null;
    mode: ThreadMode;
};

type ComposerDraftState = {
    text: string;
    attachments: ComposerAttachment[];
    capabilities: ComposerCapability[];
    selectedMode: ThreadMode;
    modeManuallySelected: boolean;
    selectedProvider: string | null;
    capabilityTarget: ComposerCapabilityTarget;
    selectedModel: string | null;
    selectedReasoningEffort: string | null;
    selectedPermissionMode: TurnPermissionMode;
    modelManuallySelected: boolean;
};

const DEFAULT_COMPOSER_MODE: ThreadMode = 'Agent';
const DEFAULT_COMPOSER_PERMISSION_MODE: TurnPermissionMode = 'full_access';

const normalizeReasoningEffort = (effort: string | null | undefined): string | null => {
    const trimmed = effort?.trim();

    return trimmed ? trimmed : null;
};

const draftFromState = (state: ActiveThreadStoreState): ComposerDraftState => ({
    text: state.composerText,
    attachments: state.composerAttachments,
    capabilities: state.composerCapabilities,
    selectedMode: state.composerSelectedMode,
    modeManuallySelected: state.composerModeManuallySelected,
    selectedProvider: state.composerSelectedProvider,
    capabilityTarget: state.composerCapabilityTarget,
    selectedModel: state.composerSelectedModel,
    selectedReasoningEffort: state.composerSelectedReasoningEffort,
    selectedPermissionMode: state.composerSelectedPermissionMode,
    modelManuallySelected: state.composerModelManuallySelected,
});

const defaultDraftForThread = (state: ActiveThreadStoreState): ComposerDraftState => ({
    text: '',
    attachments: [],
    capabilities: [],
    selectedMode: state.composerSelectedMode,
    modeManuallySelected: false,
    selectedProvider: state.defaultComposerProvider,
    capabilityTarget: state.defaultComposerCapabilityTarget,
    selectedModel: state.defaultComposerModel,
    selectedReasoningEffort: state.defaultComposerReasoningEffort,
    selectedPermissionMode: DEFAULT_COMPOSER_PERMISSION_MODE,
    modelManuallySelected: false,
});

const persistActiveDraft = (
    state: ActiveThreadStoreState,
    nextDrafts: Record<string, ComposerDraftState> = state.composerDrafts,
): Record<string, ComposerDraftState> => {
    if (!state.activeComposerThreadId) {
        return nextDrafts;
    }

    return {
        ...nextDrafts,
        [state.activeComposerThreadId]: draftFromState(state),
    };
};

const capabilityTargetForSelection = (
    state: ActiveThreadStoreState,
    provider: string | null,
    requestedTarget?: ComposerCapabilityTarget,
): ComposerCapabilityTarget => {
    if (requestedTarget) {
        return requestedTarget;
    }
    if (provider === state.composerSelectedProvider) {
        return state.composerCapabilityTarget;
    }
    return isCliRuntimeProvider(provider) ? 'unsupportedCli' : 'native';
};

const updateActiveDraft = (
    state: ActiveThreadStoreState,
    patch: Partial<ComposerDraftState>,
): Partial<ActiveThreadStoreState> => {
    if (!state.activeComposerThreadId) {
        return {};
    }

    return {
        composerDrafts: {
            ...state.composerDrafts,
            [state.activeComposerThreadId]: {
                ...(state.composerDrafts[state.activeComposerThreadId] ??
                    defaultDraftForThread(state)),
                ...patch,
            },
        },
    };
};

export const useActiveThreadStore = create<ActiveThreadStoreState>((set) => ({
    snapshot: null,
    loading: false,
    error: null,
    sending: false,
    activeComposerThreadId: null,
    composerDrafts: {},
    composerText: '',
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
    composerCapabilityTarget: 'native',
    composerSelectedModel: null,
    composerSelectedReasoningEffort: null,
    composerSelectedPermissionMode: DEFAULT_COMPOSER_PERMISSION_MODE,
    defaultComposerProvider: null,
    defaultComposerCapabilityTarget: 'native',
    defaultComposerModel: null,
    defaultComposerReasoningEffort: null,
    defaultComposerWorkspaceId: null,
    defaultComposerSelectionLoading: true,
    composerModelManuallySelected: false,

    activateComposerThread: (threadId) => {
        set((state) => {
            const persistedDrafts = persistActiveDraft(state);
            const draft = persistedDrafts[threadId] ?? defaultDraftForThread(state);

            return {
                activeComposerThreadId: threadId,
                composerDrafts: {
                    ...persistedDrafts,
                    [threadId]: draft,
                },
                composerText: draft.text,
                composerAttachments: draft.attachments,
                composerCapabilities: draft.capabilities,
                composerModeThreadId: threadId,
                composerSelectedMode: draft.selectedMode,
                composerModeManuallySelected: draft.modeManuallySelected,
                composerSelectedProvider: draft.selectedProvider,
                composerCapabilityTarget: draft.capabilityTarget,
                composerSelectedModel: draft.selectedModel,
                composerSelectedReasoningEffort: draft.selectedReasoningEffort,
                composerSelectedPermissionMode: draft.selectedPermissionMode,
                composerModelManuallySelected: draft.modelManuallySelected,
                composerError: null,
            };
        });
    },

    setSnapshot: (snapshot) => {
        set({
            snapshot,
            error: null,
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

    setComposerText: (composerText) => {
        set((state) => ({
            composerText,
            ...updateActiveDraft(state, { text: composerText }),
        }));
    },

    setComposerError: (composerError) => {
        set({ composerError });
    },

    setComposerAttachments: (composerAttachments) => {
        set((state) => ({
            composerAttachments,
            composerError: null,
            ...updateActiveDraft(state, { attachments: composerAttachments }),
        }));
    },

    setComposerCapabilities: (composerCapabilities) => {
        set((state) => ({
            composerCapabilities,
            composerError: null,
            ...updateActiveDraft(state, { capabilities: composerCapabilities }),
        }));
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
        set((state) => ({
            composerSelectedMode,
            composerModeManuallySelected: true,
            ...updateActiveDraft(state, {
                selectedMode: composerSelectedMode,
                modeManuallySelected: true,
            }),
        }));
    },

    clearComposerPayload: () => {
        set((state) => ({
            composerText: '',
            composerAttachments: [],
            composerCapabilities: [],
            composerError: null,
            ...updateActiveDraft(state, {
                text: '',
                attachments: [],
                capabilities: [],
            }),
        }));
    },

    setExpandedKeys: (expandedKeys) => {
        set({ expandedKeys });
    },

    setComposerModelSelectionFromUser: (
        composerSelectedProvider,
        composerSelectedModel,
        requestedCapabilityTarget,
        capabilitiesRemovedMessage,
    ) => {
        set((state) => {
            const modelSelectionChanged =
                state.composerSelectedProvider !== composerSelectedProvider ||
                state.composerSelectedModel !== composerSelectedModel;

            const capabilityTarget = capabilityTargetForSelection(
                state,
                composerSelectedProvider,
                requestedCapabilityTarget,
            );
            const composerCapabilities = filterComposerCapabilitiesForTarget(
                state.composerCapabilities,
                capabilityTarget,
            );
            const capabilitiesRemoved =
                composerCapabilities.length !== state.composerCapabilities.length;

            return {
                composerSelectedProvider,
                composerCapabilityTarget: capabilityTarget,
                composerSelectedModel,
                composerSelectedReasoningEffort: modelSelectionChanged
                    ? null
                    : state.composerSelectedReasoningEffort,
                composerModelManuallySelected: true,
                composerError:
                    capabilitiesRemoved && capabilitiesRemovedMessage
                        ? capabilitiesRemovedMessage
                        : null,
                composerCapabilities,
                ...updateActiveDraft(state, {
                    selectedProvider: composerSelectedProvider,
                    capabilityTarget,
                    selectedModel: composerSelectedModel,
                    selectedReasoningEffort: modelSelectionChanged
                        ? null
                        : state.composerSelectedReasoningEffort,
                    modelManuallySelected: true,
                    capabilities: composerCapabilities,
                }),
            };
        });
    },

    setComposerReasoningEffortFromUser: (composerSelectedReasoningEffort) => {
        set((state) => ({
            composerSelectedReasoningEffort,
            composerModelManuallySelected: true,
            ...updateActiveDraft(state, {
                selectedReasoningEffort: composerSelectedReasoningEffort,
                modelManuallySelected: true,
            }),
        }));
    },

    setComposerPermissionMode: (composerSelectedPermissionMode) => {
        set((state) => ({
            composerSelectedPermissionMode,
            composerError: null,
            ...updateActiveDraft(state, {
                selectedPermissionMode: composerSelectedPermissionMode,
            }),
        }));
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
                          composerCapabilityTarget: 'native',
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
            composerCapabilityTarget: 'native',
            composerSelectedModel: null,
            composerSelectedReasoningEffort: null,
            composerSelectedPermissionMode: DEFAULT_COMPOSER_PERMISSION_MODE,
            defaultComposerProvider: null,
            defaultComposerCapabilityTarget: 'native',
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
        requestedCapabilityTarget,
    ) => {
        set((state) => {
            const normalizedReasoningEffort = normalizeReasoningEffort(
                defaultComposerReasoningEffort,
            );
            const defaultComposerCapabilityTarget =
                requestedCapabilityTarget ??
                (isCliRuntimeProvider(defaultComposerProvider) ? 'unsupportedCli' : 'native');

            return {
                defaultComposerWorkspaceId,
                defaultComposerProvider,
                defaultComposerCapabilityTarget,
                defaultComposerModel,
                defaultComposerReasoningEffort: normalizedReasoningEffort,
                defaultComposerSelectionLoading: false,
                ...(state.composerModelManuallySelected
                    ? {}
                    : {
                          composerSelectedProvider: defaultComposerProvider,
                          composerCapabilityTarget: defaultComposerCapabilityTarget,
                          composerSelectedModel: defaultComposerModel,
                          composerSelectedReasoningEffort: normalizedReasoningEffort,
                          ...updateActiveDraft(state, {
                              selectedProvider: defaultComposerProvider,
                              capabilityTarget: defaultComposerCapabilityTarget,
                              selectedModel: defaultComposerModel,
                              selectedReasoningEffort: normalizedReasoningEffort,
                              capabilities: filterComposerCapabilitiesForTarget(
                                  state.composerCapabilities,
                                  defaultComposerCapabilityTarget,
                              ),
                          }),
                          composerCapabilities: filterComposerCapabilitiesForTarget(
                              state.composerCapabilities,
                              defaultComposerCapabilityTarget,
                          ),
                      }),
            };
        });
    },

    syncComposerModelSelection: (
        composerSelectedProvider,
        composerSelectedModel,
        composerSelectedReasoningEffort,
        requestedCapabilityTarget,
        capabilitiesRemovedMessage,
    ) => {
        set((state) => {
            if (state.composerModelManuallySelected) {
                if (
                    requestedCapabilityTarget === undefined ||
                    state.composerSelectedProvider !== composerSelectedProvider
                ) {
                    return state;
                }
                const composerCapabilities = filterComposerCapabilitiesForTarget(
                    state.composerCapabilities,
                    requestedCapabilityTarget,
                );
                const capabilitiesRemoved =
                    composerCapabilities.length !== state.composerCapabilities.length;

                return {
                    composerCapabilityTarget: requestedCapabilityTarget,
                    composerCapabilities,
                    composerError:
                        capabilitiesRemoved && capabilitiesRemovedMessage
                            ? capabilitiesRemovedMessage
                            : state.composerError,
                    ...updateActiveDraft(state, {
                        capabilityTarget: requestedCapabilityTarget,
                        capabilities: composerCapabilities,
                    }),
                };
            }

            const capabilityTarget = capabilityTargetForSelection(
                state,
                composerSelectedProvider,
                requestedCapabilityTarget,
            );
            const composerCapabilities = filterComposerCapabilitiesForTarget(
                state.composerCapabilities,
                capabilityTarget,
            );

            return {
                composerSelectedProvider,
                composerCapabilityTarget: capabilityTarget,
                composerSelectedModel,
                composerSelectedReasoningEffort: normalizeReasoningEffort(
                    composerSelectedReasoningEffort,
                ),
                ...updateActiveDraft(state, {
                    selectedProvider: composerSelectedProvider,
                    capabilityTarget,
                    selectedModel: composerSelectedModel,
                    selectedReasoningEffort: normalizeReasoningEffort(
                        composerSelectedReasoningEffort,
                    ),
                    capabilities: composerCapabilities,
                }),
                composerCapabilities,
            };
        });
    },

    reset: (composerModeContext) => {
        set((state) => ({
            snapshot: null,
            loading: false,
            error: null,
            sending: false,
            activeComposerThreadId: composerModeContext?.threadId ?? null,
            composerDrafts: {},
            composerText: '',
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
            composerCapabilityTarget: state.defaultComposerCapabilityTarget,
            composerSelectedModel: state.defaultComposerModel,
            composerSelectedReasoningEffort: state.defaultComposerReasoningEffort,
            composerSelectedPermissionMode: DEFAULT_COMPOSER_PERMISSION_MODE,
            composerModelManuallySelected: false,
        }));
    },
}));
