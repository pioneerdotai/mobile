/**
 * Qualification-only diagnostic accounting.
 *
 * No record contains payload text, paths, URLs, credentials, or domain IDs.
 * The module is inert until an isolated runner explicitly starts it, is bounded
 * by count and duration, permits one capture in a disposable process, and never
 * writes or sends its snapshot itself.
 */

export const QUALIFICATION_DIAGNOSTIC_SCHEMA_VERSION = 1 as const;
export const QUALIFICATION_MAX_RECORDS = 200_000;
export const QUALIFICATION_MAX_DURATION_MS = 120_000;

const qualificationScenarioValues = [
    'idle',
    'visible_animation',
    'visible_stream',
    'offscreen_stream',
    'one_row_change',
    'failure_loop',
    'callback_attribution',
    'counter_reconciliation',
    'profiler_overhead',
    'identical_replay',
    'ui_oracle_capture',
] as const;
const deliveryLayerValues = ['mobile_binding'] as const;
const deliveryScopeValues = [
    'thread',
    'workspace',
    'navigation',
    'composer',
    'provider',
    'administration',
    'mcp',
    'skills',
    'settings',
    'auth',
    'pending_request',
    'task_notification',
    'artifact',
    'avatar',
    'startup',
    'other',
] as const;
const deliveryActionValues = [
    'received',
    'delivered',
    'applied',
    'stale_discard',
    'dropped',
] as const;
const deliveryVisibilityValues = ['visible', 'offscreen', 'not_applicable'] as const;

export type QualificationScenario = (typeof qualificationScenarioValues)[number];
export type DeliveryLayer = (typeof deliveryLayerValues)[number];
export type DeliveryScope = (typeof deliveryScopeValues)[number];
export type DeliveryAction = (typeof deliveryActionValues)[number];
export type DeliveryVisibility = (typeof deliveryVisibilityValues)[number];

export type QualificationDiagnosticEvent =
    | {
          readonly series: 'client_delivery';
          readonly shell: 'mobile';
          readonly layer: DeliveryLayer;
          readonly scope: DeliveryScope;
          readonly action: DeliveryAction;
          readonly visibility: DeliveryVisibility;
      }
    | {
          readonly series: 'client_delivery_measurement';
          readonly shell: 'mobile';
          readonly layer: DeliveryLayer;
          readonly scope: DeliveryScope;
          readonly measurement: 'batch_items';
      };

export interface QualificationDiagnosticRecord {
    readonly elapsed_micros: number;
    readonly event: QualificationDiagnosticEvent;
    readonly value: number;
}

export interface QualificationDiagnosticSnapshot {
    readonly schema_version: typeof QUALIFICATION_DIAGNOSTIC_SCHEMA_VERSION;
    readonly scenario: QualificationScenario;
    readonly records: readonly QualificationDiagnosticRecord[];
    readonly dropped_records: number;
    readonly stopped_after_micros: number;
}

export interface QualificationIsolationAttestation {
    readonly runner_is_disposable: true;
    readonly process_owned_by_run: true;
    readonly credentials_absent: true;
    readonly product_state_absent: true;
    readonly network_denied: true;
}

interface CaptureState {
    scenario: QualificationDiagnosticSnapshot['scenario'];
    startedAt: number;
    maxRecords: number;
    maxDurationMs: number;
    records: QualificationDiagnosticRecord[];
    nextRecordIndex: number;
    recordsWrapped: boolean;
    droppedRecords: number;
    lastElapsedMicros: number;
    recordingStoppedAfterMicros: number | null;
}

let capture: CaptureState | null = null;
let captureConsumed = false;

const qualificationScenarios: ReadonlySet<string> = new Set(qualificationScenarioValues);
const deliveryLayers: ReadonlySet<string> = new Set(deliveryLayerValues);
const deliveryScopes: ReadonlySet<string> = new Set(deliveryScopeValues);
const deliveryActions: ReadonlySet<string> = new Set(deliveryActionValues);
const deliveryVisibilities: ReadonlySet<string> = new Set(deliveryVisibilityValues);

export const isQualificationDiagnosticCaptureActive = (): boolean =>
    capture !== null && capture.recordingStoppedAfterMicros === null;

const proveIsolation = (attestation: QualificationIsolationAttestation): void => {
    if (
        attestation.runner_is_disposable !== true ||
        attestation.process_owned_by_run !== true ||
        attestation.credentials_absent !== true ||
        attestation.product_state_absent !== true ||
        attestation.network_denied !== true
    ) {
        throw new Error('Qualification isolation was not proven');
    }
};

export const startQualificationDiagnosticCapture = (
    attestation: QualificationIsolationAttestation,
    scenario: QualificationDiagnosticSnapshot['scenario'],
    maxRecords: number,
    maxDurationMs: number,
): void => {
    proveIsolation(attestation);
    if (
        !Number.isSafeInteger(maxRecords) ||
        maxRecords <= 0 ||
        maxRecords > QUALIFICATION_MAX_RECORDS
    ) {
        throw new Error('Qualification diagnostic record limit is outside the bounded range');
    }
    if (
        !Number.isSafeInteger(maxDurationMs) ||
        maxDurationMs <= 0 ||
        maxDurationMs > QUALIFICATION_MAX_DURATION_MS
    ) {
        throw new Error('Qualification diagnostic duration is outside the bounded range');
    }
    if (!qualificationScenarios.has(scenario)) {
        throw new Error('Qualification diagnostic scenario is not recognized');
    }
    if (capture !== null) {
        throw new Error('Qualification diagnostic capture is already active');
    }
    if (captureConsumed) {
        throw new Error('Qualification diagnostic capture was already consumed by this process');
    }
    const startedAt = performance.now();
    if (!Number.isFinite(startedAt)) {
        throw new Error('Qualification diagnostic monotonic clock is unavailable');
    }
    captureConsumed = true;
    capture = {
        scenario,
        startedAt,
        maxRecords,
        maxDurationMs,
        records: [],
        nextRecordIndex: 0,
        recordsWrapped: false,
        droppedRecords: 0,
        lastElapsedMicros: 0,
        recordingStoppedAfterMicros: null,
    };
};

export const stopQualificationDiagnosticCapture = (
    attestation: QualificationIsolationAttestation,
): QualificationDiagnosticSnapshot => {
    proveIsolation(attestation);
    const state = capture;
    if (state === null) {
        throw new Error('Qualification diagnostic capture is not active');
    }
    capture = null;
    const orderedRecords = state.recordsWrapped
        ? state.records
              .slice(state.nextRecordIndex)
              .concat(state.records.slice(0, state.nextRecordIndex))
        : state.records.slice();
    const records = Object.freeze(orderedRecords);
    const stoppedElapsedMs = performance.now() - state.startedAt;
    const stoppedElapsedMicros = Number.isFinite(stoppedElapsedMs)
        ? Math.max(
              state.lastElapsedMicros,
              Math.max(0, Math.round(stoppedElapsedMs * 1_000)),
          )
        : state.lastElapsedMicros;
    return Object.freeze({
        schema_version: QUALIFICATION_DIAGNOSTIC_SCHEMA_VERSION,
        scenario: state.scenario,
        records,
        dropped_records: state.droppedRecords,
        stopped_after_micros: Math.min(
            state.maxDurationMs * 1_000,
            state.recordingStoppedAfterMicros ?? stoppedElapsedMicros,
        ),
    });
};

const incrementDroppedRecords = (state: CaptureState): void => {
    state.droppedRecords = Math.min(Number.MAX_SAFE_INTEGER, state.droppedRecords + 1);
};

const elapsedMicrosForRecord = (state: CaptureState): number | null => {
    const elapsedMs = performance.now() - state.startedAt;
    if (!Number.isFinite(elapsedMs)) {
        incrementDroppedRecords(state);
        state.recordingStoppedAfterMicros = state.lastElapsedMicros;
        return null;
    }
    // `performance.now()` is specified as monotonic, but preserve the capture
    // contract even if a runner supplies a regressing clock implementation.
    const elapsedMicros = Math.max(
        state.lastElapsedMicros,
        0,
        Math.round(elapsedMs * 1_000),
    );
    state.lastElapsedMicros = elapsedMicros;
    if (elapsedMicros >= state.maxDurationMs * 1_000) {
        incrementDroppedRecords(state);
        state.recordingStoppedAfterMicros = state.maxDurationMs * 1_000;
        return null;
    }
    return elapsedMicros;
};

const dropInvalidQualificationInput = (): void => {
    const state = capture;
    if (
        state !== null &&
        state.recordingStoppedAfterMicros === null &&
        elapsedMicrosForRecord(state) !== null
    ) {
        incrementDroppedRecords(state);
    }
};

const recordQualificationDiagnostic = (event: QualificationDiagnosticEvent, value = 1): void => {
    const state = capture;
    if (state === null) {
        return;
    }
    if (state.recordingStoppedAfterMicros !== null) {
        return;
    }
    const elapsedMicros = elapsedMicrosForRecord(state);
    if (elapsedMicros === null) {
        return;
    }
    if (!Number.isSafeInteger(value) || value < 0) {
        incrementDroppedRecords(state);
        return;
    }
    const record: QualificationDiagnosticRecord = Object.freeze({
        elapsed_micros: elapsedMicros,
        event: Object.freeze(event),
        value,
    });
    if (state.records.length < state.maxRecords) {
        state.records.push(record);
        return;
    }
    state.records[state.nextRecordIndex] = record;
    state.nextRecordIndex = (state.nextRecordIndex + 1) % state.maxRecords;
    state.recordsWrapped = true;
    incrementDroppedRecords(state);
};

export const recordMobileClientDelivery = (
    layer: DeliveryLayer,
    scope: DeliveryScope,
    action: DeliveryAction,
    visibility: DeliveryVisibility,
): void => {
    if (!isQualificationDiagnosticCaptureActive()) {
        return;
    }
    if (
        !deliveryLayers.has(layer) ||
        !deliveryScopes.has(scope) ||
        !deliveryActions.has(action) ||
        !deliveryVisibilities.has(visibility)
    ) {
        dropInvalidQualificationInput();
        return;
    }
    recordQualificationDiagnostic({
        series: 'client_delivery',
        shell: 'mobile',
        layer,
        scope,
        action,
        visibility,
    });
};

export const recordMobileClientBatchItems = (
    layer: DeliveryLayer,
    scope: DeliveryScope,
    value: number,
): void => {
    if (!isQualificationDiagnosticCaptureActive()) {
        return;
    }
    if (!deliveryLayers.has(layer) || !deliveryScopes.has(scope)) {
        dropInvalidQualificationInput();
        return;
    }
    recordQualificationDiagnostic(
        {
            series: 'client_delivery_measurement',
            shell: 'mobile',
            layer,
            scope,
            measurement: 'batch_items',
        },
        value,
    );
};
