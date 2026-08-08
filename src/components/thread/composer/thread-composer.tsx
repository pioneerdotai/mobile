import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
    Platform,
    type GestureResponderEvent,
    type LayoutChangeEvent,
    type TextInput,
} from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
    ArrowUp,
    AtSign,
    Check,
    ChevronDown,
    File,
    FileAudio,
    FileVideo,
    Image,
    Infinity as InfinityIcon,
    Keyboard as KeyboardIcon,
    Loader,
    MessageCircle,
    Mic,
    ShieldAlert,
    ShieldCheck,
    ShieldX,
    MessageSquarePlus,
    Plus,
    Square,
    TriangleAlert,
    Users,
    X,
    Zap,
} from 'lucide-react-native';

import type {
    ComposerAttachment,
    ComposerCapability,
    ComposerMentionCandidate,
    ComposerMentionSelection,
    ComposerPermissionModeOption,
    ComposerReplyTarget,
    ComposerSkillChip,
    ThreadMode,
    TurnPermissionMode,
} from '@/client';
import { McpIcon } from '@/components/icons/mcp-icon';
import { ComposerMentionSheet } from '@/components/overlays/composer-mentions';
import { Box } from '@/components/primitives/box';
import { VStack } from '@/components/primitives/vstack';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { Input } from '@/components/primitives/input';
import Spinner from '@/components/feedback/spinner';
import {
    resolveThreadComposerActionState,
    resolveThreadComposerActionVisual,
    resolveThreadComposerDraftPresence,
} from './voice-entry';

type ThreadComposerProps = {
    value: string;
    placeholder: string;
    sendLabel: string;
    stopLabel: string;
    steerLabel: string;
    disabled: boolean;
    sending: boolean;
    canSend: boolean;
    canSteerTurn: boolean;
    steering: boolean;
    hasInFlightTurn: boolean;
    canStopTurn: boolean;
    turnCancelling: boolean;
    composerMode: ThreadMode;
    modeLabel: string;
    modeAccessibilityLabel: string;
    modeSwitcherDisabled: boolean;
    messageMode: boolean;
    error: string | null;
    modeNotice: string | null;
    replyTarget: ComposerReplyTarget | null;
    editTarget: { turnId: string; preview: string } | null;
    selectedMentions: ComposerMentionSelection[];
    mentionCandidates: ComposerMentionCandidate[];
    attachments: ComposerAttachment[];
    capabilities: ComposerCapability[];
    skillChips: ComposerSkillChip[];
    attachmentsEnabled: boolean;
    attachmentMenuAccessibilityLabel: string;
    dismissLabel: string;
    replyCancelLabel: string;
    editLabel: string;
    editCancelLabel: string;
    mentionAddLabel: string;
    mentionEmptyLabel: string;
    mentionSearchPlaceholder: string;
    mentionSearchDismissLabel: string;
    mentionRemoveLabel: string;
    modelSelectionLabel: string;
    modelSelectionEffortLabel?: string | null;
    modelSelectionLoading: boolean;
    modelSelectionAccessibilityLabel: string;
    modelSelectionDisabled: boolean;
    modelSelectionComplete: boolean;
    permissionModeOptions: ComposerPermissionModeOption[];
    selectedPermissionMode: TurnPermissionMode;
    inputNativeID?: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    onSteerTurn: () => void;
    onStopTurn: () => void;
    onOpenAttachmentMenu: () => void;
    onOpenModeSelector: () => void;
    onDismissModeNotice: () => void;
    onClearReplyTarget: () => void;
    onCancelEdit: () => void;
    onSelectMention: (candidate: ComposerMentionCandidate) => void;
    onRemoveMention: (principalId: string) => void;
    onOpenModelSelector: () => void;
    onOpenPermissionModeSelector: () => void;
    onRemoveAttachment: (index: number) => void;
    onRemoveCapability: (index: number) => void;
    onRemoveSkillChip: (chip: ComposerSkillChip) => void;
    onHeightChange?: (height: number) => void;
    voiceVisible: boolean;
    voiceEnabled: boolean;
    voiceBusy: boolean;
    voiceProcessing: boolean;
    voiceLevel: number;
    voiceMicrophoneLabel: string;
    voiceKeyboardLabel: string;
    voiceHoldLabel: string;
    voiceReleaseToSendLabel: string;
    voiceReleaseToCancelLabel: string;
    onVoiceStart: () => void;
    onVoiceCommit: () => void;
    onVoiceCancel: () => void;
};

export const THREAD_COMPOSER_MIN_INPUT_HEIGHT = 44;

const MAX_INPUT_HEIGHT = 136;
const VOICE_CANCEL_SWIPE_DISTANCE = 44;
const VOICE_ACTIVE_COLOR = '#1071FF';
const VOICE_CANCEL_COLOR = '#DC2626';

type VoiceGestureState = 'idle' | 'recording' | 'cancel';

export const ThreadComposer = ({
    value,
    placeholder,
    sendLabel,
    stopLabel,
    steerLabel,
    disabled,
    sending,
    canSend,
    canSteerTurn,
    steering,
    hasInFlightTurn,
    canStopTurn,
    turnCancelling,
    composerMode,
    modeLabel,
    modeAccessibilityLabel,
    modeSwitcherDisabled,
    messageMode,
    error,
    replyTarget,
    editTarget,
    mentionCandidates,
    attachments,
    capabilities,
    skillChips,
    attachmentsEnabled,
    attachmentMenuAccessibilityLabel,
    replyCancelLabel,
    editLabel,
    editCancelLabel,
    mentionAddLabel,
    mentionEmptyLabel,
    mentionSearchPlaceholder,
    mentionSearchDismissLabel,
    modelSelectionLabel,
    modelSelectionEffortLabel,
    modelSelectionLoading,
    modelSelectionAccessibilityLabel,
    modelSelectionDisabled,
    modelSelectionComplete,
    permissionModeOptions,
    selectedPermissionMode,
    inputNativeID,
    onChangeText,
    onSend,
    onSteerTurn,
    onStopTurn,
    onOpenAttachmentMenu,
    onOpenModeSelector,
    onClearReplyTarget,
    onCancelEdit,
    onSelectMention,
    onOpenModelSelector,
    onOpenPermissionModeSelector,
    onRemoveAttachment,
    onRemoveCapability,
    onRemoveSkillChip,
    onHeightChange,
    voiceVisible,
    voiceEnabled,
    voiceBusy,
    voiceProcessing,
    voiceLevel,
    voiceMicrophoneLabel,
    voiceKeyboardLabel,
    voiceHoldLabel,
    voiceReleaseToSendLabel,
    voiceReleaseToCancelLabel,
    onVoiceStart,
    onVoiceCommit,
    onVoiceCancel,
}: ThreadComposerProps) => {
    const { theme, rt } = useUnistyles();
    const [voiceMode, setVoiceMode] = useState(false);
    const [mentionPickerOpen, setMentionPickerOpen] = useState(false);
    const [voiceGesture, setVoiceGesture] = useState<VoiceGestureState>('idle');
    const voiceGestureRef = useRef<VoiceGestureState>('idle');
    const voiceStartPageYRef = useRef<number | null>(null);
    const inputRef = useRef<TextInput>(null);
    const composerContextFocusKey = editTarget
        ? `edit:${editTarget.turnId}`
        : replyTarget
          ? `reply:${replyTarget.turn_id}`
          : null;
    const composerContext = editTarget
        ? {
              text: `${editLabel}: ${editTarget.preview}`,
              cancelLabel: editCancelLabel,
              onCancel: onCancelEdit,
          }
        : replyTarget
          ? {
                text: `${replyTarget.author_display_name ? `${replyTarget.author_display_name}: ` : ''}${replyTarget.preview ?? ''}`,
                cancelLabel: replyCancelLabel,
                onCancel: onClearReplyTarget,
            }
          : null;

    const { composerTextEmpty, hasComposerPayload } = resolveThreadComposerDraftPresence(
        value,
        attachments.length,
        messageMode ? 0 : capabilities.length,
        messageMode ? 0 : skillChips.length,
    );
    const canSubmit = hasComposerPayload && canSend && !disabled && !sending;
    const { primaryAction, actionDisabled, actionLoading, activeVoiceMode, voiceModeDisabled } =
        resolveThreadComposerActionState({
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
        });
    const actionIsStop = primaryAction === 'stop';
    const actionIsVoice = primaryAction === 'voice-ready';
    const actionVisual = resolveThreadComposerActionVisual({ primaryAction, actionLoading });
    const actionDimmed = actionDisabled && !voiceProcessing;
    const actionLabel = actionIsStop ? stopLabel : actionIsVoice ? voiceMicrophoneLabel : sendLabel;
    const actionColor = rt.themeName === 'dark' ? theme.colors.neutral[950] : theme.colors.white;
    const hasAttachmentChips =
        attachmentsEnabled &&
        (attachments.length > 0 ||
            (!messageMode && (capabilities.length > 0 || skillChips.length > 0)));
    const steerDisabled = !canSteerTurn || disabled || steering;
    const permissionSelectionDisabled = disabled || sending || hasInFlightTurn;
    const voiceActive = voiceGesture !== 'idle';
    const voiceHoldDisabled = !activeVoiceMode || (!voiceActive && voiceModeDisabled);
    const voiceCancelling = voiceGesture === 'cancel';
    const voiceSurfaceLabel = voiceCancelling
        ? voiceReleaseToCancelLabel
        : voiceActive
          ? voiceReleaseToSendLabel
          : voiceHoldLabel;
    const voiceSurfaceColor = voiceCancelling
        ? VOICE_CANCEL_COLOR
        : voiceActive
          ? VOICE_ACTIVE_COLOR
          : theme.colors.surfaceMuted;
    const voiceSurfaceTextColor = voiceActive ? theme.colors.white : theme.colors.typography;

    useEffect(() => {
        if (!messageMode) {
            const frame = requestAnimationFrame(() => setMentionPickerOpen(false));
            return () => cancelAnimationFrame(frame);
        }
    }, [messageMode]);

    const mentionPickerVisible =
        messageMode && mentionPickerOpen && mentionCandidates.length > 0 && !disabled && !sending;
    const selectedPermissionOption = useMemo(
        () =>
            permissionModeOptions.find((option) => option.mode === selectedPermissionMode) ??
            permissionModeOptions[permissionModeOptions.length - 1] ?? {
                mode: 'full_access' as const,
                label: 'Full access',
                description: 'Allow commands and edits without prompts.',
            },
        [permissionModeOptions, selectedPermissionMode],
    );

    const handleLayout = useCallback(
        (event: LayoutChangeEvent) => {
            onHeightChange?.(event.nativeEvent.layout.height);
        },
        [onHeightChange],
    );

    const handleOpenAttachmentMenu = useCallback(() => {
        if (KeyboardController.isVisible()) {
            void KeyboardController.dismiss();
        }

        onOpenAttachmentMenu();
    }, [onOpenAttachmentMenu]);

    const handleOpenMentionPicker = useCallback(() => {
        if (disabled || sending) {
            return;
        }

        if (KeyboardController.isVisible()) {
            void KeyboardController.dismiss();
        }
        setMentionPickerOpen(true);
    }, [disabled, sending]);

    const openPermissionModeSelector = useCallback(() => {
        if (permissionSelectionDisabled) {
            return;
        }
        if (KeyboardController.isVisible()) {
            void KeyboardController.dismiss();
        }
        onOpenPermissionModeSelector();
    }, [onOpenPermissionModeSelector, permissionSelectionDisabled]);

    const updateVoiceGesture = useCallback((nextGesture: VoiceGestureState) => {
        if (voiceGestureRef.current === nextGesture) {
            return;
        }

        voiceGestureRef.current = nextGesture;
        setVoiceGesture(nextGesture);
    }, []);

    useEffect(() => {
        if (!voiceMode || activeVoiceMode) {
            return;
        }

        const resetFrame = requestAnimationFrame(() => {
            if (voiceStartPageYRef.current !== null) {
                onVoiceCancel();
            }
            voiceStartPageYRef.current = null;
            updateVoiceGesture('idle');
            setVoiceMode(false);
        });

        return () => cancelAnimationFrame(resetFrame);
    }, [activeVoiceMode, onVoiceCancel, updateVoiceGesture, voiceMode]);

    const triggerVoiceHoldHaptic = useCallback(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
    }, []);

    const openVoiceMode = useCallback(() => {
        if (voiceModeDisabled) {
            return;
        }
        if (KeyboardController.isVisible()) {
            void KeyboardController.dismiss();
        }
        setVoiceMode(true);
        updateVoiceGesture('idle');
    }, [updateVoiceGesture, voiceModeDisabled]);

    const closeVoiceMode = useCallback(() => {
        if (voiceStartPageYRef.current !== null) {
            onVoiceCancel();
        }

        voiceStartPageYRef.current = null;
        updateVoiceGesture('idle');
        setVoiceMode(false);
    }, [onVoiceCancel, updateVoiceGesture]);

    useEffect(() => {
        if (!composerContextFocusKey) {
            return;
        }

        if (voiceMode) {
            closeVoiceMode();
            return;
        }

        const focusFrame = requestAnimationFrame(() => inputRef.current?.focus?.());
        return () => cancelAnimationFrame(focusFrame);
    }, [closeVoiceMode, composerContextFocusKey, voiceMode]);

    const voiceGestureShouldCancel = useCallback((event: GestureResponderEvent) => {
        const startPageY = voiceStartPageYRef.current;
        return (
            startPageY !== null &&
            event.nativeEvent.pageY - startPageY <= -VOICE_CANCEL_SWIPE_DISTANCE
        );
    }, []);

    const handleVoiceResponderGrant = useCallback(
        (event: GestureResponderEvent) => {
            if (voiceHoldDisabled) {
                return;
            }

            voiceStartPageYRef.current = event.nativeEvent.pageY;
            updateVoiceGesture('recording');
            triggerVoiceHoldHaptic();
            onVoiceStart();
        },
        [onVoiceStart, triggerVoiceHoldHaptic, updateVoiceGesture, voiceHoldDisabled],
    );

    const handleVoiceResponderMove = useCallback(
        (event: GestureResponderEvent) => {
            if (voiceStartPageYRef.current === null) {
                return;
            }

            const nextGesture = voiceGestureShouldCancel(event) ? 'cancel' : 'recording';
            updateVoiceGesture(nextGesture);
        },
        [updateVoiceGesture, voiceGestureShouldCancel],
    );

    const handleVoiceResponderRelease = useCallback(
        (event: GestureResponderEvent) => {
            if (voiceStartPageYRef.current === null) {
                return;
            }

            const shouldCancel = voiceGestureShouldCancel(event);
            voiceStartPageYRef.current = null;
            updateVoiceGesture('idle');
            if (shouldCancel) {
                onVoiceCancel();
            } else {
                setVoiceMode(false);
                onVoiceCommit();
            }
        },
        [onVoiceCancel, onVoiceCommit, updateVoiceGesture, voiceGestureShouldCancel],
    );

    const handleVoiceResponderTerminate = useCallback(() => {
        if (voiceStartPageYRef.current === null) {
            return;
        }

        voiceStartPageYRef.current = null;
        updateVoiceGesture('idle');
        onVoiceCancel();
    }, [onVoiceCancel, updateVoiceGesture]);

    return (
        <Box onLayout={handleLayout} style={styles.container}>
            <VStack style={styles.wrapper}>
                <Box style={styles.modePanel}>
                    {composerContext ? (
                        <HStack style={styles.contextPanel}>
                            <Text
                                accessibilityLabel={composerContext.text}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                style={styles.contextPanelText}
                            >
                                {composerContext.text}
                            </Text>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={composerContext.cancelLabel}
                                hitSlop={8}
                                disabled={sending}
                                onPress={composerContext.onCancel}
                                style={({ pressed }) => [
                                    styles.contextPanelCancel,
                                    sending ? styles.modePanelDisabled : null,
                                    pressed && !sending ? styles.modePanelPressed : null,
                                ]}
                            >
                                <X size={theme.space(5)} color={theme.colors.typography} />
                            </Pressable>
                        </HStack>
                    ) : (
                        <Box style={styles.modePanelButtonContainer}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={modeAccessibilityLabel}
                                accessibilityState={{ disabled: modeSwitcherDisabled }}
                                disabled={modeSwitcherDisabled}
                                onPress={onOpenModeSelector}
                                style={({ pressed }) => [
                                    styles.modePanelButton,
                                    modeSwitcherDisabled ? styles.modePanelDisabled : null,
                                    pressed && !modeSwitcherDisabled
                                        ? styles.modePanelPressed
                                        : null,
                                ]}
                            >
                                <Box
                                    pointerEvents="none"
                                    style={styles.modePanelButtonBackground}
                                />
                                <ComposerModeIcon
                                    mode={composerMode}
                                    size={theme.space(4)}
                                    color={theme.colors.typography}
                                />
                                <Text style={styles.modePanelText}>{modeLabel}</Text>
                            </Pressable>
                        </Box>
                    )}
                </Box>
                <Box style={styles.composerContainer}>
                    <VStack style={styles.composer}>
                        {error ? (
                            <Box style={styles.errorWrap}>
                                <Text style={styles.errorText}>{error}</Text>
                            </Box>
                        ) : null}
                        {hasAttachmentChips ? (
                            <ComposerChipRail
                                attachments={attachments}
                                capabilities={messageMode ? [] : capabilities}
                                skillChips={messageMode ? [] : skillChips}
                                disabled={disabled || sending}
                                onRemoveAttachment={onRemoveAttachment}
                                onRemoveCapability={onRemoveCapability}
                                onRemoveSkillChip={onRemoveSkillChip}
                            />
                        ) : null}
                        <VStack style={styles.inputRow}>
                            {activeVoiceMode ? (
                                <Box
                                    accessible
                                    accessibilityRole="button"
                                    accessibilityLabel={voiceSurfaceLabel}
                                    onStartShouldSetResponder={() => !voiceHoldDisabled}
                                    onMoveShouldSetResponder={() =>
                                        voiceStartPageYRef.current !== null
                                    }
                                    onResponderGrant={handleVoiceResponderGrant}
                                    onResponderMove={handleVoiceResponderMove}
                                    onResponderRelease={handleVoiceResponderRelease}
                                    onResponderTerminate={handleVoiceResponderTerminate}
                                    style={[
                                        styles.voiceSurface,
                                        { backgroundColor: voiceSurfaceColor },
                                        voiceHoldDisabled ? styles.voiceSurfaceDisabled : null,
                                    ]}
                                >
                                    <HStack style={styles.voiceSurfaceContent}>
                                        <Text
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.68}
                                            style={[
                                                styles.voiceSurfaceText,
                                                { color: voiceSurfaceTextColor },
                                            ]}
                                        >
                                            {voiceSurfaceLabel}
                                        </Text>
                                    </HStack>
                                </Box>
                            ) : (
                                <Input
                                    key={composerContextFocusKey ?? 'composer-input'}
                                    ref={inputRef}
                                    nativeID={inputNativeID}
                                    value={value}
                                    placeholder={placeholder}
                                    placeholderTextColor={theme.colors.textMuted}
                                    editable={!disabled && !sending}
                                    multiline
                                    textAlignVertical="top"
                                    onChangeText={onChangeText}
                                    style={styles.input}
                                />
                            )}
                            <HStack style={styles.bottomContainer}>
                                <HStack style={styles.leftActions}>
                                    {attachmentsEnabled ? (
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel={attachmentMenuAccessibilityLabel}
                                            disabled={disabled || sending}
                                            onPress={handleOpenAttachmentMenu}
                                            style={({ pressed }) => [
                                                styles.addButton,
                                                disabled || sending
                                                    ? styles.modelButtonDisabled
                                                    : null,
                                                pressed && !disabled && !sending
                                                    ? styles.modelButtonPressed
                                                    : null,
                                            ]}
                                        >
                                            <Plus
                                                size={theme.space(6)}
                                                color={theme.colors.typography}
                                            />
                                        </Pressable>
                                    ) : null}
                                    {messageMode && mentionCandidates.length > 0 ? (
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel={mentionAddLabel}
                                            accessibilityState={{ expanded: mentionPickerVisible }}
                                            disabled={disabled || sending}
                                            onPress={handleOpenMentionPicker}
                                            style={styles.addButton}
                                        >
                                            <AtSign
                                                size={theme.space(4.5)}
                                                color={theme.colors.typography}
                                            />
                                        </Pressable>
                                    ) : null}
                                    {!messageMode ? (
                                        <>
                                            <Pressable
                                                accessibilityRole="button"
                                                accessibilityLabel={
                                                    selectedPermissionOption.description
                                                }
                                                disabled={permissionSelectionDisabled}
                                                onPress={openPermissionModeSelector}
                                                style={({ pressed }) => [
                                                    styles.permissionButton,
                                                    permissionSelectionDisabled
                                                        ? styles.modelButtonDisabled
                                                        : null,
                                                    pressed && !permissionSelectionDisabled
                                                        ? styles.modelButtonPressed
                                                        : null,
                                                ]}
                                            >
                                                <HStack style={styles.permissionButtonContent}>
                                                    <PermissionModeIcon
                                                        mode={selectedPermissionOption.mode}
                                                        size={theme.space(4.5)}
                                                        color={theme.colors.typography}
                                                    />
                                                    <ChevronDown
                                                        size={theme.space(4.5)}
                                                        opacity={0.6}
                                                        color={theme.colors.typography}
                                                    />
                                                </HStack>
                                            </Pressable>
                                            <Pressable
                                                accessibilityRole="button"
                                                accessibilityLabel={
                                                    modelSelectionAccessibilityLabel
                                                }
                                                disabled={modelSelectionDisabled}
                                                onPress={onOpenModelSelector}
                                                style={({ pressed }) => [
                                                    styles.modelButton,
                                                    modelSelectionDisabled
                                                        ? styles.modelButtonDisabled
                                                        : null,
                                                    pressed && !modelSelectionDisabled
                                                        ? styles.modelButtonPressed
                                                        : null,
                                                ]}
                                            >
                                                {modelSelectionLoading ? (
                                                    <Spinner
                                                        size={theme.space(3.5)}
                                                        color={theme.colors.textMuted}
                                                    />
                                                ) : (
                                                    <HStack style={styles.modelButtonLabelWrap}>
                                                        <Text
                                                            numberOfLines={1}
                                                            style={styles.modelButtonText}
                                                        >
                                                            {modelSelectionLabel}
                                                        </Text>
                                                        {modelSelectionEffortLabel ? (
                                                            <Text
                                                                numberOfLines={1}
                                                                style={styles.modelButtonEffortText}
                                                            >
                                                                {modelSelectionEffortLabel}
                                                            </Text>
                                                        ) : null}
                                                        <ChevronDown
                                                            size={theme.space(4.5)}
                                                            opacity={0.6}
                                                            color={theme.colors.typography}
                                                        />
                                                    </HStack>
                                                )}
                                            </Pressable>
                                        </>
                                    ) : null}
                                </HStack>
                                <HStack style={styles.rightActions}>
                                    {messageMode && hasInFlightTurn ? (
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel={stopLabel}
                                            disabled={!canStopTurn || turnCancelling}
                                            onPress={onStopTurn}
                                            style={styles.secondaryStopButton}
                                        >
                                            {turnCancelling ? (
                                                <Spinner
                                                    size={theme.space(4)}
                                                    color={theme.colors.typography}
                                                />
                                            ) : (
                                                <Square
                                                    size={theme.space(4)}
                                                    color={theme.colors.typography}
                                                />
                                            )}
                                        </Pressable>
                                    ) : null}
                                    {actionIsStop && canSteerTurn ? (
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel={steerLabel}
                                            disabled={steerDisabled}
                                            onPress={onSteerTurn}
                                            style={({ pressed }) => [
                                                styles.steerButton,
                                                steerDisabled && styles.sendButtonDisabled,
                                                pressed && !steerDisabled
                                                    ? styles.sendButtonPressed
                                                    : null,
                                            ]}
                                        >
                                            {steering ? (
                                                <Spinner
                                                    size={theme.space(4)}
                                                    color={theme.colors.typography}
                                                />
                                            ) : (
                                                <MessageSquarePlus
                                                    size={theme.space(4)}
                                                    color={theme.colors.typography}
                                                />
                                            )}
                                        </Pressable>
                                    ) : null}
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={
                                            activeVoiceMode ? voiceKeyboardLabel : actionLabel
                                        }
                                        disabled={actionDisabled}
                                        onPress={() => {
                                            setMentionPickerOpen(false);
                                            if (activeVoiceMode) {
                                                closeVoiceMode();
                                            } else if (actionIsStop) {
                                                onStopTurn();
                                            } else if (actionIsVoice) {
                                                openVoiceMode();
                                            } else {
                                                onSend();
                                            }
                                        }}
                                        style={({ pressed }) => [
                                            activeVoiceMode
                                                ? styles.keyboardButton
                                                : styles.sendButton,
                                            actionDimmed && styles.sendButtonDisabled,
                                            pressed && !actionDisabled && styles.sendButtonPressed,
                                        ]}
                                    >
                                        {actionVisual === 'loading' ? (
                                            <Spinner size={theme.space(4)} color={actionColor} />
                                        ) : actionVisual === 'stop' ? (
                                            <Square size={theme.space(4)} color={actionColor} />
                                        ) : actionVisual === 'keyboard' ? (
                                            <KeyboardIcon
                                                size={theme.space(4.5)}
                                                color={theme.colors.typography}
                                            />
                                        ) : actionVisual === 'microphone' ? (
                                            <Mic size={theme.space(4.5)} color={actionColor} />
                                        ) : (
                                            <ArrowUp size={theme.space(5)} color={actionColor} />
                                        )}
                                    </Pressable>
                                </HStack>
                            </HStack>
                        </VStack>
                    </VStack>
                </Box>
            </VStack>
            <ComposerMentionSheet
                open={mentionPickerVisible}
                candidates={mentionCandidates}
                emptyLabel={mentionEmptyLabel}
                searchPlaceholder={mentionSearchPlaceholder}
                searchDismissText={mentionSearchDismissLabel}
                onClose={() => setMentionPickerOpen(false)}
                onSelect={onSelectMention}
            />
        </Box>
    );
};

const PermissionModeIcon = ({
    mode,
    size,
    color,
}: {
    mode: TurnPermissionMode;
    size: number;
    color: string;
}) => {
    switch (mode) {
        case 'supervised':
            return <ShieldX size={size} color={color} />;
        case 'auto_accept_edits':
            return <ShieldAlert size={size} color={color} />;
        case 'full_access':
            return <ShieldCheck size={size} color={color} />;
    }
};

const ComposerModeIcon = ({
    mode,
    size,
    color,
}: {
    mode: ThreadMode;
    size: number;
    color: string;
}) => {
    switch (mode) {
        case 'Agent':
            return <InfinityIcon size={size} color={color} />;
        case 'Chat':
            return <MessageCircle size={size} color={color} />;
        case 'Message':
            return <Users size={size} color={color} />;
    }
};

type ComposerChipRailProps = {
    attachments: ComposerAttachment[];
    capabilities: ComposerCapability[];
    skillChips: ComposerSkillChip[];
    disabled: boolean;
    onRemoveAttachment: (index: number) => void;
    onRemoveCapability: (index: number) => void;
    onRemoveSkillChip: (chip: ComposerSkillChip) => void;
};

const ComposerChipRail = ({
    attachments,
    capabilities,
    skillChips,
    disabled,
    onRemoveAttachment,
    onRemoveCapability,
    onRemoveSkillChip,
}: ComposerChipRailProps) => {
    return (
        <ScrollView
            horizontal
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRail}
        >
            {attachments.map((attachment, index) => (
                <ComposerAttachmentChip
                    key={`${attachment.path}:${index}`}
                    attachment={attachment}
                    disabled={disabled}
                    onRemove={() => onRemoveAttachment(index)}
                />
            ))}
            {capabilities.map((capability, index) => (
                <ComposerCapabilityChip
                    key={capability.id}
                    capability={capability}
                    disabled={disabled}
                    onRemove={() => onRemoveCapability(index)}
                />
            ))}
            {skillChips.map((chip) => (
                <ComposerSkillSelectionChip
                    key={chip.key}
                    chip={chip}
                    disabled={disabled}
                    onRemove={() => onRemoveSkillChip(chip)}
                />
            ))}
        </ScrollView>
    );
};

const ComposerAttachmentChip = ({
    attachment,
    disabled,
    onRemove,
}: {
    attachment: ComposerAttachment;
    disabled: boolean;
    onRemove: () => void;
}) => {
    const { theme } = useUnistyles();
    const uploading = attachment.upload_state === 'Uploading';
    const failed =
        typeof attachment.upload_state === 'object' && 'Failed' in attachment.upload_state;
    const uploaded =
        typeof attachment.upload_state === 'object' && 'Uploaded' in attachment.upload_state;
    const Icon = uploading
        ? Loader
        : failed
          ? TriangleAlert
          : uploaded
            ? Check
            : attachment.kind === 'Image'
              ? Image
              : attachment.kind === 'Audio'
                ? FileAudio
                : attachment.kind === 'Video'
                  ? FileVideo
                  : File;
    const iconColor = failed ? theme.colors.dangerText : theme.colors.typography;
    const label = attachment.file_name.trim() || attachment.path;

    return (
        <HStack style={styles.chip}>
            <Box style={styles.chipIconWrap}>
                {uploading ? (
                    <Spinner size={theme.space(3)} color={theme.colors.textMuted} />
                ) : (
                    <Icon size={theme.space(3.5)} color={iconColor} />
                )}
            </Box>
            <Text numberOfLines={1} style={styles.chipText}>
                {label}
            </Text>
            <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={onRemove}
                style={styles.chipRemoveButton}
            >
                <X size={theme.space(3.5)} color={theme.colors.textMuted} />
            </Pressable>
        </HStack>
    );
};

const ComposerCapabilityChip = ({
    capability,
    disabled,
    onRemove,
}: {
    capability: ComposerCapability;
    disabled: boolean;
    onRemove: () => void;
}) => {
    const { theme } = useUnistyles();
    const Icon = 'Skill' in capability.kind ? Zap : McpIcon;

    return (
        <HStack style={styles.chip}>
            <Box style={styles.chipIconWrap}>
                <Icon size={theme.space(3.5)} color={theme.colors.typography} />
            </Box>
            <Text numberOfLines={1} style={styles.chipText}>
                {capability.label}
            </Text>
            <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={onRemove}
                style={styles.chipRemoveButton}
            >
                <X size={theme.space(3.5)} color={theme.colors.textMuted} />
            </Pressable>
        </HStack>
    );
};

const ComposerSkillSelectionChip = ({
    chip,
    disabled,
    onRemove,
}: {
    chip: ComposerSkillChip;
    disabled: boolean;
    onRemove: () => void;
}) => {
    const { theme } = useUnistyles();

    return (
        <HStack style={styles.chip}>
            <Box style={styles.chipIconWrap}>
                <Zap size={theme.space(3.5)} color={theme.colors.typography} />
            </Box>
            <Text numberOfLines={1} style={styles.chipText}>
                {chip.label}
            </Text>
            <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={onRemove}
                style={styles.chipRemoveButton}
            >
                <X size={theme.space(3.5)} color={theme.colors.textMuted} />
            </Pressable>
        </HStack>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        backgroundColor: 'transparent',
        paddingRight: rt.insets.right + theme.space(4),
        paddingBottom: rt.insets.bottom + theme.space(2),
        paddingLeft: rt.insets.left + theme.space(4),
    },
    wrapper: {
        backgroundColor:
            rt.themeName === 'dark' ? theme.colors.neutral[925] : theme.colors.neutral[150],
        borderTopLeftRadius: theme.radius['3xl'],
        borderTopRightRadius: theme.radius['3xl'],
        borderBottomLeftRadius: theme.radius['3xl'],
        borderBottomRightRadius: theme.radius['3xl'],
        overflow: 'hidden',
    },
    modePanel: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor:
            rt.themeName === 'dark' ? theme.colors.neutral[925] : theme.colors.neutral[150],
        overflow: 'hidden',
        paddingTop: theme.space(2),
        paddingBottom: theme.space(1.5),
    },
    modePanelButtonContainer: {
        paddingHorizontal: theme.space(4),
    },
    modePanelButton: {
        minHeight: theme.space(7),
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space(1),
        paddingHorizontal: theme.space(3),
        borderRadius: theme.radius.full,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    modePanelButtonBackground: {
        position: 'absolute',
        inset: 0,
        backgroundColor: theme.colors.foreground,
        opacity: 0.04,
    },
    modePanelText: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    contextPanel: {
        minWidth: 0,
        flex: 1,
        minHeight: theme.space(7),
        alignItems: 'center',
        gap: theme.space(5),
        paddingLeft: theme.space(4),
        paddingRight: theme.space(2.5),
    },
    contextPanelText: {
        minWidth: 0,
        flex: 1,
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    contextPanelCancel: {
        width: theme.space(7),
        height: theme.space(7),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        flexShrink: 0,
    },
    modePanelPressed: {
        opacity: 0.8,
    },
    modePanelDisabled: {
        opacity: 0.6,
    },
    composerContainer: {
        borderRadius: theme.radius['3xl'],
        ...Platform.select({
            ios: {
                shadowOffset: {
                    width: 0,
                    height: 0,
                },
                shadowOpacity: 0.1,
                shadowRadius: 5,
                shadowColor: rt.themeName === 'dark' ? '#0a0a0a' : '#525252',
            },
            default: {
                boxShadow:
                    rt.themeName === 'dark'
                        ? '0 0 10px 0 rgba(10, 10, 10, 0.10)'
                        : '0 0 10px 0 rgba(82, 82, 82, 0.10)',
            },
        }),
    },
    composer: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius['3xl'],
        paddingHorizontal: theme.space(2),
        paddingVertical: theme.space(2),
        overflow: 'hidden',
    },
    inputRow: {
        gap: theme.space(2),
    },
    input: {
        flex: 1,
        minWidth: 0,
        minHeight: THREAD_COMPOSER_MIN_INPUT_HEIGHT,
        maxHeight: MAX_INPUT_HEIGHT,
        backgroundColor: theme.colors.background,
        color: theme.colors.typography,
        fontSize: theme.fontSize.default.fontSize,
        paddingHorizontal: theme.space(2),
        paddingTop: 11,
        paddingBottom: 10,
    },
    voiceSurface: {
        minHeight: THREAD_COMPOSER_MIN_INPUT_HEIGHT,
        maxHeight: THREAD_COMPOSER_MIN_INPUT_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius['2xl'],
        paddingHorizontal: theme.space(2.5),
        overflow: 'hidden',
    },
    voiceSurfaceDisabled: {
        opacity: 0.6,
    },
    voiceSurfaceContent: {
        minWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space(2),
    },
    voiceSurfaceText: {
        minWidth: 0,
        flexShrink: 1,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
        textAlign: 'center',
    },
    bottomContainer: {
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.space(2),
    },
    leftActions: {
        minWidth: 0,
        flex: 1,
        alignItems: 'center',
        gap: theme.space(1),
    },
    rightActions: {
        alignItems: 'center',
        gap: theme.space(1),
        flexShrink: 0,
    },
    addButton: {
        width: theme.space(8),
        height: theme.space(8),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        flexShrink: 0,
    },
    modelButton: {
        minWidth: 0,
        flexShrink: 1,
        maxWidth: '100%',
        height: theme.space(8),
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space(1),
        paddingLeft: theme.space(2),
        paddingRight: theme.space(1),
        borderRadius: theme.radius.full,
    },
    modelButtonDisabled: {
        opacity: 0.5,
    },
    modelButtonPressed: {
        backgroundColor: theme.colors.surfaceMuted,
    },
    permissionButton: {
        minWidth: 0,
        flexShrink: 1,
        maxWidth: theme.space(42),
        height: theme.space(8),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.space(2),
        borderRadius: theme.radius.full,
    },
    permissionButtonContent: {
        minWidth: 0,
        alignItems: 'center',
        gap: theme.space(1),
    },
    permissionButtonText: {
        minWidth: 0,
        flexShrink: 1,
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    modelButtonLabelWrap: {
        minWidth: 0,
        flexShrink: 1,
        alignItems: 'center',
        gap: theme.space(1),
    },
    modelButtonText: {
        minWidth: 0,
        flexShrink: 1,
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    modelButtonEffortText: {
        maxWidth: theme.space(20),
        flexShrink: 0,
        color: theme.colors.typography,
        opacity: 0.6,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    sendButton: {
        width: theme.space(8),
        height: theme.space(8),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.foreground,
        flexShrink: 0,
    },
    secondaryStopButton: {
        width: theme.space(8),
        height: theme.space(8),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.surfaceMuted,
        flexShrink: 0,
    },
    steerButton: {
        width: theme.space(8),
        height: theme.space(8),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.surfaceMuted,
        flexShrink: 0,
    },
    keyboardButton: {
        width: theme.space(8),
        height: theme.space(8),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.surfaceMuted,
        flexShrink: 0,
    },
    sendButtonDisabled: {
        opacity: 0.42,
    },
    sendButtonPressed: {
        opacity: 0.82,
    },
    errorWrap: {
        borderWidth: 1,
        borderColor: theme.colors.dangerBorder,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.dangerSurface,
        paddingHorizontal: theme.space(2.5),
        paddingVertical: theme.space(2),
        marginBottom: theme.space(2),
    },
    errorText: {
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    modeNotice: {
        minWidth: 0,
        alignItems: 'center',
        gap: theme.space(1),
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surfaceMuted,
        paddingLeft: theme.space(2.5),
        paddingRight: theme.space(1),
        paddingVertical: theme.space(1.5),
        marginBottom: theme.space(2),
    },
    modeNoticeText: {
        minWidth: 0,
        flex: 1,
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
    chipRail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space(1.5),
        paddingHorizontal: theme.space(0.5),
        paddingBottom: theme.space(1.5),
    },
    chip: {
        height: theme.space(8),
        maxWidth: 196,
        minWidth: 0,
        alignItems: 'center',
        gap: theme.space(1),
        paddingLeft: theme.space(2),
        paddingRight: theme.space(1),
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    chipIconWrap: {
        width: theme.space(5),
        height: theme.space(5),
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    chipText: {
        minWidth: 0,
        flexShrink: 1,
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    chipRemoveButton: {
        width: theme.space(5),
        height: theme.space(5),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        flexShrink: 0,
    },
}));
