import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockReact = React;
const mockRouterReplace = jest.fn();
const mockRouterDismiss = jest.fn();
const mockRouterSetParams = jest.fn();
const mockClearInitialUrl = jest.fn();
const mockDispatch = jest.fn();
const mockHydrate = jest.fn<() => Promise<void>>();
let mockValue: Record<string, unknown> | null;
let mockDestinations: Record<string, unknown> | null;
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('@/client/onboarding', () => ({
    useInvitation: () => mockValue,
    useGatewayDestinations: () => mockDestinations,
    dispatchInvitation: mockDispatch,
    hydrateOnboarding: mockHydrate,
}));
jest.mock('@/client/mobile-client-binding', () => ({
    mobileClientBinding: { scope: () => ({ getSnapshot: () => ({ payload: mockValue }) }) },
}));
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

describe('InviteRoute Client handoff', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLinkingUrl = invitationUri;
        mockDestinations = null;
        mockValue = {
            owner_generation: 4,
            preview: { gateway_id: 'G00000000000000000001' },
            phase: 'editing_profile',
        };
        mockHydrate.mockResolvedValue();
    });
    it('sanitizes a cold link and opens it once without putting its secret into render props', async () => {
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<InviteRoute />);
            await flushPromises();
        });
        expect(mockDispatch).toHaveBeenCalledWith({ kind: 'open', uri: invitationUri });
        expect(mockRouterReplace).not.toHaveBeenCalled();
        expect(mockRouterSetParams).toHaveBeenCalledWith({
            '#': undefined,
            gateway_base_url: undefined,
            gateway_id: undefined,
        });
        expect(JSON.stringify(tree.toJSON())).not.toContain('pinv1_');
        await act(async () => {
            tree.update(<InviteRoute />);
            await flushPromises();
        });
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        act(() => tree.unmount());
        expect(mockDispatch).toHaveBeenLastCalledWith({ kind: 'close', expected_owner: 4 });
    });
    it('retries failed native initialization before delivering the invitation', async () => {
        mockValue = null;
        mockDestinations = { error: 'gateway_environment_load_failed', installation_id: null };
        mockHydrate.mockRejectedValueOnce(new Error('synthetic storage failure'));
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<InviteRoute />);
            await flushPromises();
        });
        expect(mockDispatch).not.toHaveBeenCalled();
        const retry = tree.root
            .findAllByType('Button' as never)
            .find((button) => button.props.title === 'retry')!;
        await act(async () => {
            retry.props.onPress();
            await flushPromises();
        });
        expect(mockHydrate).toHaveBeenCalledTimes(2);
        expect(mockDispatch).toHaveBeenCalledWith({ kind: 'open', uri: invitationUri });
        act(() => tree.unmount());
    });
    it('dismisses only for completion of the owning invitation', async () => {
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<InviteRoute />);
            await flushPromises();
        });
        mockValue = { ...mockValue, owner_generation: 5, phase: 'complete' };
        await act(async () => tree.update(<InviteRoute />));
        expect(mockRouterDismiss).not.toHaveBeenCalled();
        mockValue = { ...mockValue, owner_generation: 4 };
        await act(async () => tree.update(<InviteRoute />));
        expect(mockRouterDismiss).toHaveBeenCalledTimes(1);
        act(() => tree.unmount());
    });
    it('does not deliver a link after the route was released during native initialization', async () => {
        let resolve!: () => void;
        mockHydrate.mockImplementation(
            () =>
                new Promise<void>((done) => {
                    resolve = done;
                }),
        );
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<InviteRoute />);
        });
        act(() => tree.unmount());
        await act(async () => {
            resolve();
            await flushPromises();
        });
        expect(mockDispatch).not.toHaveBeenCalled();
    });
    it('does not consume a production link in the development application', async () => {
        mockLinkingUrl = invitationUri.replace('pioneer-dev://', 'pioneer://');
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<InviteRoute />);
            await flushPromises();
        });
        expect(mockDispatch).not.toHaveBeenCalled();
        expect(mockHydrate).not.toHaveBeenCalled();
        act(() => tree.unmount());
    });
});
