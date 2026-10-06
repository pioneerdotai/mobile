// NOT_RUN / NOT_COMPILED. Native platform boundary mocks only; no app/provider.
import { pioneerClient } from '@/client';
import { relayPluginOAuthCallback } from './oauth';

jest.mock('@/client', () => ({ pioneerClient: { pluginShell: jest.fn() } }));
jest.mock('@/helpers/app-url', () => ({ PIONEER_APP_URL_SCHEME: 'pioneer' }));
jest.mock('expo-web-browser', () => ({
    openAuthSessionAsync: jest.fn(),
    dismissAuthSession: jest.fn(),
}));
jest.mock('expo-linking', () => ({ addEventListener: jest.fn() }));

describe('native plugin OAuth callback boundary', () => {
    beforeEach(() => jest.clearAllMocks());
    it('passes the original opaque response to native identity validation', () => {
        const callback =
            'pioneer:///oauth/mcp/callback?state=nonce&code=opaque&iss=https%3A%2F%2Fissuer.example';
        jest.mocked(pioneerClient.pluginShell).mockReturnValue({
            accepted: true,
            operation_id: null,
            launches: [],
            active_flows: [],
            picker: [],
        });
        expect(relayPluginOAuthCallback(callback)).toBe(true);
        expect(pioneerClient.pluginShell).toHaveBeenCalledWith({
            kind: 'oauth_callback',
            url: callback,
        });
        jest.mocked(pioneerClient.pluginShell).mockReturnValue({
            accepted: false,
            operation_id: null,
            launches: [],
            active_flows: [],
            picker: [],
        });
        expect(relayPluginOAuthCallback(callback)).toBe(false);
    });
    it('never sends a foreign host, scheme or route to a current Gateway', () => {
        for (const url of [
            'https://example.com/oauth/mcp/callback?state=x&code=y',
            'pioneer://foreign/oauth/mcp/callback?state=x&code=y',
            'pioneer:///other?state=x&code=y',
        ])
            expect(relayPluginOAuthCallback(url)).toBe(false);
        expect(pioneerClient.pluginShell).not.toHaveBeenCalled();
    });
});
