import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ModelSelectorHomeScreen } from './index';

const mockPicker = jest.fn<() => unknown>();
const mockDispatch = jest.fn();

jest.mock('@shopify/flash-list', () => ({ FlashList: () => null }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string, args?: { tokens?: number }) => args ? `${key}:${args.tokens}` : key }),
}));
jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: () => ({}) },
    useUnistyles: () => ({ theme: { space: (n: number) => n, colors: { typography: 'black', textMuted: 'grey' } } }),
}));
jest.mock('lucide-react-native', () => ({ Check: () => null, ChevronRight: () => null }));
jest.mock('@/components/feedback/spinner', () => () => null);
jest.mock('@/client', () => ({}));
jest.mock('@/client/composer-model-picker', () => ({
    useComposerModelPicker: () => mockPicker(),
    dispatchComposerModelPicker: (intent: unknown) => mockDispatch(intent),
}));
jest.mock('@/stores/workspace', () => ({ useWorkspaceStore: () => null }));
jest.mock('@/components/primitives/box', () => {
    const React = require('react');
    return { Box: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement('Box', props, children) };
});
jest.mock('@/components/primitives/hstack', () => {
    const React = require('react');
    return { HStack: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement('HStack', props, children) };
});
jest.mock('@/components/primitives/vstack', () => {
    const React = require('react');
    return { VStack: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement('VStack', props, children) };
});
jest.mock('@/components/primitives/pressable', () => {
    const React = require('react');
    return { Pressable: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement('Pressable', props, children) };
});
jest.mock('@/components/primitives/scrollview', () => {
    const React = require('react');
    return { ScrollView: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement('ScrollView', props, children) };
});
jest.mock('@/components/primitives/text', () => {
    const React = require('react');
    return { Text: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement('Text', props, children) };
});
jest.mock('@/components/primitives/input', () => ({ Input: () => null }));

const identity = { thread_id: 'thread-1', draft_id: 3, generation: 7 };
const picker = () => ({
    identity,
    selected_provider_ready: true,
    selector: { selected_provider: 'openai', selected_model: 'model', models: [] },
    provider_rows: [{ id: 'openai', label: 'OpenAI' }],
    providers_request: { state: { kind: 'ready' } },
    models_request: { state: { kind: 'ready' } },
    reasoning_rows: [],
    selected_context_window: null,
    context_rows: [
        { window: null, tokens: 16000, selected: true },
        { window: 128000, tokens: 128000, selected: false },
    ],
});

beforeEach(() => {
    mockPicker.mockReset();
    mockDispatch.mockClear();
});

describe('context window selection', () => {
    it('shows choices and dispatches the selected context window with the current identity', () => {
        mockPicker.mockReturnValue(picker());
        let tree!: ReactTestRenderer;
        act(() => { tree = create(<ModelSelectorHomeScreen />); });
        const rows = tree.root.findAll((node) => String(node.type) === 'Pressable' && node.props.accessibilityRole === 'radio');
        expect(rows).toHaveLength(2);
        expect(rows[0].props.accessibilityState).toEqual({ checked: true });
        expect(rows[1].props.accessibilityState).toEqual({ checked: false });
        act(() => { rows[1].props.onPress(); });
        expect(mockDispatch).toHaveBeenCalledWith({ kind: 'select_context_window', identity, window: 128000 });
        act(() => { rows[0].props.onPress(); });
        expect(mockDispatch).toHaveBeenCalledWith({ kind: 'select_context_window', identity, window: null });
        act(() => { tree.unmount(); });
    });

    it('marks a stored unavailable context window as invalid', () => {
        mockPicker.mockReturnValue({
            ...picker(),
            selected_context_window: 64000,
            context_rows: [{ window: null, tokens: 16000, selected: false }],
        });
        let tree!: ReactTestRenderer;
        act(() => { tree = create(<ModelSelectorHomeScreen />); });
        expect(tree.root.findAll((node) => String(node.type) === 'Text' && node.children.includes('modelSelectorContextInvalid'))).toHaveLength(1);
        act(() => { tree.unmount(); });
    });

    it('hides the context section when no choices are available', () => {
        mockPicker.mockReturnValue({ ...picker(), context_rows: [] });
        let tree!: ReactTestRenderer;
        act(() => { tree = create(<ModelSelectorHomeScreen />); });
        expect(tree.root.findAll((node) => node.props.accessibilityRole === 'radio')).toHaveLength(0);
        act(() => { tree.unmount(); });
    });
});

describe('service mode selection', () => {
    it('shows service and context choices together and dispatches the selected service mode', () => {
        mockPicker.mockReturnValue({
            ...picker(),
            selected_service_mode: { authority: 'endpoint', id: 'fast' },
            service_rows: [
                { id: 'standard', label: 'Standard', available: true, selected: false },
                { id: 'fast', label: 'Fast', available: true, selected: true },
                { id: 'unavailable', label: 'Unavailable', available: false, selected: false },
            ],
        });
        let tree!: ReactTestRenderer;
        act(() => { tree = create(<ModelSelectorHomeScreen />); });
        const rows = tree.root.findAll((node) => String(node.type) === 'Pressable' && node.props.accessibilityRole === 'radio');
        expect(rows).toHaveLength(5);
        expect(rows[0].props.accessibilityState).toEqual({ checked: false, disabled: false });
        expect(rows[1].props.accessibilityState).toEqual({ checked: true, disabled: false });
        expect(rows[2].props.accessibilityState).toEqual({ checked: false, disabled: true });
        expect(rows[2].props.disabled).toBe(true);
        act(() => { rows[0].props.onPress(); });
        expect(mockDispatch).toHaveBeenCalledWith({ kind: 'select_service_mode', identity, id: 'standard' });
        act(() => { rows[1].props.onPress(); });
        expect(mockDispatch).toHaveBeenCalledWith({ kind: 'select_service_mode', identity, id: 'fast' });
        act(() => { rows[4].props.onPress(); });
        expect(mockDispatch).toHaveBeenCalledWith({ kind: 'select_context_window', identity, window: 128000 });
        act(() => { tree.unmount(); });
    });

    it('warns when a saved service mode is unavailable', () => {
        mockPicker.mockReturnValue({
            ...picker(),
            selected_service_mode: { authority: 'endpoint', id: 'fast' },
            service_rows: [
                { id: 'standard', label: 'Standard', available: true, selected: false },
                { id: 'fast', label: 'Fast', available: false, selected: true },
            ],
        });
        let tree!: ReactTestRenderer;
        act(() => { tree = create(<ModelSelectorHomeScreen />); });
        expect(tree.root.findAll((node) => String(node.type) === 'Text' && node.children.includes('modelSelectorServiceInvalid'))).toHaveLength(1);
        act(() => { tree.unmount(); });
    });

    it('hides the service section when there are no service choices', () => {
        mockPicker.mockReturnValue({ ...picker(), service_rows: [] });
        let tree!: ReactTestRenderer;
        act(() => { tree = create(<ModelSelectorHomeScreen />); });
        expect(tree.root.findAll((node) => String(node.type) === 'Text' && node.children.includes('modelSelectorServiceLabel'))).toHaveLength(0);
        act(() => { tree.unmount(); });
    });
});
