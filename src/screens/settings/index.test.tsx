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
let mockCanViewInvitations = false;
let mockCanViewMembers = false;
let mockCapabilitiesLoaded = true;
let mockCurrentPrincipal: {
    display_name: string;
    nickname: string;
    principal_id: string;
    role: {
        key: string;
        display_name: string;
        description: string;
        built_in: boolean;
    };
    avatar_revision?: string | null;
} | null = null;

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
    MailPlus: (props: Record<string, unknown>) => mockReact.createElement('MailPlus', props),
    Smartphone: (props: Record<string, unknown>) => mockReact.createElement('Smartphone', props),
    Sun: (props: Record<string, unknown>) => mockReact.createElement('Sun', props),
    Users: (props: Record<string, unknown>) => mockReact.createElement('Users', props),
    UserRound: (props: Record<string, unknown>) => mockReact.createElement('UserRound', props),
}));

jest.mock('@/hooks/use-administration-capabilities', () => ({
    useAdministrationCapabilities: () => ({
        data: mockCapabilitiesLoaded
            ? {
                  can_view_invitations: mockCanViewInvitations,
                  can_view_member_directory: mockCanViewMembers,
              }
            : undefined,
        capabilitySnapshot:
            mockCapabilitiesLoaded && mockCurrentPrincipal
                ? { role: mockCurrentPrincipal.role }
                : undefined,
    }),
    useAdministrationPrincipal: () => ({
        data: mockCurrentPrincipal
            ? {
                  principal: {
                      id: mockCurrentPrincipal.principal_id,
                      display_name: mockCurrentPrincipal.display_name,
                      nickname: mockCurrentPrincipal.nickname,
                      avatar_revision: mockCurrentPrincipal.avatar_revision,
                  },
              }
            : undefined,
    }),
}));

jest.mock('@/components/primitives/box', () => ({
    Box: (props: Record<string, unknown>) =>
        mockReact.createElement('Box', props, props.children as React.ReactNode),
}));
jest.mock('@/components/member-avatar', () => ({
    MemberAvatar: (props: Record<string, unknown>) =>
        mockReact.createElement('MemberAvatar', props),
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

const pressableWithLabel = (tree: ReactTestRenderer, label: string) =>
    tree.root
        .findAllByType(mockPressable)
        .find((node) =>
            node.findAllByType(mockText).some((textNode) => textNode.props.children === label),
        );

describe('SettingsScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockTerminalReason = null;
        mockCanViewInvitations = false;
        mockCanViewMembers = false;
        mockCapabilitiesLoaded = true;
        mockCurrentPrincipal = null;
    });

    it('keeps verified account identity visible while capabilities are unavailable', async () => {
        mockCapabilitiesLoaded = false;
        mockCurrentPrincipal = {
            display_name: 'Alice',
            nickname: 'alice',
            principal_id: 'P00000000000000000001',
            role: {
                key: 'member',
                display_name: 'Member',
                description: 'Workspace collaborator',
                built_in: true,
            },
        };
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<SettingsScreen />);
        });

        const labels = renderedLabels(tree!);
        expect(labels).toContain('Alice');
        expect(labels).toContainEqual(['@', 'alice']);
        expect(labels).not.toContain('Member');
        expect(tree!.root.findAllByType(mockPressable)[0].props.accessibilityLabel).toBe('Alice');
    });

    it('opens the editable authenticated profile', async () => {
        mockCurrentPrincipal = {
            display_name: 'Alice',
            nickname: 'alice',
            principal_id: 'P00000000000000000001',
            role: {
                key: 'future_collaborator',
                display_name: 'Future collaborator',
                description: 'Test role',
                built_in: false,
            },
        };
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<SettingsScreen />);
        });
        const labels = renderedLabels(tree!);
        expect(labels).toContain('Alice');
        expect(labels).not.toContain('profile.readOnly');
        expect(labels).toContain('Future collaborator');
        const profileRow = tree!.root.findAllByType(mockPressable)[0];
        await act(async () => profileRow.props.onPress());
        expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/settings/profile' });
    });

    it('shows Members only when the shared capability allows it', async () => {
        mockCanViewMembers = true;
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<SettingsScreen />);
        });
        expect(renderedLabels(tree!)).toContain('members.eyebrow');
        const memberRow = pressableWithLabel(tree!, 'members.eyebrow')!;
        await act(async () => memberRow.props.onPress());
        expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/settings/members' });
    });

    it('shows Invitations only when the shared capability allows it', async () => {
        mockCanViewInvitations = true;
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<SettingsScreen />);
        });
        expect(renderedLabels(tree!)).toContain('invitations.eyebrow');
        const invitationRow = pressableWithLabel(tree!, 'invitations.eyebrow')!;
        await act(async () => invitationRow.props.onPress());
        expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/settings/invitations' });
    });

    it('shows Devices while the active Gateway session is usable', async () => {
        mockCurrentPrincipal = {
            display_name: 'Alice',
            nickname: 'alice',
            principal_id: 'P00000000000000000001',
            role: {
                key: 'future_collaborator',
                display_name: 'Future collaborator',
                description: 'Test role',
                built_in: false,
            },
        };
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<SettingsScreen />);
        });

        expect(renderedLabels(tree!)).toEqual(
            expect.arrayContaining(['language.eyebrow', 'theme.eyebrow', 'devices.eyebrow']),
        );
    });

    it('keeps Language and Theme usable but hides Devices after session revocation', async () => {
        mockTerminalReason = 'session_revoked';
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<SettingsScreen />);
        });

        const labels = renderedLabels(tree!);
        expect(labels).toEqual(expect.arrayContaining(['language.eyebrow', 'theme.eyebrow']));
        expect(labels).not.toContain('devices.eyebrow');

        const rows = tree!.root.findAllByType(mockPressable);
        await act(async () => {
            rows[0].props.onPress();
            rows[1].props.onPress();
        });

        expect(mockNavigate).toHaveBeenNthCalledWith(1, { pathname: '/settings/language' });
        expect(mockNavigate).toHaveBeenNthCalledWith(2, { pathname: '/settings/theme' });
    });
});
