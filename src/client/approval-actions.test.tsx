import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { dispatchApprovalAction, useApprovalAction } from './approval-actions';
import type { ApprovalActionPublication } from './generated/approval_action_publication';
import { mobileClientBinding } from './mobile-client-binding';

jest.mock('./mobile-client-binding', () => {
    const stores = new Map<
        string,
        { payload: unknown; listeners: Set<() => void>; store: unknown }
    >();
    return {
        install: (thread: string, candidate: string, payload: unknown) => {
            const key = JSON.stringify([thread, candidate]);
            const current = stores.get(key)!;
            current.payload = payload === null ? null : { payload };
            current.listeners.forEach((listener) => listener());
        },
        mobileClientBinding: {
            scope: (scope: { thread_id: string; request_id: string }) => {
                const key = JSON.stringify([scope.thread_id, scope.request_id]);
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
        install: (
            thread: string,
            candidate: string,
            input: ApprovalActionPublication | null,
        ) => void;
    }
).install;
const dispatch = jest.mocked(mobileClientBinding.dispatch);
let rendered: ApprovalActionPublication | null;
let renders: number;
const Candidate = ({ thread, candidate }: { thread: string; candidate: string }) => {
    const input = useApprovalAction(thread, candidate);
    useEffect(() => {
        rendered = input;
        renders += 1;
    }, [input]);
    return null;
};
const publication = (thread: string, candidate: string): ApprovalActionPublication => ({
    thread_id: thread,
    request_id: candidate,
    revision: 3,
    generation: 9,
    request_generation: 1,
    request: null,
    can_respond: true,
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

describe('approval action publication adapter', () => {
    it('dispatches one typed resolution with scoped identity', () => {
        dispatchApprovalAction({
            kind: 'respond',
            thread_id: 'a',
            request_id: 'request',
            request_generation: 1,
            resolution: { resolution: 'allow' },
        });
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({
            schema_version: 1,
            intent: {
                kind: 'approval_action',
                intent: {
                    kind: 'respond',
                    thread_id: 'a',
                    request_id: 'request',
                    request_generation: 1,
                    resolution: { resolution: 'allow' },
                },
            },
        });
        expect(mobileClientBinding.drain).toHaveBeenCalledWith({
            kind: 'approval_action',
            thread_id: 'a',
            request_id: 'request',
        });
    });
    it('publishes only matching request state without echo and detaches on route switch', () => {
        act(() => {
            root = create(<Candidate thread="a" candidate="request" />);
        });
        const input = publication('a', 'request');
        act(() => install('a', 'request', input));
        expect(rendered).toBe(input);
        expect(dispatch).not.toHaveBeenCalled();
        act(() => root?.update(<Candidate thread="b" candidate="other" />));
        const other = publication('b', 'other');
        act(() => install('b', 'other', other));
        const count = renders;
        act(() => install('a', 'request', { ...input, revision: 4, state: { kind: 'completed' } }));
        expect(rendered).toBe(other);
        expect(renders).toBe(count);
        act(() => install('b', 'other', null));
        expect(rendered).toBeNull();
    });
});
