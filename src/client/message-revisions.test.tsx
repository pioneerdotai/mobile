import { useEffect } from 'react';
import { afterEach, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useMessageRevisions } from './message-revisions';
import { mobileClientBinding } from './mobile-client-binding';
import type { MessageRevisionPublication } from './generated/message_revision_publication';

jest.mock('./mobile-client-binding', () => {
    const entries = new Map<
        string,
        { value: unknown; listeners: Set<() => void>; store: unknown }
    >();
    let generation = 0;
    const scope = ({ thread_id }: { thread_id: string }) => {
        if (!entries.has(thread_id)) {
            const entry = { value: null as unknown, listeners: new Set<() => void>(), store: {} };
            entry.store = {
                getSnapshot: () => entry.value,
                subscribe: (listener: () => void) => {
                    entry.listeners.add(listener);
                    return () => entry.listeners.delete(listener);
                },
            };
            entries.set(thread_id, entry);
        }
        return entries.get(thread_id)!.store;
    };
    const install = (thread: string, value: unknown) => {
        scope({ thread_id: thread });
        const entry = entries.get(thread)!;
        entry.value = { payload: value };
        entry.listeners.forEach((listener) => listener());
    };
    return {
        install,
        listeners: (thread: string) => entries.get(thread)?.listeners.size ?? 0,
        mobileClientBinding: {
            scope,
            drain: jest.fn(),
            dispatch: jest.fn(
                ({
                    intent: { intent },
                }: {
                    intent: { intent: { kind: string; thread_id: string; turn_id: string } };
                }) => {
                    if (intent.kind === 'open') {
                        install(intent.thread_id, {
                            identity: {
                                thread_id: intent.thread_id,
                                turn_id: intent.turn_id,
                                generation: ++generation,
                            },
                            state: 'loading',
                            page: null,
                        });
                    }
                    return { outcome: 'changed' };
                },
            ),
        },
    };
});
const mock = jest.requireMock('./mobile-client-binding') as {
    install: (thread: string, value: unknown) => void;
    listeners: (thread: string) => number;
};
let rendered: MessageRevisionPublication | null = null;
let root: ReactTestRenderer | undefined;
const Consumer = ({ thread, turn }: { thread: string; turn: string }) => {
    const input = useMessageRevisions(thread, turn);
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
it('closes the captured generation on switch/drop and isolates late thread/turn publications', () => {
    act(() => {
        root = create(<Consumer thread="a" turn="first" />);
    });
    const a = rendered!;
    expect(a.identity.thread_id).toBe('a');
    act(() => root!.update(<Consumer thread="b" turn="second" />));
    const b = rendered!;
    expect(b.identity.thread_id).toBe('b');
    expect(mobileClientBinding.dispatch).toHaveBeenCalledWith({
        schema_version: 1,
        intent: { kind: 'message_revisions', intent: { kind: 'close', identity: a.identity } },
    });
    expect(mock.listeners('a')).toBe(0);
    act(() => mock.install('a', { ...a, state: 'ready' }));
    expect(rendered).toBe(b);
    act(() =>
        mock.install('b', {
            ...b,
            identity: { ...b.identity, generation: b.identity.generation + 1 },
        }),
    );
    expect(rendered).toBeNull();
    act(() => root!.unmount());
    root = undefined;
    expect(mock.listeners('b')).toBe(0);
    expect(mobileClientBinding.dispatch).toHaveBeenLastCalledWith({
        schema_version: 1,
        intent: { kind: 'message_revisions', intent: { kind: 'close', identity: b.identity } },
    });
});
