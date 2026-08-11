import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { InvitationProfileProvider } from './profile-context';

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

class MockMobileInvitationJoinError extends Error {
    readonly code: string;

    constructor(code: string) {
        super(code);
        this.code = code;
    }
}

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
jest.mock('@/services/gateway/invitation-join', () => ({
    MobileInvitationJoinError: MockMobileInvitationJoinError,
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

const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
};

const fillProfile = async (tree: ReactTestRenderer) => {
    await act(async () => {
        const fields = profileFields(tree);
        fields.name.props.onFirstNameChange('Alexander');
        fields.name.props.onLastNameChange('Oskin');
    });
};

const renderJoin = (
    onSubmit: React.ComponentProps<typeof InvitationJoinScreen>['onSubmit'],
    initialNickname = 'superoskin',
) =>
    renderer.create(
        <InvitationProfileProvider initialNickname={initialNickname}>
            <InvitationJoinScreen onCancel={jest.fn()} onSubmit={onSubmit} />
        </InvitationProfileProvider>,
    );

describe('InvitationJoinScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSelectAvatar.mockResolvedValue(null);
    });

    it('reuses the account profile fields and submits their normalized profile', async () => {
        const onSubmit = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderJoin(onSubmit);
        });

        expect(profileFields(tree!).avatar.props.actionLabel).toBe('profile.choosePhoto');
        expect(headerSubmit().disabled).toBe(true);

        await fillProfile(tree!);
        expect(profileFields(tree!).username.props.value).toBe('superoskin');
        expect(headerSubmit().disabled).toBe(false);

        await act(async () => {
            headerSubmit().onPress();
            await flushPromises();
        });
        expect(onSubmit).toHaveBeenCalledWith({
            display_name: 'Alexander Oskin',
            nickname: 'superoskin',
            avatar: null,
        });
    });

    it('pushes the real nested username route from the shared account field', async () => {
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderJoin(jest.fn<() => Promise<void>>().mockResolvedValue(undefined), '');
        });

        await act(async () => {
            profileFields(tree!).username.props.onPress();
        });
        expect(mockRouterPush).toHaveBeenCalledWith('/invite/username');
    });

    it('passes the selected account-style avatar through invitation acceptance', async () => {
        const avatar = {
            input: { media_type: 'image/png', content_base64: 'cG5n' },
            uri: 'file:///avatar.png',
            fileName: 'avatar.png',
        };
        mockSelectAvatar.mockResolvedValue(avatar);
        const onSubmit = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderJoin(onSubmit);
        });

        await act(async () => {
            await profileFields(tree!).avatar.props.onPress();
        });
        await fillProfile(tree!);
        await act(async () => {
            headerSubmit().onPress();
            await flushPromises();
        });

        expect(profileFields(tree!).avatar.props).toMatchObject({
            actionLabel: 'profile.changePhoto',
            imageUri: avatar.uri,
        });
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ avatar: avatar.input }));
    });

    it('shows nickname availability errors in the shared username field', async () => {
        const onSubmit = jest
            .fn<() => Promise<void>>()
            .mockRejectedValue(new MockMobileInvitationJoinError('nickname_unavailable'));
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderJoin(onSubmit);
        });
        await fillProfile(tree!);
        await act(async () => {
            headerSubmit().onPress();
            await flushPromises();
        });

        expect(profileFields(tree!).username.props.error).toBe(
            'invitation.join.errors.nicknameUnavailable',
        );
    });
});
