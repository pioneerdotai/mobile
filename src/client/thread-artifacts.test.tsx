import { useEffect } from 'react';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useThreadArtifacts, retryThreadArtifacts } from './thread-artifacts';
import { mobileClientBinding } from './mobile-client-binding';
import type { ArtifactPublication } from './generated/artifact_publication';

jest.mock('./mobile-client-binding', () => {
    const stores = new Map<
        string,
        { value: unknown; listeners: Set<() => void>; store: unknown }
    >();
    return {
        install: (key: string, payload: unknown) => {
            const entry = stores.get(key)!;
            entry.value = payload === null ? null : { payload };
            entry.listeners.forEach((listener) => listener());
        },
        mobileClientBinding: {
            dispatch: jest.fn(() => ({ outcome: 'noop' })),
            drain: jest.fn(),
            scope: (scope: { kind: string; thread_id?: string }) => {
                const key = `${scope.kind}:${scope.thread_id ?? ''}`;
                if (!stores.has(key)) {
                    const entry = {
                        value:
                            scope.kind === 'administration'
                                ? {
                                      payload: {
                                          current_auth: {},
                                          connection_generation: 1,
                                          authorization_change_sequence: 1,
                                      },
                                  }
                                : (null as unknown),
                        listeners: new Set<() => void>(),
                        store: {},
                    };
                    entry.store = {
                        getSnapshot: () => entry.value,
                        subscribe: (listener: () => void) => {
                            entry.listeners.add(listener);
                            return () => {
                                entry.listeners.delete(listener);
                            };
                        },
                    };
                    stores.set(key, entry);
                }
                return stores.get(key)!.store;
            },
        },
    };
});
const install = (
    jest.requireMock('./mobile-client-binding') as {
        install: (key: string, input: unknown) => void;
    }
).install;
let rendered: ArtifactPublication | null;
let root: ReactTestRenderer | undefined;
const Consumer = ({ thread, visible = true }: { thread: string; visible?: boolean }) => {
    const input = useThreadArtifacts(thread, visible, 'workspace');
    useEffect(() => {
        rendered = input;
    }, [input]);
    return null;
};
afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    jest.mocked(mobileClientBinding.dispatch).mockClear();
});

describe('thread artifact scoped consumer', () => {
    it('keeps terminal failure bounded and rejects old-thread and logged-out content', () => {
        act(() => {
            root = create(<Consumer thread="a" />);
        });
        act(() =>
            install('thread_capability:a', {
                thread_id: 'a',
                workspace_id: 'workspace',
                revision: 1,
                generation: 1,
                request: { kind: 'ready' },
                snapshot: null,
            }),
        );
        const calls = jest.mocked(mobileClientBinding.dispatch).mock.calls.length;
        const input: ArtifactPublication = {
            thread_id: 'a',
            workspace_id: 'workspace',
            revision: 1,
            generation: 1,
            items: [],
            downloads: [],
            actions: [],
            previews: [],
            request: { kind: 'failed', message: 'synthetic' },
        };
        act(() => install('artifact:a', input));
        expect(rendered).toBe(input);
        for (let i = 0; i < 5; i += 1) act(() => root!.update(<Consumer thread="a" />));
        expect(mobileClientBinding.dispatch).toHaveBeenCalledTimes(calls);
        retryThreadArtifacts('a');
        expect(mobileClientBinding.dispatch).toHaveBeenLastCalledWith({
            schema_version: 1,
            intent: { kind: 'artifact', intent: { kind: 'retry', thread_id: 'a' } },
        });
        act(() => root!.update(<Consumer thread="b" />));
        expect(rendered).toBeNull();
        act(() => install('artifact:a', { ...input, revision: 2 }));
        expect(rendered).toBeNull();
        const b = { ...input, thread_id: 'b' };
        act(() => {
            install('thread_capability:b', {
                thread_id: 'b',
                workspace_id: 'workspace',
                revision: 1,
                generation: 1,
                request: { kind: 'ready' },
                snapshot: null,
            });
            install('artifact:b', b);
        });
        expect(rendered).toBe(b);
        act(() =>
            install('administration:', {
                current_auth: null,
                connection_generation: 2,
                authorization_change_sequence: 2,
            }),
        );
        expect(rendered).toBeNull();
    });
});
