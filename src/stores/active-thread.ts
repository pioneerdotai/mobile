import { create } from 'zustand';

import type {
    ClientActiveThreadSnapshot,
    ComposerAttachment,
    ComposerCapability,
    ComposerDomainAction,
    ComposerDomainDraft,
    ComposerDomainState,
    ComposerDraftLifecycleState,
    ComposerSkillSelection,
    PreparedVoiceComposerSnapshot,
    ThreadMode,
    TurnPermissionMode,
} from '@/client';
import { pioneerClient } from '@/client';
import {
    NATIVE_COMPOSER_CAPABILITY_POLICY,
    UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
    isCliRuntimeProvider,
    type ComposerCapabilityPolicy,
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
    composerSkillSelections: ComposerSkillSelection[];
    showComposerAttachmentMenu: boolean;
    showComposerModeSwitcher: boolean;
    showComposerPermissionModeSwitcher: boolean;
    expandedKeys: string[];
    composerModeThreadId: string | null;
    composerSelectedMode: ThreadMode;
    composerModeManuallySelected: boolean;
    composerSelectedProvider: string | null;
    composerCapabilityTarget: ComposerCapabilityPolicy;
    composerSelectedModel: string | null;
    composerSelectedReasoningEffort: string | null;
    composerSelectedPermissionMode: TurnPermissionMode;
    defaultComposerProvider: string | null;
    defaultComposerCapabilityTarget: ComposerCapabilityPolicy;
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
    addComposerAttachment: (attachment: ComposerAttachment) => void;
    removeComposerAttachmentAt: (index: number) => void;
    markComposerAttachmentsUploading: () => ComposerAttachment[];
    markComposerAttachmentsFailed: (error: string) => ComposerAttachment[];
    applyUploadedComposerAttachments: (
        artifacts: PreparedVoiceComposerSnapshot['uploaded_attachment_artifacts'],
    ) => ComposerAttachment[];
    setComposerCapabilities: (capabilities: ComposerCapability[]) => void;
    setComposerSkillSelections: (selections: ComposerSkillSelection[]) => void;
    addComposerCapability: (capability: ComposerCapability) => void;
    removeComposerCapability: (id: string) => void;
    setComposerAttachmentMenuOpen: (open: boolean) => void;
    setComposerModeSwitcherOpen: (open: boolean) => void;
    setComposerPermissionModeSwitcherOpen: (open: boolean) => void;
    setComposerMode: (mode: ThreadMode) => void;
    clearComposerPayload: () => void;
    setExpandedKeys: (keys: string[]) => void;
    setComposerModelSelectionFromUser: (
        provider: string | null,
        model: string | null,
        capabilityTarget?: ComposerCapabilityPolicy,
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
        capabilityTarget?: ComposerCapabilityPolicy,
    ) => void;
    syncComposerModelSelection: (
        provider: string | null,
        model: string | null,
        reasoningEffort?: string | null,
        capabilityTarget?: ComposerCapabilityPolicy,
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
    skillSelections: ComposerSkillSelection[];
    selectedMode: ThreadMode;
    modeManuallySelected: boolean;
    selectedProvider: string | null;
    capabilityTarget: ComposerCapabilityPolicy;
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

const modelSelection = (
    provider: string | null,
    model: string | null,
    reasoningEffort?: string | null,
) => {
    const normalizedProvider = provider?.trim();
    const normalizedModel = model?.trim();

    if (!normalizedProvider || !normalizedModel) {
        return null;
    }

    return {
        provider: normalizedProvider,
        model: normalizedModel,
        selected_reasoning_effort: normalizeReasoningEffort(reasoningEffort),
    };
};

const composerDomainStateFromStore = (state: ActiveThreadStoreState): ComposerDomainState => ({
    attachments: state.composerAttachments,
    capabilities: state.composerCapabilities,
    skill_selections: state.composerSkillSelections,
    selected_mode: state.composerSelectedMode,
    mode_manually_selected: state.composerModeManuallySelected,
    selected_provider: state.composerSelectedProvider,
    capability_target: state.composerCapabilityTarget,
    selected_model: state.composerSelectedModel,
    selected_reasoning_effort: state.composerSelectedReasoningEffort,
    selected_permission_mode: state.composerSelectedPermissionMode,
    model_manually_selected: state.composerModelManuallySelected,
});

const composerDomainStateFromDraft = (draft: ComposerDraftState): ComposerDomainState => ({
    attachments: draft.attachments,
    capabilities: draft.capabilities,
    skill_selections: draft.skillSelections,
    selected_mode: draft.selectedMode,
    mode_manually_selected: draft.modeManuallySelected,
    selected_provider: draft.selectedProvider,
    capability_target: draft.capabilityTarget,
    selected_model: draft.selectedModel,
    selected_reasoning_effort: draft.selectedReasoningEffort,
    selected_permission_mode: draft.selectedPermissionMode,
    model_manually_selected: draft.modelManuallySelected,
});

const composerDomainPatch = (
    domain: ComposerDomainState,
): Pick<
    ActiveThreadStoreState,
    | 'composerAttachments'
    | 'composerCapabilities'
    | 'composerSkillSelections'
    | 'composerSelectedMode'
    | 'composerModeManuallySelected'
    | 'composerSelectedProvider'
    | 'composerCapabilityTarget'
    | 'composerSelectedModel'
    | 'composerSelectedReasoningEffort'
    | 'composerSelectedPermissionMode'
    | 'composerModelManuallySelected'
> => ({
    composerAttachments: domain.attachments ?? [],
    composerCapabilities: domain.capabilities ?? [],
    composerSkillSelections: domain.skill_selections ?? [],
    composerSelectedMode: domain.selected_mode ?? DEFAULT_COMPOSER_MODE,
    composerModeManuallySelected: domain.mode_manually_selected ?? false,
    composerSelectedProvider: domain.selected_provider ?? null,
    composerCapabilityTarget: domain.capability_target,
    composerSelectedModel: domain.selected_model ?? null,
    composerSelectedReasoningEffort: domain.selected_reasoning_effort ?? null,
    composerSelectedPermissionMode:
        domain.selected_permission_mode ?? DEFAULT_COMPOSER_PERMISSION_MODE,
    composerModelManuallySelected: domain.model_manually_selected ?? false,
});

const composerDraftDomainPatch = (
    domain: ComposerDomainState,
): Omit<ComposerDraftState, 'text'> => ({
    attachments: domain.attachments ?? [],
    capabilities: domain.capabilities ?? [],
    skillSelections: domain.skill_selections ?? [],
    selectedMode: domain.selected_mode ?? DEFAULT_COMPOSER_MODE,
    modeManuallySelected: domain.mode_manually_selected ?? false,
    selectedProvider: domain.selected_provider ?? null,
    capabilityTarget: domain.capability_target,
    selectedModel: domain.selected_model ?? null,
    selectedReasoningEffort: domain.selected_reasoning_effort ?? null,
    selectedPermissionMode: domain.selected_permission_mode ?? DEFAULT_COMPOSER_PERMISSION_MODE,
    modelManuallySelected: domain.model_manually_selected ?? false,
});

const composerDomainDraftFromDraft = (draft: ComposerDraftState): ComposerDomainDraft => ({
    text: draft.text,
    domain: composerDomainStateFromDraft(draft),
});

const composerDraftFromDomainDraft = (draft: ComposerDomainDraft): ComposerDraftState => ({
    text: draft.text ?? '',
    ...composerDraftDomainPatch(draft.domain),
});

const composerDraftLifecycleState = (
    drafts: Record<string, ComposerDraftState>,
): ComposerDraftLifecycleState => ({
    drafts: Object.fromEntries(
        Object.entries(drafts).map(([threadId, draft]) => [
            threadId,
            composerDomainDraftFromDraft(draft),
        ]),
    ),
});

const composerDraftsFromLifecycleState = (
    lifecycle: ComposerDraftLifecycleState,
): Record<string, ComposerDraftState> =>
    Object.fromEntries(
        Object.entries(lifecycle.drafts ?? {}).map(([threadId, draft]) => [
            threadId,
            composerDraftFromDomainDraft(draft),
        ]),
    );

const reduceComposerDomain = (
    state: ActiveThreadStoreState,
    action: ComposerDomainAction,
): ComposerDomainState =>
    pioneerClient.composerDomainTransition({
        state: composerDomainStateFromStore(state),
        action,
    }).state;

const draftFromState = (state: ActiveThreadStoreState): ComposerDraftState => ({
    text: state.composerText,
    attachments: state.composerAttachments,
    capabilities: state.composerCapabilities,
    skillSelections: state.composerSkillSelections,
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
    skillSelections: [],
    selectedMode: state.composerSelectedMode,
    modeManuallySelected: false,
    selectedProvider: state.defaultComposerProvider,
    capabilityTarget: state.defaultComposerCapabilityTarget,
    selectedModel: state.defaultComposerModel,
    selectedReasoningEffort: state.defaultComposerReasoningEffort,
    selectedPermissionMode: DEFAULT_COMPOSER_PERMISSION_MODE,
    modelManuallySelected: false,
});

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

const rememberActiveDraftThroughLifecycle = (
    state: ActiveThreadStoreState,
    draft: ComposerDraftState,
): Record<string, ComposerDraftState> => {
    if (!state.activeComposerThreadId) {
        return state.composerDrafts;
    }
    const transition = pioneerClient.composerDraftLifecycleTransition({
        state: composerDraftLifecycleState(state.composerDrafts),
        action: {
            RememberThread: {
                thread_id: state.activeComposerThreadId,
                draft: composerDomainDraftFromDraft(draft),
            },
        },
    });

    return composerDraftsFromLifecycleState(transition.state);
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
    composerSkillSelections: [],
    showComposerAttachmentMenu: false,
    showComposerModeSwitcher: false,
    showComposerPermissionModeSwitcher: false,
    expandedKeys: [],
    composerModeThreadId: null,
    composerSelectedMode: DEFAULT_COMPOSER_MODE,
    composerModeManuallySelected: false,
    composerSelectedProvider: null,
    composerCapabilityTarget: NATIVE_COMPOSER_CAPABILITY_POLICY,
    composerSelectedModel: null,
    composerSelectedReasoningEffort: null,
    composerSelectedPermissionMode: DEFAULT_COMPOSER_PERMISSION_MODE,
    defaultComposerProvider: null,
    defaultComposerCapabilityTarget: NATIVE_COMPOSER_CAPABILITY_POLICY,
    defaultComposerModel: null,
    defaultComposerReasoningEffort: null,
    defaultComposerWorkspaceId: null,
    defaultComposerSelectionLoading: true,
    composerModelManuallySelected: false,

    activateComposerThread: (threadId) => {
        set((state) => {
            const transition = pioneerClient.composerDraftLifecycleTransition({
                state: composerDraftLifecycleState(state.composerDrafts),
                action: {
                    SwitchThread: {
                        current_thread_id: state.activeComposerThreadId,
                        current_draft: state.activeComposerThreadId
                            ? composerDomainDraftFromDraft(draftFromState(state))
                            : null,
                        target_thread_id: threadId,
                        fallback: composerDomainDraftFromDraft(defaultDraftForThread(state)),
                    },
                },
            });
            const restoredDraft = transition.restored_draft;
            const draft = restoredDraft
                ? composerDraftFromDomainDraft(restoredDraft)
                : defaultDraftForThread(state);
            const domain = reduceComposerDomain(state, {
                Reset: { defaults: composerDomainStateFromDraft(draft) },
            });

            return {
                activeComposerThreadId: threadId,
                composerDrafts: composerDraftsFromLifecycleState(transition.state),
                composerText: draft.text,
                ...composerDomainPatch(domain),
                composerModeThreadId: threadId,
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
        set((state) => {
            const domain = reduceComposerDomain(state, {
                SetAttachments: { attachments: composerAttachments },
            });

            return {
                ...composerDomainPatch(domain),
                composerError: null,
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
        });
    },

    addComposerAttachment: (attachment) => {
        set((state) => {
            const domain = reduceComposerDomain(state, { AddAttachment: { attachment } });

            return {
                ...composerDomainPatch(domain),
                composerError: null,
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
        });
    },

    removeComposerAttachmentAt: (index) => {
        set((state) => {
            const domain = reduceComposerDomain(state, { RemoveAttachmentAt: { index } });

            return {
                ...composerDomainPatch(domain),
                composerError: null,
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
        });
    },

    markComposerAttachmentsUploading: () => {
        let attachments: ComposerAttachment[] = [];
        set((state) => {
            const domain = reduceComposerDomain(state, 'MarkAttachmentsUploading');
            attachments = domain.attachments ?? [];

            return {
                ...composerDomainPatch(domain),
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
        });
        return attachments;
    },

    markComposerAttachmentsFailed: (error) => {
        let attachments: ComposerAttachment[] = [];
        set((state) => {
            const domain = reduceComposerDomain(state, {
                MarkAttachmentsFailed: { error },
            });
            attachments = domain.attachments ?? [];

            return {
                ...composerDomainPatch(domain),
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
        });
        return attachments;
    },

    applyUploadedComposerAttachments: (artifacts) => {
        let attachments: ComposerAttachment[] = [];
        set((state) => {
            const domain = reduceComposerDomain(state, {
                ApplyUploadedAttachments: { artifacts },
            });
            attachments = domain.attachments ?? [];

            return {
                ...composerDomainPatch(domain),
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
        });
        return attachments;
    },

    setComposerCapabilities: (composerCapabilities) => {
        set((state) => {
            const domain = reduceComposerDomain(state, {
                SetCapabilities: { capabilities: composerCapabilities },
            });

            return {
                ...composerDomainPatch(domain),
                composerError: null,
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
        });
    },

    setComposerSkillSelections: (composerSkillSelections) => {
        set((state) => {
            const domain = reduceComposerDomain(state, {
                SetSkillSelections: { selections: composerSkillSelections },
            });

            return {
                ...composerDomainPatch(domain),
                composerError: null,
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
        });
    },

    addComposerCapability: (capability) => {
        set((state) => {
            const domain = reduceComposerDomain(state, { AddCapability: { capability } });

            return {
                ...composerDomainPatch(domain),
                composerError: null,
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
        });
    },

    removeComposerCapability: (id) => {
        set((state) => {
            const domain = reduceComposerDomain(state, { RemoveCapability: { id } });

            return {
                ...composerDomainPatch(domain),
                composerError: null,
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
        });
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
        set((state) => {
            const domain = reduceComposerDomain(state, {
                SetModeFromUser: { mode: composerSelectedMode },
            });

            return {
                ...composerDomainPatch(domain),
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
        });
    },

    clearComposerPayload: () => {
        set((state) => {
            const domain = reduceComposerDomain(state, 'ClearPayload');
            const clearedDraft: ComposerDraftState = {
                text: '',
                ...composerDraftDomainPatch(domain),
            };

            return {
                ...composerDomainPatch(domain),
                composerText: '',
                composerError: null,
                composerDrafts: rememberActiveDraftThroughLifecycle(state, clearedDraft),
            };
        });
    },

    setExpandedKeys: (expandedKeys) => {
        set({ expandedKeys });
    },

    setComposerModelSelectionFromUser: (
        composerSelectedProvider,
        composerSelectedModel,
        requestedCapabilityTarget,
        _capabilitiesRemovedMessage,
    ) => {
        set((state) => {
            const domain = reduceComposerDomain(state, {
                SetModelSelectionFromUser: {
                    provider: composerSelectedProvider,
                    model: composerSelectedModel,
                    capability_target: requestedCapabilityTarget,
                },
            });

            return {
                ...composerDomainPatch(domain),
                composerError: null,
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
        });
    },

    setComposerReasoningEffortFromUser: (composerSelectedReasoningEffort) => {
        set((state) => {
            const domain = reduceComposerDomain(state, {
                SetReasoningEffortFromUser: { effort: composerSelectedReasoningEffort },
            });

            return {
                ...composerDomainPatch(domain),
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
        });
    },

    setComposerPermissionMode: (composerSelectedPermissionMode) => {
        set((state) => {
            const domain = reduceComposerDomain(state, {
                SetPermissionMode: { mode: composerSelectedPermissionMode },
            });

            return {
                ...composerDomainPatch(domain),
                composerError: null,
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
        });
    },

    beginDefaultComposerModelSelectionRefresh: (workspaceId) => {
        set((state) => {
            const workspaceChanged = state.defaultComposerWorkspaceId !== workspaceId;
            const shouldClearSelection = workspaceChanged && !state.composerModelManuallySelected;
            const domain = shouldClearSelection
                ? reduceComposerDomain(state, {
                      ResetModelSelection: {
                          selection: null,
                          capability_target: NATIVE_COMPOSER_CAPABILITY_POLICY,
                      },
                  })
                : null;

            return {
                defaultComposerWorkspaceId: workspaceId,
                defaultComposerSelectionLoading: true,
                ...(domain
                    ? {
                          ...composerDomainPatch(domain),
                          ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
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
        set((state) => {
            const domain = reduceComposerDomain(state, {
                Reset: {
                    defaults: {
                        ...composerDomainStateFromStore(state),
                        selected_provider: null,
                        capability_target: NATIVE_COMPOSER_CAPABILITY_POLICY,
                        selected_model: null,
                        selected_reasoning_effort: null,
                        selected_permission_mode: DEFAULT_COMPOSER_PERMISSION_MODE,
                        model_manually_selected: false,
                    },
                },
            });

            return {
                ...composerDomainPatch(domain),
                defaultComposerProvider: null,
                defaultComposerCapabilityTarget: NATIVE_COMPOSER_CAPABILITY_POLICY,
                defaultComposerModel: null,
                defaultComposerReasoningEffort: null,
                defaultComposerWorkspaceId: null,
                defaultComposerSelectionLoading: true,
                composerError: null,
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
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
                (isCliRuntimeProvider(defaultComposerProvider)
                    ? UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY
                    : NATIVE_COMPOSER_CAPABILITY_POLICY);
            const domain = state.composerModelManuallySelected
                ? null
                : reduceComposerDomain(state, {
                      SyncResolvedModelSelection: {
                          selection: modelSelection(
                              defaultComposerProvider,
                              defaultComposerModel,
                              normalizedReasoningEffort,
                          ),
                          capability_target: defaultComposerCapabilityTarget,
                      },
                  });

            return {
                defaultComposerWorkspaceId,
                defaultComposerProvider,
                defaultComposerCapabilityTarget,
                defaultComposerModel,
                defaultComposerReasoningEffort: normalizedReasoningEffort,
                defaultComposerSelectionLoading: false,
                ...(domain
                    ? {
                          ...composerDomainPatch(domain),
                          ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
                      }
                    : {}),
            };
        });
    },

    syncComposerModelSelection: (
        composerSelectedProvider,
        composerSelectedModel,
        composerSelectedReasoningEffort,
        requestedCapabilityTarget,
        _capabilitiesRemovedMessage,
    ) => {
        set((state) => {
            const domain = reduceComposerDomain(state, {
                SyncResolvedModelSelection: {
                    selection: modelSelection(
                        composerSelectedProvider,
                        composerSelectedModel,
                        composerSelectedReasoningEffort,
                    ),
                    capability_target: requestedCapabilityTarget,
                },
            });

            return {
                ...composerDomainPatch(domain),
                ...updateActiveDraft(state, composerDraftDomainPatch(domain)),
            };
        });
    },

    reset: (composerModeContext) => {
        set((state) => {
            const domain = reduceComposerDomain(state, {
                Reset: {
                    defaults: {
                        attachments: [],
                        capabilities: [],
                        skill_selections: [],
                        selected_mode: composerModeContext?.mode ?? DEFAULT_COMPOSER_MODE,
                        mode_manually_selected: false,
                        selected_provider: state.defaultComposerProvider,
                        capability_target: state.defaultComposerCapabilityTarget,
                        selected_model: state.defaultComposerModel,
                        selected_reasoning_effort: state.defaultComposerReasoningEffort,
                        selected_permission_mode: DEFAULT_COMPOSER_PERMISSION_MODE,
                        model_manually_selected: false,
                    },
                },
            });
            const clearedDrafts = pioneerClient.composerDraftLifecycleTransition({
                state: composerDraftLifecycleState(state.composerDrafts),
                action: 'ClearAll',
            });

            return {
                snapshot: null,
                loading: false,
                error: null,
                sending: false,
                activeComposerThreadId: composerModeContext?.threadId ?? null,
                composerDrafts: composerDraftsFromLifecycleState(clearedDrafts.state),
                composerText: '',
                composerError: null,
                ...composerDomainPatch(domain),
                showComposerAttachmentMenu: false,
                showComposerModeSwitcher: false,
                showComposerPermissionModeSwitcher: false,
                expandedKeys: [],
                composerModeThreadId: composerModeContext?.threadId ?? null,
            };
        });
    },
}));
