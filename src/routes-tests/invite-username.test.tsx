import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { InvitationPublication } from '@/client/generated/invitation_publication';
const mockDispatch = jest.fn();
let mockValue: Partial<InvitationPublication>;
jest.mock('@/client/onboarding', () => ({
    useInvitation: () => mockValue,
    dispatchInvitation: mockDispatch,
}));

const mockReact = React;
const mockRouterBack = jest.fn();
const mockSetOptions = jest.fn();
const mockUsernameEditor = (props: Record<string, unknown>) =>
    mockReact.createElement('ProfileUsernameEditor', props);
const mockHeaderCheckButton = (props: Record<string, unknown>) =>
    mockReact.createElement('HeaderCheckButton', props);
jest.mock('expo-router', () => ({
    router: { back: mockRouterBack },
    useNavigation: () => ({ setOptions: mockSetOptions }),
}));
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/components/buttons/header-action', () => ({
    HeaderCheckButton: mockHeaderCheckButton,
}));
jest.mock('@/components/forms/profile-editor', () => ({
    ProfileUsernameEditor: mockUsernameEditor,
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const InvitationUsernameScreen = require('@/routes/invite/username')
    .default as typeof import('@/routes/invite/username').default;

const editor = (tree: ReactTestRenderer) => tree.root.findByType(mockUsernameEditor);

const headerSubmit = (): { disabled: boolean; onPress: () => void } => {
    const options = mockSetOptions.mock.calls.at(-1)?.[0] as {
        headerRight: () => React.ReactElement<Record<string, unknown>>;
    };
    return options.headerRight().props as { disabled: boolean; onPress: () => void };
};

describe('InvitationUsernameScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockValue = {
            owner_generation: 3,
            nickname: '',
            nickname_valid: false,
            username_editing: true,
        };
    });
    it('edits the Client draft and accepts before popping the nested stack', async () => {
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<InvitationUsernameScreen />);
        });
        expect(headerSubmit().disabled).toBe(true);
        act(() => editor(tree).props.onChangeText('member'));
        expect(mockDispatch).toHaveBeenLastCalledWith({
            kind: 'edit_field',
            expected_owner: 3,
            field: 'nickname',
            value: 'member',
        });
        mockValue = { ...mockValue, nickname: 'member', nickname_valid: true };
        await act(async () => tree.update(<InvitationUsernameScreen />));
        expect(headerSubmit().disabled).toBe(false);
        act(() => headerSubmit().onPress());
        expect(mockDispatch).toHaveBeenLastCalledWith({
            kind: 'accept_username_for_owner',
            expected_owner: mockValue.owner_generation,
        });
        expect(mockRouterBack).toHaveBeenCalledTimes(1);
        act(() => tree.unmount());
    });
    it('does not edit or submit a replacement invitation from an older username screen', async () => {
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<InvitationUsernameScreen />);
        });
        mockValue = { ...mockValue, owner_generation: 4, nickname_valid: true };
        await act(async () => tree.update(<InvitationUsernameScreen />));
        act(() => editor(tree).props.onChangeText('late'));
        act(() => headerSubmit().onPress());
        expect(mockDispatch).not.toHaveBeenCalled();
        expect(mockRouterBack).not.toHaveBeenCalled();
        act(() => tree.unmount());
        expect(mockDispatch).toHaveBeenLastCalledWith({
            kind: 'cancel_username_for_owner',
            expected_owner: 3,
        });
    });
    it('cancels an unaccepted draft on native back/unmount', async () => {
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<InvitationUsernameScreen />);
        });
        act(() => tree.unmount());
        expect(mockDispatch).toHaveBeenCalledWith({
            kind: 'cancel_username_for_owner',
            expected_owner: mockValue.owner_generation,
        });
    });
});
