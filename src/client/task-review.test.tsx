import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { dispatchTaskReview, useTaskReviewPublication } from './task-review';
import type { TaskReviewPublication } from './generated/task_review_publication';
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
            scope: (scope: { thread_id: string; candidate_id: string }) => {
                const key = JSON.stringify([scope.thread_id, scope.candidate_id]);
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
        install: (thread: string, candidate: string, input: TaskReviewPublication | null) => void;
    }
).install;
const dispatch = jest.mocked(mobileClientBinding.dispatch);
let rendered: TaskReviewPublication | null;
let renders: number;
const Candidate = ({ thread, candidate }: { thread: string; candidate: string }) => {
    const input = useTaskReviewPublication(thread, candidate, null, true, true);
    useEffect(() => {
        rendered = input;
        renders += 1;
    }, [input]);
    return null;
};
const publication = (thread: string, candidate: string): TaskReviewPublication => ({
    thread_id: thread,
    candidate_id: candidate,
    revision: 3,
    generation: 9,
    item: null,
    visible_actions: ['Accept'],
    allowed_actions: ['Accept'],
    request: { kind: 'pending', action: 'Accept' },
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

describe('candidate review publication adapter', () => {
    it('dispatches one typed action with captured thread and candidate identity', () => {
        dispatchTaskReview({
            kind: 'perform',
            thread_id: 'a',
            candidate_id: 'candidate',
            action: 'Revise',
            feedback: 'detail',
            reason: null,
        });
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({
            schema_version: 1,
            intent: {
                kind: 'task_review',
                intent: {
                    kind: 'perform',
                    thread_id: 'a',
                    candidate_id: 'candidate',
                    action: 'Revise',
                    feedback: 'detail',
                    reason: null,
                },
            },
        });
        expect(mobileClientBinding.drain).toHaveBeenCalledWith({
            kind: 'task_review',
            thread_id: 'a',
            candidate_id: 'candidate',
        });
    });
    it('uses immutable completion output without an intent echo and isolates late A output after switch to B', () => {
        act(() => {
            root = create(<Candidate thread="a" candidate="candidate" />);
        });
        expect(dispatch).toHaveBeenCalledTimes(1);
        const a = publication('a', 'candidate');
        act(() => install('a', 'candidate', a));
        expect(rendered).toBe(a);
        const completed = {
            ...a,
            revision: 4,
            request: { kind: 'succeeded' as const, action: 'Accept' as const },
        };
        act(() => install('a', 'candidate', completed));
        expect(rendered).toBe(completed);
        expect(dispatch).toHaveBeenCalledTimes(1);
        act(() => root!.update(<Candidate thread="b" candidate="candidate" />));
        expect(rendered).toBeNull();
        const b = publication('b', 'candidate');
        act(() => install('b', 'candidate', b));
        const before = renders;
        act(() => install('a', 'candidate', { ...a, revision: 5 }));
        expect(renders).toBe(before);
        expect(rendered).toBe(b);
        act(() => install('b', 'candidate', null));
        expect(rendered).toBeNull();
    });
});
