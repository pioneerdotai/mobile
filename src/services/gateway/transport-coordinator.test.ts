import { describe, expect, it, jest } from '@jest/globals';

import {
    acquireGatewayTransportLease,
    runGatewayTransportTransition,
} from './transport-coordinator';

const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
};

describe('Gateway transport coordinator', () => {
    it('waits for an active interaction before replacing the transport', async () => {
        const release = await acquireGatewayTransportLease();
        const operation = jest.fn(async () => 'connected');
        const transition = runGatewayTransportTransition(operation);

        await Promise.resolve();
        expect(operation).not.toHaveBeenCalled();

        release();
        await expect(transition).resolves.toBe('connected');
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('holds a new interaction until the current transition completes', async () => {
        const gate = deferred();
        const started = deferred();
        const transition = runGatewayTransportTransition(async () => {
            started.resolve();
            await gate.promise;
        });
        await started.promise;

        let leaseAcquired = false;
        const lease = acquireGatewayTransportLease().then((release) => {
            leaseAcquired = true;
            return release;
        });
        await Promise.resolve();
        expect(leaseAcquired).toBe(false);

        gate.resolve();
        await transition;
        const release = await lease;
        expect(leaseAcquired).toBe(true);
        release();
    });
});
