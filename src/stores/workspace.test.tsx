import React, { useEffect } from 'react';
import { afterAll, expect, jest, test } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import { useShallow } from 'zustand/react/shallow';
import { useWorkspaceStore } from './workspace';
import {
    configureMobileClientBindingBridge,
    mobileClientBinding,
    type MobileClientBridge,
} from '@/client/mobile-client-binding';
import type { ClientScope } from '@/client/generated/client_scope';
import type { ClientScopedSnapshotDto } from '@/client/generated/client_scoped_snapshot_dto';
import type { ClientChangeBatchDto } from '@/client/generated/client_change_batch_dto';

const snapshots = new Map<string, ClientScopedSnapshotDto>();
const batches = new Map<string, ClientChangeBatchDto>();
const key = (scope: ClientScope) => JSON.stringify(scope);
const bridge: MobileClientBridge = {
    snapshot: (scope) => snapshots.get(key(scope)) ?? null,
    resnapshot: (scope) => snapshots.get(key(scope)) ?? null,
    changes: (scope) => {
        const batch = batches.get(key(scope));
        batches.delete(key(scope));
        return batch ?? { schema_version: 1, changes: [] };
    },
    waitForPublications: () => new Promise(() => {}),
    dispatch: () => ({ schema_version: 1, sequence: 0, outcome: 'changed', effects: [] }),
    completeEffect: () => {
        throw new Error('unused');
    },
    cancelEffect: () => {
        throw new Error('unused');
    },
};
configureMobileClientBindingBridge(bridge);
afterAll(() => mobileClientBinding.close());

const publish = (scope: ClientScope, payload: unknown, revision: number) => {
    const previous = snapshots.get(key(scope));
    const snapshot: ClientScopedSnapshotDto = {
        schema_version: 1,
        sequence: revision,
        scope,
        revisions: {
            domain: revision,
            presentation: revision,
            content: revision,
            scoped: revision,
        },
        payload,
    };
    snapshots.set(key(scope), snapshot);
    batches.set(key(scope), {
        schema_version: 1,
        changes: [
            {
                kind: 'publication',
                sequence: revision,
                predecessor: previous?.sequence ?? null,
                snapshot,
            },
        ],
    });
    mobileClientBinding.drain(scope);
};

test('workspace selectors settle before catalog load and react to publications and UI changes', async () => {
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    let renders = 0;
    let workspaceEffects = 0;
    let selected: { workspaces: unknown[]; active: string | null; open: boolean };
    const Probe = () => {
        const selection = useWorkspaceStore(
            useShallow((state) => ({
                workspaces: state.workspaces,
                active: state.activeWorkspaceId,
                open: state.showWorkspaceSwitcher,
            })),
        );
        selected = selection;
        // A normal object selector must also be safe; callers need not cache a
        // synthetic snapshot combining three independently subscribed stores.
        const flags = useWorkspaceStore((state) => ({ loading: state.loading }));
        useEffect(() => {
            workspaceEffects++;
        }, [selection.workspaces]);
        renders++;
        return <>{flags.loading ? 'loading' : 'ready'}</>;
    };
    let root: renderer.ReactTestRenderer | undefined;
    try {
        await act(async () => {
            root = renderer.create(<Probe />);
        });
        expect(renders).toBeLessThan(10);
        expect(selected!.workspaces).toEqual([]);
        expect(useWorkspaceStore.getState().workspaces).toBe(
            useWorkspaceStore.getState().workspaces,
        );
        const empty = selected!.workspaces;
        await act(async () => {
            root!.update(<Probe />);
        });
        expect(selected!.workspaces).toBe(empty);
        expect(workspaceEffects).toBe(1);

        const catalogScope = { kind: 'workspace_tree', workspace_id: null } as const;
        const workspaces = [
            { id: 'a', name: 'A', created_at: 1, updated_at: 1, is_active: true, is_current: true },
        ];
        await act(async () =>
            publish(
                catalogScope,
                { workspaces, loading: false, action_pending: false, revision: 1 },
                1,
            ),
        );
        expect(selected!.workspaces).toEqual(workspaces);
        expect(workspaceEffects).toBe(2);
        const loaded = selected!.workspaces;
        await act(async () => publish({ kind: 'navigation' }, { workspace_id: 'a' }, 1));
        expect(selected!.active).toBe('a');
        expect(selected!.workspaces).toBe(loaded);
        await act(async () => useWorkspaceStore.getState().setWorkspaceSwitcherOpen(true));
        expect(selected!.open).toBe(true);
        expect(workspaceEffects).toBe(2);
        await act(async () => publish(catalogScope, null, 2));
        expect(selected!.workspaces).toBe(empty);
        expect(workspaceEffects).toBe(3);
        expect(renders).toBeLessThan(20);
        expect(errors).not.toHaveBeenCalled();
    } finally {
        if (root) await act(async () => root!.unmount());
        errors.mockRestore();
    }
});
