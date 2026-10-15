import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { dispatchMessageDeletion, useMessageDeletion } from './message-deletion';
import type { MessageDeletionPublication } from './generated/message_deletion_publication';
import { mobileClientBinding } from './mobile-client-binding';

jest.mock('./mobile-client-binding', () => {
    const stores = new Map<
        string,
        { payload: unknown; listeners: Set<() => void>; store: unknown }
    >();
    return {
        install: (thread: string, payload: unknown) => {
            const key = thread;
            const current = stores.get(key)!;
            current.payload = payload === null ? null : { payload };
            current.listeners.forEach((listener) => listener());
        },
        mobileClientBinding: {
            scope: (scope: { thread_id: string }) => {
                const key = scope.thread_id;
                if (!stores.has(key)) {
                    const current = {
                        payload: null as unknown,
                        listeners: new Set<() => void>(),
                        store: {},
                    };
                    current.store = {
                        getSnapshot: () => current.payload,
                        subscribe: (listener: () => void) => {
                            current.listeners.add(listener);
                            return () => {
                                current.listeners.delete(listener);
                            };
                        },
                    };
                    stores.set(key, current);
                }
                return stores.get(key)!.store;
            },
            dispatch: jest.fn(() => ({
                schema_version: 1,
                sequence: 1,
                outcome: 'changed',
                effects: [],
            })),
            drain: jest.fn(),
        },
    };
});
const install = (
    jest.requireMock('./mobile-client-binding') as {
        install: (thread: string, input: MessageDeletionPublication | null) => void;
    }
).install;
const dispatch = jest.mocked(mobileClientBinding.dispatch);
let rendered: MessageDeletionPublication | null;
let renders: number;
const Candidate = ({ thread }: { thread: string }) => {
    const input = useMessageDeletion(thread);
    useEffect(() => {
        rendered = input;
        renders += 1;
    }, [input]);
    return null;
};
const publication = (thread: string): MessageDeletionPublication => ({
    thread_id: thread,
    revision: 3,
    request_generation: 2,
    plan: {
        identity: { thread_id: thread, generation: 1 },
        workspace_id: 'ws',
        turn_id: 'turn',
        expected_revision: 4,
    },
    state: { kind: 'pending' },
});
let root: ReactTestRenderer | undefined;
beforeEach(() => {
    dispatch.mockClear();
    jest.mocked(mobileClientBinding.drain).mockClear();
    renders = 0;
});
afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
});

describe('message deletion publication adapter', () => {
    it('dispatches one confirmation with immutable operation identity', () => {
        const identity = { thread_id: 'a', generation: 7 };
        dispatchMessageDeletion({ kind: 'confirm', identity });
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({
            schema_version: 1,
            intent: { kind: 'message_deletion', intent: { kind: 'confirm', identity } },
        });
        expect(mobileClientBinding.drain).toHaveBeenCalledWith({
            kind: 'message_deletion',
            thread_id: 'a',
        });
    });
    it('changes only the scoped view without echo and detaches on route switch', () => {
        act(() => {
            root = create(<Candidate thread="a" />);
        });
        const input = publication('a');
        act(() => install('a', input));
        expect(rendered).toBe(input);
        expect(dispatch).not.toHaveBeenCalled();
        act(() => root?.update(<Candidate thread="b" />));
        const other = publication('b');
        act(() => install('b', other));
        const count = renders;
        act(() => install('a', { ...input, revision: 4, state: { kind: 'completed' } }));
        expect(rendered).toBe(other);
        expect(renders).toBe(count);
        act(() => install('b', null));
        expect(rendered).toBeNull();
    });
});
