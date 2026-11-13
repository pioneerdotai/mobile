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
    composerPolicyApplied: true,
    messageMode: false,
    modelSelectionComplete: true,
    modelSelectionLoading: false,
    runtimeState: 'ready',
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
    it('notifies active-token observers once on finish and releases them', () => {
        const timeline = new ThreadOpeningTimeline(
            () => {},
            () => 0,
            () => 1000,
        );
        const token = timeline.claim('existing', scope);
        const changed = jest.fn();
        const release = timeline.subscribe(changed);
        expect(timeline.isCurrent(token)).toBe(true);
        timeline.finish(token, 'ready');
        timeline.finish(token, 'cancelled');
        expect(timeline.isCurrent(token)).toBe(false);
        expect(changed).toHaveBeenCalledTimes(1);
        release();
        timeline.claim('new', scope);
        expect(changed).toHaveBeenCalledTimes(1);
        timeline.finish(token + 1, 'cancelled');
    });
    it('captures the end timestamp before releasing observers', () => {
        let now = 10;
        const reports: ThreadOpeningSample[] = [];
        const timeline = new ThreadOpeningTimeline(
            (sample) => reports.push(sample),
            () => now,
            () => 1000,
        );
        const token = timeline.claim('existing', scope);
        const release = timeline.subscribe(() => {
            now += 100;
        });
        now = 60;
        timeline.finish(token, 'ready');
        release();
        expect(reports[0].duration_ms).toBe(50);
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
                runtimeState: 'pending',
            }),
        ).toBe('ready');
    });
    it('waits for the actual screen, draft, authorization and necessary runtime', () => {
        for (const patch of [
            { snapshotMatches: false },
            { composerMatches: false },
            { screenLoading: true },
            { authorizationReady: false },
            { runtimeState: 'pending' as const },
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
        expect(threadOpeningReadinessOutcome({ ...ready, runtimeState: 'degraded' })).toBe(
            'degraded',
        );
        expect(threadOpeningReadinessOutcome({ ...ready, authorizationCancelled: true })).toBe(
            'cancelled',
        );
        expect(threadOpeningReadinessOutcome({ ...ready, modelSelectionComplete: false })).toBe(
            'setup_required',
        );
    });
});
