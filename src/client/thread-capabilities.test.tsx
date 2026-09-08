import { useEffect } from 'react';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useThreadCapabilities, retryThreadCapabilities } from './thread-capabilities';
import { mobileClientBinding } from './mobile-client-binding';
import type { ThreadCapabilityPublication } from './generated/thread_capability_publication';

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
            dispatch: jest.fn(),
            scope: (scope: { kind: string; thread_id?: string }) => {
                const key = scope.thread_id ?? scope.kind;
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
let rendered: ThreadCapabilityPublication | null;
let root: ReactTestRenderer | undefined;
const Consumer = ({ thread, visible = true }: { thread: string; visible?: boolean }) => {
    const input = useThreadCapabilities(thread, visible, 'workspace');
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

describe('thread capability scoped consumer', () => {
    it('does not turn failed publications or rerenders into retries and isolates a late old thread', () => {
        act(() => {
            root = create(<Consumer thread="a" />);
        });
        expect(mobileClientBinding.dispatch).toHaveBeenCalledTimes(1);
        const failed: ThreadCapabilityPublication = {
            thread_id: 'a',
            workspace_id: 'workspace',
            revision: 2,
            generation: 1,
            request: { kind: 'failed', message: 'synthetic failure' },
            snapshot: null,
        };
        act(() => install('a', failed));
        expect(rendered).toBe(failed);
        for (let i = 0; i < 5; i += 1) act(() => root!.update(<Consumer thread="a" />));
        expect(mobileClientBinding.dispatch).toHaveBeenCalledTimes(1);
        retryThreadCapabilities('a');
        expect(mobileClientBinding.dispatch).toHaveBeenLastCalledWith({
            schema_version: 1,
            intent: { kind: 'thread_capability', intent: { kind: 'retry', thread_id: 'a' } },
        });
        act(() => root!.update(<Consumer thread="b" />));
        expect(rendered).toBeNull();
        act(() => install('a', { ...failed, revision: 3 }));
        expect(rendered).toBeNull();
        const b = { ...failed, thread_id: 'b' };
        act(() => install('b', b));
        expect(rendered).toBe(b);
        act(() => root!.update(<Consumer thread="b" visible={false} />));
        expect(rendered).toBeNull();
    });
});
