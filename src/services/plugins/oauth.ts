import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { AppState } from 'react-native';
import { pioneerClient } from '@/client';
import { PIONEER_APP_URL_SCHEME } from '@/helpers/app-url';

const redirect = `${PIONEER_APP_URL_SCHEME}:///oauth/mcp/callback`;
const isCallback = (raw: string): boolean => {
    try {
        const u = new URL(raw);
        return (
            u.protocol === `${PIONEER_APP_URL_SCHEME}:` &&
            u.hostname === '' &&
            u.pathname === '/oauth/mcp/callback'
        );
    } catch {
        return false;
    }
};
export const relayPluginOAuthCallback = (url: string): boolean => {
    if (!isCallback(url)) return false;
    // Native owns exact redirect/state/flow/origin validation. Never log payloads.
    try {
        return pioneerClient.pluginShell({ kind: 'oauth_callback', url }).accepted;
    } catch {
        return false;
    }
};
/** App-lifetime OS adapter. Closing a plugin card does not revoke consent. */
export const initializePluginOAuthEffects = (): (() => void) => {
    pioneerClient.pluginShell({ kind: 'configure_oauth', redirect_uri: redirect });
    let closed = false;
    let browserFlow: string | null = null;
    const launched = new Set<string>();
    const poll = () => {
        if (closed || AppState.currentState !== 'active') return;
        let effects;
        try {
            effects = pioneerClient.pluginShell({ kind: 'poll_oauth' });
        } catch {
            return;
        }
        const active = new Set(effects.active_flows);
        for (const id of launched) if (!active.has(id)) launched.delete(id);
        if (browserFlow && !active.has(browserFlow)) {
            browserFlow = null;
            try {
                WebBrowser.dismissAuthSession();
            } catch {
                /* OS may have closed it already. */
            }
        }
        for (const launch of effects.launches) {
            if (launched.has(launch.flow_id)) continue;
            launched.add(launch.flow_id);
            if (browserFlow) {
                pioneerClient.pluginShell({
                    kind: 'browser_result',
                    flow_id: launch.flow_id,
                    cancelled: false,
                });
                continue;
            }
            browserFlow = launch.flow_id;
            void WebBrowser.openAuthSessionAsync(launch.authorization_url, launch.redirect_uri)
                .then((result) => {
                    if (closed || browserFlow !== launch.flow_id) return;
                    if (result.type === 'success' && relayPluginOAuthCallback(result.url)) return;
                    // A locked/unavailable browser retains the existing flow for
                    // Retry. Only actual user dismissal cancels Gateway consent.
                    pioneerClient.pluginShell({
                        kind: 'browser_result',
                        flow_id: launch.flow_id,
                        cancelled: result.type === 'cancel' || result.type === 'dismiss',
                    });
                })
                .catch(() => {
                    if (!closed && browserFlow === launch.flow_id)
                        pioneerClient.pluginShell({
                            kind: 'browser_result',
                            flow_id: launch.flow_id,
                            cancelled: false,
                        });
                })
                .finally(() => {
                    if (browserFlow === launch.flow_id) browserFlow = null;
                    launched.delete(launch.flow_id);
                });
        }
    };
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
        relayPluginOAuthCallback(url);
    });
    const appSubscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') poll();
    });
    // Only drains native OS effect mailboxes; no Gateway operation polling API.
    const timer = setInterval(poll, 350);
    poll();
    return () => {
        closed = true;
        clearInterval(timer);
        urlSubscription.remove();
        appSubscription.remove();
        if (browserFlow) {
            try {
                WebBrowser.dismissAuthSession();
            } catch {}
        }
    };
};
