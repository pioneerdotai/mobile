import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/js-stack';
import WebView from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { nanoid } from 'nanoid';
import { pioneerClient } from '@/client';
import { CollapseButton } from '@/components/buttons/collapse';
import { Text } from '@/components/primitives/text';
import type { AppViewPublication } from '@/client/generated/plugin_shell_response';

// The ticket grants access to a path, not the whole Gateway origin. Parse URL
// paths before comparison so dot segments cannot escape the grant.
const viewGrant = (url: string | null | undefined, baseUrl: string | null | undefined) => {
    if (!url || !baseUrl) return null;
    try {
        // Proxies may decode paths more than once. Do not accept encoded dots,
        // separators or percent signs in a grant or a navigation path.
        const unsafePath = (value: string) => /%(?:2e|2f|5c|25)/i.test(value.split(/[?#]/, 1)[0]);
        if (unsafePath(baseUrl)) return null;
        const base = new URL(baseUrl);
        if (
            !['http:', 'https:'].includes(base.protocol) ||
            base.username || base.password || base.search || base.hash ||
            !base.pathname.endsWith('/') || /%(?:2f|5c)/i.test(base.pathname) ||
            !/^\/(?:[a-zA-Z0-9._~/-]|%[0-9a-fA-F]{2})*$/.test(base.pathname)
        ) return null;
        const permits = (candidate: string) => {
            if (/[\\\u0000-\u0020\u007f]/.test(candidate) || unsafePath(candidate)) return false;
            try {
                const parsed = new URL(candidate);
                return (
                    !parsed.username && !parsed.password &&
                    parsed.origin === base.origin &&
                    parsed.pathname.startsWith(base.pathname) &&
                    !/%(?:2f|5c)/i.test(parsed.pathname)
                );
            } catch {
                return false;
            }
        };
        return permits(url) ? { permits, frameSource: `${base.origin}${base.pathname}` } : null;
    } catch {
        return null;
    }
};

export default function AppViewScreen() {
    const { workspace, app } = useLocalSearchParams<{ workspace: string; app: string }>();
    const { t } = useTranslation('settings');
    const { theme } = useUnistyles();
    const webview = useRef<WebView<object>>(null);
    // The sandboxed frame cannot read this nonce from its cross-origin parent.
    // ReactNativeWebView is available to subframes on some platforms, so native
    // must not trust an onMessage event without the parent document's nonce.
    const bridgeToken = useMemo(() => nanoid(32), [workspace, app]);
    const bridgeScript = useMemo(() => `(()=>{if(window.top!==window||window.__pioneerAppViewBridge)return;window.__pioneerAppViewBridge=true;const token=${JSON.stringify(bridgeToken)};window.addEventListener('message',event=>{const frame=document.querySelector('iframe');if(!frame||event.source!==frame.contentWindow)return;const data=event.data;if(!data||typeof data!=='object'||typeof data.id!=='string'||!/^[a-zA-Z0-9-]{1,64}$/.test(data.id))return;if(data.type==='pioneer.view.close'&&Object.keys(data).length===2){window.ReactNativeWebView?.postMessage(JSON.stringify({token,type:data.type,id:data.id}));}else if(data.type==='pioneer.view.setPlacement'&&data.placement==='fullscreen'&&Object.keys(data).length===3){window.ReactNativeWebView?.postMessage(JSON.stringify({token,type:data.type,id:data.id,placement:data.placement}));}})})();true;`, [bridgeToken]);
    // The mobile palette is not the SDK's complete desktop Theme snapshot.
    // Do not publish an incompatible partial pioneer.theme message.
    const themeScript = useMemo(() => `(()=>{const p=${JSON.stringify({ appearance: theme.appearance, background: theme.colors.background })};const r=document.documentElement;if(!r)return;r.style.colorScheme=p.appearance;r.style.setProperty('--pioneer-background',p.background)})();true;`, [theme.appearance, theme.colors.background]);
    useEffect(() => { webview.current?.injectJavaScript(themeScript); }, [themeScript]);
    const [publication, setPublication] = useState<AppViewPublication | null>(null);
    const [failed, setFailed] = useState(false);
    const activeSession = useRef<{ key: string; isActive: () => boolean; release: () => void; fail: () => void } | null>(null);
    useEffect(() => {
        setFailed(false); setPublication(null);
        let ticket: number | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let alive = true;
        const release = () => {
            if (!alive) return;
            alive = false;
            if (timer) clearTimeout(timer);
            if (ticket !== undefined) {
                const closingTicket = ticket;
                ticket = undefined;
                try { pioneerClient.pluginShell({ kind: 'app_view_close', ticket: closingTicket }); } catch { /* The native client may already be shutting down. */ }
            }
        };
        const fail = () => {
            if (!alive) return;
            release();
            setFailed(true);
        };
        const session = { key: bridgeToken, isActive: () => alive, release, fail };
        activeSession.current = session;
        try {
            ticket = pioneerClient.pluginShell({ kind: 'app_view_open', workspace_id: workspace, app_id: app }).view_ticket ?? undefined;
            if (ticket === undefined) throw new Error('app_view_unavailable');
            const poll = () => {
                if (!alive || ticket === undefined) return;
                try {
                    const next = pioneerClient.pluginShell({ kind: 'app_view_poll', ticket }).app_view ?? null;
                    if (!next) { fail(); return; }
                    setPublication(next);
                    if (next.state === 'failed' || next.state === 'denied' ||
                        (next.state === 'ready' && !viewGrant(next.url, next.base_url))) {
                        release();
                        return;
                    }
                    timer = setTimeout(poll, 500);
                } catch { fail(); }
            };
            poll();
        } catch { fail(); }
        return () => {
            release();
            if (activeSession.current === session) activeSession.current = null;
        };
    }, [workspace, app, bridgeToken]);
    const currentSession = () => activeSession.current?.key === bridgeToken && activeSession.current.isActive() ? activeSession.current : null;
    const fail = () => currentSession()?.fail();
    const close = () => { currentSession()?.release(); if (router.canGoBack()) router.back(); else router.replace('/'); };
    const receiveViewMessage = (data: string) => {
        if (typeof data !== 'string' || data.length > 1024 || !currentSession()) return;
        try {
            const message = JSON.parse(data);
            if (!message || typeof message !== 'object' || message.token !== bridgeToken ||
                typeof message.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(message.id)) return;
            if (message.type === 'pioneer.view.close' && Object.keys(message).length === 3) {
                close();
            } else if (message.type === 'pioneer.view.setPlacement' && message.placement === 'fullscreen' && Object.keys(message).length === 4) {
                const result = JSON.stringify({ type: 'pioneer.view.result', id: message.id, placement: 'fullscreen' });
                webview.current?.injectJavaScript(`document.querySelector('iframe')?.contentWindow.postMessage(${result}, '*');true;`);
            }
        } catch { /* Ignore malformed and untrusted messages. */ }
    };
    const url = publication?.state === 'ready' && !failed ? publication.url : null;
    const grant = viewGrant(url, publication?.base_url);
    const source = useMemo(() => {
        const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
        return { html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; frame-src ${escape(grant?.frameSource ?? "'none'")}"><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;overflow:hidden}body{background:var(--pioneer-background)}iframe{display:block}</style></head><body><iframe title="${escape(t('apps.title'))}" src="${escape(url ?? '')}" sandbox="allow-scripts allow-forms" referrerpolicy="no-referrer"></iframe></body></html>`, baseUrl: 'about:blank' };
    }, [url, grant?.frameSource, t]);
    return (
        <SafeAreaView edges={['bottom']} style={styles.root}><KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Stack.Screen options={{ headerShown: true, headerTransparent: false, title: publication?.title || t('apps.title'), headerLeft: () => <CollapseButton accessibilityLabel={t('apps.closeView')} onPressHandler={close} /> }} />
            {url && grant ? <WebView<object>
                key={`${workspace}:${app}`}
                ref={webview}
                source={source}
                originWhitelist={['*']}
                injectedJavaScriptBeforeContentLoaded={bridgeScript}
                injectedJavaScript={`${bridgeScript}${themeScript}`}
                onLoadEnd={() => webview.current?.injectJavaScript(`${bridgeScript}${themeScript}`)}
                style={styles.root}
                incognito
                cacheEnabled={false}
                allowFileAccess={false}
                allowFileAccessFromFileURLs={false}
                allowUniversalAccessFromFileURLs={false}
                sharedCookiesEnabled={false}
                thirdPartyCookiesEnabled={false}
                javaScriptEnabled
                domStorageEnabled
                javaScriptCanOpenWindowsAutomatically={false}
                setSupportMultipleWindows={false}
                allowsBackForwardNavigationGestures={false}
                automaticallyAdjustContentInsets={false}
                onShouldStartLoadWithRequest={(request) => request.url === 'about:blank' || grant.permits(request.url)}
                onMessage={(event) => receiveViewMessage(event.nativeEvent.data)}
                onOpenWindow={() => undefined}
                onError={fail}
                onHttpError={(event) => { if (event.nativeEvent.url === url) fail(); }}
                onContentProcessDidTerminate={fail}
                onRenderProcessGone={fail}
            /> : <Text style={styles.message}>{t(publication?.state === 'denied' ? 'apps.denied' : failed || publication?.state === 'failed' || (publication?.state === 'ready' && !grant) ? 'apps.failed' : publication?.state === 'loading' || !publication ? 'apps.loading' : 'apps.offline')}</Text>}
        </KeyboardAvoidingView></SafeAreaView>
    );
}
const styles = StyleSheet.create((theme) => ({ root: { flex: 1, backgroundColor: theme.colors.background }, message: { padding: theme.space(4), color: theme.colors.typography } }));
