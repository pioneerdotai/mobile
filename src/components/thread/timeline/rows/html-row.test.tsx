import { afterEach, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppState, Share } from 'react-native';
import { getPioneerClientNitro } from '@pioneer/client-nitro';
import type { ClientArtifactDownloadRequest } from '@/client/generated/client_artifact_download_request';
import type { ClientArtifactDownloadResult } from '@/client/generated/client_artifact_download_result';
import type { ArtifactActionIdentity, ArtifactActionKind } from '@/client/artifact-actions';
import type { HtmlPublication } from '@/client/generated/timeline_snapshot';
import { HtmlRow } from './html-row';

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
jest.mock('@legendapp/list/react-native', () => ({ useViewabilityAmount: () => undefined }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('react-native-unistyles', () => ({
    useUnistyles: () => ({
        rt: { themeName: 'dark' },
        theme: { colors: { background: '#000', text: '#fff', textMuted: '#888', border: '#222' } },
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
        default: React.forwardRef((props: object, ref) => {
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
        actions: Array<{
            identity: ArtifactActionIdentity;
            action: ArtifactActionKind;
            state: string;
        }>;
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
        actions: Array<{
            identity: ArtifactActionIdentity;
            action: ArtifactActionKind;
            state: string;
        }>;
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
    const sheet = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction });
    const publication: HtmlPublication = {
        workspaceId: 'workspace',
        threadId: 'thread',
        turnId: 'turn',
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
    async function mount() {
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
                if (action?.action !== 'share' || action.state !== 'preparing')
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
            root = create(<HtmlRow publication={publication} />);
        });
        expect(transport).toHaveBeenCalledTimes(1);
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
        expect(sheet).not.toHaveBeenCalled();
    } finally {
        AppState.currentState = previousState;
    }
});
