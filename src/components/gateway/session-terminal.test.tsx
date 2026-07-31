import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockReact = React;
const mockNavigateEditor = jest.fn();
const mockUsePathname = jest.fn();
const mockButtonComponent = (props: Record<string, unknown>) =>
    mockReact.createElement('Button', props);
type TerminalReason =
    | 'authentication_required'
    | 'session_revoked'
    | 'session_expired'
    | 'session_compromised'
    | 'gateway_identity_mismatch'
    | 'secure_storage_failed'
    | 'refresh_outcome_unknown'
    | 'refresh_credential_invalid';

let mockTerminalReason: TerminalReason | null = null;
let mockGatewayId: string | null = null;

jest.setMock('expo-router', {
    __esModule: true,
    usePathname: mockUsePathname,
});

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-unistyles', () => ({
    StyleSheet: {
        create: () => ({
            backdrop: {},
            card: {},
            description: {},
        }),
    },
}));

jest.mock('@/components/buttons/base', () => ({
    Button: mockButtonComponent,
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
            sessionTerminalReason: mockTerminalReason,
            registry: { active_gateway_id: mockGatewayId },
        }),
}));
jest.mock('@/hooks/use-editor', () => ({
    useEditor: () => ({ navigate: mockNavigateEditor }),
}));

const { TerminalGatewaySession } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./session-terminal') as typeof import('./session-terminal');

describe('TerminalGatewaySession', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUsePathname.mockReturnValue('/');
        mockTerminalReason = null;
        mockGatewayId = null;
    });

    it.each([
        'authentication_required',
        'session_revoked',
        'session_expired',
        'session_compromised',
        'gateway_identity_mismatch',
        'secure_storage_failed',
        'refresh_outcome_unknown',
        'refresh_credential_invalid',
    ] as const)('renders a terminal recovery screen for %s without retrying', async (reason) => {
        mockTerminalReason = reason;
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<TerminalGatewaySession />);
        });

        const rendered = JSON.stringify(tree!.toJSON());
        expect(rendered).toContain(`terminal.${reason}.title`);
        expect(rendered).toContain('terminal.activateAction');
        expect(rendered).not.toContain('retry');
    });

    it('opens activation for the active endpoint', async () => {
        mockTerminalReason = 'authentication_required';
        mockGatewayId = 'remote-1';
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<TerminalGatewaySession />);
        });

        const button = tree!.root
            .findAllByType(mockButtonComponent)
            .find((candidate) => candidate.props.title === 'terminal.activateAction');
        expect(button).toBeDefined();
        act(() => {
            button!.props.onPress();
        });
        expect(mockNavigateEditor).toHaveBeenCalledWith({
            type: 'gateway__authenticate',
            payload: { gatewayId: 'remote-1' },
        });
    });

    it('opens the normal gateway editor when no active endpoint is available', async () => {
        mockTerminalReason = 'authentication_required';
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<TerminalGatewaySession />);
        });

        const button = tree!.root
            .findAllByType(mockButtonComponent)
            .find((candidate) => candidate.props.title === 'terminal.activateAction');
        act(() => {
            button!.props.onPress();
        });
        expect(mockNavigateEditor).toHaveBeenCalledWith({ type: 'gateway__create' });
    });

    it('stays hidden without a terminal state and on explicit recovery routes', async () => {
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(<TerminalGatewaySession />);
        });
        expect(tree!.toJSON()).toBeNull();

        mockTerminalReason = 'session_revoked';
        mockUsePathname.mockReturnValue('/activate');
        await act(async () => {
            tree!.update(<TerminalGatewaySession />);
        });
        expect(tree!.toJSON()).toBeNull();
    });
});
