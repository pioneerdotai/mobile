import type { ClientEffectPlan } from './generated/client_effect_plan';
import type {
    ClientProcessChangeBatchDto,
    TimelineChangeSet,
} from './generated/client_process_change_batch_dto';
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
    listeners: Set<Listener>;
    store: MobileClientScopeStore;
};

const optionalIdentity = (value: string | null | undefined): string =>
    JSON.stringify(value ?? null);

const scopeKey = (scope: ClientScope): string => {
    switch (scope.kind) {
        case 'administration_page':
            return `${scope.kind}:${scope.page.kind}:${scope.page.kind === 'workspace_members' ? JSON.stringify(scope.page.workspace_id) : ''}`;
        case 'provider_collection':
            return `${scope.kind}:${JSON.stringify([scope.key.workspace_id, scope.key.collection.kind, ...(scope.key.collection.kind === 'models' ? [scope.key.collection.provider, scope.key.collection.purpose] : [])])}`;
        case 'provider_operation':
        case 'provider_runtime':
        case 'task_inbox':
        case 'workspace_tree':
        case 'administration':
        case 'mcp':
        case 'skills':
            return `${scope.kind}:${optionalIdentity(scope.workspace_id)}`;
        case 'task':
            return `${scope.kind}:${optionalIdentity(scope.task_id)}`;
        case 'approval_action':
            return `${scope.kind}:${JSON.stringify([scope.thread_id, scope.request_id])}`;
        case 'task_review':
            return `${scope.kind}:${JSON.stringify([scope.thread_id, scope.candidate_id])}`;
        case 'thread':
        case 'timeline':
        case 'composer':
        case 'turn_cancellation':
        case 'composer_model_picker':
        case 'composer_catalog':
        case 'message_deletion':
        case 'message_revisions':
        case 'thread_capability':
        case 'thread_member':
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
        case 'administration_operation':
        case 'onboarding_invitation':
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
    previousPayload: unknown,
): { payload: unknown; rows: Map<string, MobileClientRow> } => {
    if (typeof payload !== 'object' || payload === null) {
        return { payload, rows: new Map() };
    }
    const record = payload as Record<string, unknown>;
    const previous = previousPayload as Record<string, unknown> | null;
    const rows = new Map<string, MobileClientRow>();
    const next = { ...record };
    for (const field of ['rows', 'members', 'invitations', 'runtimes', 'providers', 'models']) {
        const values = record[field];
        if (!Array.isArray(values) || !values.every(isMobileClientRow)) continue;
        const memoized = values.map((row) => {
            const key = JSON.stringify([field, row.id, row.revision]);
            const stable = previousRows.get(key) ?? freezeSnapshotValue(row);
            rows.set(key, stable);
            return stable;
        });
        const old = previous?.[field];
        next[field] =
            Array.isArray(old) &&
            old.length === memoized.length &&
            old.every((row, i) => row === memoized[i])
                ? old
                : memoized;
    }
    return { payload: next, rows };
};

type TimelineValue = { revision: number; generation: number; rows: MobileClientRow[] };

// Transport replacement semantics only: every row value and revision comes from Client.
const timelineReplacementRows = (
    previous: unknown,
    snapshot: ClientScopedSnapshotDto,
    delta: TimelineChangeSet,
): MobileClientRow[] | null => {
    const current = previous as TimelineValue | null | undefined;
    const header = snapshot.payload as Omit<TimelineValue, 'rows'> | null;
    if (
        !current ||
        !header ||
        current.revision !== delta.from_revision ||
        current.generation !== delta.generation ||
        header.generation !== delta.generation ||
        header.revision !== delta.to_revision ||
        snapshot.revisions.scoped !== delta.to_revision ||
        delta.to_revision <= delta.from_revision ||
        !Array.isArray(current.rows)
    )
        return null;
    const rows = new Map(current.rows.map((row) => [row.id, row]));
    if (rows.size !== current.rows.length) return null;
    const touched = new Set<string>();
    for (const id of delta.removed) {
        if (touched.has(id) || !rows.delete(id)) return null;
        touched.add(id);
    }
    for (const row of delta.inserted) {
        if (!isMobileClientRow(row) || touched.has(row.id) || rows.has(row.id)) return null;
        touched.add(row.id);
        rows.set(row.id, row);
    }
    for (const row of delta.replaced) {
        const previous = rows.get(row.id);
        if (
            !isMobileClientRow(row) ||
            touched.has(row.id) ||
            !previous ||
            row.revision <= previous.revision
        )
            return null;
        touched.add(row.id);
        rows.set(row.id, row);
    }
    if (!delta.order && (delta.inserted.length || delta.removed.length)) return null;
    const order = delta.order ?? current.rows.map((row) => row.id);
    if (
        new Set(order).size !== rows.size ||
        order.length !== rows.size ||
        order.some((id) => !rows.has(id))
    )
        return null;
    return order.map((id) => rows.get(id)!);
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
    #demandGeneration = 0;
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
        let sequenceGap = false;
        for (const change of batch.changes) {
            if (!batch.resnapshot && (change.predecessor ?? 0) !== validatedSequence) {
                sequenceGap = true;
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
        if (sequenceGap) {
            // Recover each retained scope from Client; install all values before observers run.
            const replacements = [...this.#scopes.values()].map((state) => {
                const snapshot = this.#bridge.resnapshot(
                    state.scope,
                    batch.changes[0]?.predecessor ?? null,
                    state.lastAppliedSequence,
                );
                if (snapshot) {
                    assertSchemaVersion(snapshot);
                    if (scopeKey(snapshot.scope) !== scopeKey(state.scope))
                        throw new Error('Client resnapshot scope mismatch');
                }
                return { state, snapshot };
            });
            const changed = new Set<ScopeState>();
            for (const { state, snapshot } of replacements) {
                const previous = state.snapshot;
                if (snapshot) this.#applySnapshot(state, snapshot, false);
                else {
                    state.snapshot = null;
                    state.rows.clear();
                }
                state.lastAppliedSequence = Math.max(
                    state.lastAppliedSequence ?? 0,
                    snapshot?.sequence ?? 0,
                    batch.sequence,
                );
                if (state.snapshot !== previous) changed.add(state);
            }
            this.#processSequence = batch.sequence;
            this.#effects?.(batch.effects ?? []);
            for (const state of changed) for (const listener of [...state.listeners]) listener();
            return;
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
                const delta =
                    snapshot.scope.kind === 'timeline'
                        ? change.timeline_changes?.find(
                              (delta) =>
                                  delta.thread_id ===
                                  (snapshot.scope as Extract<ClientScope, { kind: 'timeline' }>)
                                      .thread_id,
                          )
                        : undefined;
                if (delta && !batch.resnapshot) {
                    if ((state.lastAppliedSequence ?? 0) >= snapshot.sequence) continue;
                    const rows = timelineReplacementRows(state.snapshot?.payload, snapshot, delta);
                    if (rows) {
                        this.#applySnapshot(
                            state,
                            { ...snapshot, payload: { ...(snapshot.payload as object), rows } },
                            false,
                        );
                    } else {
                        const fresh = this.#bridge.resnapshot(
                            state.scope,
                            change.predecessor ?? null,
                            state.lastAppliedSequence,
                        );
                        if (fresh) {
                            assertSchemaVersion(fresh);
                            if (scopeKey(fresh.scope) !== scopeKey(state.scope))
                                throw new Error('Timeline resnapshot scope mismatch');
                            this.#applySnapshot(state, fresh, false);
                        } else {
                            state.snapshot = null;
                            state.rows.clear();
                        }
                    }
                } else this.#applySnapshot(state, snapshot, false);
                state.lastAppliedSequence = Math.max(
                    state.lastAppliedSequence ?? 0,
                    state.snapshot?.sequence ?? 0,
                    snapshot.sequence,
                );
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

    #setScopeDemand(state: ScopeState, demand: 'visible' | 'suspended'): void {
        if (
            state.scope.kind !== 'thread' &&
            state.scope.kind !== 'timeline' &&
            state.scope.kind !== 'avatar' &&
            state.scope.kind !== 'task_inbox' &&
            state.scope.kind !== 'task_review' &&
            state.scope.kind !== 'composer' &&
            state.scope.kind !== 'composer_catalog' &&
            state.scope.kind !== 'composer_model_picker' &&
            state.scope.kind !== 'approval_action' &&
            state.scope.kind !== 'message_deletion' &&
            state.scope.kind !== 'message_revisions' &&
            state.scope.kind !== 'turn_cancellation' &&
            state.scope.kind !== 'thread_capability' &&
            state.scope.kind !== 'thread_member' &&
            state.scope.kind !== 'artifact' &&
            state.scope.kind !== 'workspace_tree'
        )
            return;
        this.dispatch({
            schema_version: 1,
            intent: {
                kind: 'set_scope_demand',
                scope: state.scope,
                demand,
                generation: ++this.#demandGeneration,
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
                if (first && !this.#scopes.has(key)) {
                    this.#scopes.set(key, state);
                    this.#resnapshot(state.scope, state, null, state.lastAppliedSequence ?? 0);
                }
                state.listeners.add(registration);
                if (first) this.#setScopeDemand(state, 'visible');
                this.#startDelivery();
                return () => {
                    if (!subscribed) {
                        return;
                    }
                    subscribed = false;
                    state.listeners.delete(registration);
                    if (state.listeners.size === 0) {
                        this.#setScopeDemand(state, 'suspended');
                        if (
                            state.scope.kind === 'avatar' ||
                            state.scope.kind === 'task_inbox' ||
                            state.scope.kind === 'task_review' ||
                            state.scope.kind === 'composer' ||
                            state.scope.kind === 'composer_catalog' ||
                            state.scope.kind === 'composer_model_picker' ||
                            state.scope.kind === 'approval_action' ||
                            state.scope.kind === 'message_deletion' ||
                            state.scope.kind === 'message_revisions' ||
                            state.scope.kind === 'turn_cancellation' ||
                            state.scope.kind === 'thread_capability' ||
                            state.scope.kind === 'thread_member' ||
                            state.scope.kind === 'artifact'
                        ) {
                            state.snapshot = null;
                            state.rows.clear();
                            this.#scopes.delete(key);
                        }
                    }
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
        const previousGeneration = (state.snapshot?.payload as { generation?: number } | null)
            ?.generation;
        const incomingGeneration = (snapshot.payload as { generation?: number } | null)?.generation;
        const memoized = memoizeRows(
            snapshot.payload,
            previousGeneration === incomingGeneration ? state.rows : new Map(),
            previousGeneration === incomingGeneration ? state.snapshot?.payload : null,
        );
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
