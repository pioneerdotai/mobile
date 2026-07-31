import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockReact = React;
const mockNavigate = jest.fn();
const mockPressable = (props: Record<string, unknown>) =>
    mockReact.createElement('Pressable', props, props.children as React.ReactNode);
const mockText = (props: Record<string, unknown>) =>
    mockReact.createElement('Text', props, props.children as React.ReactNode);
let mockTerminalReason: 'session_revoked' | null = null;

jest.setMock('expo-router', {
    __esModule: true,
    router: { navigate: mockNavigate },
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
        hairlineWidth: 1,
    },
    useUnistyles: () => ({
        theme: {
            colors: { typography: '#000' },
            space: (value: number) => value * 4,
        },
    }),
}));

jest.mock('lucide-react-native', () => ({
    ChevronRight: (props: Record<string, unknown>) =>
        mockReact.createElement('ChevronRight', props),
    Globe: (props: Record<string, unknown>) => mockReact.createElement('Globe', props),
    Smartphone: (props: Record<string, unknown>) => mockReact.createElement('Smartphone', props),
    Sun: (props: Record<string, unknown>) => mockReact.createElement('Sun', props),
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
jest.mock('@/components/primitives/text', () => ({ Text: mockText }));
jest.mock('@/components/primitives/vstack', () => ({
    VStack: (props: Record<string, unknown>) =>
        mockReact.createElement('VStack', props, props.children as React.ReactNode),
}));
jest.mock('@/components/typography/title', () => ({
    Title: (props: Record<string, unknown>) =>
        mockReact.createElement('Title', props, props.children as React.ReactNode),
}));

jest.mock('@/stores/gateway', () => ({
    useGatewayStore: (selector: (state: Record<string, unknown>) => unknown) =>
        selector({
            registry: {
                active_gateway_id: 'gateway-1',
                remotes: [{ id: 'gateway-1' }],
            },
            sessionTerminalReason: mockTerminalReason,
        }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SettingsScreen = require('./index').default as typeof import('./index').default;

const renderedLabels = (tree: ReactTestRenderer) =>
    tree.root.findAllByType(mockText).map((node) => node.props.children);

describe('SettingsScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockTerminalReason = null;
    });

    it('shows Devices while the active Gateway session is usable', async () => {
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<SettingsScreen />);
        });

        expect(renderedLabels(tree!)).toEqual([
            'language.eyebrow',
            'theme.eyebrow',
            'devices.eyebrow',
        ]);
    });

    it('keeps Language and Theme usable but hides Devices after session revocation', async () => {
        mockTerminalReason = 'session_revoked';
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<SettingsScreen />);
        });

        expect(renderedLabels(tree!)).toEqual(['language.eyebrow', 'theme.eyebrow']);

        const rows = tree!.root.findAllByType(mockPressable);
        await act(async () => {
            rows[0].props.onPress();
            rows[1].props.onPress();
        });

        expect(mockNavigate).toHaveBeenNthCalledWith(1, { pathname: '/settings/language' });
        expect(mockNavigate).toHaveBeenNthCalledWith(2, { pathname: '/settings/theme' });
    });
});
