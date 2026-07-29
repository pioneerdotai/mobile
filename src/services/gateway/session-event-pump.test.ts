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

import { pioneerClient } from '@/client';
import type { ClientEvent } from '@/client';
import { resetGatewayEventPumpForTests, subscribeGatewayEvents } from './session';

const mockNextEvents = jest.mocked(pioneerClient.gatewayNextEvents);

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
    jest.resetAllMocks();
});

describe('mobile Gateway event pump', () => {
    it('keeps one native poll and hands its result to the replacement subscriber', async () => {
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
        pending.resolve([event]);
        await flushPromises();

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledWith(event);
        expect(mockNextEvents).toHaveBeenCalledTimes(1);
    });
});
