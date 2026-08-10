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
const mockSessionPresentation = jest.fn((item: { session: { status: string } }) => ({
    status: item.session.status,
    actionable: item.session.status === 'active',
}));
const mockButton = (props: Record<string, unknown>) => mockReact.createElement('Button', props);
const mockCopyButton = (props: Record<string, unknown>) =>
    mockReact.createElement('CopyButton', props);
const mockCreateButton = (props: Record<string, unknown>) =>
    mockReact.createElement('CreateButton', props);
const mockDeviceActivationQr = (props: Record<string, unknown>) =>
    mockReact.createElement('DeviceActivationQr', props);
const mockActionsSheet = (props: Record<string, unknown>) =>
    mockReact.createElement('ActionsSheet', props, props.children as React.ReactNode);
const mockMenuItem = (props: Record<string, unknown>) => mockReact.createElement('MenuItem', props);
const mockPressable = (props: Record<string, unknown>) =>
    mockReact.createElement('Pressable', props, props.children as React.ReactNode);
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

jest.mock('lucide-react-native', () => ({
    LogOut: (props: Record<string, unknown>) => mockReact.createElement('LogOut', props),
    Trash2: (props: Record<string, unknown>) => mockReact.createElement('Trash2', props),
}));

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
jest.mock('@/components/overlays/actions', () => ({ ActionsSheet: mockActionsSheet }));
jest.mock('@/components/overlays/actions/menu-item', () => ({ MenuItem: mockMenuItem }));
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
jest.mock('@/components/primitives/pressable', () => ({ Pressable: mockPressable }));
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

jest.mock('@/client', () => ({
    pioneerClient: { sessionListRowPresentation: mockSessionPresentation },
}));

jest.mock('@/stores/gateway', () => ({
    useGatewayStore: (selector: (state: Record<string, unknown>) => unknown) =>
        selector({
            registry: {
                active_gateway_id: 'gateway-1',
                remotes: [
                    {
                        id: 'gateway-1',
                        gateway_base_url: 'https://gateway.example/',
                        kind: 'remote',
                    },
                ],
            },
        }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DevicesSettingsScreen = require('./devices').default as typeof import('./devices').default;

const currentSession = {
    current: true,
    device: { display_name: 'This iPhone', client_kind: 'mobile', status: 'active' },
    last_seen_at_unix: 1,
    session: { id: 'current-session', status: 'active' },
};
const otherSession = {
    current: false,
    device: { display_name: 'Mac', client_kind: 'desktop', status: 'active' },
    last_seen_at_unix: 2,
    session: { id: 'other-session', status: 'active' },
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

    it('moves Sign out and Revoke into each row Actions menu', async () => {
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
        ).toEqual([]);
        expect(mockT).toHaveBeenCalledWith(
            'devices.sessionMeta',
            expect.objectContaining({ kind: 'mobile', ns: 'gateway' }),
        );
        expect(mockT).toHaveBeenCalledWith('devices.status.active', { ns: 'gateway' });
        expect(mockT).toHaveBeenCalledWith(
            'devices.sessionMeta',
            expect.objectContaining({ kind: 'desktop', ns: 'gateway' }),
        );

        let actionTriggers = tree!.root
            .findAllByType(mockPressable)
            .filter((pressable) => typeof pressable.props.onLongPress === 'function');
        expect(actionTriggers).toHaveLength(2);

        act(() => actionTriggers[0].props.onLongPress());
        expect(tree!.root.findByType(mockActionsSheet).props.open).toBe(true);
        const logoutAction = tree!.root.findByType(mockMenuItem);
        expect(logoutAction.props).toMatchObject({
            title: 'devices.logoutAction',
            variant: 'destructive',
        });
        act(() => logoutAction.props.onPress());
        const logoutConfirmation = jest.mocked(Alert.alert).mock.calls[0][2];
        await act(async () => {
            logoutConfirmation?.[1]?.onPress?.();
            await flushPromises();
        });

        expect(mockLogout).toHaveBeenCalledTimes(1);
        expect(mockRevoke).not.toHaveBeenCalled();

        actionTriggers = tree!.root
            .findAllByType(mockPressable)
            .filter((pressable) => typeof pressable.props.onLongPress === 'function');
        act(() => actionTriggers[1].props.onLongPress());

        expect(tree!.root.findByType(mockActionsSheet).props.open).toBe(true);
        const revokeAction = tree!.root.findByType(mockMenuItem);
        expect(revokeAction.props).toMatchObject({
            title: 'devices.revokeAction',
            variant: 'destructive',
        });

        act(() => revokeAction.props.onPress());
        const revokeConfirmation = jest.mocked(Alert.alert).mock.calls[1][2];
        await act(async () => {
            revokeConfirmation?.[1]?.onPress?.();
            await flushPromises();
        });

        expect(mockRevoke).toHaveBeenCalledWith('gateway-1', 'other-session', false);
    });

    it('shows terminal session status and disables its action', async () => {
        mockListSessions.mockResolvedValue({
            sessions: [
                currentSession,
                {
                    ...otherSession,
                    device: { ...otherSession.device, status: 'revoked' },
                    session: { ...otherSession.session, status: 'revoked' },
                },
            ],
        });
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<DevicesSettingsScreen />);
            await flushPromises();
        });
        expect(mockT).toHaveBeenCalledWith('devices.status.revoked', { ns: 'gateway' });
        const actionTriggers = tree!.root.findAllByType(mockPressable);
        expect(typeof actionTriggers[0].props.onLongPress).toBe('function');
        expect(actionTriggers[1].props.onLongPress).toBeUndefined();
        expect(tree!.root.findAllByType(mockMenuItem)).toHaveLength(0);
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
