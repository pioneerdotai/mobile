import { useCallback, useMemo } from 'react';
import { Platform, type LayoutChangeEvent } from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
    ArrowUp,
    Check,
    ChevronDown,
    File,
    FileAudio,
    FileVideo,
    Image,
    Loader,
    ShieldAlert,
    ShieldCheck,
    ShieldX,
    MessageSquarePlus,
    Plus,
    Square,
    TriangleAlert,
    X,
    Zap,
} from 'lucide-react-native';

import type {
    ComposerAttachment,
    ComposerCapability,
    ComposerPermissionModeOption,
    TurnPermissionMode,
} from '@/client';
import { McpIcon } from '@/components/icons/mcp-icon';
import { Box } from '@/components/primitives/box';
import { VStack } from '@/components/primitives/vstack';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { Input } from '@/components/primitives/input';
import Spinner from '@/components/feedback/spinner';

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
    error: string | null;
    attachments: ComposerAttachment[];
    capabilities: ComposerCapability[];
    attachmentsEnabled: boolean;
    attachmentMenuAccessibilityLabel: string;
    modelSelectionLabel: string;
    modelSelectionEffortLabel?: string | null;
    modelSelectionLoading: boolean;
    modelSelectionAccessibilityLabel: string;
    modelSelectionDisabled: boolean;
    permissionModeOptions: ComposerPermissionModeOption[];
    selectedPermissionMode: TurnPermissionMode;
    inputNativeID?: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    onSteerTurn: () => void;
    onStopTurn: () => void;
    onOpenAttachmentMenu: () => void;
    onOpenModelSelector: () => void;
    onOpenPermissionModeSelector: () => void;
    onRemoveAttachment: (index: number) => void;
    onRemoveCapability: (index: number) => void;
    onHeightChange?: (height: number) => void;
};

export const THREAD_COMPOSER_MIN_INPUT_HEIGHT = 44;

const MAX_INPUT_HEIGHT = 136;

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
    error,
    attachments,
    capabilities,
    attachmentsEnabled,
    attachmentMenuAccessibilityLabel,
    modelSelectionLabel,
    modelSelectionEffortLabel,
    modelSelectionLoading,
    modelSelectionAccessibilityLabel,
    modelSelectionDisabled,
    permissionModeOptions,
    selectedPermissionMode,
    inputNativeID,
    onChangeText,
    onSend,
    onSteerTurn,
    onStopTurn,
    onOpenAttachmentMenu,
    onOpenModelSelector,
    onOpenPermissionModeSelector,
    onRemoveAttachment,
    onRemoveCapability,
    onHeightChange,
}: ThreadComposerProps) => {
    const { theme, rt } = useUnistyles();

    const hasComposerPayload =
        value.trim().length > 0 || attachments.length > 0 || capabilities.length > 0;
    const canSubmit = hasComposerPayload && canSend && !disabled && !sending;
    const actionIsStop = hasInFlightTurn;
    const actionDisabled = actionIsStop ? !canStopTurn : !canSubmit;
    const actionLoading = actionIsStop ? turnCancelling : sending;
    const actionLabel = actionIsStop ? stopLabel : sendLabel;
    const actionColor = rt.themeName === 'dark' ? theme.colors.neutral[950] : theme.colors.white;
    const hasChips = attachmentsEnabled && (attachments.length > 0 || capabilities.length > 0);
    const steerDisabled = !canSteerTurn || disabled || steering;
    const permissionSelectionDisabled = disabled || sending || hasInFlightTurn;
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

    const openPermissionModeSelector = useCallback(() => {
        if (permissionSelectionDisabled) {
            return;
        }
        if (KeyboardController.isVisible()) {
            void KeyboardController.dismiss();
        }
        onOpenPermissionModeSelector();
    }, [onOpenPermissionModeSelector, permissionSelectionDisabled]);

    return (
        <Box onLayout={handleLayout} style={styles.container}>
            <Box style={styles.composerContainer}>
                <VStack style={styles.composer}>
                    {error ? (
                        <Box style={styles.errorWrap}>
                            <Text style={styles.errorText}>{error}</Text>
                        </Box>
                    ) : null}
                    {hasChips ? (
                        <ComposerChipRail
                            attachments={attachments}
                            capabilities={capabilities}
                            disabled={disabled || sending}
                            onRemoveAttachment={onRemoveAttachment}
                            onRemoveCapability={onRemoveCapability}
                        />
                    ) : null}
                    <VStack style={styles.inputRow}>
                        <Input
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
                                            disabled || sending ? styles.modelButtonDisabled : null,
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
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={selectedPermissionOption.description}
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
                                    accessibilityLabel={modelSelectionAccessibilityLabel}
                                    disabled={modelSelectionDisabled}
                                    onPress={onOpenModelSelector}
                                    style={({ pressed }) => [
                                        styles.modelButton,
                                        modelSelectionDisabled ? styles.modelButtonDisabled : null,
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
                                            <Text numberOfLines={1} style={styles.modelButtonText}>
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
                            </HStack>
                            <HStack style={styles.rightActions}>
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
                                    accessibilityLabel={actionLabel}
                                    disabled={actionDisabled}
                                    onPress={actionIsStop ? onStopTurn : onSend}
                                    style={({ pressed }) => [
                                        styles.sendButton,
                                        actionDisabled && styles.sendButtonDisabled,
                                        pressed && !actionDisabled && styles.sendButtonPressed,
                                    ]}
                                >
                                    {actionLoading ? (
                                        <Spinner size={theme.space(4)} color={actionColor} />
                                    ) : actionIsStop ? (
                                        <Square size={theme.space(4)} color={actionColor} />
                                    ) : (
                                        <ArrowUp size={theme.space(5)} color={actionColor} />
                                    )}
                                </Pressable>
                            </HStack>
                        </HStack>
                    </VStack>
                </VStack>
            </Box>
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

type ComposerChipRailProps = {
    attachments: ComposerAttachment[];
    capabilities: ComposerCapability[];
    disabled: boolean;
    onRemoveAttachment: (index: number) => void;
    onRemoveCapability: (index: number) => void;
};

const ComposerChipRail = ({
    attachments,
    capabilities,
    disabled,
    onRemoveAttachment,
    onRemoveCapability,
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

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        backgroundColor: 'transparent',
        paddingRight: rt.insets.right + theme.space(4),
        paddingBottom: rt.insets.bottom + theme.space(2),
        paddingLeft: rt.insets.left + theme.space(4),
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
    steerButton: {
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
