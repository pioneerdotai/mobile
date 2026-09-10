import React from 'react';
import { expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { useActiveThreadSnapshotQuery } from './use-active-thread-snapshot-query';
import { mobileClientBinding as mockBinding } from '@/client/mobile-client-binding';

import type { ClientScopedSnapshotDto } from '@/client/generated/client_scoped_snapshot_dto';
const mockValue = (id: string, revision: number, loading = false): ClientScopedSnapshotDto => ({
    schema_version: 1,
    scope: { kind: 'thread', thread_id: id },
    sequence: revision,
    revisions: { scoped: revision, domain: revision, content: revision, presentation: revision },
    payload: { thread_id: id, history_loading: loading, projection: { revision } },
});
jest.mock('@/client/mobile-client-binding', () => {
    const actual = jest.requireActual<typeof import('@/client/mobile-client-binding')>(
        '@/client/mobile-client-binding',
    );
    return {
        ...actual,
        mobileClientBinding: new actual.MobileClientBinding({
            snapshot: (scope) => (scope.kind === 'thread' ? mockValue(scope.thread_id, 1) : null),
            changes: () => ({ schema_version: 1, changes: [] }),
            dispatch: () => ({ schema_version: 1, sequence: 1, outcome: 'noop', effects: [] }),
            completeEffect: () => {
                throw new Error('unexpected effect');
            },
            cancelEffect: () => {
                throw new Error('unexpected effect');
            },
            resnapshot: () => null,
        }),
    };
});
it('reads parent and child publications without semantic cache copies and preserves visible content while Client loads', async () => {
    const renders: unknown[] = [];
    const Probe = ({ id }: { id: string }) => {
        const value = useActiveThreadSnapshotQuery(id);
        renders.push([value.data?.thread_id, value.data?.projection.revision, value.isFetching]);
        return null;
    };
    let tree!: ReactTestRenderer;
    await act(async () => {
        tree = renderer.create(<Probe id="child" />);
    });
    await act(async () => tree.update(<Probe id="parent" />));
    expect(renders.at(-1)).toEqual(['parent', 1, false]);
    act(() =>
        mockBinding.applyProcessBatch({
            schema_version: 1,
            sequence: 2,
            closed: false,
            resnapshot: true,
            effects: [],
            changes: [{ sequence: 2, predecessor: 0, snapshots: [mockValue('parent', 2, true)] }],
        }),
    );
    expect(renders.at(-1)).toEqual(['parent', 2, true]);
    act(() =>
        mockBinding.applyProcessBatch({
            schema_version: 1,
            sequence: 3,
            closed: false,
            resnapshot: false,
            effects: [],
            changes: [{ sequence: 3, predecessor: 2, snapshots: [mockValue('parent', 3)] }],
        }),
    );
    expect(renders.at(-1)).toEqual(['parent', 3, false]);
    await act(async () => tree.unmount());
});
