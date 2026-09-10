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
const mockSelectAvatar = jest.fn<() => Promise<Record<string, unknown> | null>>();
const mockSetOptions = jest.fn();
const mockRouterPush = jest.fn();
const mockHeaderCheckButton = (props: Record<string, unknown>) =>
    mockReact.createElement('HeaderCheckButton', props);
const mockAvatarField = (props: Record<string, unknown>) =>
    mockReact.createElement('ProfileAvatarField', props);
const mockNameFields = (props: Record<string, unknown>) =>
    mockReact.createElement('ProfileNameFields', props);
const mockUsernameField = (props: Record<string, unknown>) =>
    mockReact.createElement('ProfileUsernameField', props);

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-router', () => ({
    router: { push: mockRouterPush },
    useNavigation: () => ({ setOptions: mockSetOptions }),
}));

jest.mock('react-native-unistyles', () => ({
    StyleSheet: {
        create: () =>
            new Proxy(
                {},
                {
                    get: () => ({}),
                },
            ),
    },
    useUnistyles: () => ({
        theme: {
            colors: { background: '#fff', typography: '#000' },
        },
    }),
}));

jest.mock('@/components/buttons/back', () => ({
    BackButton: (props: Record<string, unknown>) => mockReact.createElement('BackButton', props),
}));
jest.mock('@/components/buttons/header-action', () => ({
    HeaderCheckButton: mockHeaderCheckButton,
}));
jest.mock('@/components/forms/profile-editor', () => ({
    ProfileAvatarField: mockAvatarField,
    ProfileIdentityGroup: (props: Record<string, unknown>) =>
        mockReact.createElement('ProfileIdentityGroup', props, props.children as React.ReactNode),
    ProfileNameFields: mockNameFields,
    ProfileUsernameField: mockUsernameField,
}));
jest.mock('@/components/primitives/box', () => ({
    Box: (props: Record<string, unknown>) =>
        mockReact.createElement('Box', props, props.children as React.ReactNode),
}));
jest.mock('@/components/primitives/scrollview', () => ({
    ScrollView: (props: Record<string, unknown>) =>
        mockReact.createElement('ScrollView', props, props.children as React.ReactNode),
}));
jest.mock('@/components/primitives/text', () => ({
    Text: (props: Record<string, unknown>) =>
        mockReact.createElement('Text', props, props.children as React.ReactNode),
}));
jest.mock('@/services/profile/avatar', () => ({
    ProfileAvatarSelectionError: class ProfileAvatarSelectionError extends Error {},
    selectProfileAvatar: mockSelectAvatar,
}));
jest.mock('@/client', () => ({}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const InvitationJoinScreen = require('./join').default as typeof import('./join').default;

const profileFields = (tree: ReactTestRenderer) => ({
    avatar: tree.root.findByType(mockAvatarField),
    name: tree.root.findByType(mockNameFields),
    username: tree.root.findByType(mockUsernameField),
});

const headerSubmit = (): { disabled: boolean; onPress: () => void } => {
    const options = mockSetOptions.mock.calls.at(-1)?.[0] as {
        headerRight: () => React.ReactElement<Record<string, unknown>>;
    };
    return options.headerRight().props as { disabled: boolean; onPress: () => void };
};

const renderJoin = () => renderer.create(<InvitationJoinScreen onCancel={jest.fn()} />);

describe('InvitationJoinScreen Client binding', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockValue = {
            owner_generation: 7,
            first_name: '',
            last_name: '',
            nickname: 'member',
            name_valid: false,
            nickname_valid: true,
            submitting: false,
        };
        mockSelectAvatar.mockResolvedValue(null);
    });
    it('preserves profile fields and sends edits without controlled publication echo', async () => {
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderJoin();
        });
        expect(headerSubmit().disabled).toBe(true);
        expect(mockDispatch).not.toHaveBeenCalled();
        act(() => profileFields(tree).name.props.onFirstNameChange('Member'));
        expect(mockDispatch).toHaveBeenLastCalledWith({
            kind: 'edit_field',
            expected_owner: 7,
            field: 'first_name',
            value: 'Member',
        });
        mockValue = { ...mockValue, first_name: 'Member', name_valid: true };
        await act(async () => {
            tree.update(<InvitationJoinScreen onCancel={jest.fn()} />);
        });
        expect(profileFields(tree).name.props.firstName).toBe('Member');
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(headerSubmit().disabled).toBe(false);
        act(() => headerSubmit().onPress());
        expect(mockDispatch).toHaveBeenLastCalledWith({
            kind: 'submit_for_owner',
            expected_owner: 7,
        });
        act(() => tree.unmount());
    });
    it('opens the retained Client username draft before native nested navigation', async () => {
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderJoin();
        });
        act(() => profileFields(tree).username.props.onPress());
        expect(mockDispatch).toHaveBeenCalledWith({
            kind: 'open_username_for_owner',
            expected_owner: mockValue.owner_generation,
        });
        expect(mockRouterPush).toHaveBeenCalledWith('/invite/username');
        act(() => tree.unmount());
    });
    it('guards a late native photo selection with its original invitation owner', async () => {
        let resolve!: (value: Record<string, unknown>) => void;
        mockSelectAvatar.mockImplementation(
            () =>
                new Promise((done) => {
                    resolve = done;
                }),
        );
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderJoin();
        });
        act(() => profileFields(tree).avatar.props.onPress());
        mockValue = { ...mockValue, owner_generation: 8 };
        await act(async () => {
            tree.update(<InvitationJoinScreen onCancel={jest.fn()} />);
        });
        const avatar = {
            uri: 'file:///synthetic.png',
            input: { media_type: 'image/png', content_base64: 'cG5n' },
        };
        await act(async () => {
            resolve(avatar);
            await Promise.resolve();
        });
        expect(mockDispatch).toHaveBeenCalledWith({
            kind: 'select_avatar',
            expected_owner: 7,
            preview: avatar.uri,
            avatar: avatar.input,
        });
        act(() => tree.unmount());
    });
    it('renders field-specific failure and durable storage retry from scoped values', async () => {
        mockValue = {
            ...mockValue,
            nickname_error: 'nickname_unavailable',
            error: 'invitation_registry_write_failed',
            avatar_preview: 'file:///synthetic.png',
        };
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderJoin();
        });
        expect(profileFields(tree).username.props.error).toBe(
            'invitation.join.errors.nicknameUnavailable',
        );
        expect(profileFields(tree).avatar.props.imageUri).toBe('file:///synthetic.png');
        expect(JSON.stringify(tree.toJSON())).toContain('invitation.join.errors.storage');
        act(() => tree.unmount());
    });
});
