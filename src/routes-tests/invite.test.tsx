import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockReact = React;
const mockRouterReplace = jest.fn();
const mockRouterDismiss = jest.fn();
const mockRouterSetParams = jest.fn();
const mockClearInitialUrl = jest.fn();
const mockPresentation = jest.fn<(input: { uri: string }) => Promise<Record<string, unknown>>>();
const mockPreview = jest.fn<(input: { uri: string }) => Promise<Record<string, unknown>>>();
const mockAccept = jest.fn<(input: Record<string, unknown>) => Promise<void>>();
const mockJoinScreen = (props: Record<string, unknown>) =>
    mockReact.createElement('InvitationJoinScreen', props);
let mockLinkingUrl: string | null = null;

jest.setMock('expo-linking', {
    __esModule: true,
    clearInitialURL: mockClearInitialUrl,
    useLinkingURL: () => mockLinkingUrl,
});
jest.setMock('expo-router', {
    __esModule: true,
    router: {
        dismiss: mockRouterDismiss,
        replace: mockRouterReplace,
        setParams: mockRouterSetParams,
    },
});
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
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
    useUnistyles: () => ({ theme: { colors: { typography: '#000' } } }),
}));
jest.mock('@/client', () => ({
    pioneerClient: {
        invitationPresentation: mockPresentation,
        invitationPreview: mockPreview,
    },
}));
jest.mock('@/components/buttons/base', () => ({
    Button: (props: Record<string, unknown>) => mockReact.createElement('Button', props),
}));
jest.mock('@/components/feedback/spinner', () => ({
    __esModule: true,
    default: (props: Record<string, unknown>) => mockReact.createElement('Spinner', props),
}));
jest.mock('@/screens/invitation/join', () => ({
    __esModule: true,
    default: mockJoinScreen,
}));
jest.mock('@/services/gateway/invitation-join', () => ({
    MobileInvitationJoinError: class MobileInvitationJoinError extends Error {},
    acceptMobileInvitation: mockAccept,
}));

const InviteRoute =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/routes/invite').default as typeof import('@/routes/invite').default;

const invitationUri =
    'pioneer-dev://invite?gateway_base_url=https%3A%2F%2Fgateway.example%2F' +
    '&gateway_id=G00000000000000000001#token=pinv1_REDACTED';

const flushPromises = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

const settleLatestPreview = async (): Promise<void> => {
    await act(async () => {
        const presentation = mockPresentation.mock.results.at(-1)?.value;
        const preview = mockPreview.mock.results.at(-1)?.value;
        await Promise.allSettled([presentation, preview]);
        await flushPromises();
        await new Promise<void>((resolve) => setImmediate(resolve));
    });
};

const joinScreen = (tree: ReactTestRenderer) =>
    tree.root.find(
        (node) =>
            typeof node.props.onSubmit === 'function' &&
            typeof node.props.onCancel === 'function' &&
            node.props.presentation,
    );

describe('InviteRoute', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLinkingUrl = null;
        mockPresentation.mockResolvedValue({
            gateway_base_url: 'https://gateway.example/',
            gateway_id: 'G00000000000000000001',
            transport_security: 'secure_wss',
            canonical_uri: invitationUri,
            qr_payload: invitationUri,
        });
        mockPreview.mockResolvedValue({
            gateway_id: 'G00000000000000000001',
            inviter: { display_name: 'Owner' },
            workspaces: [{ name: 'Workspace' }],
            expires_at_unix: 100,
            transport: 'secure_wss',
        });
        mockAccept.mockResolvedValue();
    });

    it('hands a cold link directly to native parsing without replacing the owning route', async () => {
        mockLinkingUrl = invitationUri;
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<InviteRoute />);
        });
        await settleLatestPreview();

        expect(mockRouterReplace).not.toHaveBeenCalledWith('/invite');
        expect(mockRouterReplace).not.toHaveBeenCalledWith(expect.stringContaining('pinv1_'));
        expect(mockRouterSetParams).toHaveBeenCalledWith({
            '#': undefined,
            gateway_base_url: undefined,
            gateway_id: undefined,
        });
        expect(mockClearInitialUrl).toHaveBeenCalledTimes(1);
        expect(mockPresentation).toHaveBeenCalledWith({ uri: invitationUri });
        expect(mockPreview).toHaveBeenCalledWith({ uri: invitationUri });
        expect(joinScreen(tree!).props.presentation).toEqual({
            gateway_base_url: 'https://gateway.example/',
            gateway_id: 'G00000000000000000001',
            transport_security: 'secure_wss',
        });
    });

    it('deduplicates warm delivery and one submit produces one accept', async () => {
        mockLinkingUrl = invitationUri;
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<InviteRoute />);
        });
        await settleLatestPreview();
        await act(async () => {
            tree!.update(<InviteRoute />);
            await flushPromises();
        });
        expect(mockPreview).toHaveBeenCalledTimes(1);

        const profile = { display_name: 'Member', nickname: 'member', avatar: null };
        await act(async () => {
            await joinScreen(tree!).props.onSubmit(profile);
        });
        expect(mockAccept).toHaveBeenCalledTimes(1);
        expect(mockAccept).toHaveBeenCalledWith({ uri: invitationUri, profile });
        expect(mockRouterDismiss).toHaveBeenCalledTimes(1);
        expect(mockRouterReplace).not.toHaveBeenCalledWith('/');
    });

    it('clears secret ownership on cancel and invalid preview', async () => {
        mockLinkingUrl = invitationUri;
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<InviteRoute />);
        });
        await settleLatestPreview();
        act(() => joinScreen(tree!).props.onCancel());
        expect(mockRouterDismiss).toHaveBeenCalledTimes(1);
        expect(mockRouterReplace).not.toHaveBeenCalledWith('/');

        mockPreview.mockRejectedValueOnce(new Error('secret must not be displayed'));
        mockLinkingUrl = `${invitationUri}x`;
        await act(async () => {
            tree!.update(<InviteRoute />);
        });
        await settleLatestPreview();
        expect(JSON.stringify(tree!.toJSON())).not.toContain('pinv1_');
    });

    it('does not consume a production link in the development application', async () => {
        mockLinkingUrl = invitationUri.replace('pioneer-dev://', 'pioneer://');
        await act(async () => {
            renderer.create(<InviteRoute />);
            await flushPromises();
        });
        expect(mockPresentation).not.toHaveBeenCalled();
        expect(mockPreview).not.toHaveBeenCalled();
        expect(mockClearInitialUrl).not.toHaveBeenCalled();
    });
});
