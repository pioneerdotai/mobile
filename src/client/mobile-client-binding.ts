import type { ClientEffectPlan } from './generated/client_effect_plan';
import type { ClientProcessChangeBatchDto } from './generated/client_process_change_batch_dto';
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
    waitForPublications?: (afterSequence: number) => Promise<ClientProcessChangeBatchDto>;
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
    scope: ClientScope;
    snapshot: ClientScopedSnapshotDto | null;
    rows: Map<string, MobileClientRow>;
    lastAppliedSequence: number | null;
    demandGeneration: number;
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
            return `${scope.kind}:${optionalIdentity(scope.workspace_id)}:${optionalIdentity(scope.thread_id)}`;
        case 'sidebar_summary':
            return `${scope.kind}:${JSON.stringify(scope.workspace_id)}:${JSON.stringify(scope.thread_id)}`;
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
    waitForPublications: (sequence) => {
        const wait = requireProcessBridge().waitForPublications;
        if (!wait) {
            throw new Error('Mobile publication wait is unavailable');
        }
        return wait(sequence);
    },
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
    #processSequence = 0;
    #closed = false;
    #closeEffects: (() => void) | null = null;
    #effects: ((plans: readonly ClientEffectPlan[]) => void) | null = null;

    attachPlatformEffects(
        deliver: (plans: readonly ClientEffectPlan[]) => void,
        close?: () => void,
    ): () => void {
        if (this.#closed) {
            throw new Error('Mobile Client binding is closed');
        }
        if (this.#effects) {
            throw new Error('Mobile platform effect adapter is already attached');
        }
        this.#effects = deliver;
        this.#closeEffects = close ?? null;
        this.#startDelivery();
        return () => {
            if (this.#effects === deliver) {
                this.#effects = null;
                this.#closeEffects = null;
            }
        };
    }
    #delivery: Promise<void> | null = null;

    applyProcessBatch(batch: ClientProcessChangeBatchDto): void {
        assertSchemaVersion(batch);
        if (this.#closed) {
            return;
        }
        if (batch.closed) {
            this.#closed = true;
            const close = this.#closeEffects;
            this.#effects = null;
            this.#closeEffects = null;
            close?.();
            const listeners: Listener[] = [];
            for (const state of this.#scopes.values()) {
                state.snapshot = null;
                state.rows.clear();
                listeners.push(...state.listeners);
                state.listeners.clear();
            }
            for (const listener of listeners) {
                listener();
            }
            return;
        }
        if (batch.sequence <= this.#processSequence) {
            this.#effects?.(batch.effects ?? []);
            return;
        }
        let validatedSequence = this.#processSequence;
        for (const change of batch.changes) {
            if (!batch.resnapshot && (change.predecessor ?? 0) !== validatedSequence) {
                throw new Error('Mobile Client process sequence gap requires a resnapshot');
            }
            if (change.sequence <= validatedSequence || change.sequence > batch.sequence) {
                throw new Error('Mobile Client process sequence is invalid');
            }
            const scopes = new Set<string>();
            for (const snapshot of change.snapshots) {
                assertSchemaVersion(snapshot);
                const key = scopeKey(snapshot.scope);
                if (
                    scopes.has(key) ||
                    snapshot.sequence > change.sequence ||
                    (!batch.resnapshot && snapshot.sequence !== change.sequence)
                ) {
                    throw new Error('Mobile Client process snapshot is incoherent');
                }
                scopes.add(key);
            }
            validatedSequence = change.sequence;
        }
        if (validatedSequence !== batch.sequence) {
            throw new Error('Mobile Client process batch watermark is invalid');
        }
        const changed = new Set<ScopeState>();
        let predecessor = this.#processSequence;
        for (const change of batch.changes) {
            if (!batch.resnapshot && (change.predecessor ?? 0) !== predecessor) {
                throw new Error('Mobile Client process sequence gap requires a resnapshot');
            }
            for (const snapshot of change.snapshots) {
                assertSchemaVersion(snapshot);
                const state = this.#scopes.get(scopeKey(snapshot.scope));
                if (!state) {
                    continue;
                }
                const before = state.snapshot;
                this.#applySnapshot(state, snapshot, false);
                state.lastAppliedSequence = snapshot.sequence;
                if (before !== state.snapshot) {
                    changed.add(state);
                }
            }
            predecessor = change.sequence;
        }
        this.#processSequence = batch.sequence;
        this.#effects?.(batch.effects ?? []);
        // Every affected immutable value is installed before any observer runs.
        for (const state of changed) {
            for (const listener of [...state.listeners]) {
                listener();
            }
        }
    }

    #startDelivery(): void {
        if (this.#closed || this.#delivery || !this.#bridge.waitForPublications) {
            return;
        }
        const deliver = async () => {
            while (
                !this.#closed &&
                (this.#effects ||
                    [...this.#scopes.values()].some((scope) => scope.listeners.size > 0))
            ) {
                try {
                    const batch = await this.#bridge.waitForPublications!(this.#processSequence);
                    this.applyProcessBatch(batch);
                } catch {
                    // A failed bridge call did not advance the applied watermark.
                    // Retrying requests the same ordered batch or a Core resnapshot.
                    await new Promise((resolve) => setTimeout(resolve, 250));
                }
            }
        };
        this.#delivery = deliver().finally(() => {
            this.#delivery = null;
        });
    }

    constructor(bridge: MobileClientBridge = configuredBridge) {
        this.#bridge = bridge;
    }

    async synchronize(): Promise<void> {
        if (this.#closed) {
            return;
        }
        if (!this.#bridge.waitForPublications) {
            throw new Error('Mobile publication wait is unavailable');
        }
        let targetSequence = this.#processSequence;
        for (const state of this.#scopes.values()) {
            const snapshot = this.#bridge.snapshot(state.scope, null);
            if (snapshot) {
                assertSchemaVersion(snapshot);
                if (scopeKey(snapshot.scope) !== scopeKey(state.scope)) {
                    throw new Error('Mobile Client snapshot scope does not match its selector');
                }
                targetSequence = Math.max(targetSequence, snapshot.sequence);
            }
        }
        if (targetSequence > this.#processSequence) {
            this.applyProcessBatch(await this.#bridge.waitForPublications(this.#processSequence));
        }
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

    #setThreadDemand(state: ScopeState, demand: 'visible' | 'suspended'): void {
        if (state.scope.kind !== 'thread' && state.scope.kind !== 'timeline') return;
        this.dispatch({
            schema_version: 1,
            intent: {
                kind: 'set_scope_demand',
                scope: state.scope,
                demand,
                generation: ++state.demandGeneration,
            },
        });
    }

    #scopeState(scope: ClientScope): ScopeState {
        const key = scopeKey(scope);
        const existing = this.#scopes.get(key);
        if (existing) {
            return existing;
        }

        const state = {} as ScopeState;
        state.scope = scope;
        const initialSnapshot = this.#closed ? null : this.#bridge.snapshot(scope, null);
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
        state.demandGeneration = 0;
        state.store = {
            subscribe: (listener) => {
                if (this.#closed) {
                    return () => {};
                }
                let subscribed = true;
                const registration = () => {
                    if (subscribed) {
                        listener();
                    }
                };
                const first = state.listeners.size === 0;
                state.listeners.add(registration);
                if (first) this.#setThreadDemand(state, 'visible');
                this.#startDelivery();
                return () => {
                    if (!subscribed) {
                        return;
                    }
                    subscribed = false;
                    state.listeners.delete(registration);
                    if (state.listeners.size === 0) this.#setThreadDemand(state, 'suspended');
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
