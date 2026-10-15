import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { requestTurnCancellation, useTurnCancellationPublication } from './turn-cancellation';
import type { TurnCancellationPublication } from './generated/turn_cancellation_publication';
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
        install: (thread: string, input: TurnCancellationPublication | null) => void;
    }
).install;
let rendered: TurnCancellationPublication | null;
const Candidate = ({ thread }: { thread: string }) => {
    const input = useTurnCancellationPublication(thread);
    useEffect(() => {
        rendered = input;
    }, [input]);
    return null;
};
let root: ReactTestRenderer | undefined;
beforeEach(() => {
    jest.mocked(mobileClientBinding.dispatch).mockClear();
    jest.mocked(mobileClientBinding.drain).mockClear();
});
afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
});
describe('turn cancellation Client adapter', () => {
    it('dispatches only the typed target/reason and reads immutable outputs', () => {
        requestTurnCancellation('a', 'User requested stop');
        expect(mobileClientBinding.dispatch).toHaveBeenCalledTimes(1);
        expect(mobileClientBinding.dispatch).toHaveBeenCalledWith({
            schema_version: 1,
            intent: {
                kind: 'turn_cancellation',
                intent: { thread_id: 'a', reason: 'User requested stop' },
            },
        });
        expect(mobileClientBinding.drain).toHaveBeenCalledWith({
            kind: 'turn_cancellation',
            thread_id: 'a',
        });
        expect(mobileClientBinding.drain).toHaveBeenCalledWith({ kind: 'thread', thread_id: 'a' });
    });
    it('accepts pending/failure output without echo and ignores a late old-thread publication', () => {
        act(() => {
            root = create(<Candidate thread="a" />);
        });
        const a: TurnCancellationPublication = {
            identity: { thread_id: 'a', turn_id: 'turn', generation: 1 },
            revision: 1,
            state: { kind: 'pending' },
        };
        act(() => install('a', a));
        expect(rendered).toBe(a);
        const failure: TurnCancellationPublication = {
            ...a,
            revision: 2,
            state: { kind: 'failed', message: 'failed' },
        };
        act(() => install('a', failure));
        expect(rendered).toBe(failure);
        expect(mobileClientBinding.dispatch).not.toHaveBeenCalled();
        act(() => root?.update(<Candidate thread="b" />));
        const b: TurnCancellationPublication = {
            ...a,
            identity: { ...a.identity, thread_id: 'b', generation: 2 },
        };
        act(() => install('b', b));
        act(() => install('a', { ...a, revision: 3, state: { kind: 'completed' } }));
        expect(rendered).toBe(b);
        expect(mobileClientBinding.dispatch).not.toHaveBeenCalled();
    });
});
