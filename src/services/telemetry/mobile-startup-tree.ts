import { useGatewayStore } from '@/stores/gateway';
import { useWorkspaceStore } from '@/stores/workspace';
import { sameStartupScope } from './mobile-startup-readiness';
import { useEffect, useSyncExternalStore } from 'react';
import { directorySnapshot } from '@/client/workspaces';
import { mobileStartup } from './mobile-startup';
import { StartupTreeObservation } from './mobile-startup-tree-observation';
import type { StartupTreeScope } from './mobile-startup-readiness';

const observation = new StartupTreeObservation((failed) => {
    if (failed) mobileStartup.fail('thread_tree.load');
    else mobileStartup.succeed('thread_tree.load');
});
export const beginStartupTreeLoad = (scope: StartupTreeScope): void => {
    if (!mobileStartup.isFinalized())
        observation.begin(scope, directorySnapshot(scope.workspaceId));
};

// Root already subscribes to this directory. Observe its applied publication on
// render; no second directory owner, extra refresh, subscription demand or poll.
export const useStartupTreeApplied = (scope: StartupTreeScope) => {
    const { gatewayId, connectionId, workspaceId } = scope;
    const result = useSyncExternalStore(observation.subscribe, observation.getSnapshot);
    const publication = directorySnapshot(workspaceId);
    useEffect(() => {
        const scope = { gatewayId, connectionId, workspaceId };
        const gateway = useGatewayStore.getState();
        const currentScope = {
            gatewayId: gateway.registry.active_gateway_id ?? null,
            connectionId: gateway.sessionConnectionGeneration,
            workspaceId: useWorkspaceStore.getState().activeWorkspaceId,
        };
        if (
            !mobileStartup.isFinalized() &&
            sameStartupScope(scope, currentScope) &&
            publication === directorySnapshot(scope.workspaceId)
        )
            observation.observe(scope, publication);
    }, [gatewayId, connectionId, workspaceId, publication]);
    // Do not use a previous terminal marker for a newly pending receipt in the
    // render before the observation effect has applied that publication.
    return result && publication?.load?.state === (result.failed ? 'failed' : 'ready')
        ? result
        : null;
};
