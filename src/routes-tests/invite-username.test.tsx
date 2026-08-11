import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import {
    InvitationProfileProvider,
    useInvitationProfile,
} from '@/screens/invitation/profile-context';

const mockReact = React;
const mockRouterBack = jest.fn();
const mockSetOptions = jest.fn();
const mockUsernameEditor = (props: Record<string, unknown>) =>
    mockReact.createElement('ProfileUsernameEditor', props);
const mockHeaderCheckButton = (props: Record<string, unknown>) =>
    mockReact.createElement('HeaderCheckButton', props);
const mockNicknameProbe = (props: { nickname: string }) =>
    mockReact.createElement('NicknameProbe', props);

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
jest.mock('@/services/profile/update', () => ({
    isValidProfileNickname: (value: string) => /^[a-z0-9][a-z0-9._-]{1,31}$/i.test(value),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const InvitationUsernameScreen = require('@/routes/invite/username')
    .default as typeof import('@/routes/invite/username').default;

const NicknameProbe = () => {
    const { nickname } = useInvitationProfile();
    return mockReact.createElement(mockNicknameProbe, { nickname });
};

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
    });

    it('commits the username to the invitation flow and pops the nested stack', async () => {
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(
                <InvitationProfileProvider>
                    <InvitationUsernameScreen />
                    <NicknameProbe />
                </InvitationProfileProvider>,
            );
        });

        expect(headerSubmit().disabled).toBe(true);
        await act(async () => {
            editor(tree!).props.onChangeText('superoskin');
        });
        expect(headerSubmit().disabled).toBe(false);

        await act(async () => {
            headerSubmit().onPress();
        });

        expect(tree!.root.findByType(mockNicknameProbe).props.nickname).toBe('superoskin');
        expect(mockRouterBack).toHaveBeenCalledTimes(1);
    });
});
