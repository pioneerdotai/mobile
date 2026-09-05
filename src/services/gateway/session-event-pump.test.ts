/* eslint-disable import/first */

import { afterEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/client', () => ({
    pioneerClient: {
        gatewayNextEvents: jest.fn(),
        gatewayDisconnect: jest.fn(),
    },
}));

jest.mock('./session-coordinator', () => ({
    ensureMobileGatewaySession: jest.fn(),
    markMobileGatewayConnectionDisconnected: jest.fn(),
    mobileSessionProjection: jest.fn(),
    mobileSessionRefreshDelayMs: jest.fn(),
    suspendMobileGatewaySession: jest.fn(),
    subscribeMobileSessionProjection: jest.fn(),
}));

jest.mock('@/stores/gateway', () => ({
    useGatewayStore: {
        getState: jest.fn(),
    },
}));

import { pioneerClient } from '@/client';
import type { ClientEvent } from '@/client';
import {
    startQualificationDiagnosticCapture,
    stopQualificationDiagnosticCapture,
} from '@/services/diagnostics/qualification';
import { resetGatewayEventPumpForTests, subscribeGatewayEvents } from './session';

const mockNextEvents = jest.mocked(pioneerClient.gatewayNextEvents);
const isolatedRunner = {
    runner_is_disposable: true,
    process_owned_by_run: true,
    credentials_absent: true,
    product_state_absent: true,
    network_denied: true,
} as const;

const deferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((next) => {
        resolve = next;
    });
    return { promise, resolve };
};

const flushPromises = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

afterEach(() => {
    resetGatewayEventPumpForTests();
    try {
        stopQualificationDiagnosticCapture(isolatedRunner);
    } catch {
        // The test may already have stopped the default-inactive capture.
    }
    jest.resetAllMocks();
});

describe('mobile Gateway event pump', () => {
    it('keeps one native poll and hands its result to the replacement subscriber', async () => {
        startQualificationDiagnosticCapture(isolatedRunner, 'counter_reconciliation', 20, 10_000);
        const pending = deferred<ClientEvent[]>();
        mockNextEvents.mockReturnValueOnce(pending.promise);
        const first = jest.fn<(event: ClientEvent) => void>();
        const second = jest.fn<(event: ClientEvent) => void>();

        const unsubscribeFirst = subscribeGatewayEvents(first, jest.fn());
        expect(mockNextEvents).toHaveBeenCalledTimes(1);

        unsubscribeFirst();
        let unsubscribeSecond = () => {};
        unsubscribeSecond = subscribeGatewayEvents((event) => {
            second(event);
            unsubscribeSecond();
        }, jest.fn());
        expect(mockNextEvents).toHaveBeenCalledTimes(1);

        const event: ClientEvent = { Error: { message: 'event from current transport' } };
        const eventAfterUnsubscribe: ClientEvent = {
            Error: { message: 'event with no active listener' },
        };
        pending.resolve([event, eventAfterUnsubscribe]);
        await flushPromises();

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledWith(event);
        expect(second).toHaveBeenCalledTimes(1);
        expect(mockNextEvents).toHaveBeenCalledTimes(1);

        const snapshot = stopQualificationDiagnosticCapture(isolatedRunner);
        expect(snapshot.records).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    event: expect.objectContaining({
                        series: 'client_delivery_measurement',
                        shell: 'mobile',
                        layer: 'mobile_binding',
                        scope: 'other',
                        measurement: 'batch_items',
                    }),
                    value: 2,
                }),
                expect.objectContaining({
                    event: expect.objectContaining({
                        series: 'client_delivery',
                        shell: 'mobile',
                        layer: 'mobile_binding',
                        scope: 'other',
                        action: 'received',
                        visibility: 'not_applicable',
                    }),
                }),
                expect.objectContaining({
                    event: expect.objectContaining({
                        series: 'client_delivery',
                        shell: 'mobile',
                        layer: 'mobile_binding',
                        scope: 'other',
                        action: 'delivered',
                        visibility: 'not_applicable',
                    }),
                }),
                expect.objectContaining({
                    event: expect.objectContaining({
                        series: 'client_delivery',
                        shell: 'mobile',
                        layer: 'mobile_binding',
                        scope: 'other',
                        action: 'dropped',
                        visibility: 'not_applicable',
                    }),
                }),
            ]),
        );
    });
});
