import Screen from './index';
import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import type { GatewaySetupPublication } from '@/client/generated/gateway_setup_publication';
const mockReact = React;
let mockForm: GatewaySetupPublication;
let mockDestinations: { loading: boolean; error: string | null; installation_id: string | null };
const mockDispatch = jest.fn();
const mockHydrate = jest.fn<() => Promise<void>>();
const mockRouter = { back: jest.fn(), replace: jest.fn() };
jest.mock('@/client/onboarding', () => ({
    useGatewaySetup: () => mockForm,
    useGatewayDestinations: () => mockDestinations,
    dispatchGatewaySetup: (...args: unknown[]) => mockDispatch(...args),
    hydrateOnboarding: () => mockHydrate(),
}));
jest.mock('@/client/mobile-client-binding', () => ({
    mobileClientBinding: { scope: () => ({ getSnapshot: () => ({ payload: mockForm }) }) },
}));
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('react-native-unistyles', () => ({ StyleSheet: { create: () => ({}) } }));
jest.mock('@/components/forms/input', () => ({
    Input: (props: Record<string, unknown>) => mockReact.createElement('Input', props),
}));
jest.mock('@/components/forms/otp-input', () => ({
    OtpInput: (props: Record<string, unknown>) => mockReact.createElement('OtpInput', props),
}));
jest.mock('@/components/typography/title', () => ({
    Title: (props: Record<string, unknown>) => mockReact.createElement('Title', props),
}));
jest.mock('@/components/primitives/box', () => ({
    Box: (props: Record<string, unknown>) => mockReact.createElement('Box', props),
}));
jest.mock('@/screens/editor/components/container', () => ({
    Container: (props: Record<string, unknown>) => mockReact.createElement('Container', props),
}));
beforeEach(() => {
    jest.clearAllMocks();
    mockHydrate.mockReset().mockResolvedValue();
    mockForm = {
        owner_generation: 7,
        revision: 1,
        mode: { kind: 'add_gateway', allow_local: false },
        name: 'Remote',
        address: '',
        activation_valid: false,
        pending: false,
        input_revision: 0,
        input_reset_generation: 0,
    };
    mockDestinations = { loading: false, error: null, installation_id: 'synthetic' };
});
describe('native Gateway editor Client wiring', () => {
    it('binds field and submit events to the opened owner without controlled echo', async () => {
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<Screen />);
        });
        const [name, address] = tree.root.findAllByType('Input' as never);
        act(() => name.props.onChangeText('Edited'));
        expect(mockDispatch).toHaveBeenLastCalledWith({
            kind: 'edit_name_for_owner',
            expected_owner: 7,
            value: 'Edited',
        });
        act(() => address.props.onChangeText('https://gateway.invalid'));
        expect(mockDispatch).toHaveBeenLastCalledWith({
            kind: 'edit_address_for_owner',
            expected_owner: 7,
            value: 'https://gateway.invalid',
        });
        act(() => address.props.onSubmitEditing());
        act(() => tree.root.findByType('Container' as never).props.handleSubmit());
        expect(
            mockDispatch.mock.calls.filter(
                ([intent]) => (intent as { kind: string }).kind === 'submit_for_owner',
            ),
        ).toEqual([
            [{ kind: 'submit_for_owner', expected_owner: 7, local: false }],
            [{ kind: 'submit_for_owner', expected_owner: 7, local: false }],
        ]);
        const calls = mockDispatch.mock.calls.length;
        mockForm = { ...mockForm, name: 'Edited', pending: true, revision: 2 };
        act(() => tree.update(<Screen />));
        expect(mockDispatch).toHaveBeenCalledTimes(calls);
        expect(tree.root.findAllByType('Input' as never)[0].props.value).toBe('Edited');
        expect(tree.root.findByType('Container' as never).props.loading).toBe(true);
        act(() => tree.unmount());
        expect(mockDispatch).toHaveBeenLastCalledWith({ kind: 'close', expected_owner: 7 });
    });
    it('does not submit or navigate for a replaced owner and fences an old input callback', async () => {
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<Screen />);
        });
        const oldEdit = tree.root.findAllByType('Input' as never)[0].props.onChangeText;
        mockForm = { ...mockForm, owner_generation: 8, completed_endpoint: 'other', name: 'Other' };
        act(() => tree.update(<Screen />));
        expect(tree.root.findAllByType('Input' as never)[0].props.editable).toBe(false);
        expect(mockRouter.replace).not.toHaveBeenCalled();
        const calls = mockDispatch.mock.calls.length;
        act(() => tree.root.findByType('Container' as never).props.handleSubmit());
        expect(mockDispatch).toHaveBeenCalledTimes(calls);
        act(() => oldEdit('late'));
        expect(mockDispatch).toHaveBeenLastCalledWith({
            kind: 'edit_name_for_owner',
            expected_owner: 7,
            value: 'late',
        });
        act(() => tree.unmount());
    });
    it('retries a failed native environment load through the existing submit action', async () => {
        mockHydrate.mockRejectedValueOnce(new Error('synthetic storage failure'));
        mockDestinations = {
            loading: false,
            error: 'gateway_environment_load_failed',
            installation_id: null,
        };
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<Screen />);
        });
        expect(tree.root.findByType('Container' as never).props.submitDisabled).toBe(false);
        expect(mockDispatch).not.toHaveBeenCalled();
        await act(async () => {
            tree.root.findByType('Container' as never).props.handleSubmit();
        });
        expect(mockHydrate).toHaveBeenCalledTimes(2);
        expect(mockDispatch).toHaveBeenCalledWith({
            kind: 'open',
            mode: { kind: 'add_gateway', allow_local: false },
        });
        act(() => tree.unmount());
    });
});
