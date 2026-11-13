import { describe, expect, it, jest } from '@jest/globals';
import { StartupTreeObservation } from './mobile-startup-tree-observation';
import type { ThreadTreeLoadReceipt } from '@/client/generated/thread_tree_publication';

const scope = { gatewayId: 'gateway', connectionId: 1, workspaceId: 'workspace' };
const publication = (
    revision: number,
    load?: ThreadTreeLoadReceipt | null,
    workspaceId = 'workspace',
) => ({
    revision,
    load,
    snapshot: { workspace_id: workspaceId },
});

describe('startup follows the current directory load receipt', () => {
    it('accepts a successful empty replacement even when the original callback was superseded', () => {
        const settled = jest.fn();
        const observation = new StartupTreeObservation(settled);
        observation.begin(scope, publication(10, { generation: 4, state: 'ready' }));
        observation.observe(scope, publication(11, { generation: 5, state: 'pending' }));
        observation.observe(scope, publication(12, { generation: 6, state: 'pending' }));
        expect(observation.getSnapshot()).toBeNull();
        // No fulfilled JS callback is needed for the replacement/Rust retry.
        observation.observe(scope, publication(13, { generation: 6, state: 'ready' }));
        expect(observation.getSnapshot()).toEqual({ scope, failed: false });
        observation.observe(scope, publication(13, { generation: 6, state: 'ready' }));
        expect(settled).toHaveBeenCalledTimes(1);
    });
    it('waits when the callback sees pending, then accepts completion of that existing load', () => {
        const observation = new StartupTreeObservation(jest.fn());
        observation.begin(scope, publication(1));
        observation.observe(scope, publication(2, { generation: 1, state: 'pending' }));
        expect(observation.getSnapshot()).toBeNull();
        observation.observe(scope, publication(3, { generation: 1, state: 'ready' }));
        expect(observation.getSnapshot()).toEqual({ scope, failed: false });
    });
    it('does not accept retained snapshots, unrelated newer revisions, or a missing receipt', () => {
        const observation = new StartupTreeObservation(jest.fn());
        const retained = publication(10, { generation: 4, state: 'ready' });
        observation.begin(scope, retained);
        observation.observe(scope, retained);
        observation.observe(scope, publication(11, retained.load));
        observation.observe(scope, publication(12));
        expect(observation.getSnapshot()).toBeNull();
    });
    it('preserves a current terminal failure without relying on a raw error string', () => {
        const settled = jest.fn();
        const observation = new StartupTreeObservation(settled);
        observation.begin(scope, publication(1));
        observation.observe(scope, publication(2, { generation: 1, state: 'failed' }));
        expect(observation.getSnapshot()).toEqual({ scope, failed: true });
        expect(settled).toHaveBeenCalledWith(true);
    });
    it('ignores late success/failure of older scopes and generations', () => {
        const settled = jest.fn();
        const observation = new StartupTreeObservation(settled);
        observation.begin(scope, publication(1));
        const current = { ...scope, connectionId: 2, workspaceId: 'other' };
        observation.begin(current, publication(5, { generation: 3, state: 'ready' }, 'other'));
        for (const state of ['ready', 'failed'] as const) {
            observation.observe(scope, publication(99, { generation: 9, state }));
            observation.observe(current, publication(6, { generation: 3, state }, 'other'));
        }
        observation.observe(current, publication(7, { generation: 5, state: 'pending' }, 'other'));
        observation.observe(current, publication(6, { generation: 4, state: 'failed' }, 'other'));
        expect(observation.getSnapshot()).toBeNull();
        expect(settled).not.toHaveBeenCalled();
        observation.observe(current, publication(8, { generation: 5, state: 'ready' }, 'other'));
        expect(observation.getSnapshot()).toEqual({ scope: current, failed: false });
    });
    it('does not adopt retained success/failure of a previous connection in the same workspace', () => {
        const observation = new StartupTreeObservation(jest.fn());
        const current = { ...scope, connectionId: 2 };
        observation.begin(current, publication(10, { generation: 4, state: 'ready' }));
        observation.observe(scope, publication(11, { generation: 5, state: 'ready' }));
        observation.observe(current, publication(12, { generation: 4, state: 'failed' }));
        expect(observation.getSnapshot()).toBeNull();
        observation.observe(current, publication(13, { generation: 5, state: 'ready' }));
        expect(observation.getSnapshot()).toEqual({ scope: current, failed: false });
    });
    it('accepts completion of a load already pending when observation began', () => {
        const observation = new StartupTreeObservation(jest.fn());
        observation.begin(scope, publication(1, { generation: 3, state: 'pending' }));
        observation.observe(scope, publication(2, { generation: 3, state: 'ready' }));
        expect(observation.getSnapshot()).toEqual({ scope, failed: false });
    });
});
