import React from 'react';
import { beforeEach, expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import { useActiveThread } from './use-active-thread';
import type { ComposerIntent } from '@/client/generated/client_intent';
import type { ClientScope } from '@/client/generated/client_scope';
import type { ClientScopedSnapshotDto } from '@/client/generated/client_scoped_snapshot_dto';
import type { ClientTransitionDto } from '@/client/generated/client_transition_dto';
import type { ComposerOperationPlan } from '@/client/generated/composer_publication';

const mockOpen = jest.fn(async () => ({}));
let mockComposer: string | null = null;
let mockNavigation = { active_thread_id: 'parent', workspace_id: 'workspace' };
let mockConnection = 1;
let mockPublication: {
    thread_id: string;
    operation: {
        identity: { thread_id: string; draft_id: number; generation: number };
        kind: string;
        status: { kind: string };
    };
} | null = null;
const mockSend = jest.fn<(input: unknown) => Promise<{ thread_id: string }>>();
let mockRealComposer: typeof import('@/client/composer') | null = null;
let mockRealBinding: import('@/client/mobile-client-binding').MobileClientBinding | null = null;
const mockComplete = jest.fn();
const mockLease = jest.fn((run: () => Promise<unknown>) => run());
const mockActivate = jest.fn((id: string) => {
    mockComposer = id;
});
const mockState = {
    activateComposerThread: mockActivate,
    composerSelectedMode: 'Message',
    setComposerError: jest.fn(),
    setExpandedKeys: jest.fn(),
};
const mockSnapshot = (id: string | null) =>
    id
        ? {
              thread_id: id,
              workspace_id: 'workspace',
              thread: { id, workspace_id: 'workspace' },
              projection: {},
          }
        : null;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/services/threads/active', () => ({
    openActiveThread: () => mockOpen(),
    openActiveThreadById: () => mockOpen(),
    sendActiveThreadText: (input: unknown) => mockSend(input),
}));
jest.mock('@/services/gateway/transport-coordinator', () => ({
    withGatewayTransportLease: (run: () => Promise<unknown>) => mockLease(run),
}));
jest.mock('@/client/composer', () => ({
    composerSnapshot: (...args: Parameters<typeof import('@/client/composer').composerSnapshot>) =>
        mockRealComposer ? mockRealComposer.composerSnapshot(...args) : mockPublication,
    completeComposerOperation: (
        ...args: Parameters<typeof import('@/client/composer').completeComposerOperation>
    ) => mockRealComposer
        ? mockRealComposer.completeComposerOperation(...args)
        : mockComplete(...args),
    beginComposerOperation: (
        ...args: Parameters<typeof import('@/client/composer').beginComposerOperation>
    ) => mockRealComposer
        ? mockRealComposer.beginComposerOperation(...args)
        : { identity: mockPublication!.operation.identity },
}));
jest.mock('@/client/turn-cancellation', () => ({ useTurnCancellationPublication: () => null }));
jest.mock('@/client/navigation', () => ({
    navigationSnapshot: () => mockNavigation,
    dispatchNavigation: (intent: typeof mockNavigation & { thread_id: string }) => {
        mockNavigation = { active_thread_id: intent.thread_id, workspace_id: intent.workspace_id };
    },
}));
jest.mock('@/client/mobile-client-binding', () => ({
    mobileClientBinding: {
        scope: (scope: ClientScope) =>
            mockRealBinding?.scope(scope) ?? { subscribe: () => () => {}, getSnapshot: () => null },
        dispatch: (request: import('@/client/generated/client_intent_dispatch_dto').ClientIntentDispatchDto) =>
            mockRealBinding!.dispatch(request),
        drain: (scope: ClientScope) => mockRealBinding!.drain(scope),
    },
}));
jest.mock('./use-active-thread-snapshot-query', () => ({
    threadSnapshot: (id: string) => mockSnapshot(id),
    useActiveThreadSnapshotQuery: (id: string) => ({
        data: mockSnapshot(id),
        isFetching: false,
        error: null,
    }),
}));
jest.mock('@/stores/gateway', () => ({
    useGatewayStore: (selector: (value: unknown) => unknown) =>
        selector({ connectionId: mockConnection, connectionState: 'Connected' }),
}));
jest.mock('@/stores/active-thread', () => ({
    useActiveThreadStore: Object.assign(
        (selector: (value: unknown) => unknown) => selector(mockState),
        { getState: () => ({ ...mockState, activeComposerThreadId: mockComposer }) },
    ),
}));

it('returning from pickers and a child restores selection without reopening the parent; reconnect still reopens', async () => {
    const Probe = ({ active }: { active: boolean }) => {
        useActiveThread(null, 'workspace', active, 'parent');
        return null;
    };
    let root!: renderer.ReactTestRenderer;
    await act(async () => {
        root = renderer.create(<Probe active />);
    });
    expect(mockOpen).toHaveBeenCalledTimes(1);
    try {
        for (const picker of ['skills', 'mcp', 'models']) {
            await act(async () => {
                root.update(<Probe active={false} />);
            });
            await act(async () => {
                root.update(<Probe active />);
            });
            expect({ picker, opens: mockOpen.mock.calls.length }).toEqual({ picker, opens: 1 });
        }
        await act(async () => {
            root.update(<Probe active={false} />);
        });
        mockComposer = 'child';
        mockNavigation = { active_thread_id: 'child', workspace_id: 'workspace' };
        await act(async () => {
            root.update(<Probe active />);
        });
        expect(mockOpen).toHaveBeenCalledTimes(1);
        expect(mockComposer).toBe('parent');
        expect(mockNavigation.active_thread_id).toBe('parent');
        mockConnection = 2;
        await act(async () => {
            root.update(<Probe active />);
        });
        expect(mockOpen).toHaveBeenCalledTimes(2);
    } finally {
        await act(async () => root.unmount());
    }
});

beforeEach(() => {
    mockRealComposer = null;
    mockRealBinding = null;
    mockConnection = 1;
    mockComposer = null;
    mockNavigation = { active_thread_id: 'parent', workspace_id: 'workspace' };
    mockOpen.mockClear();
    mockState.setComposerError.mockClear();
    mockSend.mockReset();
    mockComplete.mockClear();
    mockLease.mockReset().mockImplementation((run: () => Promise<unknown>) => run());
    mockPublication = {
        thread_id: 'parent',
        operation: {
            identity: { thread_id: 'parent', draft_id: 1, generation: 7 },
            kind: 'send',
            status: { kind: 'pending' },
        },
    };
});

it.each(['failed', 'cancelled', 'replacement', 'inactive', 'unmounted'])(
    'send completion presents only the owning scope: %s',
    async (outcome) => {
        let hook!: ReturnType<typeof useActiveThread>;
        const Probe = ({ active }: { active: boolean }) => {
            hook = useActiveThread(null, 'workspace', active, 'parent');
            return null;
        };
        let reject!: (error: Error) => void;
        mockSend.mockImplementationOnce(
            () =>
                new Promise((_resolve, fail) => {
                    reject = fail;
                }),
        );
        let root!: renderer.ReactTestRenderer;
        await act(async () => {
            root = renderer.create(<Probe active />);
        });
        let sending!: Promise<boolean>;
        act(() => {
            sending = hook.sendText();
        });
        expect(mockSend).toHaveBeenCalledTimes(1);
        mockConnection = 2; // Same authorization; a connection replacement must not hide this error.
        if (outcome === 'replacement') {
            mockPublication!.operation.identity = {
                thread_id: 'parent',
                draft_id: 2,
                generation: 7,
            };
        } else {
            mockPublication!.operation.status = {
                kind: outcome === 'cancelled' ? 'cancelled' : 'failed',
            };
        }
        if (outcome === 'unmounted') await act(async () => root.unmount());
        else await act(async () => root.update(<Probe active={outcome !== 'inactive'} />));
        mockState.setComposerError.mockClear();
        await act(async () => {
            reject(new Error('raw transport failure'));
            await sending;
        });
        if (outcome === 'failed')
            expect(mockState.setComposerError).toHaveBeenCalledWith('sendFailed');
        else expect(mockState.setComposerError).not.toHaveBeenCalled();
        expect(mockSend).toHaveBeenCalledTimes(1);
        if (outcome !== 'unmounted') await act(async () => root.unmount());
    },
);

it.each(['lease_failure', 'native_before_admission', 'admitted_stale_echo', 'replacement'])(
    'boundary failure delegates captured identity to authoritative Rust admission guard: %s',
    async (outcome) => {
        let hook!: ReturnType<typeof useActiveThread>;
        const Probe = () => {
            hook = useActiveThread(null, 'workspace', true, 'parent');
            return null;
        };
        let reject!: (error: Error) => void;
        if (outcome !== 'lease_failure') {
            mockSend.mockImplementationOnce(
                () => new Promise((_resolve, fail) => { reject = fail; }),
            );
        } else {
            mockLease.mockImplementationOnce(
                () => new Promise((_resolve, fail) => { reject = fail; }),
            );
        }
        let root!: renderer.ReactTestRenderer;
        await act(async () => {
            root = renderer.create(<Probe />);
        });
        const captured = mockPublication!.operation.identity;
        let sending!: Promise<boolean>;
        act(() => {
            sending = hook.sendText();
        });
        expect(mockSend).toHaveBeenCalledTimes(outcome === 'lease_failure' ? 0 : 1);
        if (outcome === 'replacement') {
            mockPublication = {
                ...mockPublication!,
                operation: {
                    ...mockPublication!.operation,
                    identity: { thread_id: 'parent', draft_id: 2, generation: 8 },
                },
            };
        }
        // Keep the shell echo Pending even after submit; it may lag Rust's commit.
        await act(async () => {
            reject(new Error('lease unavailable'));
            expect(await sending).toBe(false);
        });
        // Native rejection before admission and a lost response after admission
        // are intentionally indistinguishable here. The production Rust owner
        // proves phase safety; this adapter must delegate in both cases.
        expect(mockComplete).toHaveBeenCalledWith(captured, {
            kind: 'send_admission_failed',
            message: 'sendFailed',
        });
        if (outcome === 'replacement') {
            expect(mockPublication!.operation.identity).toEqual({
                thread_id: 'parent',
                draft_id: 2,
                generation: 8,
            });
        }
        await act(async () => root.unmount());
    },
);

// Canonical command responses/publications are external bridge data. No fixture
// reducer decides whether a phase/identity can complete: Rust owner tests prove
// that guard. This matrix composes the real Begin adapter, binding and initiator.
for (const fault of ['first-read', 'coherence-read'] as const) {
    it.each(['unadmitted', 'admitted', 'replacement'] as const)(
        `accepted Begin retains command ownership after ${fault}: %s`,
        async (outcome) => {
            type Snapshot = ClientScopedSnapshotDto;
            type Plan = ComposerOperationPlan;
            const { MobileClientBinding } = jest.requireActual<typeof import('@/client/mobile-client-binding')>(
                '@/client/mobile-client-binding',
            );
            const actualComposer = jest.requireActual<typeof import('@/client/composer')>(
                '@/client/composer',
            );
            const identity = { thread_id: 'parent', draft_id: 12, generation: 41 };
            const nextIdentity = {
                ...identity, generation: 42, draft_id: outcome === 'replacement' ? 13 : 12,
            };
            const plan: Plan = {
                identity, kind: 'send',
                draft: {
                    text: 'Captured message',
                    domain: {
                        attachments: [],
                        capability_target: {
                            kind: 'native', supports_skills: true, supports_mcp_tools: true,
                        },
                    },
                },
            };
            const nextPlan: Plan = {
                ...plan, identity: nextIdentity,
                draft: { ...plan.draft, text: outcome === 'replacement' ? 'New draft' : plan.draft.text },
            };
            const publication = (
                sequence: number,
                captured: Plan | null,
                phase: 'pending' | 'failed' | 'sending' | null,
            ): Snapshot => ({
                schema_version: 1, sequence,
                scope: { kind: 'composer', thread_id: 'parent' },
                revisions: { domain: sequence, presentation: sequence, content: 0, scoped: sequence },
                payload: {
                    thread_id: 'parent', draft_id: captured?.identity.draft_id ?? identity.draft_id,
                    revision: sequence, draft: captured?.draft ?? plan.draft,
                    operation: phase ? {
                        identity: captured?.identity ?? identity, kind: 'send',
                        status: phase === 'failed' ? { kind: phase, message: 'sendFailed' } : { kind: phase },
                        plan: phase === 'pending' ? captured : null,
                    } : null,
                    preparing_send: phase === 'pending' && captured ? {
                        identity: captured.identity, text: captured.draft.text, attachments: [],
                    } : null,
                },
            });
            const content = (sequence: number, optimistic: boolean): Snapshot => ({
                schema_version: 1, sequence,
                scope: { kind: 'timeline', thread_id: 'parent' },
                revisions: {
                    domain: sequence, presentation: sequence, content: sequence, scoped: sequence,
                },
                payload: {
                    revision: sequence, generation: 1,
                    rows: optimistic ? [{ id: 'optimistic', revision: 1, identity }] : [],
                },
            });
            const initial = publication(1, null, null);
            const pending = publication(2, plan, 'pending');
            const retired = publication(3, plan, 'failed');
            const protectedValue = outcome === 'replacement'
                ? publication(4, nextPlan, 'pending') : publication(3, plan, 'sending');
            let nativeComposer = initial;
            let nativeContent = content(1, false);
            let failRead = false;
            let failures = 0;
            let consumed = 0;
            const reads = new Set<string>();
            const commands: ComposerIntent[] = [];
            const replies: {
                intent: ComposerIntent; result: ClientTransitionDto; publication: Snapshot;
            }[] = [{
                intent: { kind: 'begin_operation', thread_id: 'parent', draft_id: 12, operation: 'send' },
                result: {
                    schema_version: 1, sequence: 2, outcome: 'changed', effects: [],
                    composer_begin_plan: plan,
                },
                publication: pending,
            }];
            const read = (scope: ClientScope) =>
                scope.kind === 'composer' ? nativeComposer : nativeContent;
            const fail = () => {
                failRead = false;
                failures++;
                throw new Error('recoverable snapshot failure');
            };
            const binding = new MobileClientBinding({
                dispatch: (request) => {
                    if (request.intent.kind === 'set_scope_demand')
                        return { schema_version: 1, sequence: 0, outcome: 'noop', effects: [] };
                    expect(request.intent.kind).toBe('composer');
                    if (request.intent.kind !== 'composer') throw new Error('unexpected command');
                    commands.push(request.intent.intent);
                    const reply = replies.shift();
                    expect(reply).toBeDefined();
                    expect(request.intent.intent).toEqual(reply!.intent);
                    nativeComposer = reply!.publication;
                    if (commands.length === 1) failRead = true;
                    return reply!.result;
                },
                snapshot: (scope) => {
                    if (failRead && scope.kind === 'composer' && fault === 'coherence-read') fail();
                    return read(scope);
                },
                resnapshot: (scope) => {
                    if (failRead && scope.kind === 'composer' && fault === 'first-read') fail();
                    return read(scope);
                },
                changes: (scope) => {
                    const value = read(scope);
                    const key = `${scope.kind}:${value.sequence}`;
                    if (reads.has(key) || value.sequence === 1)
                        return { schema_version: 1, changes: [] };
                    reads.add(key);
                    consumed++;
                    // The marker/publication is consumed even if the following
                    // read fails. Recovery cannot rely on replaying it.
                    return {
                        schema_version: 1,
                        changes: [fault === 'first-read' && value === pending
                            ? { kind: 'resnapshot_required', scope, latest_sequence: value.sequence }
                            : {
                                kind: 'publication', predecessor: 1,
                                sequence: value.sequence, snapshot: value,
                            }],
                    };
                },
                completeEffect: () => { throw new Error('unused'); },
                cancelEffect: () => { throw new Error('unused'); },
            });
            mockRealBinding = binding;
            mockRealComposer = actualComposer;
            const composerStore = binding.scope({ kind: 'composer', thread_id: 'parent' });
            const timelineStore = binding.scope({ kind: 'timeline', thread_id: 'parent' });
            const observed: unknown[] = [];
            const observe = () => {
                const value = composerStore.getSnapshot()?.payload as {
                    preparing_send?: { identity: typeof identity };
                };
                const rows = (timelineStore.getSnapshot()?.payload as { rows: unknown[] }).rows;
                expect(
                    rows.length > 0 &&
                    value.preparing_send?.identity.generation === identity.generation,
                ).toBe(false);
                observed.push(value);
            };
            const releaseComposer = composerStore.subscribe(observe);
            const releaseTimeline = timelineStore.subscribe(observe);
            let hook!: ReturnType<typeof useActiveThread>;
            const Probe = () => {
                hook = useActiveThread(null, 'workspace', true, 'parent');
                return null;
            };
            let reject!: (error: Error) => void;
            mockSend.mockImplementationOnce(
                () => new Promise((_resolve, fail) => { reject = fail; }),
            );
            let root!: renderer.ReactTestRenderer;
            try {
                await act(async () => { root = renderer.create(<Probe />); });
                const retained = composerStore.getSnapshot();
                const retainedContent = timelineStore.getSnapshot();
                const callbacks = observed.length;
                let sending!: Promise<boolean>;
                act(() => { sending = hook.sendText(); });
                expect(failures).toBe(1);
                expect(consumed).toBe(1);
                expect(composerStore.getSnapshot()).toBe(retained);
                expect(timelineStore.getSnapshot()).toBe(retainedContent);
                expect(observed).toHaveLength(callbacks);
                // This proves execution delegation, not Rust admission. The
                // service argument comes from the command receipt even while
                // the retained shell publication still predates Begin.
                expect(mockLease).toHaveBeenCalledTimes(1);
                expect(mockSend).toHaveBeenCalledWith({
                    operation: identity, workspace_id: 'workspace', expanded_keys: undefined,
                });
                nativeComposer = outcome === 'unadmitted' ? pending : protectedValue;
                if (outcome === 'admitted') nativeContent = content(4, true);
                act(() => binding.drain({ kind: 'composer', thread_id: 'parent' }));
                if (outcome === 'unadmitted')
                    expect(actualComposer.composerSnapshot('parent')?.preparing_send?.identity)
                        .toEqual(identity);
                replies.push({
                    intent: {
                        kind: 'complete_operation', identity,
                        completion: { kind: 'send_admission_failed', message: 'sendFailed' },
                    },
                    result: {
                        schema_version: 1, sequence: 5,
                        outcome: outcome === 'unadmitted' ? 'changed' : 'noop', effects: [],
                    },
                    publication: outcome === 'unadmitted' ? retired : protectedValue,
                });
                await act(async () => {
                    reject(new Error('service failed'));
                    expect(await sending).toBe(false);
                });
                expect(commands).toHaveLength(2);
                if (outcome === 'unadmitted') {
                    expect(actualComposer.composerSnapshot('parent')?.preparing_send).toBeNull();
                    expect(actualComposer.composerSnapshot('parent')?.draft.text).toBe('Captured message');
                    replies.push({
                        intent: {
                            kind: 'begin_operation', thread_id: 'parent',
                            draft_id: 12, operation: 'send',
                        },
                        result: {
                            schema_version: 1, sequence: 6, outcome: 'changed', effects: [],
                            composer_begin_plan: nextPlan,
                        },
                        publication: publication(6, nextPlan, 'pending'),
                    });
                    mockSend.mockResolvedValueOnce({ thread_id: 'parent' });
                    await act(async () => { expect(await hook.sendText()).toBe(true); });
                    expect(mockSend).toHaveBeenLastCalledWith({
                        operation: nextIdentity, workspace_id: 'workspace', expanded_keys: undefined,
                    });
                    expect(actualComposer.composerSnapshot('parent')?.preparing_send?.identity)
                        .toEqual(nextIdentity);
                } else {
                    expect(composerStore.getSnapshot()?.payload).toEqual(protectedValue.payload);
                    if (outcome === 'replacement')
                        expect(actualComposer.composerSnapshot('parent')?.draft.text).toBe('New draft');
                }
                expect(replies).toHaveLength(0);
            } finally {
                if (root) await act(async () => root.unmount());
                releaseTimeline();
                releaseComposer();
                mockRealComposer = null;
                mockRealBinding = null;
            }
        },
    );
}
