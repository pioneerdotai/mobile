import { sameStartupScope, type StartupTreeScope } from './mobile-startup-readiness';
import type { ThreadTreePublication } from '@/client/generated/thread_tree_publication';

export type StartupTreeResult = { scope: StartupTreeScope; failed: boolean } | null;
type Publication = Pick<ThreadTreePublication, 'revision' | 'load'> & {
    snapshot: Pick<ThreadTreePublication['snapshot'], 'workspace_id'>;
};

// One observed startup load, including replacements owned by the existing Rust
// directory. Retained snapshots/local metadata revisions are not load receipts.
export class StartupTreeObservation {
    private pending: {
        scope: StartupTreeScope;
        minimumGeneration: number;
        observedRevision: number;
        observedGeneration: number;
    } | null = null;
    private result: StartupTreeResult = null;
    private readonly listeners = new Set<() => void>();
    constructor(private readonly settled: (failed: boolean) => void) {}
    getSnapshot = (): StartupTreeResult => this.result;
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };
    begin(scope: StartupTreeScope, publication: Publication | null): void {
        if (scope.gatewayId === null || scope.connectionId === null || scope.workspaceId === null)
            return;
        if (this.pending && sameStartupScope(this.pending.scope, scope)) return;
        const generation = publication?.load?.generation ?? 0;
        this.pending = {
            scope,
            minimumGeneration: generation + (publication?.load?.state === 'pending' ? 0 : 1),
            observedRevision: publication?.revision ?? 0,
            observedGeneration: generation,
        };
        this.update(null);
    }
    observe(scope: StartupTreeScope, publication: Publication | null): void {
        const pending = this.pending;
        const load = publication?.load;
        if (
            !pending ||
            !publication ||
            !load ||
            !sameStartupScope(pending.scope, scope) ||
            publication.snapshot.workspace_id !== scope.workspaceId ||
            publication.revision <= pending.observedRevision ||
            load.generation < pending.minimumGeneration ||
            load.generation < pending.observedGeneration
        )
            return;
        pending.observedRevision = publication.revision;
        pending.observedGeneration = load.generation;
        if (load.state === 'pending') {
            this.update(null);
            return;
        }
        const failed = load.state === 'failed';
        if (
            this.result &&
            sameStartupScope(this.result.scope, scope) &&
            this.result.failed === failed
        )
            return;
        this.settled(failed);
        this.update({ scope, failed });
    }
    private update(result: StartupTreeResult): void {
        if (this.result === result) return;
        this.result = result;
        for (const listener of this.listeners) listener();
    }
}
