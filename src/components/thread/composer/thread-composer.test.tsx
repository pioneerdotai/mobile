import React from 'react';
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

import type { ComposerSkillChip } from '@/client';
import { ThreadComposer } from './thread-composer';

const mountedTrees: ReactTestRenderer[] = [];

afterEach(() => {
    act(() => {
        for (const tree of mountedTrees.splice(0)) {
            tree.unmount();
        }
    });
});

const theme = {
    colors: {
        background: '#fff',
        border: '#ddd',
        dangerText: '#b00',
        foreground: '#111',
        neutral: { 950: '#000' },
        surfaceMuted: '#eee',
        textMuted: '#777',
        typography: '#111',
        white: '#fff',
    },
    space: (value: number) => value * 4,
};

jest.mock('expo-haptics', () => ({
    ImpactFeedbackStyle: { Medium: 'medium' },
    impactAsync: jest.fn(),
}));
jest.mock('react-native-keyboard-controller', () => ({
    KeyboardController: { dismiss: jest.fn(), isVisible: () => false },
}));
jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: (styles: unknown) => styles },
    useUnistyles: () => ({
        theme,
        rt: { themeName: 'light' },
    }),
}));
jest.mock('lucide-react-native', () => ({
    ArrowUp: () => null,
    AtSign: () => null,
    Check: () => null,
    ChevronDown: () => null,
    File: () => null,
    FileAudio: () => null,
    FileVideo: () => null,
    Image: () => null,
    Infinity: () => null,
    Keyboard: () => null,
    Loader: () => null,
    MessageCircle: () => null,
    MessageSquarePlus: () => null,
    Mic: () => null,
    Plus: () => null,
    ShieldAlert: () => null,
    ShieldCheck: () => null,
    ShieldX: () => null,
    Square: () => null,
    TriangleAlert: () => null,
    Users: () => null,
    X: () => null,
    Zap: () => null,
}));
jest.mock('@/components/icons/mcp-icon', () => ({ McpIcon: () => null }));
jest.mock('@/components/overlays/composer-mentions', () => ({
    ComposerMentionSheet: 'ComposerMentionSheet',
}));
jest.mock('@/components/feedback/spinner', () => () => null);
jest.mock('@/components/primitives/box', () => ({ Box: 'Box' }));
jest.mock('@/components/primitives/hstack', () => ({ HStack: 'HStack' }));
jest.mock('@/components/primitives/input', () => ({ Input: 'Input' }));
jest.mock('@/components/primitives/pressable', () => ({ Pressable: 'Pressable' }));
jest.mock('@/components/primitives/scrollview', () => ({ ScrollView: 'ScrollView' }));
jest.mock('@/components/primitives/text', () => ({ Text: 'Text' }));
jest.mock('@/components/primitives/vstack', () => ({ VStack: 'VStack' }));

const skillChips: ComposerSkillChip[] = [
    {
        key: 'skill_pack:PPPPPPPPPPPPPPPPPPPPP',
        kind: 'skill_pack',
        label: 'Research Pack',
        pack_id: 'PPPPPPPPPPPPPPPPPPPPP',
        skill_id: null,
    },
    {
        key: 'skill:SSSSSSSSSSSSSSSSSSSSS',
        kind: 'packed_skill',
        label: 'Research Pack / Search',
        pack_id: 'PPPPPPPPPPPPPPPPPPPPP',
        skill_id: 'SSSSSSSSSSSSSSSSSSSSS',
    },
    {
        key: 'skill:DDDDDDDDDDDDDDDDDDDDD',
        kind: 'standalone_skill',
        label: 'Docs',
        pack_id: null,
        skill_id: 'DDDDDDDDDDDDDDDDDDDDD',
    },
];

const chipForLabel = (root: ReactTestInstance, label: string): ReactTestInstance => {
    const text = root.find(
        (node) => (node.type as unknown) === 'Text' && node.props.children === label,
    );
    return text.parent!;
};

const composerProps = (
    overrides: Partial<React.ComponentProps<typeof ThreadComposer>> = {},
): React.ComponentProps<typeof ThreadComposer> => ({
    value: '',
    placeholder: 'Message',
    sendLabel: 'Send',
    stopLabel: 'Stop',
    steerLabel: 'Steer',
    disabled: false,
    sending: false,
    canSend: true,
    canSteerTurn: false,
    steering: false,
    hasInFlightTurn: false,
    canStopTurn: false,
    turnCancelling: false,
    composerMode: 'Message',
    modeLabel: 'Chat',
    modeAccessibilityLabel: 'Chat',
    modeSwitcherDisabled: false,
    messageMode: false,
    error: null,
    modeNotice: null,
    replyTarget: null,
    editTarget: null,
    selectedMentions: [],
    mentionCandidates: [],
    attachments: [],
    capabilities: [],
    skillChips: [],
    attachmentsEnabled: true,
    attachmentMenuAccessibilityLabel: 'Attachments',
    dismissLabel: 'Dismiss',
    replyCancelLabel: 'Cancel reply',
    editLabel: 'Edit message',
    editCancelLabel: 'Cancel edit',
    mentionAddLabel: 'Mention',
    mentionEmptyLabel: 'No participants',
    mentionSearchPlaceholder: 'Search participants',
    mentionSearchDismissLabel: 'Done',
    mentionRemoveLabel: 'Remove mention',
    modelSelectionLabel: 'Model',
    modelSelectionLoading: false,
    modelSelectionAccessibilityLabel: 'Select model',
    modelSelectionDisabled: false,
    modelSelectionComplete: true,
    permissionModeOptions: [
        {
            mode: 'full_access',
            label: 'Full access',
            description: 'Allow all actions',
        },
    ],
    selectedPermissionMode: 'full_access',
    onChangeText: jest.fn(),
    onSend: jest.fn(),
    onSteerTurn: jest.fn(),
    onStopTurn: jest.fn(),
    onOpenAttachmentMenu: jest.fn(),
    onOpenModeSelector: jest.fn(),
    onDismissModeNotice: jest.fn(),
    onClearReplyTarget: jest.fn(),
    onCancelEdit: jest.fn(),
    onSelectMention: jest.fn(),
    onRemoveMention: jest.fn(),
    onOpenModelSelector: jest.fn(),
    onOpenPermissionModeSelector: jest.fn(),
    onRemoveAttachment: jest.fn(),
    onRemoveCapability: jest.fn(),
    onRemoveSkillChip: jest.fn(),
    voiceVisible: false,
    voiceEnabled: false,
    voiceBusy: false,
    voiceProcessing: false,
    voiceLevel: 0,
    voiceMicrophoneLabel: 'Microphone',
    voiceKeyboardLabel: 'Keyboard',
    voiceHoldLabel: 'Hold',
    voiceReleaseToSendLabel: 'Release to send',
    voiceReleaseToCancelLabel: 'Release to cancel',
    onVoiceStart: jest.fn(),
    onVoiceCommit: jest.fn(),
    onVoiceCancel: jest.fn(),
    ...overrides,
});

describe('mobile Composer interactions', () => {
    it('hides the mention action when no participants are available', async () => {
        let tree: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(
                <ThreadComposer
                    {...composerProps({
                        messageMode: true,
                        mentionCandidates: [],
                    })}
                />,
            );
            mountedTrees.push(tree);
        });

        const buttons = tree!.root.findAll((node) => (node.type as unknown) === 'Pressable');
        expect(buttons.some((button) => button.props.accessibilityLabel === 'Mention')).toBe(false);
    });

    it('renders full, partial, and standalone labels and removes the exact chip', async () => {
        const onRemoveSkillChip = jest.fn();
        let tree: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(
                <ThreadComposer
                    {...composerProps()}
                    skillChips={skillChips}
                    onRemoveSkillChip={onRemoveSkillChip}
                />,
            );
            mountedTrees.push(tree);
        });

        expect(chipForLabel(tree!.root, 'Research Pack')).toBeDefined();
        const partial = chipForLabel(tree!.root, 'Research Pack / Search');
        expect(chipForLabel(tree!.root, 'Docs')).toBeDefined();

        await act(async () => {
            partial.find((node) => (node.type as unknown) === 'Pressable').props.onPress();
        });
        expect(onRemoveSkillChip).toHaveBeenCalledTimes(1);
        expect(onRemoveSkillChip).toHaveBeenCalledWith(skillChips[1]);
    });

    it('keeps Message send and Stop separate while hiding execution-only controls', async () => {
        let tree: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(
                <ThreadComposer
                    {...composerProps({
                        value: 'ordinary message',
                        messageMode: true,
                        hasInFlightTurn: true,
                        canStopTurn: true,
                    })}
                />,
            );
            mountedTrees.push(tree);
        });

        const buttons = tree!.root.findAll((node) => (node.type as unknown) === 'Pressable');
        expect(buttons.some((button) => button.props.accessibilityLabel === 'Send')).toBe(true);
        expect(buttons.some((button) => button.props.accessibilityLabel === 'Stop')).toBe(true);
        expect(buttons.some((button) => button.props.accessibilityLabel === 'Select model')).toBe(
            false,
        );
        expect(JSON.stringify(tree!.toJSON())).not.toContain('Research Pack');
    });

    it('replaces the mode panel with a single-line reply and keeps mention interactions', async () => {
        const onClearReplyTarget = jest.fn();
        const onSelectMention = jest.fn();
        const candidate = {
            principal_id: 'principal-b',
            display_name: 'Teammate',
            nickname: 'teammate',
            avatar_revision: null,
        };
        let tree: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(
                <ThreadComposer
                    {...composerProps({
                        messageMode: true,
                        replyTarget: {
                            turn_id: 'turn-parent',
                            author_display_name: 'Teammate',
                            preview: 'Earlier message',
                        },
                        mentionCandidates: [candidate],
                        onClearReplyTarget,
                        onSelectMention,
                    })}
                />,
            );
            mountedTrees.push(tree);
        });

        expect(tree!.root.findAll((node) => node.props.accessibilityLabel === 'Chat')).toHaveLength(
            0,
        );
        const replyPreview = tree!.root.find(
            (node) =>
                (node.type as unknown) === 'Text' &&
                node.props.numberOfLines === 1 &&
                JSON.stringify(node.props.children).includes('Earlier message'),
        );
        expect(replyPreview.props.ellipsizeMode).toBe('tail');

        await act(async () => {
            tree!.root
                .find((node) => node.props.accessibilityLabel === 'Cancel reply')
                .props.onPress();
            tree!.root.find((node) => node.props.accessibilityLabel === 'Mention').props.onPress();
        });
        const mentionSheet = tree!.root.find(
            (node) => (node.type as unknown) === 'ComposerMentionSheet',
        );
        expect(mentionSheet.props.open).toBe(true);
        await act(async () => {
            mentionSheet.props.onSelect(candidate);
        });

        expect(onClearReplyTarget).toHaveBeenCalledTimes(1);
        expect(onSelectMention).toHaveBeenCalledWith(candidate);
    });
});
