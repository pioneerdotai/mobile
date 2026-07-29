/* eslint-disable import/first */

import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockReact = React;
const mockRouterReplace = jest.fn();
const mockSetRegistry = jest.fn();
const mockBumpSessionRevision = jest.fn();
const mockGetInitialUrl = jest.fn<() => Promise<string | null>>();
const mockRemoveLinkListener = jest.fn();
let mockLinkListener: ((event: { url: string }) => void) | null = null;
const mockButtonComponent = (props: Record<string, unknown>) =>
    mockReact.createElement('Button', props);
const mockInputComponent = (props: Record<string, unknown>) =>
    mockReact.createElement('Input', props);
const mockOtpInputComponent = (props: Record<string, unknown>) =>
    mockReact.createElement('OtpInput', props);

jest.setMock('expo-linking', {
    __esModule: true,
    addEventListener: jest.fn((_event: string, listener: (event: { url: string }) => void) => {
        mockLinkListener = listener;
        return { remove: mockRemoveLinkListener };
    }),
    getInitialURL: mockGetInitialUrl,
});

jest.setMock('expo-router', {
    __esModule: true,
    router: { replace: mockRouterReplace },
});

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-unistyles', () => ({
    StyleSheet: {
        create: () => ({
            container: {},
            description: {},
            error: {},
        }),
    },
}));

jest.mock('@/components/buttons/base', () => ({
    Button: mockButtonComponent,
}));
jest.mock('@/components/forms/input', () => ({
    Input: mockInputComponent,
}));
jest.mock('@/components/forms/otp-input', () => ({
    OtpInput: mockOtpInputComponent,
}));
jest.mock('@/components/primitives/text', () => ({
    Text: (props: Record<string, unknown>) => mockReact.createElement('Text', props),
}));
jest.mock('@/components/primitives/vstack', () => ({
    VStack: (props: Record<string, unknown>) => mockReact.createElement('VStack', props),
}));
jest.mock('@/components/typography/title', () => ({
    Title: (props: Record<string, unknown>) => mockReact.createElement('Title', props),
}));

jest.mock('@/stores/gateway', () => ({
    useGatewayStore: (selector: (state: Record<string, unknown>) => unknown) =>
        selector({
            setRegistry: mockSetRegistry,
            bumpSessionRevision: mockBumpSessionRevision,
        }),
}));

jest.mock('@/services/gateway/device-activation', () => {
    class MockMobileDeviceActivationError extends Error {
        readonly code:
            'invalid_presentation' | 'gateway_mismatch' | 'activation_failed' | 'storage_failed';

        constructor(
            code:
                | 'invalid_presentation'
                | 'gateway_mismatch'
                | 'activation_failed'
                | 'storage_failed',
        ) {
            super(code);
            this.name = 'MobileDeviceActivationError';
            this.code = code;
        }
    }

    return {
        MobileDeviceActivationError: MockMobileDeviceActivationError,
        acceptMobileDeviceActivation: jest.fn(),
        parseMobileDeviceActivationUri: jest.fn(),
    };
});

import {
    MobileDeviceActivationError,
    acceptMobileDeviceActivation,
    parseMobileDeviceActivationUri,
} from '@/services/gateway/device-activation';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DeviceActivationScreen = require('.').default as typeof import('.').default;

const mockAcceptMobileDeviceActivation = jest.mocked(acceptMobileDeviceActivation);
const mockParseMobileDeviceActivationUri = jest.mocked(parseMobileDeviceActivationUri);

const gatewayId = 'G00000000000000000001';
const activationCode = 'K7M4-P9Q2';
const activationInput = {
    protected_endpoint: 'wss://gateway.example/ws',
    activation_code: activationCode,
    gateway_id: gatewayId,
};

const flushPromises = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

const inputByLabel = (tree: ReactTestRenderer, label: string) =>
    tree.root.find((node) => node.type === mockInputComponent && node.props.label === label);

const otpInputByLabel = (tree: ReactTestRenderer, label: string) =>
    tree.root.find((node) => node.type === mockOtpInputComponent && node.props.label === label);

const buttonByTitle = (tree: ReactTestRenderer, title: string) =>
    tree.root.find((node) => node.type === mockButtonComponent && node.props.title === title);

describe('DeviceActivationScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLinkListener = null;
        mockGetInitialUrl.mockResolvedValue(null);
        mockParseMobileDeviceActivationUri.mockResolvedValue(activationInput);
    });

    it('removes an initial activation URI from navigation before parsing its fragment', async () => {
        const deepLink =
            `pioneer://activate?gateway=wss%3A%2F%2Fgateway.example%2Fws` +
            `&gateway_id=${gatewayId}` +
            `#code=${activationCode}`;
        mockGetInitialUrl.mockResolvedValue(deepLink);
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<DeviceActivationScreen />);
            await flushPromises();
        });

        expect(mockRouterReplace).toHaveBeenCalledWith('/activate');
        expect(mockRouterReplace).not.toHaveBeenCalledWith(expect.stringContaining(activationCode));
        expect(mockParseMobileDeviceActivationUri).toHaveBeenCalledWith(deepLink);
        expect(inputByLabel(tree!, 'activation.endpointLabel').props.value).toBe(
            activationInput.protected_endpoint,
        );
        expect(otpInputByLabel(tree!, 'activation.codeLabel').props).toMatchObject({
            value: activationCode,
        });
    });

    it('accepts an endpoint and pinned activation code without persisting it', async () => {
        let resolveDeviceActivation:
            ((value: Awaited<ReturnType<typeof acceptMobileDeviceActivation>>) => void) | null =
            null;
        mockAcceptMobileDeviceActivation.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveDeviceActivation = resolve;
                }),
        );
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<DeviceActivationScreen />);
            await flushPromises();
        });

        await act(async () => {
            inputByLabel(tree!, 'activation.endpointLabel').props.onChangeText(
                activationInput.protected_endpoint,
            );
            otpInputByLabel(tree!, 'activation.codeLabel').props.onChangeText(activationCode);
        });
        await act(async () => {
            buttonByTitle(tree!, 'activation.connectAction').props.onPress();
            await Promise.resolve();
        });

        expect(mockAcceptMobileDeviceActivation).toHaveBeenCalledWith({
            ...activationInput,
            gateway_id: null,
        });
        expect(otpInputByLabel(tree!, 'activation.codeLabel').props.value).toBe('');

        await act(async () => {
            resolveDeviceActivation!({
                endpoint: {
                    id: `activated-${gatewayId}`,
                    name: 'Activated Gateway',
                    address: activationInput.protected_endpoint,
                    kind: 'remote',
                    session_ref: `activated-${gatewayId}`,
                    server_gateway_id: gatewayId,
                    service_name: null,
                    workspace_id: null,
                },
                registry: {
                    version: 2,
                    installation_id: 'installation-mobile-1',
                    active_gateway_id: `activated-${gatewayId}`,
                    local: null,
                    remotes: [],
                },
            });
            await flushPromises();
        });

        expect(mockSetRegistry).toHaveBeenCalledTimes(1);
        expect(mockBumpSessionRevision).toHaveBeenCalledTimes(1);
        expect(mockRouterReplace).toHaveBeenLastCalledWith('/');
    });

    it('shows a bounded localized error for a malformed incoming link', async () => {
        const malformed = `pioneer://activate#code=${activationCode}`;
        mockGetInitialUrl.mockResolvedValue(malformed);
        mockParseMobileDeviceActivationUri.mockRejectedValue(
            new MobileDeviceActivationError('invalid_presentation'),
        );
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<DeviceActivationScreen />);
            await flushPromises();
        });

        expect(mockRouterReplace).toHaveBeenCalledWith('/activate');
        expect(JSON.stringify(tree!.toJSON())).toContain('activation.invalidPresentation');
        expect(mockAcceptMobileDeviceActivation).not.toHaveBeenCalled();
        expect(mockLinkListener).not.toBeNull();
    });
});
