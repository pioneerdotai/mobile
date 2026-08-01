import React from 'react';
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, jest } from '@jest/globals';

import type { ComposerSkillChip } from '@/client';
import { ThreadComposer } from './thread-composer';

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
    Check: () => null,
    ChevronDown: () => null,
    File: () => null,
    FileAudio: () => null,
    FileVideo: () => null,
    Image: () => null,
    Keyboard: () => null,
    Loader: () => null,
    MessageSquarePlus: () => null,
    Mic: () => null,
    Plus: () => null,
    ShieldAlert: () => null,
    ShieldCheck: () => null,
    ShieldX: () => null,
    Square: () => null,
    TriangleAlert: () => null,
    X: () => null,
    Zap: () => null,
}));
jest.mock('@/components/icons/mcp-icon', () => ({ McpIcon: () => null }));
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

describe('mobile Composer skill chips', () => {
    it('renders full, partial, and standalone labels and removes the exact chip', async () => {
        const onRemoveSkillChip = jest.fn();
        let tree: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(
                <ThreadComposer
                    value=""
                    placeholder="Message"
                    sendLabel="Send"
                    stopLabel="Stop"
                    steerLabel="Steer"
                    disabled={false}
                    sending={false}
                    canSend
                    canSteerTurn={false}
                    steering={false}
                    hasInFlightTurn={false}
                    canStopTurn={false}
                    turnCancelling={false}
                    error={null}
                    attachments={[]}
                    capabilities={[]}
                    skillChips={skillChips}
                    attachmentsEnabled
                    attachmentMenuAccessibilityLabel="Attachments"
                    modelSelectionLabel="Model"
                    modelSelectionLoading={false}
                    modelSelectionAccessibilityLabel="Select model"
                    modelSelectionDisabled={false}
                    modelSelectionComplete
                    permissionModeOptions={[
                        {
                            mode: 'full_access',
                            label: 'Full access',
                            description: 'Allow all actions',
                        },
                    ]}
                    selectedPermissionMode="full_access"
                    onChangeText={jest.fn()}
                    onSend={jest.fn()}
                    onSteerTurn={jest.fn()}
                    onStopTurn={jest.fn()}
                    onOpenAttachmentMenu={jest.fn()}
                    onOpenModelSelector={jest.fn()}
                    onOpenPermissionModeSelector={jest.fn()}
                    onRemoveAttachment={jest.fn()}
                    onRemoveCapability={jest.fn()}
                    onRemoveSkillChip={onRemoveSkillChip}
                    voiceVisible={false}
                    voiceEnabled={false}
                    voiceBusy={false}
                    voiceProcessing={false}
                    voiceLevel={0}
                    voiceMicrophoneLabel="Microphone"
                    voiceKeyboardLabel="Keyboard"
                    voiceHoldLabel="Hold"
                    voiceReleaseToSendLabel="Release to send"
                    voiceReleaseToCancelLabel="Release to cancel"
                    onVoiceStart={jest.fn()}
                    onVoiceCommit={jest.fn()}
                    onVoiceCancel={jest.fn()}
                />,
            );
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
});
