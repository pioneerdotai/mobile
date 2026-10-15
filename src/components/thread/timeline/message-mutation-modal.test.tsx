import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { dispatchMessageDeletion, useMessageDeletion } from '@/client/message-deletion';
import type { MessageDeletionPublication } from '@/client/generated/message_deletion_publication';
import { MessageMutationModal } from './message-mutation-modal';

const mockReact = React;

jest.mock('@/client/message-deletion', () => ({
    dispatchMessageDeletion: jest.fn(),
    useMessageDeletion: jest.fn(),
}));
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

const plan = {
    identity: { thread_id: 'a', generation: 1 },
    workspace_id: 'workspace',
    turn_id: 'turn',
    expected_revision: 4,
};
const publication = (
    state: MessageDeletionPublication['state'],
    attempt = 0,
): MessageDeletionPublication => ({
    thread_id: 'a',
    revision: attempt + 1,
    request_generation: attempt,
    plan,
    state,
});
beforeEach(() => {
    jest.clearAllMocks();
});

describe('mobile message deletion confirmation', () => {
    it('sends only explicit typed confirmation and derives pending/conflict from Client', async () => {
        const close = jest.fn();
        const element = () => (
            <MessageMutationModal target={{ kind: 'delete', plan }} onClose={close} />
        );
        let tree: ReactTestRenderer;
        jest.mocked(useMessageDeletion).mockReturnValue(publication({ kind: 'confirming' }));
        await act(async () => {
            tree = renderer.create(element());
        });
        const confirm = () =>
            tree!.root.find(
                (node) => node.props.accessibilityLabel === 'timelineMessageDeleteConfirm',
            );
        expect(dispatchMessageDeletion).not.toHaveBeenCalled();
        await act(async () => {
            confirm().props.onPress();
        });
        expect(dispatchMessageDeletion).toHaveBeenCalledTimes(1);
        expect(dispatchMessageDeletion).toHaveBeenLastCalledWith({
            kind: 'confirm',
            identity: plan.identity,
        });
        jest.mocked(useMessageDeletion).mockReturnValue(publication({ kind: 'pending' }, 2));
        await act(async () => {
            tree!.update(element());
        });
        expect(confirm().props.disabled).toBe(true);
        expect(
            tree!.root.find((node) => node.type === ('Notification' as never)).props.dismissible,
        ).toBe(false);
        jest.mocked(useMessageDeletion).mockReturnValue(
            publication({ kind: 'failed', conflicted: false }, 2),
        );
        await act(async () => {
            tree!.update(element());
        });
        expect(confirm().props.disabled).toBe(false);
        await act(async () => {
            confirm().props.onPress();
        });
        expect(dispatchMessageDeletion).toHaveBeenLastCalledWith({
            kind: 'confirm',
            identity: plan.identity,
        });
        jest.mocked(useMessageDeletion).mockReturnValue(
            publication({ kind: 'failed', conflicted: true }, 3),
        );
        await act(async () => {
            tree!.update(element());
        });
        expect(confirm().props.disabled).toBe(true);
        expect(
            tree!.root.findAll((node) => node.props.children === 'timelineMessageMutationConflict')
                .length,
        ).toBeGreaterThan(0);
        expect(close).not.toHaveBeenCalled();
        jest.mocked(useMessageDeletion).mockReturnValue(publication({ kind: 'completed' }, 3));
        await act(async () => {
            tree!.update(element());
        });
        expect(close).toHaveBeenCalledTimes(1);
        await act(async () => {
            tree!.unmount();
        });
        expect(dispatchMessageDeletion).toHaveBeenLastCalledWith({
            kind: 'cancel',
            identity: plan.identity,
        });
    });
    it('closes an old confirmation instead of adopting another operation for the same message', async () => {
        const close = jest.fn();
        const other = publication({ kind: 'pending' }, 5);
        other.plan = { ...plan, identity: { ...plan.identity, generation: 4 } };
        jest.mocked(useMessageDeletion).mockReturnValue(other);
        let tree: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(
                <MessageMutationModal target={{ kind: 'delete', plan }} onClose={close} />,
            );
        });
        expect(close).toHaveBeenCalledTimes(1);
        expect(dispatchMessageDeletion).not.toHaveBeenCalled();
        await act(async () => {
            tree!.unmount();
        });
        expect(dispatchMessageDeletion).toHaveBeenCalledWith({
            kind: 'cancel',
            identity: plan.identity,
        });
    });
});
