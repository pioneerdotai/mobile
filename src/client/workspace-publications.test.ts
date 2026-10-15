import { describe, expect, test } from 'bun:test';
import fixture from './fixtures/workspace-directory-wire.json';
import type { ClientChangeBatchDto } from './generated/client_change_batch_dto';
import type { ClientScopedSnapshotDto } from './generated/client_scoped_snapshot_dto';
import { MobileClientBinding, type MobileClientBridge } from './mobile-client-binding';

// This byte-identical fixture is produced and asserted through Rust's FFI DTO.
describe('workspace directory publications', () => {
    test('replays canonical changes without a JS domain reducer or navigation echo', () => {
        const initial = fixture.initial as ClientScopedSnapshotDto[];
        const updated = fixture.updated as ClientScopedSnapshotDto[];
        const batches: ClientChangeBatchDto[] = [];
        const intents: unknown[] = [];
        const bridge: MobileClientBridge = {
            snapshot: (scope) =>
                initial.find((input) => JSON.stringify(input.scope) === JSON.stringify(scope)) ??
                null,
            resnapshot: () => null,
            changes: () => batches.shift() ?? { schema_version: 1, changes: [] },
            dispatch: (request) => {
                intents.push(request.intent);
                return { schema_version: 1, sequence: 0, outcome: 'changed', effects: [] };
            },
            completeEffect: () => {
                throw new Error('No native effects in directory replay');
            },
            cancelEffect: () => {
                throw new Error('No native effects in directory replay');
            },
        };
        const binding = new MobileClientBinding(bridge);
        const a = binding.scope(initial[0].scope);
        const b = binding.scope(initial[1].scope);
        let aCalls = 0;
        let bCalls = 0;
        const ua = a.subscribe(() => aCalls++);
        const ub = b.subscribe(() => bCalls++);
        const beforeB = b.getSnapshot();
        for (const input of [updated[0], updated[0], initial[0]]) {
            batches.push({
                schema_version: 1,
                changes: [
                    {
                        kind: 'publication',
                        sequence: input.sequence,
                        predecessor: initial[0].sequence,
                        snapshot: input,
                    },
                ],
            });
            binding.drain(initial[0].scope);
        }
        expect(a.getSnapshot()).toEqual(updated[0]);
        expect(aCalls).toBe(1);
        expect(b.getSnapshot()).toBe(beforeB);
        expect(bCalls).toBe(0);
        expect(
            intents.every((intent) => (intent as { kind: string }).kind === 'set_scope_demand'),
        ).toBe(true);
        ua();
        ub();
    });
});
