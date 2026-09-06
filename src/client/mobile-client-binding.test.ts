import { describe, expect, test } from 'bun:test';

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

describe('MobileClientBinding', () => {
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
        binding.scope(settingsScope);
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
