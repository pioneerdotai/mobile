import { describe, expect, mock, spyOn, test } from 'bun:test';
import wire from './fixtures/thread-presentation-wire.json';
import acceptedRows from './fixtures/thread-presentation-rows.json';
import type {
    ClientProcessChangeBatchDto,
    TimelineChangeSet,
} from './generated/client_process_change_batch_dto';
import type { ClientScopedSnapshotDto } from './generated/client_scoped_snapshot_dto';
import type { TimelineSnapshot } from './generated/timeline_snapshot';
import { MobileClientBinding, type MobileClientBridge } from './mobile-client-binding';

mock.module('@/locale/i18n', () => ({ default: { t: (key: string) => key } }));
const { localizeTimelineRow } = await import('@/services/threads/conversation/localization');

const fixture = () => {
    let replacement = wire.next as ClientScopedSnapshotDto | null;
    let resnapshots = 0;
    const bridge: MobileClientBridge = {
        snapshot: () => wire.initial as ClientScopedSnapshotDto,
        resnapshot: () => {
            resnapshots++;
            return replacement;
        },
        dispatch: () => ({ schema_version: 1, sequence: 0, outcome: 'changed', effects: [] }),
        changes: () => ({ schema_version: 1, changes: [] }),
        completeEffect: () => {
            throw new Error('unused');
        },
        cancelEffect: () => {
            throw new Error('unused');
        },
    };
    const binding = new MobileClientBinding(bridge);
    const store = binding.scope({ kind: 'timeline', thread_id: 'a' });
    binding.applyProcessBatch({
        schema_version: 1,
        closed: false,
        effects: [],
        sequence: wire.initial.sequence,
        resnapshot: true,
        changes: [
            {
                sequence: wire.initial.sequence,
                predecessor: null,
                snapshots: [wire.initial as ClientScopedSnapshotDto],
                timeline_changes: [],
            },
        ],
    });
    return {
        binding,
        store,
        resnapshots: () => resnapshots,
        setReplacement: (value: ClientScopedSnapshotDto | null) => {
            replacement = value;
        },
    };
};

describe('shared timeline publication', () => {
    test('applies the actual Rust/FFI ordered batch and retains every unchanged row', () => {
        const f = fixture();
        const first = f.store.getSnapshot()!;
        const rows = (first.payload as TimelineSnapshot).rows;
        let notifications = 0;
        const unsubscribe = f.store.subscribe(() => notifications++);
        f.binding.applyProcessBatch(wire.batch as ClientProcessChangeBatchDto);
        const next = f.store.getSnapshot()!;
        const nextRows = (next.payload as TimelineSnapshot).rows;
        expect(next).toEqual(wire.next as ClientScopedSnapshotDto);
        expect(notifications).toBe(1);
        expect(nextRows[0]).not.toBe(rows[0]);
        for (let ix = 1; ix < rows.length; ix++) expect(nextRows[ix]).toBe(rows[ix]);
        f.binding.applyProcessBatch(wire.batch as ClientProcessChangeBatchDto);
        expect(f.store.getSnapshot()).toBe(next);
        expect(notifications).toBe(1);
        expect(f.resnapshots()).toBe(0);
        unsubscribe();
    });

    test('localizes Client row kinds without a source aggregate or render fingerprint', () => {
        const snapshot = wire.initial.payload as unknown as TimelineSnapshot;
        const rows = snapshot.rows.map(localizeTimelineRow);
        expect(rows.map((row) => row.type)).toEqual([
            'user-message',
            'user-message',
            'work-group',
            'reasoning',
            'system-event',
            'command-execution',
            'file-change',
            'tool-call',
            'tool-call',
            'tool-call',
            'tool-call',
            'assistant-message',
            'task-anchor',
            'pending-request',
            'running',
        ]);
        expect(rows[0]).toMatchObject({
            key: snapshot.rows[0]!.id,
            text: 'initial',
            presentationRevision: 1,
        });
        expect(rows[1]).toMatchObject({ text: '', deleted: true, attachments: [] });
        expect(rows[5]).toMatchObject({
            command: 'printf hello',
            outputPreview: 'hello\nworld    !',
            terminalText: '$ printf hello\nhello\nworld    !',
        });
        expect(rows[8]).toMatchObject({ host: 'example.test:8443' });
        expect(rows[14]).toMatchObject({ startedAtUnixMs: 1000, elapsedLabel: null });
        expect(rows.every((row) => !('renderFingerprint' in row))).toBe(true);
    });

    test('keeps every pending insertion position from the direct Rust/FFI fixture', () => {
        for (const fixture of Object.values(wire.pending_positions)) {
            const snapshot = fixture.snapshot.payload as unknown as TimelineSnapshot;
            expect(
                snapshot.rows
                    .map(localizeTimelineRow)
                    .map((row) =>
                        row.type === 'pending-request'
                            ? 'pending'
                            : row.type === 'running'
                              ? 'running'
                              : 'user',
                    ),
            ).toEqual(fixture.expected as ('user' | 'running' | 'pending')[]);
        }
    });

    test('matches the committed shell row output captured before migration', () => {
        const timezone = process.env.TZ;
        process.env.TZ = 'Europe/Moscow';
        const clock = spyOn(Date, 'now').mockReturnValue(1000);
        try {
            const rows = (wire.initial.payload as unknown as TimelineSnapshot).rows
                .map(localizeTimelineRow)
                .map((row) => {
                    const value = { ...row };
                    delete value.presentationRevision;
                    delete value.presentationLocale;
                    delete value.semanticWorkItem;
                    return value;
                });
            expect(rows).toEqual(acceptedRows as unknown as typeof rows);
        } finally {
            clock.mockRestore();
            if (timezone === undefined) delete process.env.TZ;
            else process.env.TZ = timezone;
        }
    });

    test('maps both retained coalesced row variants directly from their semantic tokens', () => {
        for (const kind of ['CompletedTaskTools', 'RepeatedTaskWait'] as const) {
            const snapshot = {
                ...wire.initial.payload.rows[2]!,
                id: 'coalesced',
                turn_id: 'turn',
                item: null,
                content: null,
                value: {
                    Timeline: {
                        key: 'coalesced',
                        author: null,
                        kind: {
                            CoalescedTools: {
                                toggle_key: 'turn-work-group::turn',
                                count: 3,
                                is_open: true,
                                kind,
                            },
                        },
                    },
                },
            } as TimelineSnapshot['rows'][number];
            expect(localizeTimelineRow(snapshot)).toMatchObject({
                type: 'tool-group',
                key: 'coalesced',
                turnId: 'turn',
                count: 3,
                expanded: true,
                items: [],
                kind: kind === 'CompletedTaskTools' ? 'completedTaskTools' : 'repeatedTaskWait',
            });
        }
    });

    test('recovers a process sequence gap by replacing the affected scope', () => {
        const f = fixture();
        const batch = structuredClone(wire.batch) as ClientProcessChangeBatchDto;
        batch.changes[0]!.predecessor = batch.changes[0]!.predecessor! + 1;
        f.binding.applyProcessBatch(batch);
        expect(f.resnapshots()).toBe(1);
        expect(f.store.getSnapshot()).toEqual(wire.next as ClientScopedSnapshotDto);
    });

    test('revision gaps, wrong generations and malformed membership use a scoped resnapshot', () => {
        const corruptions = [
            (delta: TimelineChangeSet) => {
                delta.from_revision = 99;
            },
            (delta: TimelineChangeSet) => {
                delta.generation++;
            },
            (delta: TimelineChangeSet) => {
                delta.order = Array(wire.initial.payload.rows.length).fill(
                    wire.initial.payload.rows[0]!.id,
                );
            },
            (delta: TimelineChangeSet) => {
                delta.removed = ['missing-row'];
            },
            (delta: TimelineChangeSet) => {
                delta.inserted = [delta.replaced[0]!];
            },
        ];
        for (const corrupt of corruptions) {
            const f = fixture();
            const batch = structuredClone(wire.batch) as ClientProcessChangeBatchDto;
            corrupt(batch.changes.at(-1)!.timeline_changes![0]!);
            f.binding.applyProcessBatch(batch);
            expect(f.resnapshots()).toBe(1);
            expect(f.store.getSnapshot()).toEqual(wire.next as ClientScopedSnapshotDto);
        }
    });
});
