import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
    dispatchComposerCatalog,
    useComposerCatalogPublication,
    useComposerPicker,
} from './composer-catalog';
import type { ComposerCatalogPublication } from './generated/composer_catalog_publication';
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
        install: (thread: string, input: ComposerCatalogPublication | null) => void;
    }
).install;
const dispatch = jest.mocked(mobileClientBinding.dispatch);
let rendered: ComposerCatalogPublication | null;
let renders: number;
const Candidate = ({ thread }: { thread: string }) => {
    const input = useComposerCatalogPublication(thread);
    useEffect(() => {
        rendered = input;
        renders += 1;
    }, [input]);
    return null;
};
const publication = (thread: string): ComposerCatalogPublication => ({
    thread_id: thread,
    draft_id: 1,
    revision: 3,
    skills: { packs: [], standalone: [] },
    skill_request: { generation: 2, state: { kind: 'ready' } },
    mcp_servers: [],
    mcp_tools: [],
    mcp_request: { generation: 0, state: { kind: 'idle' } },
    tool_requests: {},
    session: {
        identity: { thread_id: thread, draft_id: 1, generation: 7 },
        kind: 'skills',
        selection: { kind: 'immediate' },
    },
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

describe('composer catalog publication adapter', () => {
    it('dispatches one selection intent and drains catalog and composer scopes', () => {
        const identity = { thread_id: 'a', draft_id: 1, generation: 7 };
        dispatchComposerCatalog({ kind: 'toggle_mcp', identity, key: 'server' });
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({
            schema_version: 1,
            intent: {
                kind: 'composer_catalog',
                intent: { kind: 'toggle_mcp', identity, key: 'server' },
            },
        });
        expect(mobileClientBinding.drain).toHaveBeenCalledWith({
            kind: 'composer_catalog',
            thread_id: 'a',
        });
        expect(mobileClientBinding.drain).toHaveBeenCalledWith({
            kind: 'composer',
            thread_id: 'a',
        });
    });
    it('publishes only matching thread state without echo after route switch', () => {
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
        act(() =>
            install('a', {
                ...input,
                revision: 4,
                skill_request: { generation: 2, state: { kind: 'failed', message: 'late' } },
            }),
        );
        expect(rendered).toBe(other);
        expect(renders).toBe(count);
    });
    it('opens one owned picker and closes its original identity on unmount', () => {
        mobileClientBinding.scope({ kind: 'composer_catalog', thread_id: 'picker' });
        const input = publication('picker');
        install('picker', input);
        let identity: unknown;
        const Picker = () => {
            const state = useComposerPicker('picker', 1, 'skills', true);
            useEffect(() => {
                identity = state.identity;
            }, [state.identity]);
            return null;
        };
        act(() => {
            root = create(<Picker />);
        });
        expect(identity).toEqual(input.session!.identity);
        expect(dispatch).toHaveBeenCalledTimes(1);
        act(() => install('picker', { ...input, revision: 4 }));
        expect(dispatch).toHaveBeenCalledTimes(1);
        act(() => {
            root!.unmount();
            root = undefined;
        });
        expect(dispatch).toHaveBeenLastCalledWith({
            schema_version: 1,
            intent: {
                kind: 'composer_catalog',
                intent: { kind: 'close_picker', identity: input.session!.identity },
            },
        });
    });
});
