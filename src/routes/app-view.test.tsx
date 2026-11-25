import React from 'react';
import { runInNewContext } from 'node:vm';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AppViewScreen from './app-view';

const mockCalls: { kind: string; ticket?: number }[] = [];
const mockUrl = `https://gateway.example/pioneer/storage/app-views/${'A'.repeat(43)}/ui/`;
let mockPublicationUrl = mockUrl;
let mockBaseUrl = mockUrl.slice(0, -3);
let mockPollFailure = false;
let mockPublicationState = 'ready';
let mockTokenSequence = 0;
let mockParams = { workspace: 'ws', app: 'app-a' };
const mockBack = jest.fn();
jest.mock('nanoid', () => ({ nanoid: () => `native-secret-${++mockTokenSequence}` }));
jest.mock('@/client', () => ({ pioneerClient: { pluginShell: (request: { kind: string; ticket?: number }) => {
    mockCalls.push(request);
    if (request.kind === 'app_view_open') return { view_ticket: 7 };
    if (request.kind === 'app_view_poll') {
        if (mockPollFailure) throw new Error('poll failed');
        return { app_view: { state: mockPublicationState, title: 'Example App', url: mockPublicationUrl, base_url: mockBaseUrl, expires_at: 9999999999 } };
    }
    if (request.kind === 'app_view_close') return { accepted: true };
    throw new Error('Unexpected lifecycle operation from an App view');
} } }));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockParams, router: { canGoBack: () => true, back: () => mockBack(), replace: jest.fn() } }));
jest.mock('expo-router/js-stack', () => ({ Stack: { Screen: () => null } }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' }, KeyboardAvoidingView: 'KeyboardAvoidingView' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@/components/buttons/collapse', () => ({ CollapseButton: 'CollapseButton' }));
jest.mock('@/components/primitives/text', () => ({ Text: 'Text' }));
jest.mock('react-i18next', () => { const t = (key: string) => key; return { useTranslation: () => ({ t }) }; });
jest.mock('react-native-unistyles', () => { const theme = { appearance: 'light', colors: { background: '#fff', text: '#111', textMuted: '#777', border: '#ccc', accent: '#00f', accentForeground: '#fff' }, space: (n: number) => n * 4 }; return { StyleSheet: { create: (styles: unknown) => styles }, useUnistyles: () => ({ theme }) }; });
jest.mock('react-native-webview', () => {
    const React = require('react');
    class MockWebView extends React.Component {
        injectJavaScript = jest.fn();
        render() { return React.createElement('NativeAppWebView', this.props); }
    }
    return { __esModule: true, default: MockWebView };
});

let tree: ReactTestRenderer | undefined;
beforeEach(() => { mockCalls.length = 0; mockPublicationUrl = mockUrl; mockBaseUrl = mockUrl.slice(0, -3); mockPollFailure = false; mockPublicationState = 'ready'; mockParams = { workspace: 'ws', app: 'app-a' }; mockBack.mockClear(); jest.useFakeTimers(); });
afterEach(() => { if (tree) act(() => tree?.unmount()); tree = undefined; jest.useRealTimers(); });
describe('native App view admission and dismissal', () => {
    it('uses an opaque sandbox, rejects navigation outside the grant and releases only its view ticket', () => {
        act(() => { tree = renderer.create(<AppViewScreen />); });
        const props = tree!.root.findByType('NativeAppWebView' as never).props as {
            source: { html: string }; incognito: boolean; sharedCookiesEnabled: boolean;
            onShouldStartLoadWithRequest: (request: { url: string }) => boolean;
        };
        const sandbox = /sandbox="([^"]*)"/.exec(props.source.html)?.[1].split(/\s+/) ?? [];
        expect(sandbox).toContain('allow-scripts');
        for (const authority of ['allow-same-origin', 'allow-top-navigation', 'allow-popups']) expect(sandbox).not.toContain(authority);
        expect(props.incognito).toBe(true); expect(props.sharedCookiesEnabled).toBe(false);
        expect(props.onShouldStartLoadWithRequest({ url: mockUrl })).toBe(true);
        expect(props.onShouldStartLoadWithRequest({ url: mockUrl.replace('A'.repeat(43), 'B'.repeat(43)) })).toBe(false);
        expect(props.onShouldStartLoadWithRequest({ url: `${mockBaseUrl.slice(0, -1)}suffix/ui/` })).toBe(false);
        expect(props.onShouldStartLoadWithRequest({ url: mockUrl.replace('gateway.example', 'gateway.example.evil') })).toBe(false);
        expect(props.onShouldStartLoadWithRequest({ url: `${mockBaseUrl}../other` })).toBe(false);
        expect(props.onShouldStartLoadWithRequest({ url: `${mockBaseUrl}%2e%2e/other` })).toBe(false);
        expect(props.onShouldStartLoadWithRequest({ url: `${mockBaseUrl}%252e%252e/other` })).toBe(false);
        expect(props.onShouldStartLoadWithRequest({ url: `${mockBaseUrl}ui%252f..%252fother` })).toBe(false);
        expect(props.onShouldStartLoadWithRequest({ url: `${mockBaseUrl}ui%2f..%2fother` })).toBe(false);
        expect(props.onShouldStartLoadWithRequest({ url: `${mockBaseUrl}ui%5c..%5cother` })).toBe(false);
        expect(props.onShouldStartLoadWithRequest({ url: `${mockBaseUrl}ui/../../../other` })).toBe(false);
        expect(props.onShouldStartLoadWithRequest({ url: 'javascript:alert(1)' })).toBe(false);
        expect(props.source.html).toContain(`frame-src ${mockBaseUrl}`);
        act(() => tree!.unmount()); tree = undefined;
        expect(mockCalls.map((request) => request.kind)).toEqual(['app_view_open', 'app_view_poll', 'app_view_close']);
        expect(mockCalls.at(-1)?.ticket).toBe(7);
    });
    it('fails closed when the returned URL does not belong to the granted path', () => {
        mockPublicationUrl = 'https://evil.example/';
        act(() => { tree = renderer.create(<AppViewScreen />); });
        expect(tree!.root.findAllByType('NativeAppWebView' as never)).toHaveLength(0);
        expect(mockCalls.filter((call) => call.kind === 'app_view_close')).toHaveLength(1);
    });
    it('fails closed for non-http grants', () => {
        mockBaseUrl = 'file:///private/';
        mockPublicationUrl = 'file:///private/ui/';
        act(() => { tree = renderer.create(<AppViewScreen />); });
        expect(tree!.root.findAllByType('NativeAppWebView' as never)).toHaveLength(0);
    });
    it('rejects grants that could alter the wrapper content security policy', () => {
        mockBaseUrl = 'https://gateway.example/pioneer/;frame-src/';
        mockPublicationUrl = `${mockBaseUrl}ui/`;
        act(() => { tree = renderer.create(<AppViewScreen />); });
        expect(tree!.root.findAllByType('NativeAppWebView' as never)).toHaveLength(0);
    });
    it('closes the ticket immediately on fatal WebView errors, at most once', () => {
        act(() => { tree = renderer.create(<AppViewScreen />); });
        const props = tree!.root.findByType('NativeAppWebView' as never).props as {
            onError: () => void; onRenderProcessGone: () => void;
            onHttpError: (event: { nativeEvent: { url: string } }) => void;
        };
        act(() => props.onHttpError({ nativeEvent: { url: 'https://unrelated.example/' } }));
        expect(mockCalls.filter((call) => call.kind === 'app_view_close')).toHaveLength(0);
        act(() => props.onError());
        expect(mockCalls.filter((call) => call.kind === 'app_view_close')).toEqual([{ kind: 'app_view_close', ticket: 7 }]);
        act(() => props.onRenderProcessGone());
        act(() => tree!.unmount()); tree = undefined;
        expect(mockCalls.filter((call) => call.kind === 'app_view_close')).toHaveLength(1);
        act(() => jest.advanceTimersByTime(5000));
        expect(mockCalls.filter((call) => call.kind === 'app_view_poll')).toHaveLength(1);
    });
    it('closes the ticket immediately when polling fails and cancels later polls', () => {
        act(() => { tree = renderer.create(<AppViewScreen />); });
        mockPollFailure = true;
        act(() => jest.advanceTimersByTime(500));
        expect(mockCalls.map((call) => call.kind)).toEqual(['app_view_open', 'app_view_poll', 'app_view_poll', 'app_view_close']);
        act(() => jest.advanceTimersByTime(5000));
        act(() => tree!.unmount()); tree = undefined;
        expect(mockCalls.filter((call) => call.kind === 'app_view_close')).toHaveLength(1);
        expect(mockCalls.filter((call) => call.kind === 'app_view_poll')).toHaveLength(2);
    });
    it('releases a terminal failure publication without continuing to poll', () => {
        mockPublicationState = 'failed';
        act(() => { tree = renderer.create(<AppViewScreen />); });
        expect(mockCalls.map((call) => call.kind)).toEqual(['app_view_open', 'app_view_poll', 'app_view_close']);
        act(() => jest.advanceTimersByTime(5000));
        act(() => tree!.unmount()); tree = undefined;
        expect(mockCalls.filter((call) => call.kind === 'app_view_close')).toHaveLength(1);
    });
    it('only forwards view requests from its sandboxed iframe and authenticates the native hop', () => {
        act(() => { tree = renderer.create(<AppViewScreen />); });
        const props = tree!.root.findByType('NativeAppWebView' as never).props as {
            injectedJavaScriptBeforeContentLoaded: string;
            onMessage: (event: { nativeEvent: { data: string } }) => void;
        };
        const handlers: ((event: { source: object; data: unknown }) => void)[] = [];
        const forwarded: string[] = [];
        const frame = { contentWindow: {} };
        const fakeWindow: { top?: object; addEventListener: (event: string, cb: (event: { source: object; data: unknown }) => void) => void; ReactNativeWebView: { postMessage: (data: string) => void } } = {
            addEventListener: (_event, cb) => handlers.push(cb),
            ReactNativeWebView: { postMessage: (data) => forwarded.push(data) },
        };
        fakeWindow.top = fakeWindow;
        runInNewContext(props.injectedJavaScriptBeforeContentLoaded, { window: fakeWindow, document: { querySelector: () => frame } });
        // Reinjection must not multiply listeners or leak the private nonce.
        runInNewContext(props.injectedJavaScriptBeforeContentLoaded, { window: fakeWindow, document: { querySelector: () => frame } });
        expect(handlers).toHaveLength(1);
        const close = { type: 'pioneer.view.close', id: 'request-1' };
        handlers[0]({ source: {}, data: close });
        handlers[0]({ source: frame.contentWindow, data: { ...close, id: "x');evil()" } });
        handlers[0]({ source: frame.contentWindow, data: { type: 'pioneer.view.setPlacement', id: 'req-2', placement: 'right' } });
        expect(forwarded).toHaveLength(0);
        act(() => props.onMessage({ nativeEvent: { data: JSON.stringify({ ...close, token: 'forged' }) } }));
        expect(mockBack).not.toHaveBeenCalled();
        handlers[0]({ source: frame.contentWindow, data: close });
        expect(forwarded).toHaveLength(1);
        expect(JSON.parse(forwarded[0])).toEqual({ token: JSON.parse(/const token=("[^"]+")/.exec(props.injectedJavaScriptBeforeContentLoaded)![1]), type: 'pioneer.view.close', id: 'request-1' });
        act(() => props.onMessage({ nativeEvent: { data: forwarded[0] } }));
        expect(mockCalls.filter((call) => call.kind === 'app_view_close')).toHaveLength(1);
        expect(mockBack).toHaveBeenCalledTimes(1);
        act(() => props.onMessage({ nativeEvent: { data: forwarded[0] } }));
        expect(mockBack).toHaveBeenCalledTimes(1);
    });
    it('acknowledges fullscreen only and fences messages from a previous app session', () => {
        act(() => { tree = renderer.create(<AppViewScreen />); });
        const props = tree!.root.findByType('NativeAppWebView' as never).props as {
            injectedJavaScriptBeforeContentLoaded: string;
            onMessage: (event: { nativeEvent: { data: string } }) => void;
        };
        const token = /const token=("[^"]+")/.exec(props.injectedJavaScriptBeforeContentLoaded)![1];
        const payload = JSON.stringify({ token: JSON.parse(token), type: 'pioneer.view.setPlacement', id: 'req-3', placement: 'fullscreen' });
        const WebViewClass = require('react-native-webview').default;
        const webView = tree!.root.findByType(WebViewClass).instance as { injectJavaScript: ReturnType<typeof jest.fn> };
        act(() => props.onMessage({ nativeEvent: { data: payload } }));
        expect(webView.injectJavaScript).toHaveBeenCalledWith(expect.stringContaining('"type":"pioneer.view.result","id":"req-3","placement":"fullscreen"'));
        mockParams = { workspace: 'ws', app: 'app-b' };
        act(() => tree!.update(<AppViewScreen />));
        act(() => props.onMessage({ nativeEvent: { data: JSON.stringify({ token: JSON.parse(token), type: 'pioneer.view.close', id: 'old' }) } }));
        expect(mockBack).not.toHaveBeenCalled();
        expect(mockCalls.filter((call) => call.kind === 'app_view_close')).toHaveLength(1);
    });
});
