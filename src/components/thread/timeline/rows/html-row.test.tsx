import { afterEach, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppState, Share } from 'react-native';
import { HtmlViewportContext, type HtmlViewport } from '../html-viewport';
import { getPioneerClientNitro } from '@pioneer/client-nitro';
import type { ClientArtifactDownloadRequest } from '@/client/generated/client_artifact_download_request';
import type { ClientArtifactDownloadResult } from '@/client/generated/client_artifact_download_result';
import type { ArtifactActionIdentity, ArtifactActionKind } from '@/client/artifact-actions';
import type { HtmlPublication } from '@/client/generated/timeline_snapshot';
import { AssistantMessageRow } from './assistant-message-row';
import type { TimelineRow } from '@/services/threads/conversation/timeline';

// Supply native coordinates only. HtmlInstance owns intersection and lifetime.
jest.mock('react-native', () => {
    const React = jest.requireActual<typeof import('react')>('react');
    const native = jest.requireActual<typeof import('react-native')>('react-native');
    const measureInWindow = jest.fn();
    // Preserve RN's lazy exports; replace only the native measurement ref.
    return Object.create(Object.getPrototypeOf(native), {
        ...Object.getOwnPropertyDescriptors(native),
        htmlMeasureInWindow: { value: measureInWindow },
        View: {
            enumerable: true,
            value: React.forwardRef(function MeasuredView(props: object, ref) {
                React.useImperativeHandle(ref, () => ({ measureInWindow }));
                return React.createElement(native.View, props);
            }),
        },
    });
});
jest.mock('@pioneer/client-nitro', () => ({ getPioneerClientNitro: jest.fn() }));
// Keep the real typed artifactDownload/response parser, without starting the
// index module's transport binding. Native IO is replaced only at Nitro.
jest.mock('@/client', () => jest.requireActual('@/client/native'));
jest.mock('@/client/thread-artifacts', () => ({ useThreadArtifacts: () => ({ items: [] }) }));
jest.mock('@/client/thread-capabilities', () => ({
    useThreadCapabilities: () => ({
        request: { kind: 'ready' },
        snapshot: { thread: { capabilities: { can_read_artifacts: true } } },
    }),
}));
jest.mock('@legendapp/list/react-native', () => ({ useViewabilityAmount: jest.fn() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('./markdown-content', () => {
    const React = jest.requireActual<typeof import('react')>('react');
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return {
        MarkdownContent: ({ text }: { text: string }) =>
            React.createElement(Text, { testID: 'final-response-text' }, text),
    };
});
jest.mock('@/services/telemetry/turn-startup', () => ({
    observeTurnStartupPresentation: jest.fn(),
}));
jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: () => ({}) },
    useUnistyles: () => ({
        rt: { themeName: 'dark' },
        theme: {
            space: (value: number) => value * 4,
            colors: { background: '#000', text: '#fff', textMuted: '#888', border: '#222' },
        },
    }),
}));
jest.mock('./status', () => ({
    BodyText: jest.requireActual<typeof import('react-native')>('react-native').Text,
}));
jest.mock('react-native-webview', () => {
    const React = jest.requireActual<typeof import('react')>('react');
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return {
        __esModule: true,
        default: React.forwardRef(function MockWebView(props: object, ref) {
            React.useImperativeHandle(ref, () => ({ injectJavaScript: jest.fn() }));
            return React.createElement(View, { ...props, testID: 'html-renderer' });
        }),
    };
});
jest.mock('expo-file-system', () => {
    const read = jest.fn<(path: string) => Promise<string>>();
    return {
        read,
        File: class {
            constructor(private path: string) {}
            text() {
                return read(this.path);
            }
        },
    };
});
// Same scoped-snapshot fixture pattern as client/thread-artifacts.test.tsx;
// real beginArtifactAction/dispatchArtifact consume this isolated binding.
jest.mock('@/client/mobile-client-binding', () => {
    let generation = 0;
    const payload: {
        thread_id: string;
        actions: {
            identity: ArtifactActionIdentity;
            action: ArtifactActionKind;
            state: string;
        }[];
    } = { thread_id: 'thread', actions: [] };
    const dispatch = jest.fn(
        (request: {
            intent: {
                intent: {
                    kind: string;
                    thread_id?: string;
                    artifact_id?: string;
                    version_id?: string | null;
                    action?: ArtifactActionKind;
                    identity?: ArtifactActionIdentity;
                };
            };
        }) => {
            const intent = request.intent.intent;
            if (intent.kind === 'begin_action') {
                payload.actions.push({
                    identity: {
                        thread_id: intent.thread_id!,
                        artifact_id: intent.artifact_id!,
                        version_id: intent.version_id,
                        generation: ++generation,
                    },
                    action: intent.action!,
                    state: 'preparing',
                });
                return { outcome: 'changed' };
            }
            const action = payload.actions.find(
                (item) => item.identity.generation === intent.identity?.generation,
            );
            if (!action) return { outcome: 'noop' };
            if (intent.kind === 'claim_presentation' && action.state === 'ready')
                action.state = 'presenting';
            else if (intent.kind === 'complete_presentation' && action.state === 'presenting')
                action.state = 'completed';
            else if (intent.kind === 'cancel_action' && action.state !== 'completed')
                action.state = 'cancelled';
            else return { outcome: 'noop' };
            return { outcome: 'changed' };
        },
    );
    return {
        payload,
        mobileClientBinding: {
            dispatch,
            drain: jest.fn(),
            scope: () => ({ getSnapshot: () => ({ payload }) }),
        },
    };
});

const binding = jest.requireMock('@/client/mobile-client-binding') as {
    payload: {
        actions: {
            identity: ArtifactActionIdentity;
            action: ArtifactActionKind;
            state: string;
        }[];
    };
    mobileClientBinding: { dispatch: ReturnType<typeof jest.fn> };
};
const read = (
    jest.requireMock('expo-file-system') as {
        read: ReturnType<typeof jest.fn<(path: string) => Promise<string>>>;
    }
).read;
let root: ReactTestRenderer | undefined;
afterEach(async () => {
    await act(async () => root?.unmount());
    root = undefined;
    jest.restoreAllMocks();
});

it('prepares verified inline source through artifactDownload, preserves exact metadata and fences late results', async () => {
    const previousState = AppState.currentState;
    AppState.currentState = 'active';
    const sheet = jest
        .spyOn(Share, 'share')
        .mockResolvedValue({ action: Share.dismissedAction, activityType: undefined });
    const publication: HtmlPublication = {
        workspaceId: 'workspace',
        threadId: 'source-child',
        turnId: 'source-turn',
        callId: 'call',
        title: 'Page',
        artifact: {
            artifact_id: 'document',
            version_id: 'version',
            sha256: 'cd1d3d67f9bfa720d6ce97b64ebc315bde7acccc675fd1d0e8c4d0755d1041cc',
            size_bytes: 20,
            display_name: 'Page',
            kind: 'file',
            mime_type: 'text/html',
            status: 'ready',
        },
    };
    const source = '<p>Verified page</p>';
    const valid: ClientArtifactDownloadResult = {
        artifact_id: 'document',
        version_id: 'version',
        sha256: 'cd1d3d67f9bfa720d6ce97b64ebc315bde7acccc675fd1d0e8c4d0755d1041cc',
        size_bytes: 20,
        display_name: 'Page',
        local_file_path: '/isolated-fixture/document.html',
        operation_id: '',
    };
    async function mount(viewport: HtmlViewport | null = null) {
        binding.payload.actions.length = 0;
        binding.mobileClientBinding.dispatch.mockClear();
        read.mockReset().mockResolvedValue(source);
        let resolve!: (value: ClientArtifactDownloadResult) => void;
        const result = new Promise<ClientArtifactDownloadResult>((done) => {
            resolve = done;
        });
        const transport = jest.fn(async (request: ClientArtifactDownloadRequest) => {
            const value = await result;
            const action = binding.payload.actions.find(
                (a) => a.identity.generation === request.identity.generation,
            )!;
            if (action.state !== 'cancelled') action.state = 'ready';
            return JSON.stringify({
                status: 'ok',
                value: { ...value, operation_id: request.operation_id },
            });
        });
        const nitro = {
            artifactDownloadJson: jest.fn(async (json: string) => {
                const request = JSON.parse(json) as ClientArtifactDownloadRequest;
                const action = binding.payload.actions.find(
                    (a) => a.identity.generation === request.identity.generation,
                );
                // Mirror the existing native preparation admission (access.rs:332,
                // workflow.rs:212), not a permissive transport that hides N1.
                if (
                    !/^[A-Za-z0-9_-]{1,128}$/.test(request.operation_id) ||
                    action?.action !== 'share' ||
                    action.state !== 'preparing'
                )
                    return JSON.stringify({
                        status: 'error',
                        message: 'Cancelled',
                        code: 'artifact_cancelled',
                    });
                action.state = 'resolving';
                return transport(request);
            }),
        };
        jest.mocked(getPioneerClientNitro).mockReturnValue(nitro as never);
        await act(async () => {
            root = create(
                <HtmlViewportContext.Provider value={viewport}>
                    <AssistantMessageRow
                        threadId="thread"
                        row={
                            {
                                type: 'assistant-message',
                                key: 'canonical-final',
                                turnId: 'response-turn',
                                itemId: 'canonical-final',
                                text: 'Final response',
                                streaming: false,
                                taskTimeline: false,
                                htmlPublications: [publication],
                            } as Extract<TimelineRow, { type: 'assistant-message' }>
                        }
                        expanded={false}
                        onToggle={() => undefined}
                    />
                </HtmlViewportContext.Provider>,
            );
        });
        expect(transport).toHaveBeenCalledTimes(viewport === null ? 1 : 0);
        if (viewport === null) {
            expect(transport.mock.calls[0][0]).toEqual(
                expect.objectContaining({
                    thread_id: 'thread',
                    workspace_id: 'workspace',
                    artifact_id: 'document',
                    version_id: 'version',
                    identity: binding.payload.actions[0].identity,
                }),
            );
            expect(binding.payload.actions[0].state).toBe('resolving');
        }
        expect(root!.root.findAllByProps({ testID: 'html-renderer' })).toHaveLength(0);
        return resolve;
    }
    try {
        const resolve = await mount();
        await act(async () => {
            resolve(valid);
        });
        expect(read).toHaveBeenCalledWith(valid.local_file_path);
        const rendered = root!.root.findAllByProps({ testID: 'html-renderer' });
        expect(rendered.length).toBeGreaterThan(0);
        expect(rendered[0].props.source.html.endsWith(source)).toBe(true);
        // The document and final text share the ordinary assistant body container.
        const finalText = root!.root.findAllByProps({ testID: 'final-response-text' });
        expect(finalText.length).toBeGreaterThan(0);
        const body = JSON.stringify(root!.toJSON());
        expect(body.indexOf('html-renderer')).toBeLessThan(body.indexOf('final-response-text'));
        expect(binding.payload.actions[0].state).toBe('completed');
        const kinds = () =>
            binding.mobileClientBinding.dispatch.mock.calls.map(
                (call) => (call[0] as { intent: { intent: { kind: string } } }).intent.intent.kind,
            );
        expect(kinds()).toContain('claim_presentation');
        expect(kinds()).toContain('complete_presentation');
        await act(async () => {
            root!.unmount();
        });
        root = undefined;

        for (const mismatch of [
            { artifact_id: 'foreign' },
            { version_id: 'stale' },
            { sha256: 'changed' },
            { size_bytes: 21 },
        ]) {
            const finish = await mount();
            await act(async () => {
                finish({ ...valid, ...mismatch });
            });
            expect(read).not.toHaveBeenCalled();
            expect(root!.root.findAllByProps({ testID: 'html-renderer' })).toHaveLength(0);
            expect(JSON.stringify(root!.toJSON())).toContain('loadFailed');
            expect(kinds()).not.toContain('claim_presentation');
            expect(kinds()).not.toContain('complete_presentation');
            await act(async () => {
                root!.unmount();
            });
            root = undefined;
        }
        // Cleanup while native IO is pending, then while reading verified bytes.
        for (const duringRead of [false, true]) {
            const finish = await mount();
            let finishRead!: (value: string) => void;
            if (duringRead) {
                read.mockImplementationOnce(
                    () =>
                        new Promise((done) => {
                            finishRead = done;
                        }),
                );
                await act(async () => {
                    finish(valid);
                });
                expect(read).toHaveBeenCalledTimes(1);
            }
            await act(async () => {
                root!.unmount();
            });
            root = undefined;
            expect(binding.payload.actions[0].state).toBe('cancelled');
            await act(async () => {
                if (duringRead) finishRead(source);
                else finish(valid);
            });
            if (!duringRead) expect(read).not.toHaveBeenCalled();
            expect(kinds()).not.toContain('claim_presentation');
            expect(kinds()).not.toContain('complete_presentation');
            expect(binding.payload.actions[0].state).toBe('cancelled');
        }
        // Keep the response row visible while moving this document independently.
        // Native layout and LegendList amounts are inputs to the real components;
        // the fixture does not calculate or substitute a renderer's live state.
        const listeners = new Set<(top: number, height: number) => void>();
        const viewport: HtmlViewport = {
            subscribe: (measure) => {
                listeners.add(measure);
                return () => {
                    listeners.delete(measure);
                };
            },
        };
        const measure = (
            jest.requireMock('react-native') as {
                htmlMeasureInWindow: ReturnType<typeof jest.fn>;
            }
        ).htmlMeasureInWindow;
        let documentTop = 0;
        let documentHeight = 1;
        measure.mockImplementation((callback: unknown) => {
            (callback as (x: number, y: number, width: number, height: number) => void)(
                0,
                documentTop,
                360,
                documentHeight,
            );
        });
        async function scroll(top: number, sizeVisible: number) {
            documentTop = top;
            await act(async () => {
                const amount = (
                    jest.requireMock('@legendapp/list/react-native') as {
                        useViewabilityAmount: ReturnType<typeof jest.fn>;
                    }
                ).useViewabilityAmount.mock.calls.at(-1)![0] as (token: {
                    sizeVisible: number;
                }) => void;
                amount({ sizeVisible });
                for (const notify of listeners) notify(0, 700);
            });
        }
        const finish = await mount(viewport);
        expect(binding.payload.actions).toHaveLength(0);
        await scroll(0, 700);
        expect(binding.payload.actions).toHaveLength(1);
        expect(binding.payload.actions[0].state).toBe('resolving');
        // The row still intersects, but its individual document has left the screen.
        await scroll(700, 700);
        expect(binding.payload.actions[0].state).toBe('cancelled');
        await act(async () => {
            finish(valid);
        });
        expect(read).not.toHaveBeenCalled();
        expect(kinds()).not.toContain('claim_presentation');
        expect(kinds()).not.toContain('complete_presentation');
        expect(root!.root.findAllByProps({ testID: 'html-renderer' })).toHaveLength(0);
        // Return admits a new download; the cancelled result cannot publish late.
        await scroll(0, 700);
        expect(binding.payload.actions).toHaveLength(2);
        expect(binding.payload.actions[1].state).toBe('completed');
        const renderer = root!.root.findAllByProps({ testID: 'html-renderer' })[0];
        expect(renderer.props.source.html.endsWith(source)).toBe(true);
        const rendererProps = renderer.props;
        const instance = /const id="([^"]+)"/.exec(rendererProps.source.html)![1];
        const frame = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 0);
        // Drive the real width/IPC/height path, then flush only its captured frame.
        await act(async () => {
            const host = root!.root.findAll(
                (node) =>
                    node.props.collapsable === false && typeof node.props.onLayout === 'function',
            )[0];
            host.props.onLayout({ nativeEvent: { layout: { width: 360 } } });
            rendererProps.onMessage({
                nativeEvent: {
                    url: 'about:blank',
                    data: JSON.stringify({
                        kind: 'pioneer-layout',
                        instance,
                        width: 360,
                        height: 100000,
                    }),
                },
            });
            frame.mock.calls.at(-1)![0](0);
        });
        documentHeight = 100000;
        const storedSurface = () =>
            root!.root.findAll(
                (node) =>
                    node.props.collapsable === false &&
                    typeof node.props.onLayout !== 'function' &&
                    node.props.style?.height === 100000,
            );
        await scroll(-50000, 700);
        expect(root!.root.findAllByProps({ testID: 'html-renderer' })[0].props.source.html).toBe(
            rendererProps.source.html,
        );
        await scroll(-99999, 1);
        const edge = root!.root.findAllByProps({ testID: 'html-renderer' })[0];
        expect(edge.props.style.height).toBe(100000);
        expect(edge.props.source.html).toBe(rendererProps.source.html);
        expect(storedSurface().length).toBeGreaterThan(0);
        await scroll(-100000, 700); // The response still has other visible content.
        expect(root!.root.findAllByProps({ testID: 'html-renderer' })).toHaveLength(0);
        expect(storedSurface().length).toBeGreaterThan(0);
        await act(async () => {
            rendererProps.onMessage({
                nativeEvent: {
                    url: 'about:blank',
                    data: JSON.stringify({
                        kind: 'pioneer-layout',
                        instance,
                        width: 360,
                        height: 1,
                    }),
                },
            });
        });
        expect(storedSurface().length).toBeGreaterThan(0);
        await scroll(-50000, 700);
        const returned = root!.root.findAllByProps({ testID: 'html-renderer' })[0];
        expect(returned.props.style.height).toBe(100000);
        expect(returned.props.source.html.endsWith(source)).toBe(true);
        expect(returned.props.source.html).not.toBe(rendererProps.source.html);
        expect(binding.payload.actions).toHaveLength(2);
        expect(sheet).not.toHaveBeenCalled();
    } finally {
        AppState.currentState = previousState;
    }
});
