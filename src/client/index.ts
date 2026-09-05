import type { MobileClientBridge } from './mobile-client-binding';
import {
    CLIENT_BINDING_SCHEMA_VERSION,
    configureMobileClientBindingBridge,
} from './mobile-client-binding';
import { pioneerClient } from './native';

const nativeMobileClientBridge: MobileClientBridge = {
    dispatch: (request) => pioneerClient.clientIntentDispatch(request),
    snapshot: (scope, afterRevision) =>
        pioneerClient.clientScopedSnapshot({
            schema_version: CLIENT_BINDING_SCHEMA_VERSION,
            scope,
            after_revision: afterRevision,
        }),
    changes: (scope, maximumItems) =>
        pioneerClient.clientChangeBatch({
            schema_version: CLIENT_BINDING_SCHEMA_VERSION,
            scope,
            maximum_items: maximumItems,
        }),
    completeEffect: (request) => pioneerClient.clientEffectComplete(request),
    cancelEffect: (request) => pioneerClient.clientEffectCancel(request),
    resnapshot: (scope, receivedPredecessor, lastAppliedSequence) =>
        pioneerClient.clientSequenceGapResnapshot({
            schema_version: CLIENT_BINDING_SCHEMA_VERSION,
            scope,
            received_predecessor: receivedPredecessor,
            last_applied_sequence: lastAppliedSequence,
        }),
};

configureMobileClientBindingBridge(nativeMobileClientBridge);

export * from './native';
export * from './mobile-client-binding';
export { PioneerClientNativeError } from './response';
