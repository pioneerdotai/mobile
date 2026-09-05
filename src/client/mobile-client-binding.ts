import type { ClientChangeBatchDto } from './generated/client_change_batch_dto';
import type { ClientEffectCancellationDto } from './generated/client_effect_cancellation_dto';
import type { ClientEffectCompletionDto } from './generated/client_effect_completion_dto';
import type { ClientIntentDispatchDto } from './generated/client_intent_dispatch_dto';
import type { ClientScope } from './generated/client_scope';
import type { ClientScopedSnapshotDto } from './generated/client_scoped_snapshot_dto';
import type { ClientTransitionDto } from './generated/client_transition_dto';

export const CLIENT_BINDING_SCHEMA_VERSION = 1;

type Listener = () => void;

export type MobileClientRow = Readonly<{
    id: string;
    revision: number;
}>;

export type MobileClientScopeStore = Readonly<{
    subscribe: (listener: Listener) => () => void;
    getSnapshot: () => ClientScopedSnapshotDto | null;
}>;

export type MobileClientBridge = Readonly<{
    dispatch: (request: ClientIntentDispatchDto) => ClientTransitionDto;
    snapshot: (scope: ClientScope, afterRevision: number | null) => ClientScopedSnapshotDto | null;
    changes: (scope: ClientScope, maximumItems: number) => ClientChangeBatchDto;
    completeEffect: (request: ClientEffectCompletionDto) => ClientTransitionDto;
    cancelEffect: (request: ClientEffectCancellationDto) => ClientTransitionDto;
    resnapshot: (
        scope: ClientScope,
        receivedPredecessor: number | null,
        lastAppliedSequence: number | null,
    ) => ClientScopedSnapshotDto | null;
}>;

type ScopeState = {
    snapshot: ClientScopedSnapshotDto | null;
    rows: Map<string, MobileClientRow>;
    lastAppliedSequence: number | null;
    listeners: Set<Listener>;
    store: MobileClientScopeStore;
};

const optionalIdentity = (value: string | null | undefined): string =>
    JSON.stringify(value ?? null);

const scopeKey = (scope: ClientScope): string => {
    switch (scope.kind) {
        case 'workspace_tree':
        case 'administration':
        case 'mcp':
        case 'skills':
            return `${scope.kind}:${optionalIdentity(scope.workspace_id)}`;
        case 'task':
            return `${scope.kind}:${optionalIdentity(scope.task_id)}`;
        case 'thread':
        case 'timeline':
        case 'composer':
        case 'artifact':
            return `${scope.kind}:${JSON.stringify(scope.thread_id)}`;
        case 'pending_request':
            return `${scope.kind}:${optionalIdentity(scope.thread_id)}`;
        case 'avatar':
            return `${scope.kind}:${JSON.stringify(scope.principal_id)}`;
        case 'agents_document':
            return `${scope.kind}:${JSON.stringify(scope.workspace_id)}`;
        case 'session':
        case 'navigation':
        case 'provider':
        case 'settings':
        case 'onboarding_invitation':
        case 'desktop_update':
            return scope.kind;
    }
};

const assertSchemaVersion = (value: { schema_version: number }): void => {
    if (value.schema_version !== CLIENT_BINDING_SCHEMA_VERSION) {
        throw new Error(`Unsupported Mobile Client schema version: ${value.schema_version}`);
    }
};

const freezeSnapshotValue = <T>(value: T): T => {
    if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
        return value;
    }
    for (const nested of Object.values(value)) {
        freezeSnapshotValue(nested);
    }
    return Object.freeze(value);
};

const scopedRevision = (snapshot: ClientScopedSnapshotDto): number => snapshot.revisions.scoped;

const isMobileClientRow = (value: unknown): value is MobileClientRow => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const row = value as Record<string, unknown>;
    return (
        typeof row.id === 'string' &&
        typeof row.revision === 'number' &&
        Number.isSafeInteger(row.revision) &&
        row.revision >= 0
    );
};

const memoizeRows = (
    payload: unknown,
    previousRows: Map<string, MobileClientRow>,
): { payload: unknown; rows: Map<string, MobileClientRow> } => {
    if (typeof payload !== 'object' || payload === null || !('rows' in payload)) {
        return { payload, rows: new Map() };
    }
    const record = payload as Record<string, unknown>;
    if (!Array.isArray(record.rows) || !record.rows.every(isMobileClientRow)) {
        return { payload, rows: new Map() };
    }

    const rows = new Map<string, MobileClientRow>();
    const memoized = record.rows.map((row) => {
        const key = `${row.id}:${row.revision}`;
        const stable = previousRows.get(key) ?? freezeSnapshotValue(row);
        rows.set(key, stable);
        return stable;
    });
    return {
        payload: { ...record, rows: memoized },
        rows,
    };
};

let processBridge: MobileClientBridge | null = null;

const configuredBridge: MobileClientBridge = {
    dispatch: (request) => requireProcessBridge().dispatch(request),
    snapshot: (scope, afterRevision) => requireProcessBridge().snapshot(scope, afterRevision),
    changes: (scope, maximumItems) => requireProcessBridge().changes(scope, maximumItems),
    completeEffect: (request) => requireProcessBridge().completeEffect(request),
    cancelEffect: (request) => requireProcessBridge().cancelEffect(request),
    resnapshot: (scope, receivedPredecessor, lastAppliedSequence) =>
        requireProcessBridge().resnapshot(scope, receivedPredecessor, lastAppliedSequence),
};

const requireProcessBridge = (): MobileClientBridge => {
    if (!processBridge) {
        throw new Error('Mobile Client binding bridge is not configured');
    }
    return processBridge;
};

export const configureMobileClientBindingBridge = (bridge: MobileClientBridge): void => {
    if (processBridge && processBridge !== bridge) {
        throw new Error('Mobile Client binding bridge is already configured');
    }
    processBridge = bridge;
};

export class MobileClientBinding {
    readonly #bridge: MobileClientBridge;
    readonly #scopes = new Map<string, ScopeState>();

    constructor(bridge: MobileClientBridge = configuredBridge) {
        this.#bridge = bridge;
    }

    scope(scope: ClientScope): MobileClientScopeStore {
        return this.#scopeState(scope).store;
    }

    dispatch(request: ClientIntentDispatchDto): ClientTransitionDto {
        assertSchemaVersion(request);
        const transition = this.#bridge.dispatch(request);
        assertSchemaVersion(transition);
        return transition;
    }

    completeEffect(request: ClientEffectCompletionDto): ClientTransitionDto {
        assertSchemaVersion(request);
        const transition = this.#bridge.completeEffect(request);
        assertSchemaVersion(transition);
        return transition;
    }

    cancelEffect(request: ClientEffectCancellationDto): ClientTransitionDto {
        assertSchemaVersion(request);
        const transition = this.#bridge.cancelEffect(request);
        assertSchemaVersion(transition);
        return transition;
    }

    drain(scope: ClientScope, maximumItems = 64): void {
        if (!Number.isInteger(maximumItems) || maximumItems < 1 || maximumItems > 256) {
            throw new Error('Mobile Client change batch size must be between 1 and 256');
        }
        const state = this.#scopeState(scope);
        const batch = this.#bridge.changes(scope, maximumItems);
        assertSchemaVersion(batch);
        for (const change of batch.changes) {
            if (change.kind === 'resnapshot_required') {
                if (scopeKey(change.scope) !== scopeKey(scope)) {
                    continue;
                }
                this.#resnapshot(scope, state, null, change.latest_sequence);
                continue;
            }

            assertSchemaVersion(change.snapshot);
            if (scopeKey(change.snapshot.scope) !== scopeKey(scope)) {
                continue;
            }
            if (change.snapshot.sequence !== change.sequence) {
                throw new Error('Mobile Client publication sequence does not match its snapshot');
            }
            if (
                state.lastAppliedSequence !== null &&
                change.sequence <= state.lastAppliedSequence
            ) {
                continue;
            }
            const predecessor = change.predecessor ?? null;
            if (predecessor !== state.lastAppliedSequence) {
                this.#resnapshot(scope, state, predecessor, change.sequence);
                continue;
            }
            state.lastAppliedSequence = change.sequence;
            this.#applySnapshot(state, change.snapshot);
        }
    }

    #scopeState(scope: ClientScope): ScopeState {
        const key = scopeKey(scope);
        const existing = this.#scopes.get(key);
        if (existing) {
            return existing;
        }

        const state = {} as ScopeState;
        const initialSnapshot = this.#bridge.snapshot(scope, null);
        if (initialSnapshot) {
            assertSchemaVersion(initialSnapshot);
            if (scopeKey(initialSnapshot.scope) !== key) {
                throw new Error('Mobile Client snapshot scope does not match its selector');
            }
        }
        state.snapshot = null;
        state.rows = new Map();
        state.lastAppliedSequence = initialSnapshot?.sequence ?? null;
        state.listeners = new Set();
        state.store = {
            subscribe: (listener) => {
                let subscribed = true;
                const registration = () => {
                    if (subscribed) {
                        listener();
                    }
                };
                state.listeners.add(registration);
                return () => {
                    if (!subscribed) {
                        return;
                    }
                    subscribed = false;
                    state.listeners.delete(registration);
                };
            },
            getSnapshot: () => state.snapshot,
        };
        if (initialSnapshot) {
            this.#applySnapshot(state, initialSnapshot, false);
        }
        this.#scopes.set(key, state);
        return state;
    }

    #resnapshot(
        scope: ClientScope,
        state: ScopeState,
        predecessor: number | null,
        receivedSequence: number,
    ): void {
        const snapshot = this.#bridge.resnapshot(scope, predecessor, state.lastAppliedSequence);
        if (snapshot) {
            assertSchemaVersion(snapshot);
            if (scopeKey(snapshot.scope) !== scopeKey(scope)) {
                throw new Error('Mobile Client resnapshot scope does not match its selector');
            }
            state.lastAppliedSequence = snapshot.sequence;
            this.#applySnapshot(state, snapshot);
        } else {
            // Absence invalidates the value, not the delivery watermark. Older
            // queued publications must not restore a removed snapshot.
            state.lastAppliedSequence = Math.max(state.lastAppliedSequence ?? 0, receivedSequence);
            if (state.snapshot) {
                state.snapshot = null;
                state.rows = new Map();
                for (const listener of [...state.listeners]) {
                    listener();
                }
            }
        }
    }

    #applySnapshot(state: ScopeState, snapshot: ClientScopedSnapshotDto, notify = true): void {
        if (state.snapshot && scopedRevision(state.snapshot) >= scopedRevision(snapshot)) {
            return;
        }
        const memoized = memoizeRows(snapshot.payload, state.rows);
        state.rows = memoized.rows;
        state.snapshot = freezeSnapshotValue({
            ...snapshot,
            payload: memoized.payload,
        });
        if (notify) {
            for (const listener of [...state.listeners]) {
                listener();
            }
        }
    }
}

export const mobileClientBinding = new MobileClientBinding();
