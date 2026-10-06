// NOT_RUN / NOT_COMPILED. Native platform boundary mocks only; no app/provider.
import { pioneerClient } from '@/client';
import { initializePluginOAuthEffects, relayPluginOAuthCallback } from './oauth';
import * as WebBrowser from 'expo-web-browser';

jest.mock('@/client', () => ({ pioneerClient: { pluginShell: jest.fn() } }));
jest.mock('@/helpers/app-url', () => ({ PIONEER_APP_URL_SCHEME: 'pioneer' }));
jest.mock('expo-web-browser', () => ({
    openAuthSessionAsync: jest.fn(),
    dismissAuthSession: jest.fn(),
}));
jest.mock('expo-linking', () => ({ addEventListener: jest.fn(() => ({ remove: jest.fn() })) }));
jest.mock('react-native', () => ({
    AppState: { currentState: 'active', addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));

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

// OS outcomes must never turn a failed launch into native consent cancellation.
describe('plugin browser result ownership', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });
    afterEach(() => jest.useRealTimers());
    it.each(['locked', 'cancel', 'dismiss'] as const)(
        'relays %s with its original flow identity',
        async (type) => {
            jest.mocked(pioneerClient.pluginShell).mockImplementation((request) => ({
                accepted: true,
                operation_id: null,
                picker: [],
                active_flows: ['original-flow'],
                launches:
                    request.kind === 'poll_oauth'
                        ? [
                              {
                                  flow_id: 'original-flow',
                                  workspace_id: 'original-workspace',
                                  server_id: 'original-installation',
                                  authorization_url:
                                      'https://issuer.example/authorize?state=opaque',
                                  redirect_uri: 'pioneer:///oauth/mcp/callback',
                              },
                          ]
                        : [],
            }));
            jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValueOnce({
                type: type as WebBrowser.WebBrowserResultType,
            });
            const close = initializePluginOAuthEffects();
            try {
                await Promise.resolve();
                await Promise.resolve();
                expect(pioneerClient.pluginShell).toHaveBeenCalledWith({
                    kind: 'browser_result',
                    flow_id: 'original-flow',
                    cancelled: type !== 'locked',
                });
            } finally {
                close();
            }
        },
    );
});
