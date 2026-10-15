import { useEffect } from 'react';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { composerSnapshot, dispatchComposer, useComposerPublication } from './composer';
import { mobileClientBinding } from './mobile-client-binding';
import type { ComposerPublication } from './generated/composer_publication';

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

let rendered: ComposerPublication | null;
let root: ReactTestRenderer | undefined;
const Consumer = ({ thread }: { thread: string }) => {
    const input = useComposerPublication(thread);
    useEffect(() => {
        rendered = input;
    }, [input]);
    return null;
};
afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    jest.mocked(mobileClientBinding.dispatch).mockClear();
    jest.mocked(mobileClientBinding.drain).mockClear();
});

describe('controlled composer scoped publication', () => {
    it('presents edit state without echo and leaves late A publication out of B', () => {
        act(() => {
            root = create(<Consumer thread="a" />);
        });
        const a = {
            thread_id: 'a',
            draft_id: 1,
            revision: 2,
            draft: { text: 'editing A' },
            message_edit: { preview: 'original A', failed: false },
            selected_provider_ready: false,
            runtime_selection: {
                identity: { thread_id: 'a', draft_id: 1, generation: 6 },
                request: { generation: 6, state: { kind: 'loading' } },
            },
            model_display: {
                key: { workspace_id: 'ws', provider: 'provider', model: 'model' },
                label: 'Model display name',
                request: { kind: 'ready' },
            },
        } as ComposerPublication;
        act(() => install('composer:a', a));
        expect(rendered).toBe(a);
        const ready = {
            ...a,
            revision: 3,
            selected_provider_ready: true,
            runtime_selection: { ...a.runtime_selection, active_runtime_supports_steer: true },
        };
        act(() => install('composer:a', ready));
        expect(rendered?.selected_provider_ready).toBe(true);
        expect(rendered?.runtime_selection?.active_runtime_supports_steer).toBe(true);
        expect(mobileClientBinding.dispatch).not.toHaveBeenCalled();
        act(() => root?.update(<Consumer thread="a" />));
        expect(mobileClientBinding.dispatch).not.toHaveBeenCalled();
        act(() => root?.update(<Consumer thread="b" />));
        const b = {
            ...a,
            thread_id: 'b',
            draft_id: 2,
            draft: { ...a.draft, text: 'unsent B' },
            message_edit: null,
        };
        act(() => install('composer:b', b));
        act(() => install('composer:a', { ...a, revision: 3, message_edit: null }));
        expect(rendered).toBe(b);
        expect(composerSnapshot('b')).toBe(b);
        expect(mobileClientBinding.dispatch).not.toHaveBeenCalled();
        act(() => install('composer:b', null));
        expect(rendered).toBeNull();
    });

    it('forwards one typed edit intent and drains only the owning composer scope', () => {
        for (const intent of [
            { kind: 'start_message_edit' as const, thread_id: 'a', draft_id: 1, turn_id: 'turn' },
            { kind: 'submit_message_edit' as const, thread_id: 'a', draft_id: 2 },
            { kind: 'submit_steer' as const, thread_id: 'a', draft_id: 2 },
            { kind: 'clear' as const, thread_id: 'a', draft_id: 2 },
            { kind: 'retry_model_display' as const, thread_id: 'a', draft_id: 2 },
            { kind: 'retry_runtime_selection' as const, thread_id: 'a', draft_id: 2 },
            {
                kind: 'commit_voice_capture' as const,
                identity: { thread_id: 'a', draft_id: 2, generation: 3 },
            },
        ]) {
            jest.mocked(mobileClientBinding.dispatch).mockClear();
            jest.mocked(mobileClientBinding.drain).mockClear();
            dispatchComposer(intent);
            expect(mobileClientBinding.dispatch).toHaveBeenCalledTimes(1);
            expect(mobileClientBinding.dispatch).toHaveBeenCalledWith({
                schema_version: 1,
                intent: { kind: 'composer', intent },
            });
            expect(mobileClientBinding.drain).toHaveBeenCalledTimes(1);
            expect(mobileClientBinding.drain).toHaveBeenCalledWith({
                kind: 'composer',
                thread_id: 'a',
            });
        }
    });
});
