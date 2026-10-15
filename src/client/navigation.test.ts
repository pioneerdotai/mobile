import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
    configureMobileClientBindingBridge,
    type MobileClientBridge,
} from './mobile-client-binding';
import { dispatchNavigation, navigationSnapshot } from './navigation';
import { useWorkspaceStore } from '../stores/workspace';
import type { ClientScopedSnapshotDto } from './generated/client_scoped_snapshot_dto';
import type { ClientChangeBatchDto } from './generated/client_change_batch_dto';

const publication = (revision: number, workspace: string | null): ClientScopedSnapshotDto => ({
    schema_version: 1,
    sequence: revision,
    scope: { kind: 'navigation' },
    revisions: { domain: revision, presentation: revision, content: revision, scoped: revision },
    payload: {
        workspace_id: workspace,
        active_thread_id: null,
        destination: { kind: 'threads' },
        drafts: {},
        last_active: {},
        lineage: [],
        administration: 'Members',
        settings: 'Account',
    },
});

describe('process-local navigation binding', () => {
    test('workspace facade reads native publication and sends one intent without a JS selection owner', () => {
        let current = publication(1, null);
        const calls: unknown[] = [];
        const batches: ClientChangeBatchDto[] = [];
        const bridge: MobileClientBridge = {
            snapshot: (scope) => (scope.kind === 'navigation' ? current : null),
            changes: () => batches.shift() ?? { schema_version: 1, changes: [] },
            resnapshot: (scope) => (scope.kind === 'navigation' ? current : null),
            dispatch: (request) => {
                calls.push(request);
                return { schema_version: 1, sequence: 2, outcome: 'changed', effects: [] };
            },
            completeEffect: () => {
                throw new Error('unused');
            },
            cancelEffect: () => {
                throw new Error('unused');
            },
        };
        configureMobileClientBindingBridge(bridge);
        expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull();
        useWorkspaceStore.getState().setActiveWorkspaceId('workspace');
        expect(calls).toEqual([
            {
                schema_version: 1,
                intent: {
                    kind: 'navigation',
                    expected_revision: null,
                    intent: { kind: 'select_workspace', workspace_id: 'workspace' },
                },
            },
        ]);
        // A command receipt is not a second mutable selection. Only its publication changes the value.
        expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull();
        current = publication(2, 'workspace');
        batches.push({
            schema_version: 1,
            changes: [{ kind: 'publication', sequence: 2, predecessor: 1, snapshot: current }],
        });
        dispatchNavigation({ kind: 'select_workspace', workspace_id: 'workspace' });
        const state = useWorkspaceStore.getState();
        expect(state.activeWorkspaceId).toBe('workspace');
        expect(state.preferredWorkspaceId).toBe('workspace');
        expect(Object.is(navigationSnapshot(), current.payload)).toBe(true);
        expect(Object.isFrozen(navigationSnapshot())).toBe(true);
    });
    test('Expo stack and gestures stay local while reusable destinations use Client intents', () => {
        const controller = readFileSync(
            new URL('../components/navigation/semantic-navigation.tsx', import.meta.url),
            'utf8',
        );
        expect(controller).toContain('usePathname()');
        expect(controller).toContain("path.startsWith('/settings/')");
        expect(controller).toContain("dispatchNavigation({ kind: 'navigate', destination })");
        expect(controller).not.toContain('router.push');
        const route = readFileSync(
            new URL('../routes/thread/child/[threadId].tsx', import.meta.url),
            'utf8',
        );
        expect(route).toContain('Stack.Screen');
        const hook = readFileSync(
            new URL('../screens/thread/hooks/index.tsx', import.meta.url),
            'utf8',
        );
        expect(hook).toContain("kind: 'pop_task_thread'");
        expect(hook).toContain('router.back()');
    });
});
