import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ThreadOpeningTimeline, type ThreadOpeningSample } from './thread-opening-timeline';
import {
    threadOpeningReadinessOutcome,
    type ThreadOpeningReadiness,
} from './thread-opening-readiness';

const scope = { gatewayId: 'gateway', connectionId: 1, workspaceId: 'workspace' };
const ready: ThreadOpeningReadiness = {
    focused: true,
    connected: true,
    composerBusy: false,
    snapshotMatches: true,
    composerMatches: true,
    screenLoading: false,
    screenError: false,
    authorizationReady: true,
    authorizationFailed: false,
    authorizationCancelled: false,
    composerDisabled: false,
    messageMode: false,
    modelSelectionComplete: true,
    modelSelectionLoading: false,
    runtimeLoading: false,
    runtimeFailed: false,
    runtimeCancelled: false,
    providerReady: true,
};

beforeEach(() => {
    jest.useFakeTimers();
});
afterEach(() => {
    jest.useRealTimers();
});

describe('thread opening boundaries', () => {
    it.each(['new', 'existing'])(
        'starts %s at action, claims it before data, and records once',
        (target) => {
            const reports: ThreadOpeningSample[] = [];
            let now = 10;
            const timeline = new ThreadOpeningTimeline(
                (sample) => reports.push(sample),
                () => now,
                () => 1000,
            );
            const action = timeline.begin(target, scope);
            now = 30;
            expect(timeline.claim(target, scope)).toBe(action);
            now = 75;
            timeline.observe(action, scope, 'ready');
            timeline.finish(action, 'degraded');
            expect(reports).toEqual([
                {
                    kind: 'thread_open',
                    started_at_unix_ms: 1000,
                    duration_ms: 65,
                    outcome: 'ready',
                    stages: [],
                },
            ]);
        },
    );
    it('cancels replaced, hidden and changed scopes; ignores late and repeated completions', () => {
        const reports: ThreadOpeningSample[] = [];
        const timeline = new ThreadOpeningTimeline(
            (sample) => reports.push(sample),
            () => 0,
            () => 1000,
        );
        const first = timeline.claim('existing', scope);
        const next = timeline.claim('new', scope);
        timeline.observe(first, scope, 'ready');
        timeline.observe(next, { ...scope, connectionId: 2 }, 'ready');
        timeline.finish(next, 'ready');
        const third = timeline.claim('existing', scope);
        timeline.finish(third, 'cancelled');
        timeline.observe(third, scope, 'ready');
        expect(reports.map((sample) => sample.outcome)).toEqual([
            'cancelled',
            'cancelled',
            'cancelled',
        ]);
    });
    it('bounds lifetime without sleeping and uses monotonic elapsed time', () => {
        const reports: ThreadOpeningSample[] = [];
        let now = 0;
        const timeline = new ThreadOpeningTimeline(
            (sample) => reports.push(sample),
            () => now,
            () => 1000,
        );
        timeline.claim('existing', scope);
        now = 590_000;
        jest.advanceTimersByTime(590_000);
        expect(reports[0]).toMatchObject({ duration_ms: 590_000, outcome: 'cancelled' });
    });
});

describe('observed screen and composer readiness', () => {
    it('accepts an empty Message composer without models or runtime', () => {
        expect(
            threadOpeningReadinessOutcome({
                ...ready,
                messageMode: true,
                modelSelectionComplete: false,
                modelSelectionLoading: true,
                runtimeLoading: true,
                providerReady: false,
            }),
        ).toBe('ready');
    });
    it('waits for the actual screen, draft, authorization and necessary runtime', () => {
        for (const patch of [
            { snapshotMatches: false },
            { composerMatches: false },
            { screenLoading: true },
            { authorizationReady: false },
            { runtimeLoading: true },
            { modelSelectionLoading: true },
        ]) {
            expect(threadOpeningReadinessOutcome({ ...ready, ...patch })).toBeNull();
        }
        expect(threadOpeningReadinessOutcome(ready)).toBe('ready');
    });
    it('never succeeds for a hidden, disabled or failed screen', () => {
        expect(threadOpeningReadinessOutcome({ ...ready, focused: false })).toBeNull();
        expect(threadOpeningReadinessOutcome({ ...ready, composerDisabled: true })).toBe(
            'degraded',
        );
        expect(threadOpeningReadinessOutcome({ ...ready, runtimeFailed: true })).toBe('degraded');
        expect(threadOpeningReadinessOutcome({ ...ready, authorizationCancelled: true })).toBe(
            'cancelled',
        );
        expect(threadOpeningReadinessOutcome({ ...ready, modelSelectionComplete: false })).toBe(
            'setup_required',
        );
    });
});
