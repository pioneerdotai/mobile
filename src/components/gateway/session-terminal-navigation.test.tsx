import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockDismissTo = jest.fn();
const mockUsePathname = jest.fn();
type TerminalReason =
    | 'authentication_required'
    | 'session_revoked'
    | 'session_expired'
    | 'session_compromised'
    | 'principal_suspended'
    | 'principal_removed'
    | 'gateway_identity_mismatch'
    | 'secure_storage_failed'
    | 'refresh_outcome_unknown'
    | 'refresh_credential_invalid';

let mockTerminalReason: TerminalReason | null = null;

jest.setMock('expo-router', {
    __esModule: true,
    usePathname: mockUsePathname,
    useRouter: () => ({ dismissTo: mockDismissTo }),
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

    it.each([
        'authentication_required',
        'session_revoked',
        'session_expired',
        'session_compromised',
        'principal_suspended',
        'principal_removed',
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

        expect(mockDismissTo).toHaveBeenCalledWith('/');
    });

    it.each(['/', '/activate', '/invite', '/editor'])(
        'does not interrupt terminal-session route %s',
        async (pathname) => {
            mockTerminalReason = 'authentication_required';
            mockUsePathname.mockReturnValue(pathname);

            let tree: ReactTestRenderer | null = null;
            await act(async () => {
                tree = renderer.create(<TerminalGatewaySessionNavigation />);
            });

            expect(tree!.toJSON()).toBeNull();
            expect(mockDismissTo).not.toHaveBeenCalled();
        },
    );

    it.each(['/settings', '/settings/language', '/settings/theme'])(
        'returns safe settings route %s to the typed terminal Home state',
        async (pathname) => {
            mockTerminalReason = 'principal_suspended';
            mockUsePathname.mockReturnValue(pathname);
            await act(async () => {
                renderer.create(<TerminalGatewaySessionNavigation />);
            });
            expect(mockDismissTo).toHaveBeenCalledWith('/');
        },
    );

    it('returns Devices settings to Home because it requires an authenticated session', async () => {
        mockTerminalReason = 'session_revoked';
        mockUsePathname.mockReturnValue('/settings/devices');

        await act(async () => {
            renderer.create(<TerminalGatewaySessionNavigation />);
        });

        expect(mockDismissTo).toHaveBeenCalledWith('/');
    });

    it('does not navigate without a terminal state', async () => {
        mockUsePathname.mockReturnValue('/settings');

        await act(async () => {
            renderer.create(<TerminalGatewaySessionNavigation />);
        });

        expect(mockDismissTo).not.toHaveBeenCalled();
    });
});
