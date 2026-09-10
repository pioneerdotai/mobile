import { describe, expect, test } from 'bun:test';

import wireFixture from './fixtures/thread-registry-wire.json';

import type { ClientChangeBatchDto } from './generated/client_change_batch_dto';
import type { ClientScope } from './generated/client_scope';
import type { ClientScopedSnapshotDto } from './generated/client_scoped_snapshot_dto';
import {
    MobileClientBinding,
    type MobileClientBridge,
    type MobileClientRow,
} from './mobile-client-binding';

const settingsScope: ClientScope = { kind: 'settings' };
const providerScope: ClientScope = { kind: 'provider' };

const snapshot = (
    revision: number,
    rows: MobileClientRow[],
    scope: ClientScope = settingsScope,
): ClientScopedSnapshotDto => ({
    schema_version: 1,
    sequence: revision,
    scope,
    revisions: {
        domain: revision,
        presentation: revision,
        content: revision,
        scoped: revision,
    },
    payload: { rows },
});

const bridgeFixture = (initial: ClientScopedSnapshotDto | null) => {
    const batches: ClientChangeBatchDto[] = [];
    let resnapshot = initial;
    const bridge: MobileClientBridge = {
        dispatch: () => {
            throw new Error('unused');
        },
        snapshot: () => initial,
        changes: () => batches.shift() ?? { schema_version: 1, changes: [] },
        completeEffect: () => {
            throw new Error('unused');
        },
        cancelEffect: () => {
            throw new Error('unused');
        },
        resnapshot: () => resnapshot,
    };
    return {
        bridge,
        batches,
        setResnapshot(value: ClientScopedSnapshotDto | null) {
            resnapshot = value;
        },
    };
};

test('document subscriptions isolate folders and release only their own demand', () => {
    const a: ClientScope = {
        kind: 'agents_document_content',
        workspace_id: 'workspace',
        folder_id: null,
    };
    const b: ClientScope = {
        kind: 'agents_document_content',
        workspace_id: 'workspace',
        folder_id: 'folder',
    };
    const demands: unknown[] = [];
    const fixture = bridgeFixture(null);
    const binding = new MobileClientBinding({
        ...fixture.bridge,
        dispatch: (request) => {
            demands.push(request.intent);
            return { schema_version: 1, sequence: demands.length, outcome: 'changed', effects: [] };
        },
        snapshot: (scope) => snapshot(1, [], scope),
    });
    const first = binding.scope(a);
    const second = binding.scope(b);
    let notifications = 0;
    const releaseA = first.subscribe(() => notifications++);
    const releaseB = second.subscribe(() => notifications++);
    expect(first).not.toBe(second);
    expect(
        binding.scope({
            folder_id: 'folder',
            kind: 'agents_document_content',
            workspace_id: 'workspace',
        }),
    ).toBe(second);
    const beforeB = second.getSnapshot();
    fixture.batches.push({
        schema_version: 1,
        changes: [
            {
                kind: 'publication',
                predecessor: 1,
                sequence: 2,
                snapshot: {
                    ...snapshot(2, [], a),
                    payload: { content: 'draft', save: { kind: 'dirty' } },
                },
            },
        ],
    });
    binding.drain(a);
    expect(notifications).toBe(1);
    expect(second.getSnapshot()).toBe(beforeB);
    releaseA();
    expect(first.getSnapshot()).toBeNull();
    expect(second.getSnapshot()).toBe(beforeB);
    releaseA();
    releaseB();
    expect(demands).toEqual([
        { kind: 'set_scope_demand', scope: a, demand: 'visible', generation: 1 },
        { kind: 'set_scope_demand', scope: b, demand: 'visible', generation: 2 },
        { kind: 'set_scope_demand', scope: a, demand: 'suspended', generation: 3 },
        { kind: 'set_scope_demand', scope: b, demand: 'suspended', generation: 4 },
    ]);
});

describe('MobileClientBinding', () => {
    test('provider scope identity is semantic and scoped row reuse survives reordering and deletion', () => {
        const scope: ClientScope = {
            kind: 'provider_collection',
            key: {
                workspace_id: 'workspace',
                collection: { kind: 'models', provider: 'openai', purpose: 'chat' },
            },
        };
        const reorderedScope: ClientScope = {
            kind: 'provider_collection',
            key: {
                collection: { purpose: 'chat', provider: 'openai', kind: 'models' },
                workspace_id: 'workspace',
            },
        };
        const initial = {
            ...snapshot(1, [], scope),
            payload: {
                models: [
                    { id: 'a', revision: 1 },
                    { id: 'b', revision: 1 },
                ],
            },
        };
        const fixture = bridgeFixture(initial);
        const binding = new MobileClientBinding({
            ...fixture.bridge,
            snapshot: (requested) =>
                requested.kind === 'provider_collection' &&
                requested.key.workspace_id === 'workspace'
                    ? initial
                    : null,
        });
        const store = binding.scope(scope);
        expect(binding.scope(reorderedScope)).toBe(store);
        store.subscribe(() => {});
        const before = store.getSnapshot()!.payload as { models: MobileClientRow[] };
        fixture.batches.push({
            schema_version: 1,
            changes: [
                {
                    kind: 'publication',
                    predecessor: 1,
                    sequence: 2,
                    snapshot: {
                        ...snapshot(2, [], reorderedScope),
                        payload: {
                            models: [
                                { id: 'b', revision: 1 },
                                { id: 'new', revision: 1 },
                                { id: 'a', revision: 1 },
                            ],
                        },
                    },
                },
            ],
        });
        binding.drain(scope);
        const after = store.getSnapshot()!.payload as { models: MobileClientRow[] };
        expect(after.models[0]).toBe(before.models[1]);
        expect(after.models[2]).toBe(before.models[0]);
        const other = binding.scope({
            kind: 'provider_collection',
            key: {
                workspace_id: 'other',
                collection: { kind: 'models', provider: 'openai', purpose: 'chat' },
            },
        });
        expect(other).not.toBe(store);
    });

    test('scoped consumers release protected snapshots and remount with a newer demand', () => {
        for (const scope of [
            { kind: 'mcp', workspace_id: 'workspace' },
            { kind: 'mcp_details', workspace_id: 'workspace', server_id: 'a' },
            { kind: 'mcp_action', workspace_id: 'workspace', target: 'a' },
            { kind: 'skills', workspace_id: 'workspace' },
            {
                kind: 'skills_details',
                workspace_id: 'workspace',
                skill_id: 'AAAAAAAAAAAAAAAAAAAAA',
            },
            { kind: 'skills_action', workspace_id: 'workspace', target: 'a' },
            { kind: 'skills_upload', workspace_id: 'workspace', operation_id: 7 },
            { kind: 'avatar', principal_id: 'avatar-key' },
            { kind: 'task_inbox', workspace_id: 'a' },
            { kind: 'task_review', thread_id: 'a', candidate_id: 'candidate' },
            { kind: 'thread_capability', thread_id: 'a' },
            { kind: 'thread_member', thread_id: 'a' },
            { kind: 'artifact', thread_id: 'a' },
            { kind: 'composer', thread_id: 'a' },
            { kind: 'composer_catalog', thread_id: 'a' },
            { kind: 'composer_model_picker', thread_id: 'a' },
            { kind: 'approval_action', thread_id: 'a', request_id: 'request' },
            { kind: 'message_deletion', thread_id: 'a' },
            { kind: 'message_revisions', thread_id: 'a' },
            { kind: 'turn_cancellation', thread_id: 'a' },
        ] as ClientScope[]) {
            const fixture = bridgeFixture(snapshot(1, [], scope));
            const generations: number[] = [];
            const binding = new MobileClientBinding({
                ...fixture.bridge,
                dispatch: (request) => {
                    if (request.intent.kind === 'set_scope_demand')
                        generations.push(request.intent.generation);
                    return {
                        schema_version: 1,
                        sequence: generations.length,
                        outcome: 'changed',
                        effects: [],
                    };
                },
            });
            const first = binding.scope(scope);
            const unsubscribe = first.subscribe(() => {});
            expect(first.getSnapshot()).not.toBeNull();
            unsubscribe();
            expect(first.getSnapshot()).toBeNull();
            const second = binding.scope(scope);
            const close = second.subscribe(() => {});
            expect(second.getSnapshot()).not.toBeNull();
            close();
            expect(generations).toEqual([1, 2, 3, 4]);
        }
    });

    test('replays the same serialized Rust/FFI thread scenario without reducing a raw event', () => {
        const initial = wireFixture.initial as ClientScopedSnapshotDto[];
        const updated = wireFixture.updated as ClientScopedSnapshotDto[];
        const fixture = bridgeFixture(null);
        const bridge: MobileClientBridge = {
            ...fixture.bridge,
            snapshot: (scope) =>
                initial.find((p) => JSON.stringify(p.scope) === JSON.stringify(scope)) ?? null,
            dispatch: () => ({ schema_version: 1, sequence: 0, outcome: 'changed', effects: [] }),
        };
        const binding = new MobileClientBinding(bridge);
        const a = binding.scope(initial[0].scope);
        const b = binding.scope(initial[1].scope);
        const before = a.getSnapshot();
        let aCalls = 0;
        let bCalls = 0;
        const ua = a.subscribe(() => aCalls++);
        const ub = b.subscribe(() => bCalls++);
        for (const snapshot of updated) {
            fixture.batches.push({
                schema_version: 1,
                changes: [
                    {
                        kind: 'publication',
                        sequence: snapshot.sequence,
                        predecessor: initial.find(
                            (p) => JSON.stringify(p.scope) === JSON.stringify(snapshot.scope),
                        )!.sequence,
                        snapshot,
                    },
                ],
            });
            binding.drain(snapshot.scope);
        }
        expect(a.getSnapshot()).toBe(before);
        expect(aCalls).toBe(0);
        expect(bCalls).toBe(1);
        expect(b.getSnapshot()).toEqual(updated[1]);
        ua();
        ub();
    });

    test('thread B changes leave A snapshots and listeners stable and demand ends on unsubscribe', () => {
        const a: ClientScope = { kind: 'thread', thread_id: 'a' };
        const b: ClientScope = { kind: 'thread', thread_id: 'b' };
        const fixture = bridgeFixture(null);
        const demands: unknown[] = [];
        const binding = new MobileClientBinding({
            ...fixture.bridge,
            dispatch: (request) => {
                demands.push(request.intent);
                return {
                    schema_version: 1,
                    sequence: demands.length,
                    outcome: 'changed',
                    effects: [],
                };
            },
        });
        const sa = binding.scope(a);
        const sb = binding.scope(b);
        let callsA = 0;
        let callsB = 0;
        const ua = sa.subscribe(() => callsA++);
        const ub = sb.subscribe(() => callsB++);
        const before = sa.getSnapshot();
        fixture.batches.push({
            schema_version: 1,
            changes: [
                {
                    kind: 'publication',
                    sequence: 1,
                    predecessor: null,
                    snapshot: snapshot(1, [], b),
                },
            ],
        });
        binding.drain(b);
        expect(sa.getSnapshot()).toBe(before);
        expect(callsA).toBe(0);
        expect(callsB).toBe(1);
        fixture.batches.push({
            schema_version: 1,
            changes: [
                {
                    kind: 'publication',
                    sequence: 1,
                    predecessor: null,
                    snapshot: snapshot(1, [], b),
                },
            ],
        });
        binding.drain(b);
        expect(callsB).toBe(1);
        ub();
        ub();
        fixture.batches.push({
            schema_version: 1,
            changes: [
                { kind: 'publication', sequence: 2, predecessor: 1, snapshot: snapshot(2, [], b) },
            ],
        });
        binding.drain(b);
        expect(callsB).toBe(1);
        ua();
        expect(demands).toEqual([
            { kind: 'set_scope_demand', scope: a, demand: 'visible', generation: 1 },
            { kind: 'set_scope_demand', scope: b, demand: 'visible', generation: 2 },
            { kind: 'set_scope_demand', scope: b, demand: 'suspended', generation: 3 },
            { kind: 'set_scope_demand', scope: a, demand: 'suspended', generation: 4 },
        ]);
    });

    test('synchronization does not long-poll when the requested revision is already applied', async () => {
        const current = snapshot(1, []);
        const fixture = bridgeFixture(current);
        let waits = 0;
        const binding = new MobileClientBinding({
            ...fixture.bridge,
            waitForPublications: async () => {
                waits += 1;
                return {
                    schema_version: 1,
                    closed: false,
                    effects: [],
                    sequence: 1,
                    resnapshot: false,
                    changes: [{ sequence: 1, predecessor: null, snapshots: [current] }],
                };
            },
        });
        binding.scope(settingsScope);
        await binding.synchronize();
        expect(waits).toBe(1);
        await binding.synchronize();
        expect(waits).toBe(1);
    });

    test('an absent resnapshot cannot be undone by an older queued publication', () => {
        const fixture = bridgeFixture(snapshot(1, [{ id: 'private', revision: 1 }]));
        const binding = new MobileClientBinding(fixture.bridge);
        const store = binding.scope(settingsScope);
        let notifications = 0;
        store.subscribe(() => {
            notifications += 1;
        });
        fixture.setResnapshot(null);
        fixture.batches.push({
            schema_version: 1,
            changes: [
                { kind: 'resnapshot_required', scope: settingsScope, latest_sequence: 2 },
                {
                    kind: 'publication',
                    sequence: 1,
                    predecessor: null,
                    snapshot: snapshot(1, [{ id: 'private', revision: 1 }]),
                },
            ],
        });
        binding.drain(settingsScope);
        expect(store.getSnapshot()).toBeNull();
        expect(notifications).toBe(1);
    });

    test('unsubscribing one registration preserves another with the same listener', () => {
        const fixture = bridgeFixture(snapshot(1, []));
        const binding = new MobileClientBinding(fixture.bridge);
        const store = binding.scope(settingsScope);
        let notifications = 0;
        const listener = () => {
            notifications += 1;
        };
        const first = store.subscribe(listener);
        const second = store.subscribe(listener);
        first();
        fixture.batches.push({
            schema_version: 1,
            changes: [
                { kind: 'publication', sequence: 2, predecessor: 1, snapshot: snapshot(2, []) },
            ],
        });
        binding.drain(settingsScope);
        expect(notifications).toBe(1);
        second();
    });

    test('keeps snapshot and unchanged row references stable', () => {
        const fixture = bridgeFixture(snapshot(1, [{ id: 'a', revision: 1 }]));
        const binding = new MobileClientBinding(fixture.bridge);
        const store = binding.scope(settingsScope);
        store.subscribe(() => {});
        const first = store.getSnapshot();
        expect(store.getSnapshot()).toBe(first);
        expect(Object.isFrozen(first)).toBe(true);
        expect(Object.isFrozen(first?.scope)).toBe(true);
        expect(Object.isFrozen(first?.revisions)).toBe(true);
        expect(Object.isFrozen(first?.payload)).toBe(true);

        fixture.batches.push({
            schema_version: 1,
            changes: [
                {
                    kind: 'publication',
                    sequence: 2,
                    predecessor: 1,
                    snapshot: snapshot(2, [
                        { id: 'a', revision: 1 },
                        { id: 'b', revision: 1 },
                    ]),
                },
            ],
        });
        binding.drain(settingsScope);
        const second = store.getSnapshot();
        const firstRows = (first?.payload as { rows: MobileClientRow[] }).rows;
        const secondRows = (second?.payload as { rows: MobileClientRow[] }).rows;
        expect(second).not.toBe(first);
        expect(secondRows[0]).toBe(firstRows[0]);
    });

    test('StrictMode resubscribe keeps stable functions and coherent immutable reads', () => {
        const fixture = bridgeFixture(snapshot(1, []));
        const binding = new MobileClientBinding(fixture.bridge);
        const store = binding.scope(settingsScope);
        let notifications = 0;
        const unsubscribe = store.subscribe(() => {
            notifications += 1;
            const first = store.getSnapshot();
            expect(store.getSnapshot()).toBe(first);
        });
        const before = store.getSnapshot();
        const getSnapshot = store.getSnapshot;
        const subscribe = store.subscribe;
        unsubscribe();
        unsubscribe();
        const remounted = store.subscribe(() => {
            notifications += 1;
            expect(store.getSnapshot()).toBe(store.getSnapshot());
            expect(store.getSnapshot()?.sequence).toBe(2);
        });
        fixture.batches.push({
            schema_version: 1,
            changes: [
                {
                    kind: 'publication',
                    sequence: 2,
                    predecessor: 1,
                    snapshot: snapshot(2, []),
                },
            ],
        });
        binding.drain(settingsScope);
        expect(notifications).toBe(1);
        expect(before?.sequence).toBe(1);
        expect(binding.scope(settingsScope)).toBe(store);
        expect(store.getSnapshot).toBe(getSnapshot);
        expect(store.subscribe).toBe(subscribe);
        remounted();
        remounted();
    });

    test('ignores unrelated, duplicate, and out-of-order publications', () => {
        const fixture = bridgeFixture(snapshot(1, []));
        const binding = new MobileClientBinding(fixture.bridge);
        const store = binding.scope(settingsScope);
        let notifications = 0;
        store.subscribe(() => {
            notifications += 1;
        });
        fixture.batches.push({
            schema_version: 1,
            changes: [
                {
                    kind: 'publication',
                    sequence: 2,
                    predecessor: 1,
                    snapshot: snapshot(2, [], providerScope),
                },
                {
                    kind: 'publication',
                    sequence: 2,
                    predecessor: 1,
                    snapshot: snapshot(2, []),
                },
                {
                    kind: 'publication',
                    sequence: 1,
                    predecessor: null,
                    snapshot: snapshot(1, []),
                },
            ],
        });
        binding.drain(settingsScope);
        expect(notifications).toBe(1);
        expect(store.getSnapshot()?.revisions.scoped).toBe(2);
    });

    test('resnapshots on predecessor gap and queue coalescing marker', () => {
        const fixture = bridgeFixture(snapshot(1, []));
        const binding = new MobileClientBinding(fixture.bridge);
        const store = binding.scope(settingsScope);
        fixture.setResnapshot(snapshot(4, [{ id: 'fresh', revision: 1 }]));
        fixture.batches.push({
            schema_version: 1,
            changes: [
                {
                    kind: 'publication',
                    sequence: 4,
                    predecessor: 3,
                    snapshot: snapshot(4, []),
                },
                {
                    kind: 'resnapshot_required',
                    scope: settingsScope,
                    latest_sequence: 5,
                },
            ],
        });
        binding.drain(settingsScope);
        expect(store.getSnapshot()?.revisions.scoped).toBe(4);
        expect((store.getSnapshot()?.payload as { rows: MobileClientRow[] }).rows[0].id).toBe(
            'fresh',
        );
    });

    test('canonicalizes scope field order and clears an absent resnapshot', () => {
        const canonicalFixture = bridgeFixture(null);
        const canonicalBinding = new MobileClientBinding(canonicalFixture.bridge);
        const ordered = { kind: 'timeline', thread_id: 'thread-a' } as const;
        const reordered = { thread_id: 'thread-a', kind: 'timeline' } as const;
        expect(canonicalBinding.scope(ordered)).toBe(canonicalBinding.scope(reordered));

        const fixture = bridgeFixture(snapshot(1, [{ id: 'private', revision: 1 }]));
        const binding = new MobileClientBinding(fixture.bridge);
        let notifications = 0;
        const store = binding.scope(settingsScope);
        store.subscribe(() => {
            notifications += 1;
        });
        fixture.setResnapshot(null);
        fixture.batches.push({
            schema_version: 1,
            changes: [
                {
                    kind: 'resnapshot_required',
                    scope: settingsScope,
                    latest_sequence: 2,
                },
            ],
        });
        binding.drain(settingsScope);
        expect(store.getSnapshot()).toBeNull();
        expect(notifications).toBe(1);
    });

    test('fails closed on an unsupported response schema version', () => {
        const fixture = bridgeFixture(snapshot(1, []));
        const binding = new MobileClientBinding(fixture.bridge);
        binding.scope(settingsScope).subscribe(() => {});
        fixture.batches.push({ schema_version: 2, changes: [] });
        expect(() => binding.drain(settingsScope)).toThrow('Unsupported Mobile Client schema');
    });
});

test('process change set installs every protected scope before invoking observers', () => {
    const fixture = bridgeFixture(null);
    const binding = new MobileClientBinding(fixture.bridge);
    const settings = binding.scope(settingsScope);
    const provider = binding.scope(providerScope);
    const observations: unknown[] = [];
    settings.subscribe(() => observations.push(provider.getSnapshot()?.payload));
    const cleared = (scope: ClientScope) => ({ ...snapshot(1, [], scope), payload: null });
    binding.applyProcessBatch({
        closed: false,
        effects: [],
        schema_version: 1,
        sequence: 1,
        resnapshot: false,
        changes: [
            {
                sequence: 1,
                predecessor: null,
                snapshots: [cleared(settingsScope), cleared(providerScope)],
            },
        ],
    });
    expect(observations).toEqual([null]);
    const retained = settings.getSnapshot();
    expect(() =>
        binding.applyProcessBatch({
            closed: false,
            effects: [],
            schema_version: 1,
            sequence: 2,
            resnapshot: false,
            changes: [
                {
                    sequence: 2,
                    predecessor: 1,
                    snapshots: [
                        snapshot(2, []),
                        { ...snapshot(2, [], providerScope), schema_version: 999 },
                    ],
                },
            ],
        }),
    ).toThrow();
    expect(settings.getSnapshot()).toBe(retained);
    expect(observations).toEqual([null]);
});

test('process shutdown closes native delivery and clears every retained scope before callbacks', () => {
    const fixture = bridgeFixture(snapshot(1, []));
    const binding = new MobileClientBinding(fixture.bridge);
    const store = binding.scope(settingsScope);
    let closed = 0;
    binding.attachPlatformEffects(
        () => {
            throw new Error('closed process cannot deliver effects');
        },
        () => {
            closed++;
        },
    );
    let notified = 0;
    store.subscribe(() => {
        expect(store.getSnapshot()).toBeNull();
        notified++;
    });
    binding.applyProcessBatch({
        schema_version: 1,
        closed: true,
        sequence: 0,
        resnapshot: false,
        changes: [],
        effects: [],
    });
    expect(closed).toBe(1);
    expect(notified).toBe(1);
    expect(store.getSnapshot()).toBeNull();
    binding.applyProcessBatch({
        schema_version: 1,
        closed: false,
        sequence: 0,
        resnapshot: false,
        changes: [],
        effects: [],
    });
    expect(store.getSnapshot()).toBeNull();
    expect(() => binding.attachPlatformEffects(() => {})).toThrow('closed');
});

test('catalog detail and upload publications isolate operations and recover a scoped sequence gap', () => {
    const scopes: ClientScope[] = [
        { kind: 'mcp', workspace_id: 'workspace' },
        { kind: 'mcp_details', workspace_id: 'workspace', server_id: 'a' },
        { kind: 'mcp_details', workspace_id: 'workspace', server_id: 'b' },
        { kind: 'skills', workspace_id: 'workspace' },
        { kind: 'skills_details', workspace_id: 'workspace', skill_id: 'AAAAAAAAAAAAAAAAAAAAA' },
        { kind: 'skills_upload', workspace_id: 'workspace', operation_id: 7 },
        { kind: 'skills_upload', workspace_id: 'workspace', operation_id: 8 },
        { kind: 'composer_catalog', thread_id: 'thread' },
        settingsScope,
    ];
    const initial = scopes.map((scope) => snapshot(1, [], scope));
    const fixture = bridgeFixture(null);
    const demands: unknown[] = [];
    const recovered: ClientScope[] = [];
    const binding = new MobileClientBinding({
        ...fixture.bridge,
        snapshot: (scope) =>
            initial.find((p) => JSON.stringify(p.scope) === JSON.stringify(scope)) ?? null,
        dispatch: (request) => {
            demands.push(request.intent);
            return { schema_version: 1, sequence: demands.length, outcome: 'changed', effects: [] };
        },
        resnapshot: (scope) => {
            recovered.push(scope);
            return {
                ...snapshot(5, [], scope),
                payload: { operation_id: 7, state: 'cancelled', sent_bytes: 2 },
            };
        },
    });
    const stores = scopes.map((scope) => binding.scope(scope));
    const notifications = scopes.map(() => 0);
    const releases = stores.map((store, index) => store.subscribe(() => notifications[index]++));
    const before = stores.map((store) => store.getSnapshot());
    fixture.batches.push({
        schema_version: 1,
        changes: [
            {
                kind: 'publication',
                predecessor: 1,
                sequence: 2,
                snapshot: {
                    ...snapshot(2, [], scopes[5]),
                    payload: { operation_id: 7, state: 'uploading', sent_bytes: 2 },
                },
            },
        ],
    });
    binding.drain(scopes[5]);
    expect(notifications).toEqual([0, 0, 0, 0, 0, 1, 0, 0, 0]);
    stores.forEach((store, index) => {
        if (index !== 5) expect(store.getSnapshot()).toBe(before[index]);
    });
    fixture.batches.push({
        schema_version: 1,
        changes: [
            {
                kind: 'publication',
                predecessor: 4,
                sequence: 5,
                snapshot: snapshot(5, [], scopes[5]),
            },
        ],
    });
    binding.drain(scopes[5]);
    expect(recovered).toEqual([scopes[5]]);
    expect(stores[5].getSnapshot()?.payload).toEqual({
        operation_id: 7,
        state: 'cancelled',
        sent_bytes: 2,
    });
    expect(
        binding.scope({ operation_id: 7, workspace_id: 'workspace', kind: 'skills_upload' }),
    ).toBe(stores[5]);
    expect(
        binding.scope({ operation_id: 7, workspace_id: 'other', kind: 'skills_upload' }),
    ).not.toBe(stores[5]);
    releases.forEach((release) => release());
    expect(stores[5].getSnapshot()).toBeNull();
});

test('settings and onboarding scopes retain isolated snapshots and recover only the gapped scope', () => {
    const scopes: ClientScope[] = [
        { kind: 'profile' },
        { kind: 'auth_sessions' },
        { kind: 'device_activation' },
        { kind: 'gateway_setup' },
        { kind: 'gateway_destinations' },
        { kind: 'onboarding_invitation' },
        { kind: 'settings_model_picker', picker_id: 'memory-model' },
        { kind: 'settings_model_picker', picker_id: 'voice-model' },
    ];
    const fixture = bridgeFixture(null);
    const recovered: ClientScope[] = [];
    const binding = new MobileClientBinding({
        ...fixture.bridge,
        dispatch: () => ({ schema_version: 1, sequence: 1, outcome: 'changed', effects: [] }),
        snapshot: (scope) => snapshot(1, [], scope),
        resnapshot: (scope) => {
            recovered.push(scope);
            return { ...snapshot(4, [], scope), payload: { pending: false } };
        },
    });
    const stores = scopes.map((scope) => binding.scope(scope));
    expect(new Set(stores).size).toBe(scopes.length);
    const counts = scopes.map(() => 0);
    const release = stores.map((store, i) => store.subscribe(() => counts[i]++));
    const before = stores.map((store) => store.getSnapshot());
    fixture.batches.push({
        schema_version: 1,
        changes: [
            {
                kind: 'publication',
                predecessor: 3,
                sequence: 4,
                snapshot: snapshot(4, [], scopes[3]),
            },
        ],
    });
    binding.drain(scopes[3]);
    expect(recovered).toEqual([scopes[3]]);
    expect(counts).toEqual([0, 0, 0, 1, 0, 0, 0, 0]);
    stores.forEach((store, i) => {
        if (i !== 3) expect(store.getSnapshot()).toBe(before[i]);
    });
    release[3]();
    expect(stores[3].getSnapshot()).toBeNull();
    expect(stores[0].getSnapshot()).toBe(before[0]);
    release.forEach((dispose) => dispose());
    expect(stores[6].getSnapshot()).toBeNull();
    expect(stores[7].getSnapshot()).toBeNull();
    binding.applyProcessBatch({
        schema_version: 1,
        closed: true,
        sequence: 4,
        resnapshot: false,
        changes: [],
        effects: [],
    });
    expect(binding.isClosed()).toBe(true);
});

test('access retirement is atomic across thread, navigation and capability scopes and stale delivery cannot revive it', () => {
    const scopes: ClientScope[] = [
        { kind: 'thread', thread_id: 'private' },
        { kind: 'navigation' },
        { kind: 'administration', workspace_id: null },
    ];
    const fixture = bridgeFixture(null);
    const binding = new MobileClientBinding({
        ...fixture.bridge,
        dispatch: () => ({ schema_version: 1, sequence: 1, outcome: 'noop', effects: [] }),
        snapshot: (scope) => ({ ...snapshot(1, [], scope), payload: { protected: 'old' } }),
    });
    const stores = scopes.map((scope) => binding.scope(scope));
    const observed: unknown[] = [];
    const releases = stores.map((store) =>
        store.subscribe(() => observed.push(stores.map((value) => value.getSnapshot()?.payload))),
    );
    const retired = scopes.map((scope) => ({ ...snapshot(2, [], scope), payload: null }));
    binding.applyProcessBatch({
        schema_version: 1,
        sequence: 2,
        closed: false,
        effects: [],
        resnapshot: true,
        changes: [{ sequence: 2, predecessor: 0, snapshots: retired }],
    });
    expect(observed).toEqual([
        [null, null, null],
        [null, null, null],
        [null, null, null],
    ]);
    const before = stores.map((store) => store.getSnapshot());
    binding.applyProcessBatch({
        schema_version: 1,
        sequence: 1,
        closed: false,
        effects: [],
        resnapshot: false,
        changes: [
            {
                sequence: 1,
                predecessor: 0,
                snapshots: scopes.map((scope) => ({
                    ...snapshot(1, [], scope),
                    payload: { protected: 'late' },
                })),
            },
        ],
    });
    expect(stores.map((store) => store.getSnapshot())).toEqual(before);
    releases.forEach((release) => release());
    expect(stores.every((store) => store.getSnapshot() === null)).toBe(true);
});

test('inactive scope memory and native registrations are bounded and an evicted handle can subscribe again', () => {
    const fixture = bridgeFixture(null);
    const released: ClientScope[] = [];
    const acquired: ClientScope[] = [];
    const binding = new MobileClientBinding({
        ...fixture.bridge,
        dispatch: () => ({ schema_version: 1, sequence: 1, outcome: 'noop', effects: [] }),
        snapshot: (scope) => snapshot(1, [], scope),
        releaseScope: (scope) => released.push(scope),
        acquireScope: (scope) => acquired.push(scope),
    });
    const first = binding.scope({ kind: 'thread', thread_id: '0' });
    for (let index = 1; index < 140; index++)
        binding.scope({ kind: 'thread', thread_id: `${index}` });
    expect(released.length).toBe(12);
    expect(first.getSnapshot()).toBeNull();
    const dispose = first.subscribe(() => {});
    expect(acquired.at(-1)).toEqual({ kind: 'thread', thread_id: '0' });
    expect(first.getSnapshot()?.scope).toEqual({ kind: 'thread', thread_id: '0' });
    dispose();
    expect(first.getSnapshot()).toBeNull();
});

test('one native await survives StrictMode replacement and close disposes effects and ignores its late result', async () => {
    const fixture = bridgeFixture(snapshot(1, []));
    let resolve!: (
        value: import('./generated/client_process_change_batch_dto').ClientProcessChangeBatchDto,
    ) => void;
    let waits = 0,
        shutdowns = 0,
        effectCloses = 0,
        deliveries = 0;
    const binding = new MobileClientBinding({
        ...fixture.bridge,
        shutdown: () => {
            shutdowns++;
        },
        waitForPublications: () => {
            waits++;
            return new Promise((next) => {
                resolve = next;
            });
        },
    });
    const store = binding.scope(settingsScope);
    const first = store.subscribe(() => {
        deliveries++;
    });
    first();
    const second = store.subscribe(() => {
        deliveries++;
    });
    binding.attachPlatformEffects(
        () => {
            throw new Error('late effect delivered');
        },
        () => {
            effectCloses++;
        },
    );
    expect(waits).toBe(1);
    binding.close();
    binding.close();
    second();
    const closedDeliveries = deliveries;
    resolve({
        schema_version: 1,
        sequence: 1,
        effects: [],
        closed: false,
        resnapshot: false,
        changes: [{ sequence: 1, predecessor: 0, snapshots: [snapshot(1, [])] }],
    });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(shutdowns).toBe(1);
    expect(effectCloses).toBe(1);
    expect(waits).toBe(1);
    expect(deliveries).toBe(closedDeliveries);
    expect(store.getSnapshot()).toBeNull();
});

test('released scopes stay retired through late batches, other drains and process gaps', () => {
    const fixture = bridgeFixture(null);
    const acquired: ClientScope[] = [];
    const drained: ClientScope[] = [];
    const released: ClientScope[] = [];
    const binding = new MobileClientBinding({
        ...fixture.bridge,
        snapshot: (scope) => snapshot(1, [{ id: 'private', revision: 1 }], scope),
        resnapshot: (scope) => snapshot(3, [], scope),
        acquireScope: (scope) => {
            acquired.push(scope);
        },
        releaseScope: (scope) => {
            released.push(scope);
        },
        changes: (scope) => {
            drained.push(scope);
            return { schema_version: 1, changes: [] };
        },
    });
    const retired = binding.scope(settingsScope);
    const active = binding.scope(providerScope);
    const release = retired.subscribe(() => {});
    const releaseActive = active.subscribe(() => {});
    release();
    binding.drain(providerScope);
    expect(drained).toEqual([providerScope]);
    binding.applyProcessBatch({
        schema_version: 1,
        sequence: 2,
        effects: [],
        closed: false,
        resnapshot: false,
        changes: [
            {
                sequence: 2,
                predecessor: 0,
                snapshots: [snapshot(2, [{ id: 'late', revision: 2 }])],
            },
        ],
    });
    expect(retired.getSnapshot()).toBeNull();
    binding.applyProcessBatch({
        schema_version: 1,
        sequence: 4,
        effects: [],
        closed: false,
        resnapshot: false,
        changes: [{ sequence: 4, predecessor: 3, snapshots: [] }],
    });
    expect(retired.getSnapshot()).toBeNull();
    expect(acquired).toEqual([settingsScope, providerScope]);
    expect(released).toEqual([settingsScope]);
    releaseActive();
});

test('authoritative resnapshot clears omitted protected scopes atomically and fences old publications', () => {
    const fixture = bridgeFixture(null);
    const binding = new MobileClientBinding({
        ...fixture.bridge,
        snapshot: (scope) => snapshot(1, [{ id: 'private', revision: 1 }], scope),
    });
    const a = binding.scope(settingsScope),
        b = binding.scope(providerScope);
    const observed: unknown[] = [];
    const releaseA = a.subscribe(() =>
        observed.push([a.getSnapshot()?.sequence ?? null, b.getSnapshot()?.sequence ?? null]),
    );
    const releaseB = b.subscribe(() =>
        observed.push([a.getSnapshot()?.sequence ?? null, b.getSnapshot()?.sequence ?? null]),
    );
    binding.applyProcessBatch({
        schema_version: 1,
        sequence: 5,
        effects: [],
        closed: false,
        resnapshot: true,
        changes: [{ sequence: 5, predecessor: null, snapshots: [snapshot(5, [], providerScope)] }],
    });
    expect(a.getSnapshot()).toBeNull();
    expect(observed).toEqual([
        [null, 5],
        [null, 5],
    ]);
    binding.applyProcessBatch({
        schema_version: 1,
        sequence: 4,
        effects: [],
        closed: false,
        resnapshot: false,
        changes: [
            {
                sequence: 4,
                predecessor: 3,
                snapshots: [snapshot(4, [{ id: 'private', revision: 1 }])],
            },
        ],
    });
    expect(a.getSnapshot()).toBeNull();
    releaseA();
    releaseB();
});

test('failed demand release clears protected values and failed resnapshot stays retryable', () => {
    const scope: ClientScope = { kind: 'thread', thread_id: 'thread' };
    const fixture = bridgeFixture(null);
    let failedRead = true;
    let reads = 0;
    let releases = 0;
    const binding = new MobileClientBinding({
        ...fixture.bridge,
        snapshot: () => snapshot(1, [{ id: 'private', revision: 1 }], scope),
        dispatch: (request) => {
            if (request.intent.kind === 'set_scope_demand' && request.intent.demand === 'suspended')
                throw new Error('bridge unavailable');
            return { schema_version: 1, sequence: 1, outcome: 'noop', effects: [] };
        },
        releaseScope: () => {
            releases++;
        },
        resnapshot: () => {
            reads++;
            if (failedRead) throw new Error('read unavailable');
            return snapshot(2, [], scope);
        },
    });
    const store = binding.scope(scope);
    const release = store.subscribe(() => {});
    expect(() => release()).toThrow('bridge unavailable');
    expect(releases).toBe(1);
    expect(store.getSnapshot()).toBeNull();
    expect(() => store.subscribe(() => {})).toThrow('read unavailable');
    failedRead = false;
    const retry = store.subscribe(() => {});
    expect(reads).toBe(2);
    expect(store.getSnapshot()?.sequence).toBe(2);
    binding.close();
    retry();
});
