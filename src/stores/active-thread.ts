import { create } from 'zustand';
import { turnCancellationSnapshot } from '@/client/turn-cancellation';
import { useThreadTreeStore } from '@/stores/thread-tree';
import type {
    ComposerAttachment,
    ComposerCapability,
    ComposerDomainAction,
    ComposerDomainState,
    ComposerMentionCandidate,
    ComposerMentionSelection,
    ComposerReplyTarget,
    ComposerSkillSelection,
    ThreadMode,
    TurnPermissionMode,
} from '@/client';
import type { ComposerPublication } from '@/client/generated/composer_publication';
import { composerSnapshot, dispatchComposer, useComposerPublication } from '@/client/composer';
import {
    NATIVE_COMPOSER_CAPABILITY_POLICY,
    type ComposerCapabilityPolicy,
} from '@/services/providers/cli-runtime';

type ActiveThreadStoreState = {
    sending: boolean;
    activeComposerThreadId: string | null;
    composerAuthorizationFingerprint: string | null;
    composerText: string;
    composerError: string | null;
    dismissedVoiceErrorGeneration: number | null;
    dismissedSteerErrorGeneration: number | null;
    dismissedTurnCancellationGeneration: number | null;
    composerAttachments: ComposerAttachment[];
    composerCapabilities: ComposerCapability[];
    composerSkillSelections: ComposerSkillSelection[];
    composerReplyTarget: ComposerReplyTarget | null;
    composerSelectedMentions: ComposerMentionSelection[];
    composerModeNotice: string | null;
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
    defaultComposerSelectionLoading: boolean;
    composerModelManuallySelected: boolean;
    activateComposerThread: (threadId: string) => void;
    setComposerText: (text: string) => void;
    setComposerError: (error: string | null) => void;
    setComposerAttachments: (attachments: ComposerAttachment[]) => void;
    addComposerAttachment: (attachment: ComposerAttachment) => void;
    removeComposerAttachment: (path: string) => void;
    setComposerCapabilities: (capabilities: ComposerCapability[]) => void;
    setComposerSkillSelections: (selections: ComposerSkillSelection[]) => void;
    addComposerCapability: (capability: ComposerCapability) => void;
    removeComposerCapability: (id: string) => void;
    setComposerAttachmentMenuOpen: (open: boolean) => void;
    setComposerModeSwitcherOpen: (open: boolean) => void;
    setComposerPermissionModeSwitcherOpen: (open: boolean) => void;
    setComposerMode: (mode: ThreadMode, executionStateRemovedNotice?: string) => void;
    dismissComposerModeNotice: () => void;
    setComposerReplyTarget: (target: ComposerReplyTarget) => void;
    clearComposerReplyTarget: () => void;
    selectComposerMention: (candidate: ComposerMentionCandidate) => void;
    removeComposerMention: (principalId: string) => void;
    clearComposerPayload: () => void;
    setExpandedKeys: (keys: string[]) => void;
    setComposerReasoningEffortFromUser: (effort: string | null) => void;
    setComposerPermissionMode: (mode: TurnPermissionMode) => void;
    syncComposerModelSelection: () => void;
    reset: (composerModeContext?: ComposerModeContext) => void;
};

type ComposerModeContext = {
    threadId: string | null;
    mode: ThreadMode;
};

const DEFAULT_COMPOSER_MODE: ThreadMode = 'Message';
const DEFAULT_COMPOSER_PERMISSION_MODE: TurnPermissionMode = 'full_access';
const emptyDomain: ComposerDomainState = {
    capability_target: NATIVE_COMPOSER_CAPABILITY_POLICY,
};

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
    | 'composerReplyTarget'
    | 'composerSelectedMentions'
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
    composerReplyTarget: domain.reply_target ?? null,
    composerSelectedMentions: domain.selected_mentions ?? [],
});

type PresentationState = Pick<
    ActiveThreadStoreState,
    | 'activeComposerThreadId'
    | 'composerError'
    | 'dismissedVoiceErrorGeneration'
    | 'dismissedSteerErrorGeneration'
    | 'dismissedTurnCancellationGeneration'
    | 'composerModeNotice'
    | 'showComposerAttachmentMenu'
    | 'showComposerModeSwitcher'
    | 'showComposerPermissionModeSwitcher'
    | 'expandedKeys'
>;

const initialPresentation: PresentationState = {
    activeComposerThreadId: null,
    composerError: null,
    dismissedVoiceErrorGeneration: null,
    dismissedSteerErrorGeneration: null,
    dismissedTurnCancellationGeneration: null,
    composerModeNotice: null,
    showComposerAttachmentMenu: false,
    showComposerModeSwitcher: false,
    showComposerPermissionModeSwitcher: false,
    expandedKeys: [],
};
const presentation = create<PresentationState>(() => initialPresentation);
const input = () => composerSnapshot(presentation.getState().activeComposerThreadId);
const errorPresentation = (composerError: string | null) => {
    const cancellation = turnCancellationSnapshot(presentation.getState().activeComposerThreadId);
    const operation = input()?.operation;
    const result = operation?.voice_result;
    const hasVoiceError =
        result?.action === 'show_no_speech_error' || result?.action === 'show_finalize_error';
    return {
        composerError,
        dismissedTurnCancellationGeneration:
            composerError === null && cancellation?.state.kind === 'failed'
                ? cancellation.identity.generation
                : presentation.getState().dismissedTurnCancellationGeneration,
        dismissedSteerErrorGeneration:
            composerError === null &&
            operation?.kind === 'steer' &&
            operation.status.kind === 'failed'
                ? operation.identity.generation
                : presentation.getState().dismissedSteerErrorGeneration,
        dismissedVoiceErrorGeneration:
            composerError === null && hasVoiceError
                ? operation!.identity.generation
                : presentation.getState().dismissedVoiceErrorGeneration,
    };
};
const domainIntent = (action: ComposerDomainAction) => {
    const current = input();
    if (!current) return;
    return dispatchComposer({
        kind: 'domain',
        thread_id: current.thread_id,
        draft_id: current.draft_id,
        action,
    });
};
const defaults = (): ComposerDomainState => emptyDomain;
const clearDraft = () => {
    const current = input();
    if (current)
        dispatchComposer({
            kind: 'clear',
            thread_id: current.thread_id,
            draft_id: current.draft_id,
        });
};

type Actions = Pick<
    ActiveThreadStoreState,
    {
        [K in keyof ActiveThreadStoreState]: ActiveThreadStoreState[K] extends (
            ...args: never[]
        ) => unknown
            ? K
            : never;
    }[keyof ActiveThreadStoreState]
>;
const actions: Actions = {
    activateComposerThread(threadId) {
        const previous = input();
        if (previous && previous.thread_id !== threadId && previous.operation?.plan) {
            dispatchComposer({
                kind: 'complete_operation',
                identity: previous.operation.identity,
                completion: { kind: 'cancelled' },
            });
        }

        dispatchComposer({
            kind: 'activate',
            thread_id: threadId,
        });
        presentation.setState({
            activeComposerThreadId: threadId,
            showComposerAttachmentMenu: false,
            showComposerModeSwitcher: false,
            showComposerPermissionModeSwitcher: false,
            composerError: null,
            dismissedVoiceErrorGeneration: null,
            dismissedSteerErrorGeneration: null,
            dismissedTurnCancellationGeneration: null,
            composerModeNotice: null,
        });
    },
    setComposerText(text) {
        const current = input();
        if (current && current.draft.text !== text)
            dispatchComposer({
                kind: 'edit_text',
                thread_id: current.thread_id,
                draft_id: current.draft_id,
                text,
            });
    },
    setComposerError: (composerError) => presentation.setState(errorPresentation(composerError)),
    setComposerAttachments: (attachments) => {
        domainIntent({ SetAttachments: { attachments } });
        presentation.setState(errorPresentation(null));
    },
    addComposerAttachment: (attachment) => {
        domainIntent({ AddAttachment: { attachment } });
        presentation.setState(errorPresentation(null));
    },
    removeComposerAttachment: (path) => {
        domainIntent({ RemoveAttachment: { path } });
        presentation.setState(errorPresentation(null));
    },
    setComposerCapabilities: (capabilities) => {
        domainIntent({ SetCapabilities: { capabilities } });
        presentation.setState(errorPresentation(null));
    },
    setComposerSkillSelections: (selections) => {
        domainIntent({ SetSkillSelections: { selections } });
        presentation.setState(errorPresentation(null));
    },
    addComposerCapability: (capability) => {
        domainIntent({ AddCapability: { capability } });
        presentation.setState(errorPresentation(null));
    },
    removeComposerCapability: (id) => {
        domainIntent({ RemoveCapability: { id } });
        presentation.setState(errorPresentation(null));
    },
    setComposerAttachmentMenuOpen: (showComposerAttachmentMenu) =>
        presentation.setState({ showComposerAttachmentMenu }),
    setComposerModeSwitcherOpen: (showComposerModeSwitcher) =>
        presentation.setState({ showComposerModeSwitcher }),
    setComposerPermissionModeSwitcherOpen: (showComposerPermissionModeSwitcher) =>
        presentation.setState({ showComposerPermissionModeSwitcher }),
    setComposerMode: (mode, notice) => {
        const result = domainIntent({ SetModeFromUser: { mode } });
        presentation.setState({
            composerModeNotice:
                result?.outcome === 'changed' && input()?.execution_capabilities_removed
                    ? (notice ?? null)
                    : null,
        });
    },
    dismissComposerModeNotice: () => presentation.setState({ composerModeNotice: null }),
    setComposerReplyTarget: (target) => domainIntent({ SetReplyTarget: { target } }),
    clearComposerReplyTarget: () => domainIntent('ClearReplyTarget'),
    selectComposerMention: (candidate) => domainIntent({ SelectMention: { candidate } }),
    removeComposerMention: (principal_id) => domainIntent({ RemoveMention: { principal_id } }),
    clearComposerPayload: () => {
        clearDraft();
        presentation.setState({ ...errorPresentation(null), composerModeNotice: null });
    },
    setExpandedKeys: (expandedKeys) => presentation.setState({ expandedKeys }),
    setComposerReasoningEffortFromUser: (effort) =>
        domainIntent({ SetReasoningEffortFromUser: { effort } }),
    setComposerPermissionMode: (mode) => {
        domainIntent({ SetPermissionMode: { mode } });
        presentation.setState(errorPresentation(null));
    },
    syncComposerModelSelection() {
        const current = input();
        if (current)
            dispatchComposer({
                kind: 'sync_model_selection',
                thread_id: current.thread_id,
                draft_id: current.draft_id,
                reset: false,
            });
    },
    reset(context) {
        dispatchComposer({ kind: 'clear_all' });
        presentation.setState({
            activeComposerThreadId: context?.threadId ?? null,
            composerError: null,
            dismissedVoiceErrorGeneration: null,
            dismissedSteerErrorGeneration: null,
            dismissedTurnCancellationGeneration: null,
            composerModeNotice: null,
            showComposerAttachmentMenu: false,
            showComposerModeSwitcher: false,
            showComposerPermissionModeSwitcher: false,
            expandedKeys: [],
        });
        if (context?.threadId) {
            dispatchComposer({
                kind: 'open',
                thread_id: context.threadId,
                defaults: { ...defaults(), selected_mode: context.mode },
            });
            domainIntent({ Reset: { defaults: { ...defaults(), selected_mode: context.mode } } });
        }
    },
};

const view = (
    ui: PresentationState,
    publication: ComposerPublication | null,
    defaultComposerSelectionLoading: boolean,
): ActiveThreadStoreState => ({
    ...ui,
    defaultComposerSelectionLoading,
    ...composerDomainPatch(publication?.draft.domain ?? emptyDomain),
    ...actions,
    sending: publication?.operation?.kind === 'send' && publication.operation.plan != null,
    composerText: publication?.draft.text ?? '',
    composerAuthorizationFingerprint: publication?.authorization_fingerprint ?? null,
    composerModeThreadId: publication?.thread_id ?? null,
});

// Compatibility names project immutable Client draft output.
export const useActiveThreadStore = Object.assign(
    function useActiveThreadStore<T>(selector: (state: ActiveThreadStoreState) => T): T {
        const ui = presentation();
        const publication = useComposerPublication(ui.activeComposerThreadId);
        const loading = useThreadTreeStore((state) => state.loading || state.snapshot === null);
        return selector(view(ui, publication, loading));
    },
    {
        getState: () => {
            const directory = useThreadTreeStore.getState();
            return view(
                presentation.getState(),
                input(),
                directory.loading || directory.snapshot === null,
            );
        },
    },
);
