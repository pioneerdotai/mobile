import React, { forwardRef, useImperativeHandle } from 'react';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockReact = React;
const mockT = jest.fn((key: string) => key);
const mockSetOptions = jest.fn();
const mockPresent = jest.fn();
const mockClose = jest.fn();
const mockListSessions = jest.fn<() => Promise<unknown>>();
const mockCreateActivation = jest.fn<() => Promise<unknown>>();
const mockCancelActivation = jest.fn<(sessionId: string) => Promise<void>>();
const mockLogout = jest.fn<() => Promise<void>>();
const mockRevoke = jest.fn<() => Promise<void>>();
const mockButton = (props: Record<string, unknown>) => mockReact.createElement('Button', props);
const mockCopyButton = (props: Record<string, unknown>) =>
    mockReact.createElement('CopyButton', props);
const mockCreateButton = (props: Record<string, unknown>) =>
    mockReact.createElement('CreateButton', props);
const mockDeviceActivationQr = (props: Record<string, unknown>) =>
    mockReact.createElement('DeviceActivationQr', props);
const mockText = (props: Record<string, unknown>) =>
    mockReact.createElement('Text', props, props.children as React.ReactNode);
const mockVStack = (props: Record<string, unknown>) =>
    mockReact.createElement('VStack', props, props.children as React.ReactNode);
const mockBottomSheetModal = forwardRef<
    { present: () => void; close: () => void },
    Record<string, unknown>
>((props, ref) => {
    useImperativeHandle(ref, () => ({ present: mockPresent, close: mockClose }));
    return mockReact.createElement('BottomSheetModal', props, props.children as React.ReactNode);
});
mockBottomSheetModal.displayName = 'MockBottomSheetModal';

jest.setMock('expo-router', {
    __esModule: true,
    useNavigation: () => ({ setOptions: mockSetOptions }),
});

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: mockT }),
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
        hairlineWidth: 1,
    },
    useUnistyles: () => ({
        rt: { insets: { top: 0, bottom: 0 } },
        theme: {
            colors: { textMuted: '#888', typography: '#000' },
            sheetHeaderHeight: () => 64,
            space: (value: number) => value * 4,
        },
    }),
}));

jest.mock('@gorhom/bottom-sheet', () => ({
    BottomSheetModal: mockBottomSheetModal,
    BottomSheetScrollView: (props: Record<string, unknown>) =>
        mockReact.createElement('BottomSheetScrollView', props, props.children as React.ReactNode),
}));

jest.mock('@/components/buttons/base', () => ({ Button: mockButton }));
jest.mock('@/components/buttons/copy', () => ({ CopyButton: mockCopyButton }));
jest.mock('@/components/buttons/create', () => ({ CreateButton: mockCreateButton }));
jest.mock('@/components/feedback/spinner', () => ({
    __esModule: true,
    default: (props: Record<string, unknown>) => mockReact.createElement('Spinner', props),
}));
jest.mock('@/components/gateway/device-activation-qr', () => ({
    DeviceActivationQr: mockDeviceActivationQr,
}));
jest.mock('@/components/overlays/components/backdrop', () => ({
    Backdrop: (props: Record<string, unknown>) => mockReact.createElement('Backdrop', props),
}));
jest.mock('@/components/overlays/components/handle', () => ({
    Handle: (props: Record<string, unknown>) => mockReact.createElement('Handle', props),
}));
jest.mock('@/components/primitives/box', () => ({
    Box: (props: Record<string, unknown>) =>
        mockReact.createElement('Box', props, props.children as React.ReactNode),
}));
jest.mock('@/components/primitives/hstack', () => ({
    HStack: (props: Record<string, unknown>) =>
        mockReact.createElement('HStack', props, props.children as React.ReactNode),
}));
jest.mock('@/components/primitives/scrollview', () => ({
    ScrollView: (props: Record<string, unknown>) =>
        mockReact.createElement('ScrollView', props, props.children as React.ReactNode),
}));
jest.mock('@/components/primitives/text', () => ({
    Text: mockText,
}));
jest.mock('@/components/primitives/vstack', () => ({
    VStack: mockVStack,
}));

jest.mock('@/services/gateway/device-activation', () => ({
    cancelMobileDeviceActivation: mockCancelActivation,
    createMobileDeviceActivationPresentation: mockCreateActivation,
    listMobileGatewaySessions: mockListSessions,
    logoutMobileGatewaySession: mockLogout,
    revokeMobileGatewaySession: mockRevoke,
}));

jest.mock('@/stores/gateway', () => ({
    useGatewayStore: (selector: (state: Record<string, unknown>) => unknown) =>
        selector({
            registry: {
                active_gateway_id: 'gateway-1',
                remotes: [{ id: 'gateway-1', address: 'wss://gateway.example', kind: 'remote' }],
            },
        }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DevicesSettingsScreen = require('./devices').default as typeof import('./devices').default;

const currentSession = {
    current: true,
    device: { display_name: 'This iPhone', client_kind: 'mobile' },
    last_seen_at_unix: 1,
    session: { id: 'current-session' },
};
const otherSession = {
    current: false,
    device: { display_name: 'Mac', client_kind: 'desktop' },
    last_seen_at_unix: 2,
    session: { id: 'other-session' },
};
const activation = {
    session_id: 'activation-session',
    manual_code: 'ABCD-EFGH',
    deep_link: 'pioneer://activate#code=ABCD-EFGH',
    qr_modules: [true],
    qr_width: 1,
};

const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
};

describe('DevicesSettingsScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockListSessions.mockResolvedValue({ sessions: [currentSession, otherSession] });
        mockCreateActivation.mockResolvedValue(activation);
        mockCancelActivation.mockResolvedValue(undefined);
        mockLogout.mockResolvedValue(undefined);
        mockRevoke.mockResolvedValue(undefined);
        jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    });

    it('uses one device list and moves Sign out onto the current device row', async () => {
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<DevicesSettingsScreen />);
            await flushPromises();
        });

        const actions = tree!.root.findAllByType(mockButton);
        expect(
            tree!.root
                .findAllByType(mockVStack)
                .filter((node) => node.props.testID === 'devices-list'),
        ).toHaveLength(1);
        expect(
            actions
                .map((action) => action.props.title)
                .filter((title) =>
                    ['devices.logoutAction', 'devices.revokeAction'].includes(title),
                ),
        ).toEqual(['devices.logoutAction', 'devices.revokeAction']);
        expect(mockT).toHaveBeenCalledWith(
            'devices.sessionMeta',
            expect.objectContaining({ kind: 'mobile', ns: 'gateway' }),
        );
        expect(mockT).toHaveBeenCalledWith(
            'devices.sessionMeta',
            expect.objectContaining({ kind: 'desktop', ns: 'gateway' }),
        );

        act(() => {
            actions[0].props.onPress();
        });
        const logoutConfirmation = jest.mocked(Alert.alert).mock.calls[0][2];
        await act(async () => {
            logoutConfirmation?.[1]?.onPress?.();
            await flushPromises();
        });

        expect(mockLogout).toHaveBeenCalledTimes(1);
        expect(mockRevoke).not.toHaveBeenCalled();

        act(() => {
            actions[1].props.onPress();
        });
        const revokeConfirmation = jest.mocked(Alert.alert).mock.calls[1][2];
        await act(async () => {
            revokeConfirmation?.[1]?.onPress?.();
            await flushPromises();
        });

        expect(mockRevoke).toHaveBeenCalledWith('gateway-1', 'other-session', false);
    });

    it('opens activation from the header plus and renders QR, code, and link in the sheet', async () => {
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<DevicesSettingsScreen />);
            await flushPromises();
        });

        const options = mockSetOptions.mock.calls.at(-1)?.[0] as {
            headerRight: () => React.ReactElement<{ onPressHandler: () => void }>;
        };
        const headerButton = options.headerRight();

        await act(async () => {
            headerButton.props.onPressHandler();
            await flushPromises();
        });

        expect(mockPresent).toHaveBeenCalledTimes(1);
        expect(mockCreateActivation).toHaveBeenCalledTimes(1);
        expect(tree!.root.findByType(mockDeviceActivationQr).props).toMatchObject({
            modules: [true],
            width: 1,
        });
        expect(
            tree!.root.findAllByType(mockCopyButton).map((button) => button.props.value),
        ).toEqual(['ABCD-EFGH', 'pioneer://activate#code=ABCD-EFGH']);
        const labels = tree!.root.findAllByType(mockText).map((node) => node.props.children);
        expect(labels).toContain('devices.codeLabel');
        expect(labels).toContain('devices.linkLabel');
    });
});
