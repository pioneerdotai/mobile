import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
    ComposerModelPickerProvider,
    dispatchComposerModelPicker,
    useComposerModelPicker,
} from './composer-model-picker';
import type { ComposerModelPickerPublication } from './generated/composer_model_picker_publication';
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

jest.mock('./composer', () => ({ composerSnapshot: () => ({ thread_id: 'a', draft_id: 1 }) }));
jest.mock('@/stores/active-thread', () => ({ useActiveThreadStore: () => 'a' }));
const install = (
    jest.requireMock('./mobile-client-binding') as {
        install: (thread: string, input: ComposerModelPickerPublication | null) => void;
    }
).install;
const dispatch = jest.mocked(mobileClientBinding.dispatch);
let rendered: ComposerModelPickerPublication | null;
const Candidate = () => {
    const input = useComposerModelPicker();
    useEffect(() => {
        rendered = input;
    }, [input]);
    return null;
};
const publication = (): ComposerModelPickerPublication => ({
    identity: { thread_id: 'a', draft_id: 1, generation: 7 },
    revision: 1,
    deferred: false,
    closed: false,
    providers_request: { generation: 8, state: { kind: 'ready' } },
    models_request: { generation: 9, state: { kind: 'ready' } },
    provider_rows: [],
    reasoning_rows: [],
    selected_provider_ready: true,
    selected_reasoning_effort: null,
    selector: {
        providers: [],
        cli_runtimes: [],
        models: [],
        selected_provider: null,
        selected_model: null,
        mode: 'Chat',
        loading_providers: false,
        loading_cli_runtimes: false,
        loading_models: false,
        error: null,
    },
});
let root: ReactTestRenderer | undefined;
beforeEach(() => {
    dispatch.mockClear();
    jest.mocked(mobileClientBinding.drain).mockClear();
    rendered = null;
});
afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
});
describe('native composer model picker session', () => {
    it('subscribes once and never echoes a controlled selection', () => {
        mobileClientBinding.scope({ kind: 'composer_model_picker', thread_id: 'a' });
        const input = publication();
        install('a', input);
        act(() => {
            root = create(
                <ComposerModelPickerProvider>
                    <Candidate />
                </ComposerModelPickerProvider>,
            );
        });
        expect(rendered).toBe(input);
        expect(dispatch).toHaveBeenCalledTimes(1);
        const selected = {
            ...input,
            revision: 2,
            selector: { ...input.selector, selected_model: 'one' },
        };
        act(() => install('a', selected));
        expect(rendered).toBe(selected);
        expect(dispatch).toHaveBeenCalledTimes(1);
        act(() => {
            root!.unmount();
            root = undefined;
        });
        expect(dispatch).toHaveBeenLastCalledWith({
            schema_version: 1,
            intent: {
                kind: 'composer_model_picker',
                intent: { kind: 'close', identity: input.identity },
            },
        });
    });
    it('does not adopt another draft or session and cancels only its own identity', () => {
        mobileClientBinding.scope({ kind: 'composer_model_picker', thread_id: 'a' });
        const input = publication();
        install('a', input);
        act(() => {
            root = create(
                <ComposerModelPickerProvider>
                    <Candidate />
                </ComposerModelPickerProvider>,
            );
        });
        act(() => install('a', { ...input, identity: { ...input.identity, generation: 10 } }));
        expect(rendered).toBeNull();
        act(() => install('a', { ...input, identity: { ...input.identity, draft_id: 2 } }));
        expect(rendered).toBeNull();
        expect(dispatch).toHaveBeenCalledTimes(1);
        act(() => {
            root!.unmount();
            root = undefined;
        });
        expect(dispatch).toHaveBeenLastCalledWith({
            schema_version: 1,
            intent: {
                kind: 'composer_model_picker',
                intent: { kind: 'close', identity: input.identity },
            },
        });
    });
    it('routes one user selection and drains the two immutable outputs', () => {
        const intent = {
            kind: 'select_model' as const,
            identity: publication().identity,
            model: 'one',
        };
        dispatchComposerModelPicker(intent);
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({
            schema_version: 1,
            intent: { kind: 'composer_model_picker', intent },
        });
        expect(mobileClientBinding.drain).toHaveBeenCalledWith({
            kind: 'composer_model_picker',
            thread_id: 'a',
        });
        expect(mobileClientBinding.drain).toHaveBeenCalledWith({
            kind: 'composer',
            thread_id: 'a',
        });
    });
});
