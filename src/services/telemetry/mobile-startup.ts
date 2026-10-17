import Constants from 'expo-constants';
import * as Application from 'expo-application';

import { pioneerClient } from '@/client';
import type { MobileStartupRecordRequest, MobileStartupStageTiming } from '@/client';

export type MobileStartupStageName =
    | 'native.launch'
    | 'javascript.runtime'
    | 'fonts.load'
    | 'client.initialize'
    | 'gateway_registry.hydrate'
    | 'navigation.mount'
    | 'gateway_session.connect'
    | 'gateway_session.connect_attempt'
    | 'gateway_session.identity_verify'
    | 'authorization.load'
    | 'authorization.registry.load'
    | 'authorization.credentials.load'
    | 'authorization.refresh_intent.persist'
    | 'authorization.refresh.request'
    | 'authorization.credentials.persist'
    | 'workspace.load'
    | 'thread_tree.load'
    | 'thread_tree.request'
    | 'thread_tree.response.apply'
    | 'composer.prepare'
    | 'ui.shell_frame'
    | 'splash.hide';

export type MobileStartupOutcome = MobileStartupRecordRequest['outcome'];

type ActiveStage = {
    startedAt: number;
};

type ReactNativeStartupTiming = {
    startTime?: number;
    initializeRuntimeStart?: number;
    executeJavaScriptBundleEntryPointStart?: number;
};

type TelemetryExtra = {
    enabled?: boolean;
    environment?: 'development' | 'production';
    metricsEndpoint?: string;
    tracesEndpoint?: string;
};

const now = (): number => performance.now();
const startupTiming = (performance as Performance & { rnStartupTiming?: ReactNativeStartupTiming })
    .rnStartupTiming;
const observedAt = now();
const nativeOrigin = startupTiming?.startTime;
const startupMonotonicOrigin =
    typeof nativeOrigin === 'number' &&
    Number.isFinite(nativeOrigin) &&
    nativeOrigin >= 0 &&
    nativeOrigin <= observedAt
        ? nativeOrigin
        : observedAt;
const startupWallClockOrigin = Math.max(
    0,
    Math.round((performance.timeOrigin || Date.now() - now()) + startupMonotonicOrigin),
);

export class MobileStartupTimeline {
    private readonly active = new Map<MobileStartupStageName, ActiveStage>();
    private readonly completed = new Map<MobileStartupStageName, MobileStartupStageTiming>();
    private finalized = false;
    private readonly listeners = new Set<() => void>();
    isFinalized = (): boolean => this.finalized;
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };
    private frameScheduled = false;
    private shellRevealed = false;
    private pendingOutcome: MobileStartupOutcome | null = null;
    private readonly deadline: ReturnType<typeof setTimeout>;

    constructor() {
        // Stay below the existing FFI ten-minute limit, including native time.
        this.deadline = setTimeout(
            () => this.finalize('cancelled'),
            Math.max(0, 590_000 - (now() - startupMonotonicOrigin)),
        );
        const runtimeStart = startupTiming?.initializeRuntimeStart;
        const bundleEntry = startupTiming?.executeJavaScriptBundleEntryPointStart;
        if (
            typeof nativeOrigin === 'number' &&
            nativeOrigin === startupMonotonicOrigin &&
            typeof runtimeStart === 'number' &&
            Number.isFinite(runtimeStart) &&
            runtimeStart >= startupMonotonicOrigin &&
            runtimeStart <= observedAt
        ) {
            this.record('native.launch', startupMonotonicOrigin, runtimeStart);
            if (
                typeof bundleEntry === 'number' &&
                Number.isFinite(bundleEntry) &&
                bundleEntry >= runtimeStart &&
                bundleEntry <= observedAt
            ) {
                this.record('javascript.runtime', runtimeStart, bundleEntry);
            }
        }
        // No fabricated native/runtime stages when RN timing is unavailable.
    }

    complete(outcome: MobileStartupOutcome): void {
        if (this.finalized || this.pendingOutcome) return;
        this.pendingOutcome = outcome;
        if (this.shellRevealed) this.finalize(outcome);
    }

    begin(name: MobileStartupStageName): void {
        if (this.finalized || this.completed.has(name) || this.active.has(name)) {
            return;
        }
        this.active.set(name, { startedAt: now() });
    }

    beginNativeStage(name: MobileStartupStageName, startedAtUnixMs: number): void {
        const offset = startedAtUnixMs - startupWallClockOrigin;
        if (
            this.finalized ||
            !Number.isFinite(offset) ||
            offset < 0 ||
            offset > now() - startupMonotonicOrigin
        )
            return;
        this.completed.delete(name);
        this.active.set(name, { startedAt: startupMonotonicOrigin + offset });
    }

    recordNativeStage(
        name: MobileStartupStageName,
        timing: { started_at_unix_ms: number; duration_ms: number },
        outcome: 'succeeded' | 'failed' | 'cancelled',
    ): void {
        if (this.finalized) return;
        const offset = timing.started_at_unix_ms - startupWallClockOrigin;
        if (
            !Number.isFinite(offset) ||
            !Number.isFinite(timing.duration_ms) ||
            offset < 0 ||
            timing.duration_ms < 0 ||
            offset + timing.duration_ms > now() - startupMonotonicOrigin
        )
            return;
        // Keep the latest real attempt per stage, bounded by the fixed stage set.
        this.active.delete(name);
        this.completed.set(name, {
            name,
            start_offset_ms: Math.max(0, timing.started_at_unix_ms - startupWallClockOrigin),
            duration_ms: Math.max(0, timing.duration_ms),
            failed: outcome === 'failed',
            cancelled: outcome === 'cancelled',
        });
    }

    succeed(name: MobileStartupStageName): void {
        this.finishStage(name, 'ok');
    }

    fail(name: MobileStartupStageName): void {
        this.finishStage(name, 'error');
    }

    cancel(name: MobileStartupStageName): void {
        this.finishStage(name, 'cancelled');
    }

    revealAfterShellFrame(onReady: () => void | Promise<void>): void {
        if (this.frameScheduled) {
            return;
        }
        this.frameScheduled = true;
        this.begin('ui.shell_frame');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.succeed('ui.shell_frame');
                void this.revealShell(onReady);
            });
        });
    }

    completeWithFailure(outcome: MobileStartupOutcome, onReady: () => void | Promise<void>): void {
        this.pendingOutcome = outcome;
        void this.revealShell(onReady);
    }

    private async revealShell(onReady: () => void | Promise<void>): Promise<void> {
        this.begin('splash.hide');
        try {
            await onReady();
            this.succeed('splash.hide');
            this.shellRevealed = true;
            if (this.pendingOutcome) this.finalize(this.pendingOutcome);
        } catch {
            this.fail('splash.hide');
            this.finalize('degraded');
        }
    }

    private finishStage(
        name: MobileStartupStageName,
        outcome: 'ok' | 'error' | 'cancelled',
        finishedAt = now(),
    ): void {
        if (this.finalized || this.completed.has(name)) {
            return;
        }
        const active = this.active.get(name);
        if (!active) {
            return;
        }
        this.active.delete(name);
        this.completed.set(name, {
            name,
            start_offset_ms: Math.max(0, active.startedAt - startupMonotonicOrigin),
            duration_ms: Math.max(0, finishedAt - active.startedAt),
            failed: outcome === 'error',
            cancelled: outcome === 'cancelled',
        });
    }

    private record(name: MobileStartupStageName, startedAt: number, finishedAt: number): void {
        this.completed.set(name, {
            name,
            start_offset_ms: Math.max(0, startedAt - startupMonotonicOrigin),
            duration_ms: Math.max(0, finishedAt - startedAt),
            failed: false,
            cancelled: false,
        });
    }

    private finalize(outcome: MobileStartupOutcome): void {
        if (this.finalized) {
            return;
        }
        // Preserve every stage that was in flight when a valid terminal
        // startup branch was reached. These stages did not fail; setup/auth
        // UI simply made them unnecessary for this launch.
        const observedEnd = now();
        const finishedAt = Math.min(observedEnd, startupMonotonicOrigin + 590_000);
        if (observedEnd - startupMonotonicOrigin > 590_000) outcome = 'cancelled';
        for (const name of [...this.active.keys()]) {
            this.finishStage(name, 'cancelled', finishedAt);
        }
        this.finalized = true;
        clearTimeout(this.deadline);
        for (const listener of this.listeners) listener();
        recordMobileMeasurement({
            started_at_unix_ms: startupWallClockOrigin,
            duration_ms: Math.min(590_000, Math.max(0, finishedAt - startupMonotonicOrigin)),
            outcome,
            // The bounded observation ends at the deadline even if the JS task
            // that delivers it was delayed. Stages crossing it are cancelled.
            stages: [...this.completed.values()].flatMap((stage) => {
                const remaining = finishedAt - startupMonotonicOrigin - stage.start_offset_ms;
                if (remaining < 0) return [];
                return [
                    {
                        ...stage,
                        duration_ms: Math.min(stage.duration_ms, remaining),
                        ...(stage.duration_ms > remaining
                            ? { failed: false, cancelled: true }
                            : {}),
                    },
                ];
            }),
        });
    }
}

// One bounded report path and one Rust exporter for both lifecycle measurements.
export const recordMobileMeasurement = (
    sample: Pick<
        MobileStartupRecordRequest,
        'kind' | 'started_at_unix_ms' | 'duration_ms' | 'outcome' | 'stages'
    >,
): void => {
    const extra = (Constants.expoConfig?.extra?.telemetry ?? {}) as TelemetryExtra;
    const appVersion = Application.nativeApplicationVersion ?? Constants.expoConfig?.version;
    const buildVersion = Application.nativeBuildVersion;
    const request: MobileStartupRecordRequest = {
        enabled: extra.enabled !== false,
        metrics_endpoint: extra.metricsEndpoint ?? 'https://telemetry.getpioneer.dev/v1/metrics',
        traces_endpoint: extra.tracesEndpoint ?? 'https://telemetry.getpioneer.dev/v1/traces',
        export_interval_ms: 30_000,
        export_timeout_ms: 15_000,
        deployment_environment: extra.environment ?? 'production',
        ...(appVersion
            ? { service_version: buildVersion ? `${appVersion}+${buildVersion}` : appVersion }
            : {}),
        ...sample,
    };
    setTimeout(() => {
        try {
            const result = pioneerClient.mobileStartupRecord(request);
            if (request.enabled && !result.recorded)
                console.warn('Mobile telemetry report was not recorded');
        } catch {
            // Fixed diagnostic only: no payload, raw error or recursive telemetry.
            console.warn('Mobile telemetry report was rejected');
        }
    }, 0);
};

export const mobileStartup = new MobileStartupTimeline();
