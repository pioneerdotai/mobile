import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
    QUALIFICATION_MAX_DURATION_MS,
    QUALIFICATION_MAX_RECORDS,
    isQualificationDiagnosticCaptureActive,
    recordMobileClientBatchItems,
    recordMobileClientDelivery,
    startQualificationDiagnosticCapture,
    stopQualificationDiagnosticCapture,
} from './qualification';

const isolatedRunner = {
    runner_is_disposable: true,
    process_owned_by_run: true,
    credentials_absent: true,
    product_state_absent: true,
    network_denied: true,
} as const;

afterEach(() => {
    try {
        stopQualificationDiagnosticCapture(isolatedRunner);
    } catch {
        // The test may already have stopped its capture or never started one.
    }
    jest.restoreAllMocks();
});

describe('qualification diagnostic capture', () => {
    it('is bounded, private, default-inactive, and single-use per process', () => {
        expect(isQualificationDiagnosticCaptureActive()).toBe(false);
        recordMobileClientDelivery('mobile_binding', 'thread', 'received', 'visible');
        recordMobileClientBatchItems('mobile_binding', 'other', 1);

        expect(() =>
            startQualificationDiagnosticCapture(
                { ...isolatedRunner, network_denied: false } as never,
                'idle',
                10,
                1_000,
            ),
        ).toThrow('Qualification isolation was not proven');
        expect(() =>
            startQualificationDiagnosticCapture(
                isolatedRunner,
                'idle',
                QUALIFICATION_MAX_RECORDS + 1,
                1_000,
            ),
        ).toThrow('Qualification diagnostic record limit is outside the bounded range');
        expect(() =>
            startQualificationDiagnosticCapture(
                isolatedRunner,
                'idle',
                10,
                QUALIFICATION_MAX_DURATION_MS + 1,
            ),
        ).toThrow('Qualification diagnostic duration is outside the bounded range');
        expect(() =>
            startQualificationDiagnosticCapture(isolatedRunner, 'unknown' as never, 10, 1_000),
        ).toThrow('Qualification diagnostic scenario is not recognized');

        const now = jest.spyOn(performance, 'now').mockReturnValueOnce(100).mockReturnValue(100.1);
        startQualificationDiagnosticCapture(isolatedRunner, 'visible_stream', 2, 1);
        expect(isQualificationDiagnosticCaptureActive()).toBe(true);
        recordMobileClientDelivery('foreign_binding' as never, 'thread', 'received', 'visible');
        recordMobileClientDelivery(
            'mobile_binding',
            'foreign_scope' as never,
            'received',
            'visible',
        );
        recordMobileClientDelivery(
            'mobile_binding',
            'thread',
            'foreign_action' as never,
            'visible',
        );
        recordMobileClientDelivery(
            'mobile_binding',
            'thread',
            'received',
            'foreign_visibility' as never,
        );
        recordMobileClientBatchItems('foreign_binding' as never, 'other', 1);
        recordMobileClientBatchItems('mobile_binding', 'foreign_scope' as never, 1);
        recordMobileClientDelivery('mobile_binding', 'thread', 'received', 'visible');
        recordMobileClientBatchItems('mobile_binding', 'other', Number.NaN);
        now.mockReturnValue(100.05);
        recordMobileClientDelivery('mobile_binding', 'thread', 'delivered', 'visible');
        now.mockReturnValue(100.2);
        recordMobileClientDelivery('mobile_binding', 'thread', 'applied', 'visible');
        now.mockReturnValue(102);
        recordMobileClientDelivery('mobile_binding', 'thread', 'received', 'visible');
        expect(isQualificationDiagnosticCaptureActive()).toBe(false);
        now.mockReturnValue(99);

        const snapshot = stopQualificationDiagnosticCapture(isolatedRunner);
        expect(isQualificationDiagnosticCaptureActive()).toBe(false);

        expect(Object.isFrozen(snapshot)).toBe(true);
        expect(Object.isFrozen(snapshot.records)).toBe(true);
        expect(Object.isFrozen(snapshot.records[0])).toBe(true);
        expect(Object.isFrozen(snapshot.records[0]?.event)).toBe(true);
        expect(snapshot.records).toHaveLength(2);
        expect(
            snapshot.records.map(({ event }) => ('action' in event ? event.action : null)),
        ).toEqual(['delivered', 'applied']);
        expect(snapshot.records.map(({ elapsed_micros }) => elapsed_micros)).toEqual([100, 200]);
        expect(snapshot.dropped_records).toBe(9);
        expect(snapshot.stopped_after_micros).toBe(1_000);
        const serialized = JSON.stringify(snapshot);
        expect(serialized).not.toContain('payload');
        expect(serialized).not.toContain('credential');
        expect(() =>
            startQualificationDiagnosticCapture(isolatedRunner, 'idle', 10, 1_000),
        ).toThrow('Qualification diagnostic capture was already consumed by this process');
    });
});
