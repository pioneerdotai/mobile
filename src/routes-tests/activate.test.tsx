import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockReact = React;
const mockRouterReplace = jest.fn();
const mockClearInitialUrl = jest.fn();
type ParsedActivation = {
    gateway_base_url: string;
    activation_code: string;
    gateway_id?: string | null;
};
const mockParseMobileDeviceActivationUri = jest.fn<(uri: string) => Promise<ParsedActivation>>();
const mockGatewayEditor = (props: Record<string, unknown>) =>
    mockReact.createElement('GatewayEditor', props);
let mockLinkingUrl: string | null = null;
let mockActiveGatewayId: string | null = null;

class MockMobileDeviceActivationError extends Error {
    readonly code:
        'invalid_presentation' | 'gateway_mismatch' | 'activation_failed' | 'storage_failed';

    constructor(
        code: 'invalid_presentation' | 'gateway_mismatch' | 'activation_failed' | 'storage_failed',
    ) {
        super(code);
        this.name = 'MobileDeviceActivationError';
        this.code = code;
    }
}

jest.setMock('expo-linking', {
    __esModule: true,
    clearInitialURL: mockClearInitialUrl,
    useLinkingURL: () => mockLinkingUrl,
});

jest.setMock('expo-router', {
    __esModule: true,
    router: { replace: mockRouterReplace },
});

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/screens/gateway/editor', () => ({
    __esModule: true,
    default: mockGatewayEditor,
}));

jest.mock('@/stores/gateway', () => ({
    useGatewayStore: (selector: (state: Record<string, unknown>) => unknown) =>
        selector({
            registry: { active_gateway_id: mockActiveGatewayId },
        }),
}));

jest.setMock('@/services/gateway/device-activation', {
    MobileDeviceActivationError: MockMobileDeviceActivationError,
    parseMobileDeviceActivationUri: mockParseMobileDeviceActivationUri,
});

const ActivateRoute =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/routes/activate').default as typeof import('@/routes/activate').default;

const gatewayId = 'G00000000000000000001';
const activationCode = 'K7M4-P9Q2';
const activationLink =
    `pioneer-dev://activate?gateway_base_url=https%3A%2F%2Fgateway.example%2F` +
    `&gateway_id=${gatewayId}` +
    `#code=${activationCode}`;
const activationInput = {
    gateway_base_url: 'https://gateway.example/',
    activation_code: activationCode,
    gateway_id: gatewayId,
};

const flushPromises = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

const editor = (tree: ReactTestRenderer) =>
    tree.root.find((node) => node.type === mockGatewayEditor);

describe('ActivateRoute', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLinkingUrl = null;
        mockActiveGatewayId = null;
        mockParseMobileDeviceActivationUri.mockResolvedValue(activationInput);
    });

    it('opens the shared gateway editor with the activation link values prefilled', async () => {
        mockLinkingUrl = activationLink;
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<ActivateRoute />);
            await flushPromises();
        });

        expect(mockRouterReplace).toHaveBeenCalledWith('/activate');
        expect(mockRouterReplace).not.toHaveBeenCalledWith(expect.stringContaining(activationCode));
        expect(mockClearInitialUrl).toHaveBeenCalledTimes(1);
        expect(mockParseMobileDeviceActivationUri).toHaveBeenCalledWith(activationLink);
        expect(editor(tree!).props).toMatchObject({
            activationPrefill: {
                gateway_base_url: activationInput.gateway_base_url,
                activationCode,
                serverGatewayId: gatewayId,
            },
            blocker: true,
            initialError: null,
        });
    });

    it('uses the same editor with a localized error for a malformed link', async () => {
        mockLinkingUrl = `pioneer-dev://activate#code=${activationCode}`;
        mockParseMobileDeviceActivationUri.mockRejectedValue(
            new MockMobileDeviceActivationError('invalid_presentation'),
        );
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<ActivateRoute />);
            await flushPromises();
        });

        expect(editor(tree!).props).toMatchObject({
            blocker: true,
            initialError: 'activation.invalidPresentation',
        });
        expect(editor(tree!).props.activationPrefill).toBeUndefined();
    });

    it('renders a normal gateway editor when the technical route has no deep link', async () => {
        mockActiveGatewayId = 'remote-1';
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<ActivateRoute />);
        });

        expect(editor(tree!).props).toMatchObject({
            blocker: false,
            initialError: null,
        });
        expect(editor(tree!).props.activationPrefill).toBeUndefined();
        expect(mockParseMobileDeviceActivationUri).not.toHaveBeenCalled();
    });

    it('does not consume a production link in the development application', async () => {
        mockLinkingUrl = activationLink.replace('pioneer-dev://', 'pioneer://');
        await act(async () => {
            renderer.create(<ActivateRoute />);
            await flushPromises();
        });
        expect(mockParseMobileDeviceActivationUri).not.toHaveBeenCalled();
        expect(mockClearInitialUrl).not.toHaveBeenCalled();
    });
});
