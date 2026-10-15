import React from 'react';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import type { GatewayDestinationsPublication } from '@/client/generated/gateway_destinations_publication';
import Sheet from './index';
const mockReact = React;
let mockDestinations: GatewayDestinationsPublication;
const mockSetOpen = jest.fn();
const mockDispatch = jest.fn<(intent: unknown) => { outcome: string }>();
const mockPresent = jest.fn();
const mockClose = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@/client/onboarding', () => ({
    useGatewayDestinations: () => mockDestinations,
    dispatchOnboarding: (intent: unknown) => mockDispatch(intent),
}));
jest.mock('@/client/mobile-client-binding', () => ({
    mobileClientBinding: { scope: () => ({ getSnapshot: () => ({ payload: mockDestinations }) }) },
}));
jest.mock('@/hooks/use-gateway', () => ({
    useGateway: () => ({
        registry: {
            remotes: mockDestinations.endpoints,
            active_gateway_id: mockDestinations.selected_endpoint,
        },
        busy: false,
        error: null,
    }),
}));
jest.mock('@/stores/gateway', () => ({
    useGatewayStore: (selector: (state: unknown) => unknown) =>
        selector({ showGatewaySwitcher: true, setGatewaySwitcherOpen: mockSetOpen }),
}));
jest.mock('zustand/react/shallow', () => ({ useShallow: (value: unknown) => value }));
jest.mock('@/hooks/use-editor', () => ({ useEditor: () => ({ navigate: mockNavigate }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: () => ({}) },
    useUnistyles: () => ({
        rt: { insets: { top: 0 } },
        theme: { space: (n: number) => n, colors: {} },
    }),
}));
jest.mock('@gorhom/bottom-sheet', () => {
    const React = jest.requireActual<typeof import('react')>('react');
    return {
        BottomSheetModal: React.forwardRef(function SyntheticSheet(
            props: Record<string, unknown>,
            ref,
        ) {
            mockReact.useImperativeHandle(ref, () => ({ present: mockPresent, close: mockClose }));
            return mockReact.createElement('Sheet', props);
        }),
        BottomSheetScrollView: (props: Record<string, unknown>) =>
            mockReact.createElement('Scroll', props),
    };
});
jest.mock('lucide-react-native', () => ({ Bolt: () => null, Trash2: () => null }));
jest.mock('../components/backdrop', () => ({ Backdrop: () => null }));
jest.mock('../components/handle', () => ({ Handle: () => null }));
jest.mock('@/components/buttons/create', () => ({ CreateButton: () => null }));
jest.mock('@/helpers/styles', () => ({ stableOutlineWidth: () => 1 }));
jest.mock('@/components/primitives/text', () => ({
    Text: (props: Record<string, unknown>) => mockReact.createElement('Text', props),
}));
jest.mock('@/components/primitives/box', () => ({
    Box: (props: Record<string, unknown>) => mockReact.createElement('Box', props),
}));
jest.mock('@/components/primitives/vstack', () => ({
    VStack: (props: Record<string, unknown>) => mockReact.createElement('VStack', props),
}));
jest.mock('@/components/primitives/hstack', () => ({
    HStack: (props: Record<string, unknown>) => mockReact.createElement('HStack', props),
}));
beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockReset().mockReturnValue({ outcome: 'noop' });
    mockDestinations = {
        action_generation: 3,
        registry_revision: 2,
        endpoints: [
            { id: 'a', name: 'A', kind: 'remote', gateway_base_url: 'https://a.invalid' },
            { id: 'b', name: 'B', kind: 'remote', gateway_base_url: 'https://b.invalid' },
        ],
        selected_endpoint: 'a',
        loading: false,
        local_install_required: false,
        local_update_required: false,
        warnings: [],
        workspace_outcomes: [],
    };
});
const buttons = (tree: ReactTestRenderer, label: string) =>
    tree.root.findAll(
        (node) =>
            typeof node.type !== 'string' &&
            node.props.accessibilityLabel === label &&
            typeof node.props.onPress === 'function',
    );
describe('Gateway switcher native correlation', () => {
    it('does not arm a close for a rejected selection or an unrelated later outcome', () => {
        let tree!: ReactTestRenderer;
        act(() => {
            tree = renderer.create(<Sheet />);
        });
        expect(mockPresent).toHaveBeenCalledTimes(1);
        act(() => buttons(tree, 'activate').at(-1)!.props.onPress());
        expect(mockDispatch).toHaveBeenCalledWith({ kind: 'select_gateway', endpoint_id: 'b' });
        mockDestinations = {
            ...mockDestinations,
            action_generation: 4,
            outcome: { endpoint_id: 'a', generation: 4, succeeded: true },
        };
        act(() => tree.update(<Sheet />));
        expect(mockSetOpen).not.toHaveBeenCalled();
        act(() => tree.unmount());
    });
    it('uses the accepted generation and endpoint, and closes once for its successful outcome', () => {
        let tree!: ReactTestRenderer;
        act(() => {
            tree = renderer.create(<Sheet />);
        });
        mockDispatch.mockImplementation(() => {
            mockDestinations = { ...mockDestinations, action_generation: 9, pending_endpoint: 'b' };
            return { outcome: 'changed' };
        });
        act(() => buttons(tree, 'activate').at(-1)!.props.onPress());
        mockDestinations = {
            ...mockDestinations,
            outcome: { endpoint_id: 'a', generation: 9, succeeded: true },
        };
        act(() => tree.update(<Sheet />));
        expect(mockSetOpen).not.toHaveBeenCalled();
        mockDestinations = {
            ...mockDestinations,
            pending_endpoint: null,
            outcome: { endpoint_id: 'b', generation: 9, succeeded: true },
        };
        act(() => tree.update(<Sheet />));
        expect(mockSetOpen).toHaveBeenCalledTimes(1);
        expect(mockSetOpen).toHaveBeenCalledWith(false);
        act(() => tree.unmount());
    });
    it('keeps the confirmed deletion identity/revision and cancels native callbacks on unmount', () => {
        const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        let tree!: ReactTestRenderer;
        act(() => {
            tree = renderer.create(<Sheet />);
        });
        act(() => buttons(tree, 'deleteAction').at(-1)!.props.onPress());
        const confirm = alert.mock.calls.at(-1)![2]!.at(-1)!.onPress!;
        mockDestinations = {
            ...mockDestinations,
            registry_revision: 3,
            endpoints: [...mockDestinations.endpoints].reverse(),
        };
        act(() => tree.update(<Sheet />));
        act(() => confirm());
        expect(mockDispatch).toHaveBeenLastCalledWith({
            kind: 'delete_gateway',
            endpoint_id: 'b',
            expected_registry_revision: 2,
        });
        act(() => tree.unmount());
        mockDispatch.mockClear();
        act(() => confirm());
        expect(mockDispatch).not.toHaveBeenCalled();
        alert.mockRestore();
    });
});
