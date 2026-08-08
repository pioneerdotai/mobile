export type ThreadComposerPrimaryAction = 'send' | 'stop' | 'voice-ready' | 'voice-mode';
export type ThreadComposerActionVisual = 'send' | 'stop' | 'microphone' | 'keyboard' | 'loading';

export type ThreadComposerActionState = Readonly<{
    primaryAction: ThreadComposerPrimaryAction;
    actionDisabled: boolean;
    actionLoading: boolean;
    activeVoiceMode: boolean;
    voiceModeDisabled: boolean;
}>;

export type ThreadComposerDraftPresence = Readonly<{
    composerTextEmpty: boolean;
    hasComposerPayload: boolean;
}>;

type ThreadComposerActionInput = Readonly<{
    voiceMode: boolean;
    messageMode: boolean;
    composerTextEmpty: boolean;
    modelSelectionComplete: boolean;
    disabled: boolean;
    sending: boolean;
    canSubmit: boolean;
    hasInFlightTurn: boolean;
    canStopTurn: boolean;
    turnCancelling: boolean;
    voiceVisible: boolean;
    voiceEnabled: boolean;
    voiceBusy: boolean;
    voiceProcessing: boolean;
}>;

export const resolveThreadComposerDraftPresence = (
    text: string,
    attachmentCount: number,
    capabilityCount: number,
    skillSelectionCount = 0,
): ThreadComposerDraftPresence => {
    const composerTextEmpty = text.trim().length === 0;

    return {
        composerTextEmpty,
        hasComposerPayload:
            !composerTextEmpty ||
            attachmentCount > 0 ||
            capabilityCount > 0 ||
            skillSelectionCount > 0,
    };
};

export const resolveThreadComposerActionState = ({
    voiceMode,
    messageMode,
    composerTextEmpty,
    modelSelectionComplete,
    disabled,
    sending,
    canSubmit,
    hasInFlightTurn,
    canStopTurn,
    turnCancelling,
    voiceVisible,
    voiceEnabled,
    voiceBusy,
    voiceProcessing,
}: ThreadComposerActionInput): ThreadComposerActionState => {
    const voiceSelectionReady = messageMode || modelSelectionComplete;
    const voiceModeDisabled =
        disabled ||
        sending ||
        hasInFlightTurn ||
        voiceBusy ||
        !voiceVisible ||
        !voiceEnabled ||
        !voiceSelectionReady;
    const activeVoiceMode =
        voiceMode &&
        composerTextEmpty &&
        voiceSelectionReady &&
        !disabled &&
        !sending &&
        !hasInFlightTurn &&
        voiceVisible &&
        voiceEnabled;

    const primaryAction: ThreadComposerPrimaryAction =
        hasInFlightTurn && !messageMode
            ? 'stop'
            : activeVoiceMode
              ? 'voice-mode'
              : composerTextEmpty && voiceSelectionReady && voiceVisible && !voiceModeDisabled
                ? 'voice-ready'
                : 'send';

    const actionDisabled = voiceProcessing
        ? true
        : primaryAction === 'stop'
          ? !canStopTurn
          : primaryAction === 'voice-mode'
            ? false
            : primaryAction === 'voice-ready'
              ? voiceModeDisabled
              : !canSubmit;
    const actionLoading = voiceProcessing || (primaryAction === 'stop' ? turnCancelling : sending);

    return {
        primaryAction,
        actionDisabled,
        actionLoading,
        activeVoiceMode,
        voiceModeDisabled,
    };
};

export const resolveThreadComposerActionVisual = (
    state: Pick<ThreadComposerActionState, 'primaryAction' | 'actionLoading'>,
): ThreadComposerActionVisual => {
    if (state.actionLoading) {
        return 'loading';
    }

    switch (state.primaryAction) {
        case 'stop':
            return 'stop';
        case 'voice-mode':
            return 'keyboard';
        case 'voice-ready':
            return 'microphone';
        case 'send':
            return 'send';
    }
};
