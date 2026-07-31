import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockReplace = jest.fn();
const mockUsePathname = jest.fn();
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

jest.setMock('expo-router', {
    __esModule: true,
    usePathname: mockUsePathname,
    useRouter: () => ({ replace: mockReplace }),
});
jest.mock('@/stores/gateway', () => ({
    useGatewayStore: (selector: (state: Record<string, unknown>) => unknown) =>
        selector({
            sessionTerminalReason: mockTerminalReason,
        }),
}));

const { TerminalGatewaySessionNavigation } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./session-terminal-navigation') as typeof import('./session-terminal-navigation');

describe('TerminalGatewaySessionNavigation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUsePathname.mockReturnValue('/');
        mockTerminalReason = null;
    });

    it('renders nothing and stays on Home when authentication is required', async () => {
        mockTerminalReason = 'authentication_required';
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<TerminalGatewaySessionNavigation />);
        });

        expect(tree!.toJSON()).toBeNull();
        expect(mockReplace).not.toHaveBeenCalled();
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
    ] as const)('returns non-recovery routes to Home for %s', async (reason) => {
        mockTerminalReason = reason;
        mockUsePathname.mockReturnValue('/thread/thread-1');

        await act(async () => {
            renderer.create(<TerminalGatewaySessionNavigation />);
        });

        expect(mockReplace).toHaveBeenCalledWith('/');
    });

    it.each(['/activate', '/editor'])('does not interrupt recovery route %s', async (pathname) => {
        mockTerminalReason = 'authentication_required';
        mockUsePathname.mockReturnValue(pathname);

        await act(async () => {
            renderer.create(<TerminalGatewaySessionNavigation />);
        });

        expect(mockReplace).not.toHaveBeenCalled();
    });

    it('does not navigate without a terminal state', async () => {
        mockUsePathname.mockReturnValue('/settings');

        await act(async () => {
            renderer.create(<TerminalGatewaySessionNavigation />);
        });

        expect(mockReplace).not.toHaveBeenCalled();
    });
});
