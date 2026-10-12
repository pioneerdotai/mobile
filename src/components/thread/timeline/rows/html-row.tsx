import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppState, NativeModules, Platform, View, findNodeHandle } from 'react-native';
import { File } from 'expo-file-system';
import { nanoid } from 'nanoid';
import { useViewabilityAmount } from '@legendapp/list/react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';
import { pioneerClient } from '@/client';
import { beginArtifactAction, dispatchArtifact } from '@/client/artifact-actions';
import { useThreadArtifacts } from '@/client/thread-artifacts';
import { useThreadCapabilities } from '@/client/thread-capabilities';
import type { HtmlPublication } from '@/client/generated/timeline_snapshot';
import { BodyText } from './status';
import {
    prepare,
    layoutMeasurement,
    rendererIntersects,
    type Palette,
    type ScrollRect,
} from './html-document';

// The key is the immutable publication identity, including its exact version.
// LegendList may recycle the containing component; the renderer below never is.
export function HtmlRow({ publication }: { publication: HtmlPublication }) {
    return (
        <HtmlInstance
            key={`${publication.artifact.artifact_id}:${publication.artifact.version_id}`}
            publication={publication}
        />
    );
}

function HtmlInstance({ publication }: { publication: HtmlPublication }) {
    const { theme, rt } = useUnistyles();
    const { t } = useTranslation('artifacts');
    const [viewable, setViewable] = useState(true);
    const [foreground, setForeground] = useState(AppState.currentState === 'active');
    useViewabilityAmount((token) => setViewable(rendererIntersects(token.sizeVisible)));
    useEffect(() => {
        const listener = AppState.addEventListener('change', (state) =>
            setForeground(state === 'active'),
        );
        return () => listener.remove();
    }, []);
    const artifacts = useThreadArtifacts(publication.threadId, true, publication.workspaceId);
    const capability = useThreadCapabilities(publication.threadId, true, publication.workspaceId);
    const permitted =
        capability?.request.kind !== 'failed' &&
        capability?.snapshot?.thread?.capabilities.can_read_artifacts === true;
    // The artifact panel is paginated. Absence from its first page is not an
    // authoritative deletion; the exact download and semantic descriptor are.
    const current = artifacts?.items.find(
        (summary) => summary.artifact.artifact_id === publication.artifact.artifact_id,
    );
    const available =
        publication.artifact.status === 'ready' &&
        (!current ||
            (current.artifact.status === 'ready' &&
                current.artifact.version_id === publication.artifact.version_id));
    const [document, setDocument] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [height, setHeight] = useState(1);
    const active = permitted && available && viewable && foreground;
    const palette = useMemo(
        () => ({
            appearance: rt.themeName === 'light' ? 'light' : 'dark',
            background: theme.colors.background,
            foreground: theme.colors.text,
            muted: theme.colors.textMuted,
            border: theme.colors.border,
            accent: theme.colors.text,
        }),
        [rt.themeName, theme.colors],
    );

    useEffect(() => {
        if (!permitted || !available || !viewable || !foreground || document !== null || failed)
            return;
        let cancelled = false;
        const identity = beginArtifactAction(
            publication.threadId,
            publication.artifact.artifact_id,
            publication.artifact.version_id ?? null,
            'share',
        );
        if (!identity) {
            setFailed(true);
            return;
        }
        const operation = `html:${nanoid()}`;
        void pioneerClient
            .artifactDownload({
                identity,
                operation_id: operation,
                thread_id: publication.threadId,
                workspace_id: publication.workspaceId,
                artifact_id: publication.artifact.artifact_id,
                version_id: publication.artifact.version_id,
            })
            .then(async (result) => {
                // Rust resolves the configured remote Gateway, owns authentication,
                // checks the exact version, length and SHA, and returns a verified file.
                if (cancelled) return;
                if (
                    result.artifact_id !== publication.artifact.artifact_id ||
                    result.version_id !== publication.artifact.version_id ||
                    result.sha256 !== publication.artifact.sha256 ||
                    result.size_bytes !== publication.artifact.size_bytes
                )
                    throw new Error('HTML exact source mismatch');
                const html = await new File(result.local_file_path).text();
                if (cancelled) return;
                dispatchArtifact({ kind: 'claim_presentation', identity });
                dispatchArtifact({ kind: 'complete_presentation', identity, error: null });
                setDocument(html);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });
        return () => {
            cancelled = true;
            dispatchArtifact({ kind: 'cancel_action', identity });
        };
    }, [
        permitted,
        available,
        viewable,
        foreground,
        document,
        failed,
        publication.threadId,
        publication.workspaceId,
        publication.artifact.artifact_id,
        publication.artifact.version_id,
    ]);
    if (
        !available ||
        capability?.request.kind === 'failed' ||
        (capability?.request.kind === 'ready' && !permitted) ||
        (document !== null && !permitted)
    )
        return <BodyText>{t('actionErrors.revoked_or_unavailable')}</BodyText>;
    if (failed) return <BodyText>{t('loadFailed')}</BodyText>;
    if (document === null) return <BodyText>{t('loading')}</BodyText>;
    return (
        <View style={{ height, width: '100%' }}>
            {active ? (
                <HtmlWebView
                    html={document}
                    palette={palette}
                    height={height}
                    onHeight={setHeight}
                    onFailure={() => setFailed(true)}
                />
            ) : null}
        </View>
    );
}

// Each mount has its own generation. Late native callbacks from an evicted or
// recycled instance cannot affect its successor, even for the same publication.
function HtmlWebView({
    html,
    palette,
    height,
    onHeight,
    onFailure,
}: {
    html: string;
    palette: Palette;
    height: number;
    onHeight: (height: number) => void;
    onFailure: () => void;
}) {
    const webview = useRef<WebView<object>>(null);
    const host = useRef<View>(null);
    const gestureTag = useRef<number | null>(null);
    const scrollRects = useRef<ScrollRect[]>([]);
    const [instance] = useState(() => nanoid());
    const initialPalette = useRef(palette);
    const source = useMemo(
        () => ({ html: prepare(html, instance, initialPalette.current) }),
        [html, instance],
    );
    const live = useRef(true);
    const frame = useRef<number | null>(null);
    const pending = useRef<number | null>(null);
    const width = useRef(0);
    useLayoutEffect(() => {
        live.current = true;
        return () => {
            live.current = false;
            if (gestureTag.current !== null)
                NativeModules.PioneerHtmlLayout?.release(gestureTag.current, instance);
            if (frame.current !== null) cancelAnimationFrame(frame.current);
        };
    }, []);
    useEffect(() => {
        webview.current?.injectJavaScript(
            `window.dispatchEvent(new CustomEvent('pioneer-theme',{detail:${JSON.stringify(palette)}}));true;`,
        );
    }, [palette]);
    const fail = () => {
        if (live.current) onFailure();
    };
    const onMessage = (event: WebViewMessageEvent) => {
        if (!live.current) return;
        const next = layoutMeasurement(
            event.nativeEvent.data,
            event.nativeEvent.url,
            instance,
            width.current,
        );
        if (next === null) return;
        scrollRects.current = next.scrollRects;
        if (gestureTag.current !== null)
            NativeModules.PioneerHtmlLayout.update(
                gestureTag.current,
                instance,
                width.current,
                next.scrollRects,
            );
        pending.current = next.height;
        if (frame.current !== null) return;
        frame.current = requestAnimationFrame(() => {
            frame.current = null;
            if (live.current && pending.current !== null) onHeight(pending.current);
        });
    };
    return (
        <View
            ref={host}
            collapsable={false}
            style={{ height, width: '100%' }}
            onLayout={(event) => {
                const nextWidth = event.nativeEvent.layout.width;
                if (Platform.OS === 'android' && gestureTag.current === null) {
                    const tag = findNodeHandle(host.current);
                    const layout = NativeModules.PioneerHtmlLayout;
                    if (tag === null || !layout) {
                        fail();
                        return;
                    }
                    gestureTag.current = tag;
                    void layout
                        .attach(tag, instance)
                        .then((attached: boolean) => {
                            if (!live.current) {
                                layout.release(tag, instance);
                                return;
                            }
                            if (!attached) {
                                fail();
                                return;
                            }
                            layout.update(tag, instance, width.current, scrollRects.current);
                        })
                        .catch(fail);
                }
                if (nextWidth !== width.current) {
                    width.current = nextWidth;
                    webview.current?.injectJavaScript(
                        "window.dispatchEvent(new Event('pioneer-measure'));true;",
                    );
                }
            }}
        >
            <WebView<object>
                ref={webview}
                source={source}
                style={{ height, backgroundColor: palette.background }}
                containerStyle={{ height }}
                originWhitelist={['*']}
                onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
                onMessage={onMessage}
                onError={fail}
                onRenderProcessGone={fail}
                onContentProcessDidTerminate={fail}
                onLoadEnd={() =>
                    webview.current?.injectJavaScript(
                        `window.dispatchEvent(new CustomEvent('pioneer-theme',{detail:${JSON.stringify(palette)}}));window.dispatchEvent(new Event('pioneer-measure'));true;`,
                    )
                }
                scrollEnabled={false}
                nestedScrollEnabled={false}
                bounces={false}
                overScrollMode="never"
                automaticallyAdjustContentInsets={false}
                automaticallyAdjustsScrollIndicatorInsets={false}
                contentInsetAdjustmentBehavior="never"
                javaScriptEnabled
                javaScriptCanOpenWindowsAutomatically={false}
                setSupportMultipleWindows={false}
                allowFileAccess={false}
                allowFileAccessFromFileURLs={false}
                allowUniversalAccessFromFileURLs={false}
                sharedCookiesEnabled={false}
                thirdPartyCookiesEnabled={false}
                incognito
                cacheEnabled={false}
                geolocationEnabled={false}
                mediaCapturePermissionGrantType="deny"
                allowsLinkPreview={false}
                allowsBackForwardNavigationGestures={false}
                mediaPlaybackRequiresUserAction
                webviewDebuggingEnabled={false}
            />
        </View>
    );
}
