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
    | 'ui.operational_frame'
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
const startupMonotonicOrigin = startupTiming?.startTime ?? 0;
const startupWallClockOrigin = Math.max(
    0,
    Math.round((performance.timeOrigin || Date.now() - now()) + startupMonotonicOrigin),
);

class MobileStartupTimeline {
    private readonly active = new Map<MobileStartupStageName, ActiveStage>();
    private readonly completed = new Map<MobileStartupStageName, MobileStartupStageTiming>();
    private finalized = false;
    private frameScheduled = false;

    constructor() {
        const runtimeStart = startupTiming?.initializeRuntimeStart;
        if (typeof runtimeStart === 'number' && runtimeStart >= startupMonotonicOrigin) {
            this.record(
                'native.launch',
                startupMonotonicOrigin,
                Math.max(runtimeStart, startupMonotonicOrigin),
            );
            const bundleEntry = startupTiming?.executeJavaScriptBundleEntryPointStart;
            this.record(
                'javascript.runtime',
                runtimeStart,
                Math.max(bundleEntry ?? now(), runtimeStart),
            );
        } else {
            this.record('native.launch', startupMonotonicOrigin, now());
            this.record('javascript.runtime', now(), now());
        }
    }

    begin(name: MobileStartupStageName): void {
        if (this.finalized || this.completed.has(name) || this.active.has(name)) {
            return;
        }
        this.active.set(name, { startedAt: now() });
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

    completeAfterOperationalFrame(
        outcome: MobileStartupOutcome,
        onReady: () => void | Promise<void>,
    ): void {
        if (this.finalized || this.frameScheduled) {
            return;
        }
        this.frameScheduled = true;
        this.begin('ui.operational_frame');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.succeed('ui.operational_frame');
                void this.revealAndFinalize(outcome, onReady);
            });
        });
    }

    completeWithFailure(outcome: MobileStartupOutcome, onReady: () => void | Promise<void>): void {
        if (this.finalized) {
            return;
        }
        void this.revealAndFinalize(outcome, onReady);
    }

    private async revealAndFinalize(
        outcome: MobileStartupOutcome,
        onReady: () => void | Promise<void>,
    ): Promise<void> {
        this.begin('splash.hide');
        try {
            await onReady();
            this.succeed('splash.hide');
            this.finalize(outcome);
        } catch {
            this.fail('splash.hide');
            this.finalize('degraded');
        }
    }

    private finishStage(name: MobileStartupStageName, outcome: 'ok' | 'error' | 'cancelled'): void {
        if (this.finalized || this.completed.has(name)) {
            return;
        }
        const active = this.active.get(name);
        if (!active) {
            return;
        }
        this.active.delete(name);
        const finishedAt = now();
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
        for (const name of [...this.active.keys()]) {
            this.cancel(name);
        }
        this.finalized = true;
        const finishedAt = now();
        const extra = (Constants.expoConfig?.extra?.telemetry ?? {}) as TelemetryExtra;
        const appVersion = Application.nativeApplicationVersion ?? Constants.expoConfig?.version;
        const buildVersion = Application.nativeBuildVersion;
        const request: MobileStartupRecordRequest = {
            enabled: extra.enabled !== false,
            metrics_endpoint:
                extra.metricsEndpoint ?? 'https://telemetry.getpioneer.dev/v1/metrics',
            traces_endpoint: extra.tracesEndpoint ?? 'https://telemetry.getpioneer.dev/v1/traces',
            export_interval_ms: 30_000,
            export_timeout_ms: 3_000,
            deployment_environment: extra.environment ?? 'production',
            ...(appVersion
                ? { service_version: buildVersion ? `${appVersion}+${buildVersion}` : appVersion }
                : {}),
            started_at_unix_ms: startupWallClockOrigin,
            duration_ms: Math.max(0, finishedAt - startupMonotonicOrigin),
            outcome,
            stages: [...this.completed.values()],
        };

        setTimeout(() => {
            try {
                pioneerClient.mobileStartupRecord(request);
            } catch {
                // Startup telemetry must never affect application readiness.
            }
        }, 0);
    }
}

export const mobileStartup = new MobileStartupTimeline();
