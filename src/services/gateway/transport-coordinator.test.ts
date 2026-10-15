import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { pioneerClient } from '@/client';
import {
    acquireGatewayTransportLease,
    runGatewayTransportTransition,
} from './transport-coordinator';

jest.mock('@/client', () => ({
    pioneerClient: {
        gatewayTransportReserve: jest.fn(),
        gatewayTransportWait: jest.fn(),
        gatewayTransportRelease: jest.fn(),
    },
}));

describe('Gateway transport lease adapter', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(pioneerClient.gatewayTransportReserve).mockReturnValue(17);
        jest.mocked(pioneerClient.gatewayTransportRelease).mockReturnValue(true);
    });

    it('reserves synchronously and waits for the native grant before executing a transition', async () => {
        let grant!: (value: boolean) => void;
        jest.mocked(pioneerClient.gatewayTransportWait).mockReturnValue(
            new Promise((resolve) => {
                grant = resolve;
            }),
        );
        const operation = jest.fn(async () => 'connected');
        const transition = runGatewayTransportTransition(operation);
        expect(pioneerClient.gatewayTransportReserve).toHaveBeenCalledWith({
            schema_version: 1,
            exclusive: true,
        });
        expect(operation).not.toHaveBeenCalled();
        expect(pioneerClient.gatewayTransportRelease).not.toHaveBeenCalled();
        grant(true);
        await expect(transition).resolves.toBe('connected');
        expect(pioneerClient.gatewayTransportRelease).toHaveBeenCalledWith({
            schema_version: 1,
            lease_id: 17,
        });
    });

    it('releases the interactive token exactly once', async () => {
        jest.mocked(pioneerClient.gatewayTransportWait).mockResolvedValue(true);
        const release = await acquireGatewayTransportLease();
        expect(pioneerClient.gatewayTransportReserve).toHaveBeenCalledWith({
            schema_version: 1,
            exclusive: false,
        });
        release();
        release();
        expect(pioneerClient.gatewayTransportRelease).toHaveBeenCalledTimes(1);
    });

    it('releases on operation failure and on cancelled native acquisition', async () => {
        jest.mocked(pioneerClient.gatewayTransportWait)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false);
        const error = new Error('synthetic failure');
        await expect(
            runGatewayTransportTransition(async () => {
                throw error;
            }),
        ).rejects.toBe(error);
        const operation = jest.fn(async () => undefined);
        await expect(runGatewayTransportTransition(operation)).rejects.toThrow('cancelled');
        expect(operation).not.toHaveBeenCalled();
        expect(pioneerClient.gatewayTransportRelease).toHaveBeenCalledTimes(2);
    });
});
