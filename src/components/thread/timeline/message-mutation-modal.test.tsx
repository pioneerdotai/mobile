import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, jest } from '@jest/globals';

import { pioneerClient } from '@/client';
import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { MessageMutationModal } from './message-mutation-modal';

const mockReact = React;

jest.mock('@/client', () => {
    class NativeError extends Error {
        readonly code?: string | null;

        constructor(message: string, code?: string | null) {
            super(message);
            this.name = 'PioneerClientNativeError';
            this.code = code;
        }
    }
    return {
        pioneerClient: {
            turnMessageDelete: jest.fn(),
        },
        PioneerClientNativeError: NativeError,
    };
});
jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: (styles: unknown) => styles },
    useUnistyles: () => ({ theme: { colors: { dangerText: '#f00' } } }),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/components/feedback/spinner', () => ({
    __esModule: true,
    default: 'Spinner',
}));
jest.mock('@/components/overlays/notification', () => ({
    Notification: (props: Record<string, unknown>) =>
        mockReact.createElement('Notification', props, props.children as React.ReactNode),
}));
jest.mock('@/components/primitives/box', () => ({ Box: 'Box' }));
jest.mock('@/components/primitives/pressable', () => ({ Pressable: 'Pressable' }));
jest.mock('@/components/primitives/text', () => ({ Text: 'Text' }));
jest.mock('@/components/primitives/vstack', () => ({ VStack: 'VStack' }));

const row = (): Extract<TimelineRow, { type: 'user-message' }> => ({
    type: 'user-message',
    key: 'user-message:turn-a',
    itemId: 'item-a',
    turnId: 'turn-a',
    text: 'Original',
    timestampLabel: '',
    mode: 'Message',
    author: null,
    reply: null,
    replyState: null,
    mentions: [{ principal_id: 'principal-b', nickname: 'teammate' }],
    revision: 4,
    edited: false,
    deleted: false,
    attachments: [
        {
            id: 'artifact-a',
            label: 'Plan.pdf',
            kind: 'artifact',
            artifact: {
                artifact_id: 'artifact-a',
                version_id: 'version-a',
                display_name: 'Plan.pdf',
                kind: 'pdf',
                status: 'ready',
            },
        },
    ],
});

describe('mobile Message mutation modal', () => {
    it('deletes only through confirmation with the current expected revision', async () => {
        jest.mocked(pioneerClient.turnMessageDelete).mockResolvedValue({
            turn: { id: 'turn-a' },
        } as never);
        const refresh = jest.fn(async () => undefined);
        let tree: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(
                <MessageMutationModal
                    target={{ kind: 'delete', threadId: 'thread-a', row: row() }}
                    onAuthoritativeRefresh={refresh}
                    onClose={jest.fn()}
                />,
            );
        });
        expect(pioneerClient.turnMessageDelete).not.toHaveBeenCalled();
        await act(async () => {
            tree!.root
                .find((node) => node.props.accessibilityLabel === 'timelineMessageDeleteConfirm')
                .props.onPress();
        });
        expect(pioneerClient.turnMessageDelete).toHaveBeenCalledWith({
            thread_id: 'thread-a',
            turn_id: 'turn-a',
            expected_revision: 4,
        });
    });
});
