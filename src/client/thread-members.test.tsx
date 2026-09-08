import { useEffect } from 'react';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useThreadMembers, dispatchThreadMember } from './thread-members';
import { mobileClientBinding } from './mobile-client-binding';
import type { ThreadMemberPublication } from './generated/thread_member_publication';

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
let rendered: ThreadMemberPublication | null;
let root: ReactTestRenderer | undefined;
const Consumer = ({ thread, visible = true }: { thread: string; visible?: boolean }) => {
    const input = useThreadMembers(thread, visible, 'workspace');
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

describe('thread members scoped consumer', () => {
    it('publishes partial data and bounded failure without retrying; switch and logout hide old data', () => {
        act(() => {
            root = create(<Consumer thread="a" />);
        });
        const initialCalls = jest.mocked(mobileClientBinding.dispatch).mock.calls.length;
        const input: ThreadMemberPublication = {
            thread_id: 'a',
            workspace_id: 'workspace',
            revision: 1,
            generation: 1,
            workspace_members: [],
            member_directory: [],
            participants: [],
            mention_candidates: [],
            presentation: null,
            workspace_request: { kind: 'ready' },
            directory_request: { kind: 'failed', message: 'synthetic' },
            participants_request: { kind: 'ready' },
            request: {
                kind: 'failed',
                action: { kind: 'list_participants' },
                message: 'synthetic',
            },
        };
        act(() => install('thread_member:a', input));
        expect(rendered).toBe(input);
        for (let i = 0; i < 5; i += 1) act(() => root!.update(<Consumer thread="a" />));
        expect(mobileClientBinding.dispatch).toHaveBeenCalledTimes(initialCalls);
        dispatchThreadMember({ kind: 'retry', thread_id: 'a' });
        expect(mobileClientBinding.dispatch).toHaveBeenLastCalledWith({
            schema_version: 1,
            intent: { kind: 'thread_member', intent: { kind: 'retry', thread_id: 'a' } },
        });
        act(() => root!.update(<Consumer thread="b" />));
        expect(rendered).toBeNull();
        act(() => install('thread_member:a', { ...input, revision: 2 }));
        expect(rendered).toBeNull();
        const b = { ...input, thread_id: 'b' };
        act(() => install('thread_member:b', b));
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
